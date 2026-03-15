-- ============================================
-- 同步项目所需的所有数据库函数
-- 创建时间: 2026-03-17
-- ============================================

-- ==================== 资金冻结/解冻 ====================

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
  SELECT available_balance INTO v_available
  FROM assets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_available IS NULL OR v_available < p_amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE assets SET 
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
  UPDATE assets SET 
    available_balance = available_balance + p_amount,
    frozen_balance = GREATEST(frozen_balance - p_amount, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  RETURN FOUND;
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
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  SELECT available_quantity INTO v_available
  FROM positions WHERE user_id = p_user_id AND symbol = p_stock_code FOR UPDATE;
  
  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN FALSE;
  END IF;
  
  UPDATE positions SET 
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
  UPDATE positions SET 
    available_quantity = available_quantity + p_quantity,
    updated_at = NOW()
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  RETURN FOUND;
END;
$$;

-- ==================== 交易执行 ====================

-- 执行买入交易
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
  
  SELECT frozen_balance INTO v_frozen_amount
  FROM assets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_frozen_amount IS NULL OR v_frozen_amount < v_total_cost THEN
    RETURN FALSE;
  END IF;
  
  UPDATE assets SET 
    frozen_balance = frozen_balance - v_total_cost,
    total_balance = total_balance - p_fee,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  INSERT INTO positions (user_id, symbol, stock_name, quantity, available_quantity, cost_price, created_at, updated_at)
  VALUES (p_user_id, p_stock_code, p_stock_name, p_quantity, p_quantity, p_price, NOW(), NOW())
  ON CONFLICT (user_id, symbol) DO UPDATE SET
    quantity = positions.quantity + p_quantity,
    available_quantity = positions.available_quantity + p_quantity,
    cost_price = (positions.cost_price * positions.quantity + p_price * p_quantity) / (positions.quantity + p_quantity),
    updated_at = NOW();
  
  UPDATE trades SET status = 'FILLED', filled_at = NOW(), updated_at = NOW() WHERE id = p_trade_id;
  
  RETURN TRUE;
END;
$$;

-- 执行卖出交易
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
BEGIN
  v_total_amount := p_price * p_quantity - p_fee;
  
  UPDATE positions SET 
    quantity = quantity - p_quantity,
    available_quantity = available_quantity - p_quantity,
    updated_at = NOW()
  WHERE user_id = p_user_id AND symbol = p_stock_code;
  
  DELETE FROM positions WHERE user_id = p_user_id AND symbol = p_stock_code AND quantity <= 0;
  
  UPDATE assets SET 
    available_balance = available_balance + v_total_amount,
    total_balance = total_balance - p_fee,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  UPDATE trades SET status = 'FILLED', filled_at = NOW(), updated_at = NOW() WHERE id = p_trade_id;
  
  RETURN TRUE;
END;
$$;

-- ==================== 订单取消 ====================

-- 取消订单
CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM trades WHERE id = p_order_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', '订单不存在');
  END IF;
  
  IF v_order.status NOT IN ('PENDING', 'SUBMITTED') THEN
    RETURN json_build_object('success', FALSE, 'message', '订单状态不可取消');
  END IF;
  
  IF v_order.trade_type = 'BUY' THEN
    PERFORM unfreeze_user_funds(p_user_id, v_order.quantity * v_order.price);
  ELSE
    PERFORM unfreeze_user_position(p_user_id, v_order.stock_code, v_order.quantity);
  END IF;
  
  UPDATE trades SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
  
  RETURN json_build_object('success', TRUE, 'message', '订单已取消');
END;
$$;

-- 撤单 RPC（Edge Function 调用）
CREATE OR REPLACE FUNCTION cancel_trade_order(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_refunded_amount DECIMAL(18, 4) := 0;
  v_refunded_quantity INTEGER := 0;
BEGIN
  SELECT * INTO v_order FROM trades WHERE id = p_order_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', '订单不存在');
  END IF;
  
  IF v_order.status NOT IN ('PENDING', 'SUBMITTED') THEN
    RETURN json_build_object('success', FALSE, 'error', '订单状态不可取消');
  END IF;
  
  IF v_order.trade_type = 'BUY' THEN
    v_refunded_amount := v_order.quantity * v_order.price;
    PERFORM unfreeze_user_funds(p_user_id, v_refunded_amount);
  ELSE
    v_refunded_quantity := v_order.quantity;
    PERFORM unfreeze_user_position(p_user_id, v_order.stock_code, v_refunded_quantity);
  END IF;
  
  UPDATE trades SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
  
  RETURN json_build_object('success', TRUE, 'refunded_amount', v_refunded_amount, 'refunded_quantity', v_refunded_quantity);
END;
$$;

-- ==================== 撮合与结算 ====================

-- 是否交易时间
CREATE OR REPLACE FUNCTION is_trading_time()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_hour INTEGER;
  current_minute INTEGER;
  current_dow INTEGER;
BEGIN
  current_hour := EXTRACT(HOUR FROM NOW());
  current_minute := EXTRACT(MINUTE FROM NOW());
  current_dow := EXTRACT(DOW FROM NOW());
  
  IF current_dow IN (0, 6) THEN RETURN FALSE; END IF;
  
  IF current_hour = 9 AND current_minute >= 30 THEN RETURN TRUE; END IF;
  IF current_hour = 10 THEN RETURN TRUE; END IF;
  IF current_hour = 11 AND current_minute <= 30 THEN RETURN TRUE; END IF;
  IF current_hour = 13 THEN RETURN TRUE; END IF;
  IF current_hour = 14 THEN RETURN TRUE; END IF;
  IF current_hour = 15 AND current_minute = 0 THEN RETURN TRUE; END IF;
  
  RETURN FALSE;
END;
$$;

-- 撮合订单
CREATE OR REPLACE FUNCTION match_trade_orders()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  matched_count INTEGER := 0;
BEGIN
  UPDATE trades SET status = 'FILLED', filled_at = NOW(), updated_at = NOW()
  WHERE status = 'SUBMITTED' AND is_trading_time();
  
  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RETURN matched_count;
END;
$$;

-- 日结算
CREATE OR REPLACE FUNCTION daily_settlement()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO asset_snapshots (user_id, total_asset, available_balance, frozen_balance, market_value, snapshot_date, created_at)
  SELECT a.user_id, a.total_balance + COALESCE(p.market_value, 0), a.available_balance, a.frozen_balance, COALESCE(p.market_value, 0), CURRENT_DATE, NOW()
  FROM assets a
  LEFT JOIN (SELECT user_id, SUM(quantity * COALESCE(cost_price, 0)) as market_value FROM positions GROUP BY user_id) p ON p.user_id = a.user_id
  ON CONFLICT (user_id, snapshot_date) DO NOTHING;
END;
$$;

-- ==================== 计算函数 ====================

-- 计算交易手续费
CREATE OR REPLACE FUNCTION calculate_trade_fee(
  p_trade_amount DECIMAL(18, 4),
  p_trade_type VARCHAR(10)
)
RETURNS DECIMAL(18, 4)
LANGUAGE plpgsql
AS $$
DECLARE
  v_commission DECIMAL(18, 4);
  v_stamp_duty DECIMAL(18, 4);
BEGIN
  v_commission := p_trade_amount * 0.0003;
  IF v_commission < 5 THEN v_commission := 5; END IF;
  
  IF p_trade_type = 'SELL' THEN
    v_stamp_duty := p_trade_amount * 0.001;
  ELSE
    v_stamp_duty := 0;
  END IF;
  
  RETURN v_commission + v_stamp_duty + p_trade_amount * 0.00001;
END;
$$;

-- 记录资金流水
CREATE OR REPLACE FUNCTION record_fund_flow(
  p_user_id UUID,
  p_flow_type VARCHAR(20),
  p_amount DECIMAL(18, 4),
  p_related_id UUID DEFAULT NULL,
  p_remark VARCHAR(200) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_flow_id UUID;
BEGIN
  INSERT INTO fund_flows (user_id, flow_type, amount, related_id, remark, created_at)
  VALUES (p_user_id, p_flow_type, p_amount, p_related_id, p_remark, NOW())
  RETURNING id INTO v_flow_id;
  RETURN v_flow_id;
END;
$$;

-- ==================== 基金与理财 ====================

-- 计算基金份额
CREATE OR REPLACE FUNCTION calculate_fund_shares(p_amount DECIMAL(18, 4), p_nav DECIMAL(18, 4))
RETURNS DECIMAL(18, 4) LANGUAGE plpgsql AS $$
BEGIN
  IF p_nav <= 0 THEN RETURN 0; END IF;
  RETURN ROUND(p_amount / p_nav, 2);
END;
$$;

-- 计算基金赎回金额
CREATE OR REPLACE FUNCTION calculate_fund_redeem(p_shares DECIMAL(18, 4), p_nav DECIMAL(18, 4), p_holding_days INTEGER)
RETURNS DECIMAL(18, 4) LANGUAGE plpgsql AS $$
DECLARE
  v_amount DECIMAL(18, 4);
  v_fee DECIMAL(18, 4);
BEGIN
  v_amount := p_shares * p_nav;
  
  IF p_holding_days < 7 THEN v_fee := v_amount * 0.015;
  ELSIF p_holding_days < 30 THEN v_fee := v_amount * 0.0075;
  ELSIF p_holding_days < 180 THEN v_fee := v_amount * 0.005;
  ELSIF p_holding_days < 365 THEN v_fee := v_amount * 0.0025;
  ELSE v_fee := 0; END IF;
  
  RETURN v_amount - v_fee;
END;
$$;

-- 计算理财收益
CREATE OR REPLACE FUNCTION calculate_wealth_interest(p_principal DECIMAL(18, 4), p_rate DECIMAL(6, 4), p_days INTEGER)
RETURNS DECIMAL(18, 4) LANGUAGE plpgsql AS $$
BEGIN
  RETURN ROUND(p_principal * p_rate / 365 * p_days, 2);
END;
$$;

-- ==================== 积分与VIP ====================

-- 签到获取积分
CREATE OR REPLACE FUNCTION checkin_and_get_points(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  v_today DATE;
  v_last_checkin DATE;
  v_continuous_days INTEGER;
  v_points INTEGER;
BEGIN
  v_today := CURRENT_DATE;
  
  SELECT last_checkin_date, continuous_days INTO v_last_checkin, v_continuous_days
  FROM user_vip WHERE user_id = p_user_id;
  
  IF v_last_checkin IS NULL THEN
    INSERT INTO user_vip (user_id, total_points, last_checkin_date, continuous_days)
    VALUES (p_user_id, 10, v_today, 1);
    v_points := 10;
  ELSIF v_last_checkin = v_today THEN
    RETURN json_build_object('success', FALSE, 'message', '今日已签到');
  ELSIF v_last_checkin = v_today - 1 THEN
    v_continuous_days := v_continuous_days + 1;
    v_points := 10 + (v_continuous_days - 1) * 2;
    IF v_points > 50 THEN v_points := 50; END IF;
    UPDATE user_vip SET total_points = total_points + v_points, last_checkin_date = v_today, continuous_days = v_continuous_days WHERE user_id = p_user_id;
  ELSE
    v_points := 10;
    UPDATE user_vip SET total_points = total_points + v_points, last_checkin_date = v_today, continuous_days = 1 WHERE user_id = p_user_id;
  END IF;
  
  RETURN json_build_object('success', TRUE, 'points', v_points, 'continuous_days', v_continuous_days);
END;
$$;

-- 计算VIP等级
CREATE OR REPLACE FUNCTION calculate_vip_level(p_user_id UUID)
RETURNS VARCHAR(20) LANGUAGE plpgsql AS $$
DECLARE
  v_total_points INTEGER;
BEGIN
  SELECT total_points INTO v_total_points FROM user_vip WHERE user_id = p_user_id;
  
  IF v_total_points IS NULL OR v_total_points < 1000 THEN RETURN 'VIP0';
  ELSIF v_total_points < 5000 THEN RETURN 'VIP1';
  ELSIF v_total_points < 20000 THEN RETURN 'VIP2';
  ELSIF v_total_points < 100000 THEN RETURN 'VIP3';
  ELSE RETURN 'VIP4'; END IF;
END;
$$;

-- ==================== 管理员函数 ====================

-- 管理员干预交易
CREATE OR REPLACE FUNCTION admin_intervene_trade(p_trade_id UUID, p_action VARCHAR(20), p_reason TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_action = 'cancel' THEN
    UPDATE trades SET status = 'CANCELLED', admin_reason = p_reason, updated_at = NOW() WHERE id = p_trade_id;
  ELSIF p_action = 'force_fill' THEN
    UPDATE trades SET status = 'FILLED', admin_reason = p_reason, filled_at = NOW(), updated_at = NOW() WHERE id = p_trade_id;
  END IF;
  RETURN json_build_object('success', TRUE);
END;
$$;

-- 管理员资金操作
CREATE OR REPLACE FUNCTION admin_user_fund_operation(p_user_id UUID, p_operation VARCHAR(20), p_amount DECIMAL(18, 4), p_reason TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_operation = 'add' THEN
    PERFORM add_balance(p_user_id, p_amount);
  ELSIF p_operation = 'deduct' THEN
    UPDATE assets SET available_balance = available_balance - p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  END IF;
  INSERT INTO admin_operation_logs (operation_type, target_user_id, amount, reason, created_at) VALUES (p_operation, p_user_id, p_amount, p_reason, NOW());
  RETURN json_build_object('success', TRUE);
END;
$$;

-- 获取cron任务
CREATE OR REPLACE FUNCTION get_cron_jobs()
RETURNS TABLE(jobid BIGINT, name TEXT, schedule TEXT, command TEXT, nodename TEXT, nodeport INTEGER, database TEXT, username TEXT, active BOOLEAN, jobname TEXT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT * FROM cron.job ORDER BY jobid;
END;
$$;

-- ==================== 其他工具函数 ====================

-- 增加观看计数
CREATE OR REPLACE FUNCTION increment_view_count(content_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE education_content SET view_count = view_count + 1 WHERE id = content_id;
END;
$$;

-- 记录每日资产快照
CREATE OR REPLACE FUNCTION record_daily_asset_snapshot(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_total_asset DECIMAL(18, 4);
  v_available DECIMAL(18, 4);
  v_frozen DECIMAL(18, 4);
  v_market_value DECIMAL(18, 4);
BEGIN
  SELECT total_balance, available_balance, frozen_balance INTO v_total_asset, v_available, v_frozen FROM assets WHERE user_id = p_user_id;
  SELECT COALESCE(SUM(p.quantity * COALESCE(s.last_price, p.cost_price)), 0) INTO v_market_value
  FROM positions p LEFT JOIN stock_realtime s ON s.symbol = p.symbol WHERE p.user_id = p_user_id;
  
  v_total_asset := COALESCE(v_total_asset, 0) + v_market_value;
  
  INSERT INTO asset_snapshots (user_id, total_asset, available_balance, frozen_balance, market_value, snapshot_date, created_at)
  VALUES (p_user_id, v_total_asset, v_available, v_frozen, v_market_value, CURRENT_DATE, NOW())
  ON CONFLICT (user_id, snapshot_date) DO UPDATE SET total_asset = EXCLUDED.total_asset, available_balance = EXCLUDED.available_balance;
END;
$$;

-- 发送用户通知
CREATE OR REPLACE FUNCTION send_user_notification(p_user_id UUID, p_title VARCHAR(200), p_content TEXT, p_type VARCHAR(50) DEFAULT 'system')
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_notifications (user_id, title, content, type, is_read, created_at)
  VALUES (p_user_id, p_title, p_content, p_type, FALSE, NOW()) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 获取当前股价
CREATE OR REPLACE FUNCTION get_current_stock_price(p_stock_code VARCHAR(20))
RETURNS DECIMAL(18, 4) LANGUAGE plpgsql AS $$
DECLARE
  v_price DECIMAL(18, 4);
BEGIN
  SELECT last_price INTO v_price FROM stock_realtime WHERE symbol = p_stock_code;
  RETURN COALESCE(v_price, 0);
END;
$$;

-- 获取股票涨停状态
CREATE OR REPLACE FUNCTION get_stock_limit_up_status(p_stock_code VARCHAR(20))
RETURNS TABLE(stock_code VARCHAR(20), is_limit_up BOOLEAN, limit_up_price DECIMAL(18, 4), current_price DECIMAL(18, 4))
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT p_stock_code::VARCHAR(20), FALSE::BOOLEAN, 0::DECIMAL(18, 4), 0::DECIMAL(18, 4);
END;
$$;

-- 清理过期缓存
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM market_data_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 批量处理订单
CREATE OR REPLACE FUNCTION process_batch_orders(p_batch_size INTEGER DEFAULT 100)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  processed INTEGER := 0;
BEGIN
  UPDATE trades SET status = 'FILLED', filled_at = NOW(), updated_at = NOW()
  WHERE status = 'SUBMITTED' AND is_trading_time() LIMIT p_batch_size;
  GET DIAGNOSTICS processed = ROW_COUNT;
  RETURN processed;
END;
$$;
