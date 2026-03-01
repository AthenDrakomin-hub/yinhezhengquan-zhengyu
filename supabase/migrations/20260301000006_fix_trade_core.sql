-- ==========================================================
-- 交易核心闭环修复脚本 (P0级别)
-- 执行时间: 2026-03-01
-- 优先级: P0 (阻塞问题，立即修复)
-- 功能: 撮合逻辑、清算系统、幂等性、撤单功能
-- ==========================================================

-- 1. 创建幂等性表（替代内存缓存）
CREATE TABLE IF NOT EXISTS public.transaction_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  request_body JSONB NOT NULL,
  response_body JSONB,
  status TEXT DEFAULT 'PROCESSING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key ON public.transaction_idempotency(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.transaction_idempotency(expires_at);

-- 2. 创建资金流水表
CREATE TABLE IF NOT EXISTS public.fund_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  flow_type TEXT NOT NULL,
  amount NUMERIC(20,2) NOT NULL,
  balance_after NUMERIC(20,2) NOT NULL,
  related_trade_id UUID REFERENCES public.trades(id),
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_flows_user ON public.fund_flows(user_id, created_at DESC);

-- 3. 创建清算日志表
CREATE TABLE IF NOT EXISTS public.settlement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_date DATE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  settlement_type TEXT NOT NULL,
  details JSONB,
  status TEXT DEFAULT 'SUCCESS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_date ON public.settlement_logs(settlement_date DESC);

-- 4. 添加订单状态（补充缺失状态）
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 5. 创建撮合函数
CREATE OR REPLACE FUNCTION public.match_trade_orders()
RETURNS TABLE(matched_count INT, error_count INT) AS $$
DECLARE
  v_matched_count INT := 0;
  v_error_count INT := 0;
  v_trade RECORD;
BEGIN
  -- 处理所有MATCHING状态的订单
  FOR v_trade IN 
    SELECT * FROM public.trades 
    WHERE status = 'MATCHING' 
    ORDER BY created_at ASC
    LIMIT 100
  LOOP
    BEGIN
      -- 买入订单
      IF v_trade.trade_type = 'BUY' THEN
        -- 更新持仓
        INSERT INTO public.positions (user_id, symbol, name, quantity, available_quantity, average_price, market_value, created_at, updated_at)
        VALUES (
          v_trade.user_id,
          v_trade.stock_code,
          v_trade.stock_name,
          v_trade.quantity,
          0, -- T+1锁定
          v_trade.price,
          v_trade.quantity * v_trade.price,
          NOW(),
          NOW()
        )
        ON CONFLICT (user_id, symbol) DO UPDATE SET
          quantity = positions.quantity + v_trade.quantity,
          average_price = (positions.average_price * positions.quantity + v_trade.price * v_trade.quantity) / (positions.quantity + v_trade.quantity),
          market_value = (positions.quantity + v_trade.quantity) * v_trade.price,
          updated_at = NOW();
        
        -- 解冻资金
        UPDATE public.assets SET
          frozen_balance = frozen_balance - (v_trade.quantity * v_trade.price + COALESCE(v_trade.fee, 0)),
          updated_at = NOW()
        WHERE user_id = v_trade.user_id;
        
      -- 卖出订单
      ELSIF v_trade.trade_type = 'SELL' THEN
        -- 减少持仓
        UPDATE public.positions SET
          quantity = quantity - v_trade.quantity,
          market_value = (quantity - v_trade.quantity) * average_price,
          updated_at = NOW()
        WHERE user_id = v_trade.user_id AND symbol = v_trade.stock_code;
        
        -- 增加可用余额
        UPDATE public.assets SET
          available_balance = available_balance + (v_trade.quantity * v_trade.price - COALESCE(v_trade.fee, 0)),
          updated_at = NOW()
        WHERE user_id = v_trade.user_id;
      END IF;
      
      -- 更新订单状态
      UPDATE public.trades SET
        status = 'SUCCESS',
        executed_quantity = quantity,
        remaining_quantity = 0,
        finish_time = NOW()
      WHERE id = v_trade.id;
      
      -- 记录资金流水
      INSERT INTO public.fund_flows (user_id, flow_type, amount, balance_after, related_trade_id, remark)
      SELECT 
        v_trade.user_id,
        CASE WHEN v_trade.trade_type = 'BUY' THEN 'BUY_DEDUCT' ELSE 'SELL_INCOME' END,
        v_trade.quantity * v_trade.price,
        a.available_balance,
        v_trade.id,
        v_trade.stock_code || ' ' || v_trade.trade_type
      FROM public.assets a WHERE a.user_id = v_trade.user_id;
      
      v_matched_count := v_matched_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      UPDATE public.trades SET status = 'FAILED' WHERE id = v_trade.id;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_matched_count, v_error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建每日清算函数
CREATE OR REPLACE FUNCTION public.daily_settlement()
RETURNS TABLE(processed_users INT, unlocked_positions INT) AS $$
DECLARE
  v_processed_users INT := 0;
  v_unlocked_positions INT := 0;
  v_user RECORD;
  v_total_asset NUMERIC;
