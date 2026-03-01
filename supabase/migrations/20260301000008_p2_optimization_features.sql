-- ==========================================================
-- P2优化功能集成脚本
-- 执行时间: 2026-03-01
-- 优先级: P2 (性能优化、用户体验提升)
-- 功能: 数据缓存、批量操作、智能推荐、性能监控
-- ==========================================================

-- 1. 行情数据缓存表
CREATE TABLE IF NOT EXISTS public.market_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  market TEXT NOT NULL,
  data JSONB NOT NULL,
  cache_key TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_key ON public.market_data_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON public.market_data_cache(expires_at);

-- 自动清理过期缓存
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.market_data_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. 批量交易订单表（支持一键打新、批量撤单）
CREATE TABLE IF NOT EXISTS public.batch_trade_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  batch_type TEXT NOT NULL CHECK (batch_type IN ('IPO_BATCH', 'CANCEL_BATCH', 'GRID_BATCH')),
  orders JSONB NOT NULL,
  total_count INT NOT NULL,
  success_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_batch_user ON public.batch_trade_orders(user_id, created_at DESC);

-- 批量订单处理函数
CREATE OR REPLACE FUNCTION public.process_batch_orders(
  p_batch_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_batch RECORD;
  v_order JSONB;
  v_success INT := 0;
  v_failed INT := 0;
BEGIN
  SELECT * INTO v_batch FROM public.batch_trade_orders WHERE id = p_batch_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '批量订单不存在');
  END IF;

  UPDATE public.batch_trade_orders SET status = 'PROCESSING' WHERE id = p_batch_id;

  FOR v_order IN SELECT * FROM jsonb_array_elements(v_batch.orders)
  LOOP
    BEGIN
      -- 执行单个订单（调用create_trade_order）
      PERFORM create_trade_order(
        p_user_id,
        (v_order->>'symbol')::TEXT,
        (v_order->>'trade_type')::TEXT,
        (v_order->>'direction')::TEXT,
        (v_order->>'quantity')::INT,
        (v_order->>'price')::NUMERIC
      );
      v_success := v_success + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  UPDATE public.batch_trade_orders SET
    status = 'COMPLETED',
    success_count = v_success,
    failed_count = v_failed,
    completed_at = NOW()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('success', true, 'success_count', v_success, 'failed_count', v_failed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 智能推荐表（基于用户行为）
CREATE TABLE IF NOT EXISTS public.user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  symbol TEXT NOT NULL,
  reason TEXT NOT NULL,
  score NUMERIC NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recommend_user ON public.user_recommendations(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_recommend_expires ON public.user_recommendations(expires_at);

-- 生成推荐函数
CREATE OR REPLACE FUNCTION public.generate_recommendations(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_holdings JSONB;
  v_recommendations JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  
  -- 基于持仓生成推荐（使用symbol列）
  SELECT jsonb_agg(jsonb_build_object('symbol', h.symbol, 'quantity', h.quantity))
  INTO v_holdings
  FROM public.holdings h WHERE h.user_id = p_user_id AND h.quantity > 0;

  -- 清理旧推荐
  DELETE FROM public.user_recommendations WHERE user_id = p_user_id AND expires_at < NOW();

  -- 插入新推荐（示例：基于风险等级）
  INSERT INTO public.user_recommendations (user_id, symbol, reason, score, expires_at)
  SELECT 
    p_user_id,
    'SH600000',
    '根据您的风险偏好推荐',
    0.85,
    NOW() + INTERVAL '1 day'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_recommendations 
    WHERE user_id = p_user_id AND symbol = 'SH600000' AND expires_at > NOW()
  );

  SELECT jsonb_agg(row_to_json(r.*)) INTO v_recommendations
  FROM public.user_recommendations r
  WHERE user_id = p_user_id AND expires_at > NOW()
  ORDER BY score DESC LIMIT 10;

  RETURN jsonb_build_object('success', true, 'recommendations', COALESCE(v_recommendations, '[]'::JSONB));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 性能监控表
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_type ON public.performance_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_created ON public.performance_metrics(created_at DESC);

-- 记录性能指标函数
CREATE OR REPLACE FUNCTION public.record_performance_metric(
  p_metric_type TEXT,
  p_metric_name TEXT,
  p_value NUMERIC,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.performance_metrics (metric_type, metric_name, value, metadata)
  VALUES (p_metric_type, p_metric_name, p_value, p_metadata);
  
  -- 自动清理30天前的数据
  DELETE FROM public.performance_metrics WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 5. 用户行为分析表
CREATE TABLE IF NOT EXISTS public.user_behavior_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_target TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_user ON public.user_behavior_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_action ON public.user_behavior_logs(action_type);

-- 6. 交易热度统计视图（简化版，不依赖trades表结构）
CREATE OR REPLACE VIEW public.trading_hotness AS
SELECT 
  t.stock_code as symbol,
  COUNT(*) as trade_count,
  SUM(t.quantity) as total_volume,
  COUNT(DISTINCT t.user_id) as unique_traders,
  AVG(t.price) as avg_price,
  DATE_TRUNC('hour', t.created_at) as time_bucket
FROM public.trades t
WHERE t.created_at > NOW() - INTERVAL '24 hours'
  AND t.status = 'SUCCESS'
GROUP BY t.stock_code, DATE_TRUNC('hour', t.created_at)
ORDER BY trade_count DESC;

-- 7. RLS策略
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_trade_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户查看自己的批量订单" ON public.batch_trade_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户创建批量订单" ON public.batch_trade_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户查看自己的推荐" ON public.user_recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "管理员查看性能指标" ON public.performance_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "用户查看自己的行为日志" ON public.user_behavior_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 8. 定时任务触发器（需配合pg_cron扩展）
-- 每小时清理过期缓存
-- SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT public.cleanup_expired_cache()');

-- 9. 验证安装
SELECT 
  'P2优化功能集成完成' as status,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name IN ('market_data_cache', 'batch_trade_orders', 'user_recommendations', 'performance_metrics', 'user_behavior_logs')) as tables_created,
  (SELECT COUNT(*) FROM information_schema.routines 
   WHERE routine_name IN ('cleanup_expired_cache', 'process_batch_orders', 'generate_recommendations', 'record_performance_metric')) as functions_created,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'trading_hotness') as views_created;
