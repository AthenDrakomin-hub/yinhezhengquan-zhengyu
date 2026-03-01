-- ==========================================================
-- 清算系统和资金流水模块
-- 执行时间: 2026-03-01
-- 优先级: P0 (立即执行)
-- 功能: 添加清算日志、资金流水、对账机制、幂等性表
-- ==========================================================

-- 1. 交易幂等性表（替代内存缓存）
CREATE TABLE IF NOT EXISTS public.transaction_idempotency (
  transaction_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_transaction_expires ON public.transaction_idempotency(expires_at);
CREATE INDEX idx_transaction_user ON public.transaction_idempotency(user_id);

-- 自动清理过期记录
CREATE OR REPLACE FUNCTION cleanup_expired_transactions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.transaction_idempotency WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. 资金流水表
CREATE TABLE IF NOT EXISTS public.fund_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAW', 'FREEZE', 'UNFREEZE', 'TRADE_BUY', 'TRADE_SELL', 'FEE')),
  amount DECIMAL(18,2) NOT NULL,
  balance_before DECIMAL(18,2) NOT NULL,
  balance_after DECIMAL(18,2) NOT NULL,
  related_trade_id UUID REFERENCES public.trades(id),
  status TEXT DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fund_transfers_user ON public.fund_transfers(user_id, created_at DESC);
CREATE INDEX idx_fund_transfers_trade ON public.fund_transfers(related_trade_id);

-- RLS策略
ALTER TABLE public.fund_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的资金流水" ON public.fund_transfers
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

CREATE POLICY "管理员可以查看所有资金流水" ON public.fund_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 3. 清算日志表
CREATE TABLE IF NOT EXISTS public.settlement_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_date DATE NOT NULL UNIQUE,
  total_users INTEGER NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  total_volume DECIMAL(18,2) NOT NULL DEFAULT 0,
  unlocked_positions INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settlement_date ON public.settlement_logs(settlement_date DESC);

-- RLS策略
ALTER TABLE public.settlement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员可以查看清算日志" ON public.settlement_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 4. 资产对账函数
CREATE OR REPLACE FUNCTION reconcile_user_assets(p_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  cash DECIMAL,
  position_value DECIMAL,
  total_asset_db DECIMAL,
  total_asset_calc DECIMAL,
  diff DECIMAL,
  is_match BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.user_id,
    (a.available_balance + a.frozen_balance) AS cash,
    COALESCE(SUM(p.quantity * p.average_price), 0) AS position_value,
    a.total_asset AS total_asset_db,
    (a.available_balance + a.frozen_balance + COALESCE(SUM(p.quantity * p.average_price), 0)) AS total_asset_calc,
    (a.total_asset - (a.available_balance + a.frozen_balance + COALESCE(SUM(p.quantity * p.average_price), 0))) AS diff,
    (ABS(a.total_asset - (a.available_balance + a.frozen_balance + COALESCE(SUM(p.quantity * p.average_price), 0))) < 0.01) AS is_match
  FROM public.assets a
  LEFT JOIN public.positions p ON a.user_id = p.user_id
  WHERE a.user_id = p_user_id
  GROUP BY a.user_id, a.available_balance, a.frozen_balance, a.total_asset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 计算总资产函数
CREATE OR REPLACE FUNCTION calculate_total_asset(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_cash DECIMAL;
  v_position_value DECIMAL;
BEGIN
  -- 获取现金（可用+冻结）
  SELECT COALESCE(available_balance + frozen_balance, 0) INTO v_cash
  FROM public.assets WHERE user_id = p_user_id;
  
  -- 计算持仓市值（使用成本价，实时行情需要外部更新）
  SELECT COALESCE(SUM(quantity * average_price), 0) INTO v_position_value
  FROM public.positions
  WHERE user_id = p_user_id;
  
  RETURN v_cash + v_position_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 每日清算主函数
CREATE OR REPLACE FUNCTION daily_settlement()
RETURNS JSONB AS $$
DECLARE
  v_settlement_date DATE := CURRENT_DATE;
  v_log_id UUID;
  v_total_users INTEGER := 0;
  v_total_trades INTEGER := 0;
  v_total_volume DECIMAL := 0;
  v_unlocked_positions INTEGER := 0;
BEGIN
  -- 检查今日是否已清算
  IF EXISTS (SELECT 1 FROM public.settlement_logs WHERE settlement_date = v_settlement_date) THEN
    RETURN jsonb_build_object('error', '今日已完成清算', 'date', v_settlement_date);
  END IF;
  
  -- 创建清算日志
  INSERT INTO public.settlement_logs (settlement_date, started_at, status)
  VALUES (v_settlement_date, NOW(), 'RUNNING')
  RETURNING id INTO v_log_id;
  
  BEGIN
    -- 1. 解除T+1锁定
    UPDATE public.positions
    SET 
      available_quantity = available_quantity + COALESCE(locked_quantity, 0),
      locked_quantity = 0,
      updated_at = NOW()
    WHERE locked_quantity > 0;
    
    GET DIAGNOSTICS v_unlocked_positions = ROW_COUNT;
    
    -- 2. 统计当日交易
    SELECT COUNT(DISTINCT user_id), COUNT(*), COALESCE(SUM(price * quantity), 0)
    INTO v_total_users, v_total_trades, v_total_volume
    FROM public.trades
    WHERE DATE(created_at) = v_settlement_date;
    
    -- 3. 更新所有用户总资产
    UPDATE public.assets a
    SET 
      total_asset = calculate_total_asset(a.user_id),
      today_profit_loss = 0, -- 重置当日盈亏
      updated_at = NOW();
    
    -- 4. 更新清算日志为成功
    UPDATE public.settlement_logs
    SET 
      status = 'SUCCESS',
      total_users = v_total_users,
      total_trades = v_total_trades,
      total_volume = v_total_volume,
      unlocked_positions = v_unlocked_positions,
      completed_at = NOW()
    WHERE id = v_log_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'date', v_settlement_date,
      'total_users', v_total_users,
      'total_trades', v_total_trades,
      'total_volume', v_total_volume,
      'unlocked_positions', v_unlocked_positions
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- 清算失败，记录错误
    UPDATE public.settlement_logs
    SET 
      status = 'FAILED',
      error_message = SQLERRM,
      completed_at = NOW()
    WHERE id = v_log_id;
    
    RETURN jsonb_build_object('error', SQLERRM, 'date', v_settlement_date);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 添加trades表缺失字段
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS fee DECIMAL(18,2) DEFAULT 0;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS need_approval BOOLEAN DEFAULT false;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS approval_status TEXT;

-- 8. 添加positions表缺失字段
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS locked_quantity INTEGER DEFAULT 0;

-- 9. 验证安装
SELECT 
  'settlement_system_installed' as status,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('transaction_idempotency', 'fund_transfers', 'settlement_logs');
