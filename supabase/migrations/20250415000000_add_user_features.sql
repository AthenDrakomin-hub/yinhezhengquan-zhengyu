-- ==========================================================
-- 用户功能扩展迁移
-- 版本: v1.0 (2025-04-15)
-- 功能: 自选股、用户配置、资产表完善
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. 用户资产表（确保存在）
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    available_balance DECIMAL(18,2) DEFAULT 1000000.00,
    frozen_balance DECIMAL(18,2) DEFAULT 0.00,
    total_asset DECIMAL(18,2) DEFAULT 1000000.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DO $$ BEGIN
    CREATE POLICY "Users view own assets" ON public.assets FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users update own assets" ON public.assets FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Service role full access" ON public.assets FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 索引
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);

-- ==========================================================
-- 2. 自选股表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT,
    market TEXT CHECK (market IN ('CN', 'HK')) DEFAULT 'CN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保每个用户对同一只股票只有一条记录
    UNIQUE(user_id, symbol)
);

-- 启用 RLS
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DO $$ BEGIN
    CREATE POLICY "Users manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "Users view own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users insert own watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users delete own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 索引
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON public.watchlist(symbol);

-- ==========================================================
-- 3. 用户配置表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.user_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    config_type TEXT NOT NULL CHECK (config_type IN (
        'trading_preferences',
        'personal_preferences',
        'security_settings',
        'notification_settings'
    )),
    config_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保每个用户的每种配置类型只有一条记录
    UNIQUE(user_id, config_type)
);

-- 启用 RLS
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DO $$ BEGIN
    CREATE POLICY "Users manage own configs" ON public.user_configs FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "Users view own configs" ON public.user_configs FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users insert own configs" ON public.user_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users update own configs" ON public.user_configs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON public.user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_type ON public.user_configs(config_type);

-- ==========================================================
-- 4. 触发器：自动更新 updated_at
-- ==========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 assets 表添加触发器
DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为 user_configs 表添加触发器
DROP TRIGGER IF EXISTS update_user_configs_updated_at ON public.user_configs;
CREATE TRIGGER update_user_configs_updated_at
    BEFORE UPDATE ON public.user_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
