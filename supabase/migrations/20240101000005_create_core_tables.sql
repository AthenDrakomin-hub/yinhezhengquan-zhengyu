-- =====================================================
-- 核心交易表和函数迁移
-- 创建 assets、positions 表及相关 RPC 函数
-- =====================================================

-- ==================== 用户资产表 ====================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,          -- 总余额
  available_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,      -- 可用余额
  frozen_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,         -- 冻结余额
  market_value DECIMAL(18, 2) NOT NULL DEFAULT 0,           -- 持仓市值
  total_assets DECIMAL(18, 2) NOT NULL DEFAULT 0,           -- 总资产
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_updated_at ON assets(updated_at);

-- 添加注释
COMMENT ON TABLE assets IS '用户资产表';
COMMENT ON COLUMN assets.total_balance IS '总余额（含冻结）';
COMMENT ON COLUMN assets.available_balance IS '可用余额';
COMMENT ON COLUMN assets.frozen_balance IS '冻结余额（订单占用）';
COMMENT ON COLUMN assets.market_value IS '持仓市值';
COMMENT ON COLUMN assets.total_assets IS '总资产 = 可用余额 + 冻结余额 + 持仓市值';

-- ==================== 用户持仓表 ====================

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,                              -- 股票代码
  stock_name VARCHAR(100),                                  -- 股票名称
  quantity INTEGER NOT NULL DEFAULT 0,                      -- 持仓数量
  available_quantity INTEGER NOT NULL DEFAULT 0,            -- 可用数量
  frozen_quantity INTEGER NOT NULL DEFAULT 0,               -- 冻结数量
  cost_price DECIMAL(18, 4) NOT NULL DEFAULT 0,             -- 成本价
  current_price DECIMAL(18, 4),                             -- 当前价格
  market_value DECIMAL(18, 2),                              -- 市值
  profit_loss DECIMAL(18, 2),                               -- 盈亏
  profit_loss_ratio DECIMAL(10, 4),                         -- 盈亏比例
  market VARCHAR(20) DEFAULT 'A股',                         -- 市场类型
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uk_positions_user_symbol UNIQUE(user_id, symbol)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market);

-- 添加注释
COMMENT ON TABLE positions IS '用户持仓表';
COMMENT ON COLUMN positions.symbol IS '股票代码';
COMMENT ON COLUMN positions.quantity IS '持仓总数';
COMMENT ON COLUMN positions.available_quantity IS '可卖数量';
COMMENT ON COLUMN positions.frozen_quantity IS '冻结数量（委托卖出）';
COMMENT ON COLUMN positions.cost_price IS '持仓成本价';

-- ==================== 性能指标表 ====================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL,                         -- 指标类型
  metric_name VARCHAR(100) NOT NULL,                        -- 指标名称
  value DECIMAL(18, 4) NOT NULL,                            -- 指标值
  metadata JSONB DEFAULT '{}',                              -- 元数据
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);

-- 添加注释
COMMENT ON TABLE performance_metrics IS '系统性能指标表';

-- ==================== RLS 策略 ====================

-- 启用 RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- assets 表 RLS 策略
CREATE POLICY "用户只能查看自己的资产" ON assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的资产" ON assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的资产" ON assets
  FOR UPDATE USING (auth.uid() = user_id);

-- positions 表 RLS 策略
CREATE POLICY "用户只能查看自己的持仓" ON positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的持仓" ON positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的持仓" ON positions
  FOR UPDATE USING (auth.uid() = user_id);

-- performance_metrics 表 RLS 策略（仅管理员可访问）
CREATE POLICY "性能指标仅管理员可访问" ON performance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- ==================== RPC 函数 ====================

