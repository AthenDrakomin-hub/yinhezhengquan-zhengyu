-- ============================================================
-- 撮合引擎核心迁移（安全版本）
-- ============================================================
-- 只创建必要的表和视图，不依赖其他表
-- 在 Supabase Dashboard → SQL Editor 中执行
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

-- 插入默认配置
INSERT INTO app_config (key, value, description)
VALUES 
  ('project_url', 'https://kvlvbhzrrpspzaoiormt.supabase.co', 'Supabase 项目 URL')
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

-- ============================================================
-- 6. 创建交易时间检查函数
-- ============================================================

CREATE OR REPLACE FUNCTION is_trading_time()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_time TIME;
  v_current_weekday INTEGER;
BEGIN
  v_current_time := CURRENT_TIME;
  v_current_weekday := EXTRACT(DOW FROM CURRENT_DATE);
  
  -- 周末不交易
  IF v_current_weekday IN (0, 6) THEN
    RETURN FALSE;
  END IF;
  
  -- 交易时间段
  IF (v_current_time >= '09:30:00'::TIME AND v_current_time <= '11:30:00'::TIME) OR
     (v_current_time >= '13:00:00'::TIME AND v_current_time <= '15:00:00'::TIME) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ============================================================
-- 7. 为 match_logs 和 notifications 启用 Realtime
-- ============================================================

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE match_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 8. 验证
-- ============================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_name IN ('match_logs', 'app_config', 'notifications');
  
  RAISE NOTICE '创建了 %/3 个表', table_count;
END $$;

COMMIT;

-- ============================================================
-- 执行成功！
-- ============================================================
-- 
-- 下一步：
-- 1. 在 Dashboard → Settings → Edge Functions 设置:
--    PROJECT_URL=https://kvlvbhzrrpspzaoiormt.supabase.co
--    SERVICE_ROLE_KEY=<从 Settings → API 获取>
--
-- 2. 部署 match-orders Edge Function
--
-- 3. 如果需要为 trades 表启用 Realtime，请单独执行:
--    ALTER PUBLICATION supabase_realtime ADD TABLE trades;
-- ============================================================
