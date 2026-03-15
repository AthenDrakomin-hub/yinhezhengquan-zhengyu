-- ========================================================
-- 完整数据库迁移 SQL
-- 请在 Supabase Dashboard -> SQL Editor 中执行
-- ========================================================

-- 第一阶段：核心用户表
-- 1. 用户配置表
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    admin_level TEXT CHECK (admin_level IN ('admin', 'super_admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    login_count INT DEFAULT 0,
    preferences JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. 用户配置项表
CREATE TABLE IF NOT EXISTS public.user_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    language TEXT DEFAULT 'zh-CN',
    notification_enabled BOOLEAN DEFAULT true,
    email_notification BOOLEAN DEFAULT true,
    push_notification BOOLEAN DEFAULT true,
    trade_notification BOOLEAN DEFAULT true,
    system_notification BOOLEAN DEFAULT false,
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval INT DEFAULT 5,
    default_page TEXT DEFAULT 'home',
    kline_period TEXT DEFAULT 'day',
    chart_type TEXT DEFAULT 'candle',
    show_volume BOOLEAN DEFAULT true,
    show_ma BOOLEAN DEFAULT true,
    ma_periods INT[] DEFAULT ARRAY[5, 10, 20, 60],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_configs_user ON public.user_configs(user_id);

-- 第二阶段：交易相关表
-- 3. 资产表
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_asset NUMERIC DEFAULT 0,
    available_cash NUMERIC DEFAULT 0,
    frozen_cash NUMERIC DEFAULT 0,
    market_value NUMERIC DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    today_profit NUMERIC DEFAULT 0,
    today_profit_percent NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'CNY',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_assets_user ON public.assets(user_id);

-- 4. 持仓表
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT,
    market TEXT DEFAULT 'CN',
    quantity NUMERIC DEFAULT 0,
    available_quantity NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    current_price NUMERIC DEFAULT 0,
    market_value NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    profit_percent NUMERIC DEFAULT 0,
    today_change NUMERIC DEFAULT 0,
    today_change_percent NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_user ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON public.positions(symbol);

-- 5. 交易记录表
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT,
    market TEXT DEFAULT 'CN',
    trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    order_type TEXT DEFAULT 'limit' CHECK (order_type IN ('market', 'limit', 'stop')),
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    amount NUMERIC NOT NULL,
    commission NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'rejected')),
    order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    filled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- 6. 自选股表
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT,
    market TEXT DEFAULT 'CN',
    group_name TEXT DEFAULT 'default',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON public.watchlist(symbol);

-- 第三阶段：系统配置表
-- 7. 交易时间表
CREATE TABLE IF NOT EXISTS public.trading_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market TEXT NOT NULL UNIQUE,
    morning_open TIME,
    morning_close TIME,
    afternoon_open TIME,
    afternoon_close TIME,
    timezone TEXT DEFAULT 'Asia/Shanghai',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 审批规则表
CREATE TABLE IF NOT EXISTS public.approval_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('auto', 'manual')),
    conditions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 快速通道规则表
CREATE TABLE IF NOT EXISTS public.fast_channel_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    min_asset NUMERIC DEFAULT 0,
    max_asset NUMERIC,
    min_trade_count INT DEFAULT 0,
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 第四阶段：内容管理表
-- 10. 新闻表
CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    source TEXT,
    category TEXT DEFAULT 'market',
    importance INT DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
    publish_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT false,
    view_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_category ON public.news(category);
CREATE INDEX IF NOT EXISTS idx_news_publish ON public.news(publish_at);

-- 11. Banner 表
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT,
    position TEXT DEFAULT 'home' CHECK (position IN ('home', 'trade', 'profile')),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_position ON public.banners(position);

-- 12. IPO 表
CREATE TABLE IF NOT EXISTS public.ipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    market TEXT DEFAULT 'CN',
    issue_price NUMERIC,
    issue_quantity BIGINT,
    subscription_start DATE,
    subscription_end DATE,
    listing_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'subscribing', 'subscribed', 'listed', 'cancelled')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipos_status ON public.ipos(status);