BEGIN
  -- 解锁T+1持仓
  UPDATE public.positions SET
    available_quantity = quantity,
    locked_quantity = 0,
    updated_at = NOW()
  WHERE lock_until <= CURRENT_DATE;
  
  GET DIAGNOSTICS v_unlocked_positions = ROW_COUNT;
  
  -- 更新每个用户的总资产
  FOR v_user IN SELECT DISTINCT user_id FROM public.assets
  LOOP
    -- 计算总资产 = 可用余额 + 冻结余额 + 持仓市值
    SELECT 
      COALESCE(a.available_balance, 0) + 
      COALESCE(a.frozen_balance, 0) + 
      COALESCE(SUM(p.market_value), 0)
    INTO v_total_asset
    FROM public.assets a
    LEFT JOIN public.positions p ON p.user_id = a.user_id
    WHERE a.user_id = v_user.user_id
    GROUP BY a.available_balance, a.frozen_balance;
    
    -- 更新总资产
    UPDATE public.assets SET
      total_asset = v_total_asset,
      today_profit_loss = 0, -- 重置当日盈亏
      updated_at = NOW()
    WHERE user_id = v_user.user_id;
    
    v_processed_users := v_processed_users + 1;
    
    -- 记录清算日志
    INSERT INTO public.settlement_logs (settlement_date, user_id, settlement_type, details)
    VALUES (CURRENT_DATE, v_user.user_id, 'DAILY', jsonb_build_object('total_asset', v_total_asset));
  END LOOP;
  
  RETURN QUERY SELECT v_processed_users, v_unlocked_positions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建撤单函数
CREATE OR REPLACE FUNCTION public.cancel_trade_order(p_trade_id UUID, p_user_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  v_trade RECORD;
  v_refund_amount NUMERIC;
BEGIN
  -- 查询订单
  SELECT * INTO v_trade FROM public.trades 
  WHERE id = p_trade_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '订单不存在');
  END IF;
  
  IF v_trade.status NOT IN ('PENDING', 'MATCHING') THEN
    RETURN jsonb_build_object('success', false, 'error', '订单状态不允许撤单');
  END IF;
  
  -- 计算退款金额
  v_refund_amount := v_trade.quantity * v_trade.price + COALESCE(v_trade.fee, 0);
  
  -- 解冻资金
  UPDATE public.assets SET
    available_balance = available_balance + v_refund_amount,
    frozen_balance = frozen_balance - v_refund_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- 更新订单状态
  UPDATE public.trades SET
    status = 'CANCELLED',
    cancel_reason = p_reason,
    cancelled_at = NOW(),
    finish_time = NOW()
  WHERE id = p_trade_id;
  
  -- 记录资金流水
  INSERT INTO public.fund_flows (user_id, flow_type, amount, balance_after, related_trade_id, remark)
  SELECT 
    p_user_id,
    'CANCEL_REFUND',
    v_refund_amount,
    a.available_balance,
    p_trade_id,
    '撤单退款: ' || p_reason
  FROM public.assets a WHERE a.user_id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'refund_amount', v_refund_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 创建对账函数
CREATE OR REPLACE FUNCTION public.reconcile_user_assets(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_calculated_total NUMERIC;
  v_recorded_total NUMERIC;
  v_diff NUMERIC;
BEGIN
  -- 计算实际总资产
  SELECT 
    COALESCE(a.available_balance, 0) + 
    COALESCE(a.frozen_balance, 0) + 
    COALESCE(SUM(p.market_value), 0)
  INTO v_calculated_total
  FROM public.assets a
  LEFT JOIN public.positions p ON p.user_id = a.user_id
  WHERE a.user_id = p_user_id
  GROUP BY a.available_balance, a.frozen_balance;
  
  -- 获取记录的总资产
  SELECT total_asset INTO v_recorded_total 
  FROM public.assets WHERE user_id = p_user_id;
  
  v_diff := v_calculated_total - COALESCE(v_recorded_total, 0);
  
  -- 如果有差异，记录日志
  IF ABS(v_diff) > 0.01 THEN
    INSERT INTO public.settlement_logs (settlement_date, user_id, settlement_type, details, status)
    VALUES (
      CURRENT_DATE, 
      p_user_id, 
      'RECONCILE', 
      jsonb_build_object(
        'calculated', v_calculated_total,
        'recorded', v_recorded_total,
        'diff', v_diff
      ),
      'WARNING'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'calculated_total', v_calculated_total,
    'recorded_total', v_recorded_total,
    'diff', v_diff,
    'is_balanced', ABS(v_diff) <= 0.01
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 创建定时清理过期幂等性记录的函数
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency()
RETURNS INT AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM public.transaction_idempotency WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RLS策略
ALTER TABLE public.transaction_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户查看自己的幂等性记录" ON public.transaction_idempotency
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户查看自己的资金流水" ON public.fund_flows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "管理员查看所有资金流水" ON public.fund_flows
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'ACTIVE')
  );

CREATE POLICY "管理员查看清算日志" ON public.settlement_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'ACTIVE')
  );

-- 11. 验证安装
SELECT 
  'P0修复完成' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('transaction_idempotency', 'fund_flows', 'settlement_logs')) as tables_created,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name IN ('match_trade_orders', 'daily_settlement', 'cancel_trade_order', 'reconcile_user_assets')) as functions_created;
