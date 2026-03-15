-- ============================================================
-- 撮合引擎定时任务配置
-- ============================================================
-- 功能：每分钟触发撮合引擎，处理待撮合订单
-- 前置条件：
-- 1. pg_cron 和 pg_net 扩展已启用
-- 2. match-orders Edge Function 已部署
-- 3. 设置环境变量：PROJECT_URL 和 SERVICE_ROLE_KEY
-- ============================================================

BEGIN;

-- ============================================
-- 1. 创建撮合引擎定时任务
-- ============================================

-- 任务：每分钟触发撮合引擎
-- 说明：在交易时间内（9:30-11:30, 13:00-15:00）每分钟执行一次撮合
SELECT cron.schedule(
  'match-orders-every-minute',
  '* * * * *', -- 每分钟执行
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.project_url', true) || '/functions/v1/match-orders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'x-trigger-source', 'scheduled'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================
-- 2. 创建交易时间检查函数（可选优化）
-- ============================================

-- 创建函数：判断当前是否在交易时间
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
  
  -- 交易时间段：
  -- 上午：9:30 - 11:30
  -- 下午：13:00 - 15:00
  IF (current_time >= '09:30:00'::TIME AND current_time <= '11:30:00'::TIME) OR
     (current_time >= '13:00:00'::TIME AND current_time <= '15:00:00'::TIME) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ============================================
-- 3. 创建优化版定时任务（仅交易时间执行）
-- ============================================

-- 取消之前的任务，改用交易时间检查
-- SELECT cron.unschedule('match-orders-every-minute');

-- 创建带时间检查的任务
SELECT cron.schedule(
  'match-orders-trading-time',
  '* * * * *', -- 每分钟执行，但函数内部会检查时间
  $$
  SELECT
    CASE WHEN is_trading_time() THEN
      net.http_post(
        url := current_setting('app.settings.project_url', true) || '/functions/v1/match-orders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
          'x-trigger-source', 'scheduled'
        ),
        body := '{}'::jsonb
      )
    ELSE
      NULL
    END;
  $$
);

-- ============================================
-- 4. 创建清理任务
-- ============================================

-- 任务：每天凌晨清理过期的撮合日志（保留30天）
SELECT cron.schedule(
  'cleanup-match-logs-daily',
  '0 2 * * *', -- 每天凌晨2点执行
  $$
  DELETE FROM match_logs WHERE started_at < NOW() - INTERVAL '30 days';
  $$
);

-- 任务：每天凌晨清理过期的撮合池记录
SELECT cron.schedule(
  'cleanup-match-pool-daily',
  '0 2 * * *', -- 每天凌晨2点执行
  $$
  -- 清理已完成超过7天的记录
  DELETE FROM trade_match_pool 
  WHERE status = 'COMPLETED' 
    AND updated_at < NOW() - INTERVAL '7 days';
  $$
);

-- ============================================
-- 5. 创建撮合统计视图
-- ============================================

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

-- ============================================
-- 6. 创建实时撮合监控视图
-- ============================================

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

-- ============================================
-- 7. 环境变量配置
-- ============================================

-- 创建应用配置表（如果不存在）
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入配置项（需要替换为实际值）
INSERT INTO app_config (key, value, description)
VALUES 
  ('project_url', 'https://YOUR_PROJECT_ID.supabase.co', 'Supabase 项目 URL'),
  ('service_role_key', 'YOUR_SERVICE_ROLE_KEY', 'Supabase 服务角色密钥')
ON CONFLICT (key) DO NOTHING;

-- 创建设置获取函数
CREATE OR REPLACE FUNCTION get_app_config(key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT value INTO result FROM app_config WHERE app_config.key = key;
  RETURN result;
END;
$$;

-- ============================================
-- 8. 创建简化调用函数
-- ============================================

CREATE OR REPLACE FUNCTION trigger_match_orders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response JSON;
BEGIN
  -- 调用撮合引擎
  SELECT INTO response
    net.http_post(
      url := get_app_config('project_url') || '/functions/v1/match-orders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_app_config('service_role_key')
      ),
      body := '{}'::jsonb
    );
  
  RETURN response;
END;
$$;

COMMENT ON FUNCTION trigger_match_orders IS '手动触发撮合引擎';

-- ============================================
-- 9. 管理命令
-- ============================================

-- 查看所有定时任务
-- SELECT jobid, name, schedule, active FROM cron.job WHERE name LIKE '%match%';

-- 查看撮合任务执行历史
-- SELECT * FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE name LIKE '%match%') ORDER BY start_time DESC LIMIT 20;

-- 手动触发撮合（测试用）
-- SELECT trigger_match_orders();

-- 查看撮合统计
-- SELECT * FROM match_statistics LIMIT 7;

-- 查看实时撮合状态
-- SELECT * FROM match_status_realtime;

-- 暂停撮合任务
-- UPDATE cron.job SET active = false WHERE name = 'match-orders-trading-time';

-- 恢复撮合任务
-- UPDATE cron.job SET active = true WHERE name = 'match-orders-trading-time';

-- 取消撮合任务
-- SELECT cron.unschedule('match-orders-trading-time');

COMMIT;

-- ============================================
-- 10. 部署说明
-- ============================================
-- 
-- 步骤1：确保 pg_cron 和 pg_net 扩展已启用
-- 在 SQL Editor 中执行：
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- 步骤2：设置环境变量
-- 方式A（推荐）：在 Supabase Dashboard 设置 Edge Functions 环境变量
-- 方式B：更新 app_config 表中的值
-- UPDATE app_config SET value = 'https://你的项目ID.supabase.co' WHERE key = 'project_url';
-- UPDATE app_config SET value = '你的服务角色密钥' WHERE key = 'service_role_key';
--
-- 步骤3：部署 Edge Function
-- supabase functions deploy match-orders
--
-- 步骤4：验证任务
-- SELECT * FROM cron.job WHERE name LIKE '%match%';
-- SELECT trigger_match_orders(); -- 手动测试
--
-- 步骤5：监控
-- SELECT * FROM match_statistics;
-- SELECT * FROM match_status_realtime;