-- 第五阶段：扩展功能表
-- 13. ETF 产品表
CREATE TABLE IF NOT EXISTS public.etf_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    market TEXT NOT NULL DEFAULT 'CN' CHECK (market IN ('CN', 'HK')),
    price NUMERIC DEFAULT 0,
    change NUMERIC DEFAULT 0,
    change_percent NUMERIC DEFAULT 0,
    prev_close NUMERIC DEFAULT 0,
    volume BIGINT DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'stock',
    scale NUMERIC DEFAULT 0,
    management_fee NUMERIC DEFAULT 0,
    tracking_index TEXT,
    tracking_error NUMERIC,
    listed_date DATE,
    logo_url TEXT,
    data_source TEXT DEFAULT 'yinhe',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etf_products_symbol ON public.etf_products(symbol);
CREATE INDEX IF NOT EXISTS idx_etf_products_category ON public.etf_products(category);

-- 14. 理财产品表
CREATE TABLE IF NOT EXISTS public.wealth_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'deposit' CHECK (type IN ('deposit', 'fund', 'bond', 'insurance')),
    expected_return NUMERIC,
    return_type TEXT DEFAULT 'annual',
    min_amount NUMERIC DEFAULT 1000,
    increment NUMERIC DEFAULT 1000,
    period_days INT,
    period_type TEXT DEFAULT 'fixed',
    risk_level INT DEFAULT 2 CHECK (risk_level BETWEEN 1 AND 5),
    quota NUMERIC DEFAULT 0,
    max_quota NUMERIC,
    per_user_limit NUMERIC,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    tag TEXT,
    description TEXT,
    issuer TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wealth_products_type ON public.wealth_products(type);
CREATE INDEX IF NOT EXISTS idx_wealth_products_status ON public.wealth_products(status);

-- 15. 板块数据表
CREATE TABLE IF NOT EXISTS public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('industry', 'concept', 'region')),
    price NUMERIC DEFAULT 0,
    change NUMERIC DEFAULT 0,
    change_percent NUMERIC DEFAULT 0,
    prev_close NUMERIC DEFAULT 0,
    volume BIGINT DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    leading_stock_code TEXT,
    leading_stock_name TEXT,
    leading_stock_change NUMERIC,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sectors_code ON public.sectors(code);
CREATE INDEX IF NOT EXISTS idx_sectors_type ON public.sectors(type);

-- 16. 板块成分股表
CREATE TABLE IF NOT EXISTS public.sector_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_code TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    stock_name TEXT,
    weight NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sector_code, stock_code)
);

CREATE INDEX IF NOT EXISTS idx_sector_stocks_sector ON public.sector_stocks(sector_code);
CREATE INDEX IF NOT EXISTS idx_sector_stocks_stock ON public.sector_stocks(stock_code);

-- 17. 融资融券账户表
CREATE TABLE IF NOT EXISTS public.margin_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    total_asset NUMERIC DEFAULT 0,
    available_cash NUMERIC DEFAULT 0,
    margin_balance NUMERIC DEFAULT 0,
    short_balance NUMERIC DEFAULT 0,
    maintenance_ratio NUMERIC DEFAULT 0,
    margin_limit NUMERIC DEFAULT 0,
    short_limit NUMERIC DEFAULT 0,
    available_margin NUMERIC DEFAULT 0,
    available_short NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'liquidated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_margin_accounts_user ON public.margin_accounts(user_id);

-- 18. 融资融券持仓表
CREATE TABLE IF NOT EXISTS public.margin_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.margin_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT,
    quantity NUMERIC DEFAULT 0,
    available_quantity NUMERIC DEFAULT 0,
    position_type TEXT NOT NULL CHECK (position_type IN ('margin', 'short')),
    cost_price NUMERIC DEFAULT 0,
    current_price NUMERIC DEFAULT 0,
    market_value NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    interest_rate NUMERIC DEFAULT 0,
    interest_accrued NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, symbol, position_type)
);

