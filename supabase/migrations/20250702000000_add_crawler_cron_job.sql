-- ============================================================
-- 添加 crawler 热点数据爬虫定时任务
-- ============================================================
-- 说明：
-- 1. 每30分钟执行一次 crawler Edge Function
-- 2. 爬取热点资讯、今日热点、财经日历、公社热帖
-- 3. 有去重机制，7天自动清理
-- 4. 预计存储量约150KB，占免费额度0.03%
-- ============================================================

-- 添加 crawler 定时任务（每30分钟）
SELECT cron.schedule(
  'crawler-hotspot-every-30min',
  '*/30 * * * *', -- 每30分钟执行
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/crawler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'x-trigger-source', 'scheduled'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================
-- 任务说明
-- ============================================
-- | 任务名称 | 频率 | 每天执行次数 | 数据特性 |
-- |----------|------|-------------|----------|
-- | crawler-hotspot-every-30min | 每30分钟 | 48次 | 去重+7天清理 |
--
-- 数据量预估：
-- - 每次爬取约 50 条热点资讯 + 20 条今日热点 + 50 条财经日历 + 50 条公社热帖
-- - 去重后实际存储约 150KB
-- - 免费额度 500MB，占用 0.03%
--
-- 注意：
-- 1. 请替换 YOUR_PROJECT_ID 和 YOUR_SERVICE_ROLE_KEY
-- 2. 可通过以下命令验证任务状态：
--    SELECT * FROM cron.job WHERE name = 'crawler-hotspot-every-30min';
-- 3. 查看执行历史：
--    SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE name = 'crawler-hotspot-every-30min') ORDER BY start_time DESC LIMIT 10;
