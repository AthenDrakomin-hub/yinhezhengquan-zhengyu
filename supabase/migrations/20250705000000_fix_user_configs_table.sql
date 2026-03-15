-- 修复 user_configs 表结构
-- 添加 config_type 和 config_value 列，支持多类型配置存储

-- 检查是否需要添加列
DO $$
BEGIN
    -- 添加 config_type 列（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_configs' 
        AND column_name = 'config_type'
    ) THEN
        ALTER TABLE public.user_configs ADD COLUMN config_type TEXT DEFAULT 'general';
    END IF;

    -- 添加 config_value 列（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_configs' 
        AND column_name = 'config_value'
    ) THEN
        ALTER TABLE public.user_configs ADD COLUMN config_value JSONB NOT NULL DEFAULT '{}';
    END IF;
END $$;

-- 添加唯一约束（user_id + config_type）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_configs_user_id_config_type_key'
    ) THEN
        -- 先移除 user_id 上的唯一约束（如果存在）
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'user_configs_user_id_key'
        ) THEN
            ALTER TABLE public.user_configs DROP CONSTRAINT user_configs_user_id_key;
        END IF;
        
        -- 添加组合唯一约束
        ALTER TABLE public.user_configs ADD CONSTRAINT user_configs_user_id_config_type_key 
        UNIQUE (user_id, config_type);
    END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_user_configs_type ON public.user_configs(config_type);

-- 修改 RLS 策略
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 删除旧策略并创建新策略
DROP POLICY IF EXISTS "Users manage own configs" ON public.user_configs;
DROP POLICY IF EXISTS "Users view own configs" ON public.user_configs;
DROP POLICY IF EXISTS "Users insert own configs" ON public.user_configs;
DROP POLICY IF EXISTS "Users update own configs" ON public.user_configs;

CREATE POLICY "Users manage own configs" ON public.user_configs 
    FOR ALL USING (auth.uid() = user_id);

-- 通知 PostgREST 重新加载 schema
NOTIFY pgrst, 'reload schema';
