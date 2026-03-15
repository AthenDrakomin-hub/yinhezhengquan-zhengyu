-- ========================================================
-- IPO 自动同步配置迁移
-- 版本: v1.1
-- 功能: 
--   1. 确保 ipo_sync_history 表存在
--   2. 创建 v_ipo_sync_status 视图
--   3. 创建 trigger_ipo_sync 函数
--   4. 配置 pg_cron 定时任务（如果可用）
-- ========================================================

-- ==========================================================
-- 1. 确保 ipo_sync_history 表存在
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.ipo_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_time TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
    total_count INTEGER DEFAULT 0,
    new_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    error_message TEXT,
    triggered_by TEXT NOT NULL CHECK (triggered_by IN ('manual', 'scheduled', 'auto')),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipo_sync_history_time ON public.ipo_sync_history(sync_time DESC);
CREATE INDEX IF NOT EXISTS idx_ipo_sync_history_status ON public.ipo_sync_history(status);

-- RLS 策略
ALTER TABLE public.ipo_sync_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_admin_read_ipo_sync_history" ON public.ipo_sync_history;
CREATE POLICY "allow_admin_read_ipo_sync_history" ON public.ipo_sync_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "allow_public_read_ipo_sync_history" ON public.ipo_sync_history;
CREATE POLICY "allow_public_read_ipo_sync_history" ON public.ipo_sync_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_service_role_manage_ipo_sync_history" ON public.ipo_sync_history;
CREATE POLICY "allow_service_role_manage_ipo_sync_history" ON public.ipo_sync_history FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ==========================================================
-- 2. 创建/更新 v_ipo_sync_status 视图
-- ==========================================================

CREATE OR REPLACE VIEW public.v_ipo_sync_status AS
SELECT 
    id,
    sync_time,
    status,
    total_count,
    triggered_by,
    error_message,
    duration_ms,
    EXTRACT(EPOCH FROM (NOW() - sync_time)) / 3600 as hours_ago
FROM public.ipo_sync_history
ORDER BY sync_time DESC
LIMIT 10;

-- 授权
GRANT SELECT ON public.v_ipo_sync_status TO authenticated;
GRANT SELECT ON public.v_ipo_sync_status TO anon;

COMMENT ON VIEW public.v_ipo_sync_status IS 'IPO 同步状态视图，显示最近 10 条记录';

-- ==========================================================
-- 3. 启用扩展（如果可用）
-- ==========================================================

-- pg_cron: 用于定时任务
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- pg_net: 用于 HTTP 请求（可能在某些 Supabase 项目中不可用）
-- 如果失败，可以忽略
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_net CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_net 扩展不可用，将使用外部定时服务';
    END;
END $$;

-- ==========================================================
-- 4. 创建触发 IPO 同步的函数
-- ==========================================================

CREATE OR REPLACE FUNCTION public.trigger_ipo_sync()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 尝试使用 pg_net 发送异步 HTTP 请求
    -- 如果 pg_net 不可用，函数会抛出异常
    BEGIN
        PERFORM net.http_post(
            url := 'https://kvlvbhzrrpspzaoiormt.supabase.co/functions/v1/sync-ipo',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-api-key', 'yinhe-ipo-sync-2024',
                'x-trigger-source', 'scheduled'
            ),
            body := '{}'::jsonb
        );
        
        -- 记录触发日志
        INSERT INTO public.ipo_sync_history (status, total_count, triggered_by)
        VALUES ('partial', 0, 'scheduled');
        
        RETURN 'IPO 同步已触发（通过 pg_net）';
    EXCEPTION WHEN OTHERS THEN
        -- pg_net 不可用，返回提示信息
        RETURN '请使用外部定时服务调用 Edge Function';
    END;
END;
$$;

COMMENT ON FUNCTION public.trigger_ipo_sync() IS '触发 IPO 数据同步 Edge Function';

-- ==========================================================
-- 5. 配置 pg_cron 定时任务（如果可用）
-- ==========================================================

-- 删除已存在的定时任务
SELECT cron.unschedule('ipo-daily-sync') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ipo-daily-sync'
);

-- 创建新的定时任务（每天 UTC 00:00 = 北京时间 08:00）
-- 注意：这需要 pg_cron 在当前数据库中正确配置
DO $$
BEGIN
    BEGIN
        PERFORM cron.schedule(
            'ipo-daily-sync',
            '0 0 * * *',
            $$SELECT public.trigger_ipo_sync()$$
        );
        RAISE NOTICE '定时任务 ipo-daily-sync 已创建';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '无法创建定时任务，请使用 Supabase Dashboard 或外部服务';
    END;
END $$;

-- ==========================================================
-- 使用说明
-- ==========================================================

-- 【方案一：Supabase Dashboard Cron Jobs】
-- 
-- 1. 进入 Database → Cron Jobs
-- 2. 创建新任务：
--    - 名称: ipo-daily-sync
--    - 调度: 0 0 * * * (每天 UTC 00:00)
--    - 命令: 
--      SELECT net.http_post(
--          url := 'https://kvlvbhzrrpspzaoiormt.supabase.co/functions/v1/sync-ipo',
--          headers := '{"Content-Type": "application/json", "x-api-key": "yinhe-ipo-sync-2024"}'::jsonb,
--          body := '{}'::jsonb
--      );

-- 【方案二：外部定时服务】
-- 
-- GitHub Actions / Vercel Cron Jobs
-- 调用: curl -X POST -H "x-api-key: yinhe-ipo-sync-2024" 
--       https://kvlvbhzrrpspzaoiormt.supabase.co/functions/v1/sync-ipo

-- 【查询命令】
-- 
-- 查看同步历史: SELECT * FROM v_ipo_sync_status;
-- 查看 IPO 数据: SELECT COUNT(*) FROM ipos;
-- 手动触发同步: SELECT trigger_ipo_sync();
-- 查看定时任务: SELECT * FROM cron.job WHERE jobname = 'ipo-daily-sync';
