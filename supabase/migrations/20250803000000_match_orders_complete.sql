-- ============================================================
-- 撮合引擎完整部署 SQL
-- ============================================================
-- 执行方式：在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================================

BEGIN;

-- ============================================================
-- 1. 创建撮合日志表
-- ============================================================

CREATE TABLE IF NOT EXISTS match_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  total_orders INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  partial_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  details JSONB DEFAULT '[]'
);

COMMENT ON TABLE match_logs IS '撮合引擎日志表';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_match_logs_batch ON match_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_status ON match_logs(status);
CREATE INDEX IF NOT EXISTS idx_match_logs_started ON match_logs(started_at DESC);

-- ============================================================
-- 2. 创建撮合统计视图
-- ============================================================

CREATE OR REPLACE VIEW match_statistics AS
SELECT
  DATE(started_at) as match_date,
  COUNT(*) as total_batches,
  SUM(total_orders) as total_orders,
  SUM(matched_count) as total_matched,
  SUM(failed_count) as total_failed,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms
FROM match_logs
WHERE status = 'COMPLETED'
GROUP BY DATE(started_at)
ORDER BY match_date DESC;

COMMENT ON VIEW match_statistics IS '撮合统计视图';

-- ============================================================
-- 3. 创建实时撮合监控视图
-- ============================================================

CREATE OR REPLACE VIEW match_status_realtime AS
SELECT
  batch_id,
  status,
  total_orders,
  matched_count,
  failed_count,
  started_at,
  finished_at,
  duration_ms,
  error_message
FROM match_logs
WHERE started_at > NOW() - INTERVAL '1 hour'
ORDER BY started_at DESC;

COMMENT ON VIEW match_status_realtime IS '最近1小时的撮合状态';

-- ============================================================
-- 4. 创建应用配置表
-- ============================================================

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE app_config IS '应用配置表';

-- 插入默认配置（需要替换为实际值）
INSERT INTO app_config (key, value, description)
VALUES 
  ('project_url', 'https://kvlvbhzrrpspzaoiormt.supabase.co', 'Supabase 项目 URL'),
  ('service_role_key', 'YOUR_SERVICE_ROLE_KEY', 'Supabase 服务角色密钥')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 5. 创建通知表
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

COMMENT ON TABLE notifications IS '通知表';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DO $$ BEGIN
    CREATE POLICY "Users can view own notifications" 
      ON notifications FOR SELECT 
      USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own notifications" 
      ON notifications FOR UPDATE 
      USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access notifications" 
      ON notifications FOR ALL 
      USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 6. 启用 Realtime 发布
-- ============================================================

-- 为 trades 表启用 Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trades;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 为 trade_executions 表启用 Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trade_executions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 为 notifications 表启用 Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 为 match_logs 表启用 Realtime（监控用）
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE match_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 7. 创建通知触发器
-- ============================================================

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只在状态变化时插入通知
  IF NEW.status <> OLD.status THEN
    INSERT INTO notifications (user_id, type, title, content, data)
    VALUES (
      NEW.user_id,
      'ORDER_STATUS_CHANGE',
      '订单状态更新',
      format('您的订单 %s(%s) 状态已更新为 %s', NEW.stock_name, NEW.stock_code, NEW.status),
      jsonb_build_object(
        'trade_id', NEW.id,
        'stock_code', NEW.stock_code,
        'stock_name', NEW.stock_name,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 创建触发器
DO $$ BEGIN
    CREATE TRIGGER trades_status_notify
      AFTER UPDATE ON trades
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION notify_order_status_change();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 8. 创建定时任务函数
-- ============================================================

-- 创建交易时间检查函数
CREATE OR REPLACE FUNCTION is_trading_time()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_time TIME;
  current_weekday INTEGER;
BEGIN
  -- 获取当前时间和星期
  current_time := CURRENT_TIME;
  current_weekday := EXTRACT(DOW FROM CURRENT_DATE);
  
  -- 周末不交易
  IF current_weekday IN (0, 6) THEN
    RETURN FALSE;
  END IF;
  
  -- 交易时间段
  IF (current_time >= '09:30:00'::TIME AND current_time <= '11:30:00'::TIME) OR
     (current_time >= '13:00:00'::TIME AND current_time <= '15:00:00'::TIME) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 创建手动触发撮合的函数
CREATE OR REPLACE FUNCTION trigger_match_orders()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response JSONB;
BEGIN
  -- 调用 Edge Function
  SELECT net.http_post(
    url := current_setting('app.settings.project_url', true) || '/functions/v1/match-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) INTO response;
  
  RETURN response::TEXT;
END;
$$;

-- ============================================================
-- 9. 配置 pg_cron 定时任务（需要启用 pg_cron 扩展）
-- ============================================================

-- 注意：以下命令需要先在 Dashboard 中启用 pg_cron 扩展
-- Dashboard → Database → Extensions → 搜索 pg_cron → Enable

-- 撮合引擎定时任务（每分钟执行）
-- 取消注释以启用
/*
SELECT cron.schedule(
  'match-orders-trading-time',
  '* * * * *',
  $$
  SELECT
    CASE WHEN is_trading_time() THEN
      net.http_post(
        url := current_setting('app.settings.project_url', true) || '/functions/v1/match-orders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      )
    ELSE NULL
    END;
  $$
);
*/

-- 清理过期通知（每天凌晨3点）
-- 取消注释以启用
/*
SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 3 * * *',
  $$DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW();$$
);
*/

-- 清理撮合日志（保留30天）
-- 取消注释以启用
/*
SELECT cron.schedule(
  'cleanup-match-logs-daily',
  '0 2 * * *',
  $$DELETE FROM match_logs WHERE started_at < NOW() - INTERVAL '30 days';$$
);
*/

-- ============================================================
-- 10. 验证
-- ============================================================

-- 验证表创建
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_name IN ('match_logs', 'app_config', 'notifications');
  
  IF table_count = 3 THEN
    RAISE NOTICE '✓ 所有表创建成功';
  ELSE
    RAISE NOTICE '⚠ 部分表创建失败，请检查';
  END IF;
END $$;

-- 验证视图创建
DO $$
DECLARE
  view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views 
  WHERE table_name IN ('match_statistics', 'match_status_realtime');
  
  IF view_count = 2 THEN
    RAISE NOTICE '✓ 所有视图创建成功';
  ELSE
    RAISE NOTICE '⚠ 部分视图创建失败，请检查';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- 部署完成
-- ============================================================
-- 
-- 下一步：
-- 1. 在 Dashboard → Settings → Edge Functions 设置环境变量:
--    - PROJECT_URL=https://kvlvbhzrrpspzaoiormt.supabase.co
--    - SERVICE_ROLE_KEY=<从 Settings → API 获取>
--
-- 2. 部署 Edge Function:
--    方式1: supabase functions deploy match-orders
--    方式2: 在 Dashboard 中手动创建函数
--
-- 3. 启用 pg_cron 扩展并取消注释定时任务配置
--
-- 详细文档: docs/MATCH_ORDERS_QUICK_START.md
-- ============================================================