CREATE INDEX IF NOT EXISTS idx_margin_positions_account ON public.margin_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_margin_positions_user ON public.margin_positions(user_id);

-- 19. 用户设置表
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    fast_order_mode BOOLEAN DEFAULT false,
    default_strategy TEXT DEFAULT 'limit',
    default_leverage NUMERIC DEFAULT 1,
    auto_stop_loss BOOLEAN DEFAULT false,
    language TEXT DEFAULT 'zh-CN' CHECK (language IN ('zh-CN', 'zh-HK', 'en-US')),
    font_size TEXT DEFAULT 'standard' CHECK (font_size IN ('standard', 'large')),
    haptic_feedback BOOLEAN DEFAULT true,
    sound_effects BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('dark', 'light', 'system')),
    default_kline_period TEXT DEFAULT 'day',
    up_color TEXT DEFAULT 'red',
    show_avg_line BOOLEAN DEFAULT true,
    show_volume BOOLEAN DEFAULT true,
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval INT DEFAULT 5,
    default_validity TEXT DEFAULT 'GTC',
    trigger_method TEXT DEFAULT 'price',
    condition_notify BOOLEAN DEFAULT true,
    trade_alerts_enabled BOOLEAN DEFAULT true,
    price_alerts_enabled BOOLEAN DEFAULT true,
    system_news_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);

-- 20. 条件单表
CREATE TABLE IF NOT EXISTS public.conditional_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT,
    condition_type TEXT NOT NULL CHECK (condition_type IN ('price', 'time', 'profit', 'loss')),
    trigger_condition JSONB NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('buy', 'sell', 'notify')),
    action_params JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'cancelled', 'expired')),
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditional_orders_user ON public.conditional_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_conditional_orders_status ON public.conditional_orders(status);

-- 21. 用户通知表
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'system' CHECK (type IN ('system', 'trade', 'price', 'news', 'activity')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(is_read);

-- 22. 通知设置表
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    trade_notify BOOLEAN DEFAULT true,
    price_notify BOOLEAN DEFAULT true,
    system_notify BOOLEAN DEFAULT true,
    news_notify BOOLEAN DEFAULT false,
    activity_notify BOOLEAN DEFAULT true,
    email_notify BOOLEAN DEFAULT true,
    push_notify BOOLEAN DEFAULT true,
    sms_notify BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON public.notification_settings(user_id);

-- 23. 资产快照表
CREATE TABLE IF NOT EXISTS public.asset_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_asset NUMERIC DEFAULT 0,
    cash NUMERIC DEFAULT 0,
    market_value NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    profit_percent NUMERIC DEFAULT 0,
    positions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_asset_snapshots_user ON public.asset_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_snapshots_date ON public.asset_snapshots(snapshot_date);

-- 24. 教育内容表
CREATE TABLE IF NOT EXISTS public.education_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT DEFAULT 'basic',
    difficulty INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    sort_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    view_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_topics_category ON public.education_topics(category);

-- 25. 用户学习进度表
CREATE TABLE IF NOT EXISTS public.education_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.education_topics(id) ON DELETE CASCADE,
    progress INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_education_progress_user ON public.education_progress(user_id);

-- 26. 工单表
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT DEFAULT 'other',
    priority INT DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'processing', 'resolved', 'closed')),
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

-- 27. 撮合池表
CREATE TABLE IF NOT EXISTS public.trade_match_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    matched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trade_match_pool_user ON public.trade_match_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_match_pool_symbol ON public.trade_match_pool(symbol);

-- ========================================================
-- RLS 策略设置
-- ========================================================

-- 启用所有表的 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margin_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_match_pool ENABLE ROW LEVEL SECURITY;

-- 公开读表
ALTER TABLE public.trading_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fast_channel_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_topics ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
-- profiles: 用户可以读取和更新自己的资料
DO $$ BEGIN
    CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_configs
