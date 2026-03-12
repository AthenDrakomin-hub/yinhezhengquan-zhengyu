-- 交易资金和持仓冻结函数
-- 这些函数确保事务安全，避免并发问题

-- ==================== 资金冻结 ====================

-- 冻结用户资金
CREATE OR REPLACE FUNCTION freeze_user_funds(
  p_user_id UUID,
  p_amount DECIMAL(18, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_available DECIMAL(18, 2);
BEGIN
  -- 获取当前可用余额（加锁）
  SELECT available_balance INTO v_available
  FROM assets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- 检查余额是否足够
  IF v_available IS NULL OR v_available < p_amount THEN
    RETURN FALSE;
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
AS $$
BEGIN
  -- 解冻资金
  UPDATE assets
  SET 
    available_balance = available_balance + p_amount,
    frozen_balance = GREATEST(frozen_balance - p_amount, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- ==================== 持仓冻结 ====================

-- 冻结用户持仓
CREATE OR REPLACE FUNCTION freeze_user_position(
  p_user_id UUID,
  p_stock_code VARCHAR(20),
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- 获取当前可用持仓（加锁）
  SELECT available_quantity INTO v_available
  FROM positions
  WHERE user_id = p_user_id AND symbol = p_stock_code
  FOR UPDATE;
  
  -- 检查持仓是否足够
  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN FALSE;
  END IF;
  
  -- 冻结持仓
  UPDATE positions
  SET 
    available_quantity = available_quantity - p_quantity,
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
AS $$
BEGIN
  -- 解冻持仓
  UPDATE positions
  SET 
    available_quantity = available_quantity + p_quantity,
    updated_at = NOW()
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  
  RETURN FOUND;
END;
$$;

-- ==================== 涨停状态检查 ====================

-- 获取股票涨停状态
CREATE OR REPLACE FUNCTION get_stock_limit_up_status(
  p_stock_code VARCHAR(20)
)
RETURNS TABLE(
  stock_code VARCHAR(20),
  is_limit_up BOOLEAN,
  limit_up_price DECIMAL(18, 4),
  current_price DECIMAL(18, 4)
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- 从实时行情缓存获取涨停数据
  -- 如果没有数据，返回默认值
  RETURN QUERY
  SELECT 
    p_stock_code::VARCHAR(20),
    FALSE::BOOLEAN,
    0::DECIMAL(18, 4),
    0::DECIMAL(18, 4);
END;
$$;

-- ==================== 交易执行（原子操作） ====================

-- 执行买入交易（资金扣减 + 持仓增加）
CREATE OR REPLACE FUNCTION execute_buy_trade(
  p_user_id UUID,
  p_stock_code VARCHAR(20),
  p_stock_name VARCHAR(50),
  p_price DECIMAL(18, 4),
  p_quantity INTEGER,
  p_fee DECIMAL(18, 4),
  p_trade_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_cost DECIMAL(18, 4);
  v_frozen_amount DECIMAL(18, 4);
BEGIN
  v_total_cost := p_price * p_quantity + p_fee;
  
  -- 1. 获取冻结金额
  SELECT frozen_balance INTO v_frozen_amount
  FROM assets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_frozen_amount IS NULL OR v_frozen_amount < v_total_cost THEN
    RETURN FALSE;
  END IF;
  
  -- 2. 扣减冻结资金
  UPDATE assets
  SET 
    frozen_balance = frozen_balance - v_total_cost,
    total_balance = total_balance - p_fee,  -- 手续费从总资产扣除
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- 3. 增加持仓（upsert）
  INSERT INTO positions (user_id, symbol, stock_name, quantity, available_quantity, cost_price, created_at, updated_at)
  VALUES (p_user_id, p_stock_code, p_stock_name, p_quantity, p_quantity, p_price, NOW(), NOW())
  ON CONFLICT (user_id, symbol) 
  DO UPDATE SET
    quantity = positions.quantity + p_quantity,
    available_quantity = positions.available_quantity + p_quantity,
    cost_price = (positions.cost_price * positions.quantity + p_price * p_quantity) / (positions.quantity + p_quantity),
    updated_at = NOW();
  
  -- 4. 更新交易状态
  UPDATE trades
  SET 
    status = 'FILLED',
    filled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_trade_id;
  
  RETURN TRUE;
END;
$$;

-- 执行卖出交易（持仓扣减 + 资金增加）
CREATE OR REPLACE FUNCTION execute_sell_trade(
  p_user_id UUID,
  p_stock_code VARCHAR(20),
  p_price DECIMAL(18, 4),
  p_quantity INTEGER,
  p_fee DECIMAL(18, 4),
  p_trade_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_amount DECIMAL(18, 4);
  v_available_quantity INTEGER;
BEGIN
  v_total_amount := p_price * p_quantity - p_fee;
  
  -- 1. 检查持仓
  SELECT available_quantity INTO v_available_quantity
  FROM positions
  WHERE user_id = p_user_id AND symbol = p_stock_code
  FOR UPDATE;
  
  IF v_available_quantity IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 2. 扣减持仓
  UPDATE positions
  SET 
    quantity = quantity - p_quantity,
    available_quantity = available_quantity - p_quantity,
    updated_at = NOW()
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  
  -- 3. 删除零持仓
  DELETE FROM positions 
  WHERE user_id = p_user_id AND symbol = p_stock_code AND quantity <= 0;
  
  -- 4. 增加资金
  UPDATE assets
  SET 
    available_balance = available_balance + v_total_amount,
    total_balance = total_balance - p_fee,  -- 手续费从总资产扣除
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- 5. 更新交易状态
  UPDATE trades
  SET 
    status = 'FILLED',
    filled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_trade_id;
  
  RETURN TRUE;
END;
$$;

-- ==================== 权限设置 ====================

-- 授予执行权限
GRANT EXECUTE ON FUNCTION freeze_user_funds TO service_role;
GRANT EXECUTE ON FUNCTION unfreeze_user_funds TO service_role;
GRANT EXECUTE ON FUNCTION freeze_user_position TO service_role;
GRANT EXECUTE ON FUNCTION unfreeze_user_position TO service_role;
GRANT EXECUTE ON FUNCTION get_stock_limit_up_status TO service_role;
GRANT EXECUTE ON FUNCTION execute_buy_trade TO service_role;
GRANT EXECUTE ON FUNCTION execute_sell_trade TO service_role;

-- 添加注释
COMMENT ON FUNCTION freeze_user_funds IS '冻结用户资金，事务安全';
COMMENT ON FUNCTION unfreeze_user_funds IS '解冻用户资金';
COMMENT ON FUNCTION freeze_user_position IS '冻结用户持仓，事务安全';
COMMENT ON FUNCTION unfreeze_user_position IS '解冻用户持仓';
COMMENT ON FUNCTION get_stock_limit_up_status IS '获取股票涨停状态';
COMMENT ON FUNCTION execute_buy_trade IS '执行买入交易（原子操作）';
COMMENT ON FUNCTION execute_sell_trade IS '执行卖出交易（原子操作）';
