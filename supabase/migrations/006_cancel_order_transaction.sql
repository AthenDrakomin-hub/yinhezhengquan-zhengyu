-- =====================================================
-- 撤单事务函数迁移
-- 创建时间：2024
-- 描述：使用 PostgreSQL 事务保障撤单操作的原子性
-- =====================================================

-- 1. 创建撤单事务函数
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_trade_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trade RECORD;
  v_is_buy BOOLEAN;
  v_remaining_qty INTEGER;
  v_amount NUMERIC(20, 2);
  v_fee NUMERIC(20, 2);
  v_total_frozen NUMERIC(20, 2);
  v_refunded_amount NUMERIC(20, 2) := 0;
  v_refunded_quantity INTEGER := 0;
BEGIN
  -- 1. 锁定订单并检查状态
  SELECT * INTO v_trade 
  FROM public.trades 
  WHERE id = p_trade_id 
    AND user_id = p_user_id 
    AND status IN ('PENDING', 'MATCHING', 'PARTIAL', 'SUBMITTED')
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- 检查订单是否存在但不满足撤单条件
    SELECT * INTO v_trade FROM public.trades WHERE id = p_trade_id AND user_id = p_user_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('订单状态为 %s，不可撤销', v_trade.status)
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', '订单不存在或无权操作'
      );
    END IF;
  END IF;

  -- 2. 计算退款金额
  v_is_buy := v_trade.trade_type IN ('BUY', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP');
  v_remaining_qty := COALESCE(v_trade.remaining_quantity, v_trade.quantity);
  v_amount := v_trade.price * v_remaining_qty;
  v_fee := COALESCE(v_trade.fee, 0);

  -- 3. 删除撮合池记录
  DELETE FROM public.trade_match_pool WHERE trade_id = p_trade_id;

  -- 4. 处理退款
  IF v_is_buy THEN
    -- 买入订单：解冻资金
    v_total_frozen := v_amount + v_fee;
    
    UPDATE public.assets 
    SET 
      available_balance = available_balance + v_total_frozen,
      frozen_balance = frozen_balance - v_total_frozen,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    v_refunded_amount := v_total_frozen;
  ELSE
    -- 卖出订单：解冻持仓
    UPDATE public.positions 
    SET 
      available_quantity = available_quantity + v_remaining_qty,
      updated_at = NOW()
    WHERE user_id = p_user_id AND symbol = v_trade.stock_code;
    
    v_refunded_quantity := v_remaining_qty;
  END IF;

  -- 5. 更新订单状态
  UPDATE public.trades 
  SET 
    status = 'CANCELLED',
    finish_time = NOW(),
    updated_at = NOW()
  WHERE id = p_trade_id;

  -- 6. 记录操作日志（可选）
  INSERT INTO public.trade_logs (trade_id, user_id, action, details, created_at)
  VALUES (
    p_trade_id,
    p_user_id,
    'CANCEL',
    jsonb_build_object(
      'previous_status', v_trade.status,
      'refunded_amount', v_refunded_amount,
      'refunded_quantity', v_refunded_quantity
    ),
    NOW()
  )
  ON CONFLICT DO NOTHING;  -- 如果表不存在则忽略

  -- 7. 返回成功结果
  RETURN jsonb_build_object(
    'success', true,
    'refunded_amount', v_refunded_amount,
    'refunded_quantity', v_refunded_quantity,
    'previous_status', v_trade.status
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 回滚事务并返回错误
    RAISE NOTICE '撤单事务异常: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', '撤单失败：' || SQLERRM
    );
END;
$$;

-- 2. 添加函数注释
COMMENT ON FUNCTION public.cancel_order(UUID, UUID) IS 
'撤单事务函数 - 使用 PostgreSQL 事务保障撤单操作的原子性
参数：
  p_trade_id: 订单ID
  p_user_id: 用户ID
返回：
  success: 是否成功
  error: 错误信息（失败时）
  refunded_amount: 退款金额（买入订单）
  refunded_quantity: 退款数量（卖出订单）
可撤销状态：PENDING, MATCHING, PARTIAL, SUBMITTED';

-- 3. 授予执行权限
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, UUID) TO service_role;

-- 4. 创建辅助函数：获取当前价格（用于价格偏离验证）
CREATE OR REPLACE FUNCTION public.get_current_stock_price(p_stock_code VARCHAR(20))
RETURNS NUMERIC(20, 4)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_price NUMERIC(20, 4);
BEGIN
  -- 从股票行情表获取最新价格
  SELECT current_price INTO v_price
  FROM public.stock_quotes
  WHERE stock_code = p_stock_code
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- 如果没有实时价格，从股票基础信息表获取昨收价
  IF v_price IS NULL THEN
    SELECT prev_close INTO v_price
    FROM public.stocks
    WHERE stock_code = p_stock_code
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_price, 0);
END;
$$;

COMMENT ON FUNCTION public.get_current_stock_price(VARCHAR) IS 
'获取股票当前价格 - 用于价格偏离验证';

GRANT EXECUTE ON FUNCTION public.get_current_stock_price(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_stock_price(VARCHAR) TO service_role;

-- 5. 创建价格偏离验证函数
CREATE OR REPLACE FUNCTION public.validate_price_deviation(
  p_stock_code VARCHAR(20),
  p_order_price NUMERIC(20, 4),
  p_max_deviation NUMERIC(5, 4) DEFAULT 0.05  -- 默认5%
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_current_price NUMERIC(20, 4);
  v_deviation NUMERIC(10, 6);
  v_is_valid BOOLEAN;
BEGIN
  -- 获取当前价格
  v_current_price := public.get_current_stock_price(p_stock_code);
  
  -- 如果没有价格数据，允许交易
  IF v_current_price IS NULL OR v_current_price = 0 THEN
    RETURN jsonb_build_object(
      'valid', true,
      'current_price', 0,
      'deviation', 0,
      'message', '无法获取当前价格，允许交易'
    );
  END IF;
  
  -- 计算偏离度
  v_deviation := ABS(p_order_price - v_current_price) / v_current_price;
  v_is_valid := v_deviation <= p_max_deviation;
  
  RETURN jsonb_build_object(
    'valid', v_is_valid,
    'current_price', v_current_price,
    'order_price', p_order_price,
    'deviation', ROUND(v_deviation * 100, 2),  -- 百分比
    'max_deviation', p_max_deviation * 100,
    'message', CASE 
      WHEN v_is_valid THEN '价格正常'
      ELSE format('价格偏离 %.2f%%，超过阈值 %.2f%%', v_deviation * 100, p_max_deviation * 100)
    END
  );
END;
$$;

COMMENT ON FUNCTION public.validate_price_deviation(VARCHAR, NUMERIC, NUMERIC) IS 
'验证价格偏离度 - 用于下单前的价格校验';

GRANT EXECUTE ON FUNCTION public.validate_price_deviation(VARCHAR, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_price_deviation(VARCHAR, NUMERIC, NUMERIC) TO service_role;

-- 6. 更新订单状态约束（如果需要）
-- 注意：如果已有约束，可能需要先删除再重建
-- ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_status_check;
-- ALTER TABLE public.trades ADD CONSTRAINT trades_status_check 
--   CHECK (status IN ('PENDING', 'SUBMITTED', 'MATCHING', 'PARTIAL', 'SUCCESS', 'CANCELLED', 'FAILED', 'REJECTED'));

-- 7. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_status_created ON public.trades(status, created_at);
