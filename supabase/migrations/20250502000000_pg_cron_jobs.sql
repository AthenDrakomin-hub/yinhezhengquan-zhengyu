-- ============================================================
-- pg_cron 定时任务配置
-- ============================================================
-- 前置条件：
-- 1. 在 Supabase Dashboard → Database → Extensions 中启用 pg_cron
-- 2. 确保 pg_net 扩展也已启用（用于 HTTP 请求）
--
-- 使用方式：
-- 方式一：在 Supabase SQL Editor 中逐条执行
-- 方式二：作为迁移文件部署
--
-- 重要提示：
-- - 请替换下面的 YOUR_PROJECT_ID 和 YOUR_SERVICE_ROLE_KEY
-- - SERVICE_ROLE_KEY 可在 Dashboard → Settings → API 中找到
-- - 定时任务会消耗 Edge Function 调用配额
-- ============================================================

-- ============================================
-- 1. 检查扩展状态
-- ============================================
-- 确认扩展已启用（在 SQL Editor 中执行）
-- SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- ============================================
-- 2. 环境变量配置（推荐方式）
-- ============================================
-- 为了避免在 SQL 中硬编码敏感信息，建议：
-- 1. 在 Supabase Dashboard → Settings → Edge Functions 中设置环境变量
--    - PROJECT_URL: https://你的项目ID.supabase.co
--    - SERVICE_ROLE_KEY: 你的服务角色密钥
-- 2. 在函数内部通过 Deno.env.get() 读取

-- ============================================
-- 3. 定时任务定义
-- ============================================

-- 任务1：同步股票基础数据（每5分钟）
-- 说明：同步热门股票和用户自选股的基础信息
SELECT cron.schedule(
  'sync-stock-data-every-5min',
  '*/5 * * * *', -- 每5分钟执行
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-stock-data',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'x-trigger-source', 'scheduled'
      ),
      body := '{"action": "sync_all"}'::jsonb
    );
  $$
);

-- 任务2：同步新股发行数据（每天早8点）
-- 说明：新股数据更新频率低，每天同步一次即可
SELECT cron.schedule(
  'sync-ipo-daily',
  '0 8 * * *', -- 每天早8点执行
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-ipo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'x-trigger-source', 'scheduled'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 任务3：刷新新闻缓存（每30分钟）
-- 说明：新闻数据更新频率适中，30分钟刷新一次
SELECT cron.schedule(
  'fetch-galaxy-news-every-30min',
  '*/30 * * * *', -- 每30分钟执行
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/fetch-galaxy-news',
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
-- 4. 管理命令
-- ============================================

-- 查看所有定时任务
-- SELECT jobid, name, schedule, command, nodename, nodeport, database, username, active FROM cron.job;

-- 查看任务执行历史（最近20条）
-- SELECT jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time 
-- FROM cron.job_run_details 
-- ORDER BY start_time DESC 
-- LIMIT 20;

-- 取消某个定时任务
-- SELECT cron.unschedule('sync-stock-data-every-5min');

-- 暂停/恢复任务
-- UPDATE cron.job SET active = false WHERE name = 'sync-stock-data-every-5min';
-- UPDATE cron.job SET active = true WHERE name = 'sync-stock-data-every-5min';

-- ============================================
-- 5. 定时任务频率说明
-- ============================================
-- Cron 表达式格式：分 时 日 月 周
-- 
-- 常用表达式：
-- '* * * * *'     - 每分钟（不推荐，消耗配额）
-- '*/5 * * * *'   - 每5分钟
-- '*/15 * * * *'  - 每15分钟
-- '*/30 * * * *'  - 每30分钟
-- '0 * * * *'     - 每小时整点
-- '0 */2 * * *'   - 每2小时
-- '0 8 * * *'     - 每天早8点
-- '0 18 * * 1-5'  - 工作日下午6点
-- '0 0 * * *'     - 每天凌晨
-- '0 2 * * 0'     - 每周日凌晨2点

-- ============================================
-- 6. 推荐配置
-- ============================================
-- 根据数据更新频率和业务需求，建议：
-- 
-- | 任务 | 推荐频率 | 原因 |
-- |------|---------|------|
-- | sync-stock-data | 每5分钟 | 股票信息需要保持较新 |
-- | sync-ipo | 每天1次 | 新股数据更新频率低 |
-- | fetch-galaxy-news | 每30分钟 | 新闻更新频率适中 |
--
-- 注意：
-- 1. 频率越高，Edge Function 调用配额消耗越大
-- 2. 非交易时间可以考虑降低频率
-- 3. 可以在函数内部检查交易时间，非交易时间跳过处理

-- ============================================
-- 7. 替代方案：外部定时器
-- ============================================
-- 如果 pg_cron 不可用或有限制，可以使用外部服务：
-- 
-- 1. Vercel Cron Jobs
--    在 vercel.json 中配置：
--    {
--      "crons": [{
--        "path": "/api/cron/sync-stock",
--        "schedule": "*/5 * * * *"
--      }]
--    }
--
-- 2. GitHub Actions
--    创建 .github/workflows/sync.yml：
--    on:
--      schedule:
--        - cron: '*/5 * * * *'
--    jobs:
--      sync:
--        runs-on: ubuntu-latest
--        steps:
--          - name: Trigger sync
--            run: curl -X POST ${{ secrets.SYNC_URL }}
--
-- 3. 外部监控服务
--    使用 UptimeRobot、Cron-job.org 等服务定时调用 Webhook
