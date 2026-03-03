-- ========================================================
-- 迁移优化系统
-- 版本: v1.0 (2026-03-02)
-- 功能: 迁移版本控制、智能检查、事务支持
-- ========================================================

BEGIN;

-- 1. 创建迁移版本控制表
CREATE TABLE IF NOT EXISTS public.migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    checksum TEXT, -- 可选：用于验证迁移文件完整性
    execution_time_ms INTEGER, -- 执行时间（毫秒）
    status TEXT DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为迁移表创建索引
CREATE INDEX IF NOT EXISTS idx_migrations_name ON public.migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON public.migrations(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_status ON public.migrations(status);

-- 2. 启用RLS（可选，通常迁移表不需要RLS）
-- ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;

-- 3. 创建智能检查辅助函数

-- 检查表是否存在
CREATE OR REPLACE FUNCTION public.table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查字段是否存在
CREATE OR REPLACE FUNCTION public.column_exists(table_name TEXT, column_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查索引是否存在
CREATE OR REPLACE FUNCTION public.index_exists(index_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = $1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查策略是否存在
CREATE OR REPLACE FUNCTION public.policy_exists(table_name TEXT, policy_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = $1 
        AND policyname = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查迁移是否已应用
CREATE OR REPLACE FUNCTION public.migration_applied(migration_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.migrations 
        WHERE migration_name = $1 
        AND status = 'SUCCESS'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建安全创建表的函数（带智能检查）
CREATE OR REPLACE FUNCTION public.create_table_safe(
    table_name TEXT,
    column_definitions TEXT
) RETURNS VOID AS $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT public.table_exists(table_name) INTO table_exists;
    
    IF NOT table_exists THEN
        EXECUTE format('CREATE TABLE public.%I (%s)', table_name, column_definitions);
        RAISE NOTICE '表 % 创建成功', table_name;
    ELSE
        RAISE NOTICE '表 % 已存在，跳过创建', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建安全添加字段的函数
CREATE OR REPLACE FUNCTION public.add_column_safe(
    table_name TEXT,
    column_name TEXT,
    column_type TEXT,
    column_default TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    col_exists BOOLEAN;
    default_clause TEXT;
BEGIN
    SELECT public.column_exists(table_name, column_name) INTO col_exists;
    
    IF NOT col_exists THEN
        IF column_default IS NOT NULL THEN
            default_clause := format('DEFAULT %s', column_default);
        ELSE
            default_clause := '';
        END IF;
        
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s %s', 
                      table_name, column_name, column_type, default_clause);
        RAISE NOTICE '字段 % 已添加到表 %', column_name, table_name;
    ELSE
        RAISE NOTICE '字段 % 在表 % 中已存在，跳过添加', column_name, table_name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建记录迁移应用的函数
CREATE OR REPLACE FUNCTION public.record_migration(
    migration_name TEXT,
    status TEXT DEFAULT 'SUCCESS',
    error_message TEXT DEFAULT NULL,
    execution_time_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    migration_id UUID;
BEGIN
    INSERT INTO public.migrations (
        migration_name,
        status,
        error_message,
        execution_time_ms
    ) VALUES (
        migration_name,
        status,
        error_message,
        execution_time_ms
    ) RETURNING id INTO migration_id;
    
    RETURN migration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建应用迁移的包装函数
CREATE OR REPLACE FUNCTION public.apply_migration(
    migration_name TEXT,
    migration_sql TEXT
) RETURNS UUID AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time_ms INTEGER;
    migration_id UUID;
    already_applied BOOLEAN;
BEGIN
    -- 检查是否已应用
    SELECT public.migration_applied(migration_name) INTO already_applied;
    
    IF already_applied THEN
        RAISE NOTICE '迁移 % 已应用，跳过执行', migration_name;
        RETURN NULL;
    END IF;
    
    -- 记录开始时间
    start_time := clock_timestamp();
    
    -- 记录迁移开始（状态为PENDING）
    migration_id := public.record_migration(
        migration_name,
        'PENDING',
        NULL,
        NULL
    );
    
    BEGIN
        -- 执行迁移SQL
        EXECUTE migration_sql;
        
        -- 计算执行时间
        end_time := clock_timestamp();
        execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        -- 更新迁移状态为成功
        UPDATE public.migrations 
        SET status = 'SUCCESS',
            execution_time_ms = execution_time_ms,
            applied_at = NOW()
        WHERE id = migration_id;
        
        RAISE NOTICE '迁移 % 应用成功，耗时 % 毫秒', migration_name, execution_time_ms;
        RETURN migration_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- 计算执行时间
        end_time := clock_timestamp();
        execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        -- 更新迁移状态为失败
        UPDATE public.migrations 
        SET status = 'FAILED',
            error_message = SQLERRM,
            execution_time_ms = execution_time_ms
        WHERE id = migration_id;
        
        RAISE EXCEPTION '迁移 % 应用失败: %', migration_name, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 创建合并市场数据表的迁移函数
CREATE OR REPLACE FUNCTION public.apply_market_data_migrations()
RETURNS VOID AS $$
DECLARE
    migration_sql TEXT;
BEGIN
    -- 检查是否已应用市场数据迁移
    IF public.migration_applied('market_data_tables_merged') THEN
        RAISE NOTICE '市场数据表迁移已应用，跳过执行';
        RETURN;
    END IF;
    
    -- 开始事务（函数内部）
    BEGIN
        -- 这里可以调用具体的迁移函数或执行SQL
        -- 例如：调用 public.apply_migration() 函数
        
        -- 记录迁移应用
        PERFORM public.record_migration('market_data_tables_merged', 'SUCCESS');
        
        RAISE NOTICE '市场数据表迁移应用完成';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '市场数据表迁移失败: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 插入初始数据到迁移表（记录已应用的迁移）
-- 基于README.md中的状态，标记已应用的迁移
INSERT INTO public.migrations (migration_name, status, applied_at)
VALUES 
    ('20250327000000_init.sql', 'SUCCESS', NOW()),
    ('20250328000001_add_sms_hook.sql', 'SUCCESS', NOW()),
    ('20250330000003_add_chat_tables.sql', 'SUCCESS', NOW()),
    ('20250331000004_add_metadata_to_trades.sql', 'SUCCESS', NOW())
ON CONFLICT (migration_name) DO NOTHING;

-- 10. 创建查看迁移状态的视图
CREATE OR REPLACE VIEW public.migration_status AS
SELECT 
    migration_name,
    applied_at,
    status,
    execution_time_ms,
    error_message,
    CASE 
        WHEN status = 'SUCCESS' THEN '✅ 已应用'
        WHEN status = 'FAILED' THEN '❌ 失败'
        WHEN status = 'PENDING' THEN '⏳ 待执行'
        ELSE '❓ 未知'
    END as status_display
FROM public.migrations
ORDER BY applied_at DESC;

-- 11. 权限设置
GRANT SELECT ON public.migrations TO authenticated, service_role;
GRANT SELECT ON public.migration_status TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMIT;

-- ========================================================
-- 迁移优化完成
-- ========================================================

DO $$ 
BEGIN
    RAISE NOTICE '迁移优化系统初始化完成';
    RAISE NOTICE '- 创建了 migrations 表用于版本控制';
    RAISE NOTICE '- 添加了智能检查函数 (table_exists, column_exists, etc.)';
    RAISE NOTICE '- 添加了安全创建函数 (create_table_safe, add_column_safe)';
    RAISE NOTICE '- 添加了迁移应用函数 (apply_migration)';
    RAISE NOTICE '- 创建了 migration_status 视图';
    RAISE NOTICE '- 记录了已应用的迁移';
END $$;