DO $$ BEGIN
    CREATE POLICY "Users manage own configs" ON public.user_configs FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- assets
DO $$ BEGIN
    CREATE POLICY "Users manage own assets" ON public.assets FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- positions
DO $$ BEGIN
    CREATE POLICY "Users manage own positions" ON public.positions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- trades
DO $$ BEGIN
    CREATE POLICY "Users manage own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- watchlist
DO $$ BEGIN
    CREATE POLICY "Users manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- conditional_orders
DO $$ BEGIN
    CREATE POLICY "Users manage own conditional_orders" ON public.conditional_orders FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_notifications
DO $$ BEGIN
    CREATE POLICY "Users manage own notifications" ON public.user_notifications FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- notification_settings
DO $$ BEGIN
    CREATE POLICY "Users manage own notification_settings" ON public.notification_settings FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- asset_snapshots
DO $$ BEGIN
    CREATE POLICY "Users manage own asset_snapshots" ON public.asset_snapshots FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- education_progress
DO $$ BEGIN
    CREATE POLICY "Users manage own education_progress" ON public.education_progress FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- margin_accounts
DO $$ BEGIN
    CREATE POLICY "Users manage own margin_accounts" ON public.margin_accounts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- margin_positions
DO $$ BEGIN
    CREATE POLICY "Users manage own margin_positions" ON public.margin_positions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_settings
DO $$ BEGIN
    CREATE POLICY "Users manage own user_settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- tickets
DO $$ BEGIN
    CREATE POLICY "Users manage own tickets" ON public.tickets FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- trade_match_pool
DO $$ BEGIN
    CREATE POLICY "Users manage own trade_match_pool" ON public.trade_match_pool FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 公开读取的表
DO $$ BEGIN
    CREATE POLICY "Public read trading_hours" ON public.trading_hours FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read approval_rules" ON public.approval_rules FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read fast_channel_rules" ON public.fast_channel_rules FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read news" ON public.news FOR SELECT USING (is_published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read ipos" ON public.ipos FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read etf_products" ON public.etf_products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read wealth_products" ON public.wealth_products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read sectors" ON public.sectors FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read sector_stocks" ON public.sector_stocks FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read education_topics" ON public.education_topics FOR SELECT USING (is_published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================
-- 插入初始数据
-- ========================================================

-- 插入交易时间配置
INSERT INTO public.trading_hours (market, morning_open, morning_close, afternoon_open, afternoon_close, is_active)
VALUES 
    ('CN', '09:30:00', '11:30:00', '13:00:00', '15:00:00', true),
    ('HK', '09:30:00', '12:00:00', '13:00:00', '16:00:00', true)
ON CONFLICT (market) DO NOTHING;

-- 插入 ETF 产品数据
INSERT INTO public.etf_products (symbol, name, market, category, price, change, change_percent, scale, management_fee, tracking_index)
VALUES 
    ('510050', '华夏上证50ETF', 'CN', 'stock', 2.856, 0.012, 0.42, 50.0, 0.5, '上证50指数'),
    ('510300', '华泰柏瑞沪深300ETF', 'CN', 'stock', 4.125, 0.025, 0.61, 120.0, 0.5, '沪深300指数'),
    ('159915', '易方达创业板ETF', 'CN', 'stock', 1.856, -0.012, -0.64, 85.0, 0.5, '创业板指数'),
    ('588000', '华夏科创50ETF', 'CN', 'stock', 0.925, 0.008, 0.87, 45.0, 0.5, '科创50指数'),
    ('512880', '国泰中证全指证券公司ETF', 'CN', 'stock', 1.025, 0.015, 1.48, 35.0, 0.6, '证券公司指数'),
    ('511010', '国泰上证5年期国债ETF', 'CN', 'bond', 102.56, 0.05, 0.05, 15.0, 0.2, '上证5年期国债指数'),
    ('518880', '华安黄金易ETF', 'CN', 'commodity', 5.856, 0.025, 0.43, 85.0, 0.5, '黄金现货'),
    ('511880', '银华交易货币ETF', 'CN', 'money', 100.02, 0.001, 0.00, 120.0, 0.1, '货币市场')
