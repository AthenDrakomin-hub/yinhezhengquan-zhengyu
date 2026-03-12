-- pg_cron 定时任务配置
-- 需要先在 Supabase Dashboard 中启用 pg_cron 扩展
-- Database → Extensions → 搜索 "cron" → 启用

-- ============================================
-- 1. 确保扩展已启用（需要在 Dashboard 手动操作）
-- ============================================
-- 注意：以下命令需要超级管理员权限，在 Supabase Dashboard 中执行
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- 2. 定义定时任务
-- ============================================

-- 每分钟调用 sync-stock-data 同步股票基础数据
SELECT cron.schedule(
  'sync-stock-data-every-minute',
  '* * * * *', -- 每分钟执行
  $$
  SELECT
    net.http_post(
      url := 'https://你的项目ID.supabase.co/functions/v1/sync-stock-data',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer 你的服务角色密钥"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- 每分钟调用 sync-ipo 同步新股数据
SELECT cron.schedule(
  'sync-ipo-every-minute',
  '* * * * *', -- 每分钟执行
  $$
  SELECT
    net.http_post(
      url := 'https://你的项目ID.supabase.co/functions/v1/sync-ipo',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer 你的服务角色密钥"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- 每分钟调用 fetch-galaxy-news 同步新闻
SELECT cron.schedule(
  'fetch-galaxy-news-every-minute',
  '* * * * *', -- 每分钟执行
  $$
  SELECT
    net.http_post(
      url := 'https://你的项目ID.supabase.co/functions/v1/fetch-galaxy-news',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer 你的服务角色密钥"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- ============================================
-- 3. 管理定时任务的常用命令
-- ============================================

-- 查看所有定时任务
-- SELECT * FROM cron.job;

-- 查看任务执行历史
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- 取消某个定时任务
-- SELECT cron.unschedule('sync-stock-data-every-minute');

-- 修改定时任务（先取消再重新创建）
-- SELECT cron.unschedule('sync-stock-data-every-minute');
-- SELECT cron.schedule('sync-stock-data-every-minute', '*/5 * * * *', $$...$$);

-- ============================================
-- 4. 推荐的定时任务配置（根据实际需求调整）
-- ============================================

-- 建议：
-- 1. sync-stock-data：每分钟执行（实时性要求高）
-- 2. sync-ipo：每分钟执行（新股信息需要及时更新）
-- 3. fetch-galaxy-news：每分钟执行（新闻需要实时更新）

-- 如果对实时性要求不高，可以调整为：
-- - 每5分钟：'*/5 * * * *'
-- - 每小时：'0 * * * *'
-- - 每天凌晨：'0 0 * * *'

-- ============================================
-- 5. 注意事项
-- ============================================
-- 1. 需要替换 SQL 中的 "你的项目ID" 和 "你的服务角色密钥"
-- 2. 服务角色密钥可以在 Supabase Dashboard → Settings → API → service_role 找到
-- 3. pg_cron 扩展需要在 Database → Extensions 中手动启用
-- 4. 定时任务会消耗 Edge Function 调用配额，请根据实际需求调整频率