-- 记录性能指标
CREATE OR REPLACE FUNCTION record_performance_metric(
  p_metric_type VARCHAR(50),
  p_metric_name VARCHAR(100),
  p_value DECIMAL(18, 4),
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO performance_metrics (metric_type, metric_name, value, metadata)
  VALUES (p_metric_type, p_metric_name, p_value, p_metadata);
END;
$$;

-- 冻结用户资金
CREATE OR REPLACE FUNCTION freeze_user_funds(
  p_user_id UUID,
  p_amount DECIMAL(18, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available DECIMAL(18, 2);
BEGIN
  -- 检查可用余额
  SELECT available_balance INTO v_available
  FROM assets
  WHERE user_id = p_user_id;
  
  IF v_available IS NULL THEN
    RAISE EXCEPTION '用户资产不存在';
  END IF;
  
  IF v_available < p_amount THEN
    RAISE EXCEPTION '可用余额不足';
  END IF;
  
  -- 冻结资金
  UPDATE assets
  SET 
    available_balance = available_balance - p_amount,
    frozen_balance = frozen_balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- 解冻用户资金
CREATE OR REPLACE FUNCTION unfreeze_user_funds(
  p_user_id UUID,
  p_amount DECIMAL(18, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_frozen DECIMAL(18, 2);
BEGIN
  -- 检查冻结余额
  SELECT frozen_balance INTO v_frozen
  FROM assets
  WHERE user_id = p_user_id;
  
  IF v_frozen IS NULL THEN
    RAISE EXCEPTION '用户资产不存在';
  END IF;
  
  IF v_frozen < p_amount THEN
    RAISE EXCEPTION '冻结余额不足';
  END IF;
  
  -- 解冻资金
  UPDATE assets
  SET 
    available_balance = available_balance + p_amount,
    frozen_balance = frozen_balance - p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- 冻结用户持仓
CREATE OR REPLACE FUNCTION freeze_user_position(
  p_user_id UUID,
  p_stock_code VARCHAR(20),
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- 检查可用持仓
  SELECT available_quantity INTO v_available
  FROM positions
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  
  IF v_available IS NULL THEN
    RAISE EXCEPTION '持仓不存在';
  END IF;
  
  IF v_available < p_quantity THEN
    RAISE EXCEPTION '可用持仓不足';
  END IF;
  
  -- 冻结持仓
  UPDATE positions
  SET 
    available_quantity = available_quantity - p_quantity,
    frozen_quantity = frozen_quantity + p_quantity,
    updated_at = NOW()
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  
  RETURN TRUE;
END;
$$;

-- 解冻用户持仓
CREATE OR REPLACE FUNCTION unfreeze_user_position(
  p_user_id UUID,
  p_stock_code VARCHAR(20),
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_frozen INTEGER;
BEGIN
  -- 检查冻结持仓
  SELECT frozen_quantity INTO v_frozen
  FROM positions
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  
  IF v_frozen IS NULL THEN
    RAISE EXCEPTION '持仓不存在';
  END IF;
  
  IF v_frozen < p_quantity THEN
    RAISE EXCEPTION '冻结持仓不足';
  END IF;
  
  -- 解冻持仓
  UPDATE positions
  SET 
    available_quantity = available_quantity + p_quantity,
    frozen_quantity = frozen_quantity - p_quantity,
    updated_at = NOW()
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  
  RETURN TRUE;
END;
$$;

-- 创建默认资产（新用户注册时调用）
CREATE OR REPLACE FUNCTION create_default_user_assets(
  p_user_id UUID,
  p_initial_balance DECIMAL(18, 2) DEFAULT 1000000
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_asset_id UUID;
BEGIN
  INSERT INTO assets (user_id, total_balance, available_balance, frozen_balance, market_value, total_assets)
  VALUES (p_user_id, p_initial_balance, p_initial_balance, 0, 0, p_initial_balance)
  RETURNING id INTO v_asset_id;
  
  RETURN v_asset_id;
END;
$$;

-- 更新用户资产（撮合成交后调用）
CREATE OR REPLACE FUNCTION update_user_assets_after_trade(
  p_user_id UUID,
  p_amount_change DECIMAL(18, 2),
  p_frozen_change DECIMAL(18, 2) DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE assets
  SET 
    total_balance = total_balance + p_amount_change,
    available_balance = available_balance + p_amount_change,
    frozen_balance = frozen_balance + p_frozen_change,
    total_assets = total_balance + p_amount_change,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- 更新持仓（成交后调用）
CREATE OR REPLACE FUNCTION update_position_after_trade(
  p_user_id UUID,
  p_stock_code VARCHAR(20),
  p_stock_name VARCHAR(100),
  p_quantity INTEGER,
  p_price DECIMAL(18, 4),
  p_is_buy BOOLEAN,
  p_market VARCHAR(20) DEFAULT 'A股'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_qty INTEGER;
  v_current_cost DECIMAL(18, 4);
  v_new_qty INTEGER;
  v_new_cost DECIMAL(18, 4);
BEGIN
  -- 查询当前持仓
  SELECT quantity, cost_price INTO v_current_qty, v_current_cost
  FROM positions
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  
  IF p_is_buy THEN
    -- 买入：增加持仓
    IF v_current_qty IS NULL THEN
      -- 新建持仓
      INSERT INTO positions (user_id, symbol, stock_name, quantity, available_quantity, cost_price, market)
      VALUES (p_user_id, p_stock_code, p_stock_name, p_quantity, p_quantity, p_price, p_market);
    ELSE
      -- 加仓：重新计算成本价
      v_new_qty := v_current_qty + p_quantity;
      v_new_cost := (v_current_cost * v_current_qty + p_price * p_quantity) / v_new_qty;
      
      UPDATE positions
      SET 
        quantity = v_new_qty,
        available_quantity = available_quantity + p_quantity,
        cost_price = v_new_cost,
        updated_at = NOW()
      WHERE user_id = p_user_id AND symbol = p_stock_code;
    END IF;
  ELSE
    -- 卖出：减少持仓
    IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
      RAISE EXCEPTION '持仓不足';
    END IF;
    
    v_new_qty := v_current_qty - p_quantity;
    
    IF v_new_qty = 0 THEN
      -- 清空持仓
      DELETE FROM positions
      WHERE user_id = p_user_id AND symbol = p_stock_code;
    ELSE
      -- 减仓
      UPDATE positions
      SET 
        quantity = v_new_qty,
        frozen_quantity = GREATEST(frozen_quantity - p_quantity, 0),
        updated_at = NOW()
      WHERE user_id = p_user_id AND symbol = p_stock_code;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 为 assets 表创建触发器
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 positions 表创建触发器
DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== 授权管理员访问 ====================

-- 为服务角色添加完全访问权限
GRANT ALL ON assets TO service_role;
GRANT ALL ON positions TO service_role;
GRANT ALL ON performance_metrics TO service_role;

-- 为认证用户添加基本权限
GRANT SELECT, INSERT, UPDATE ON assets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON positions TO authenticated;

-- ==================== 清理过期数据 ====================

-- 创建定期清理性能指标的函数
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM performance_metrics
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;