ON CONFLICT (symbol) DO NOTHING;

-- 插入理财产品数据
INSERT INTO public.wealth_products (code, name, type, expected_return, min_amount, period_days, risk_level, tag, description, status)
VALUES 
    ('YH001', '银河稳健理财1号', 'deposit', 3.2, 1000, 90, 1, '热销', '银河证券自营理财产品，稳健增值', 'active'),
    ('YH002', '银河季度盈', 'deposit', 3.5, 5000, 180, 2, '新品', '季度结算，收益稳健', 'active'),
    ('YH003', '银河年年盈', 'deposit', 3.8, 10000, 365, 2, NULL, '年度结算，长期持有更优', 'active'),
    ('YH004', '银河活期宝', 'deposit', 2.5, 1, NULL, 1, '灵活', '随存随取，灵活便捷', 'active'),
    ('YH005', '银河优选混合基金', 'fund', NULL, 1000, NULL, 3, NULL, '混合型基金，专业团队管理', 'active'),
    ('YH006', '银河债券增强基金', 'fund', NULL, 5000, NULL, 2, NULL, '债券型基金，追求稳定收益', 'active')
ON CONFLICT (code) DO NOTHING;

-- 插入板块数据
INSERT INTO public.sectors (code, name, type, price, change, change_percent, leading_stock_name, leading_stock_change)
VALUES 
    ('BK0001', '半导体', 'industry', 1256.34, 45.23, 3.73, '北方华创', 9.98),
    ('BK0002', '光伏设备', 'industry', 1892.56, -23.45, -1.22, '隆基绿能', 5.32),
    ('BK0003', '锂电池', 'industry', 2345.78, 67.89, 2.98, '宁德时代', 4.56),
    ('BK0004', '白酒', 'industry', 3456.12, -12.34, -0.36, '贵州茅台', 1.23),
    ('BK0005', '医疗器械', 'industry', 1567.89, 34.56, 2.25, '迈瑞医疗', 3.45),
    ('BN0001', '人工智能', 'concept', 2567.89, 89.12, 3.60, '科大讯飞', 8.76),
    ('BN0002', '数字经济', 'concept', 1890.34, 56.78, 3.10, '深桑达A', 10.01),
    ('BN0003', '机器人', 'concept', 1234.56, 45.67, 3.84, '拓普集团', 7.89),
    ('BN0004', '新能源车', 'concept', 2345.67, -12.34, -0.52, '比亚迪', 2.67),
    ('BN0005', 'Chiplet', 'concept', 1678.90, 78.90, 4.93, '通富微电', 10.02)
ON CONFLICT (code) DO NOTHING;

-- 插入示例新闻
INSERT INTO public.news (title, summary, content, category, importance, is_published, publish_at)
VALUES 
    ('市场早报：A股三大指数集体高开', '今日A股市场表现强劲，科技板块领涨。', '详细内容...', 'market', 5, true, NOW()),
    ('投资策略：关注新能源板块机会', '新能源板块近期表现活跃，建议关注龙头企业。', '详细内容...', 'strategy', 4, true, NOW())
ON CONFLICT DO NOTHING;

-- 插入示例 Banner
INSERT INTO public.banners (title, image_url, link_url, position, sort_order, is_active)
VALUES 
    ('新手开户礼', '/images/banner1.jpg', '/register', 'home', 1, true),
    ('理财季活动', '/images/banner2.jpg', '/wealth', 'home', 2, true)
ON CONFLICT DO NOTHING;

-- ========================================================
-- 迁移完成提示
-- ========================================================
-- 迁移完成！请检查所有表是否正确创建。
-- 可以运行以下 SQL 验证：
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
