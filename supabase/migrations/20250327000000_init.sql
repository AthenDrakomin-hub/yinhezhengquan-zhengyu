-- ==========================================================
-- 中国银河证券——证裕交易单元 Nexus 核心数据库结构 (PostgreSQL)
-- 版本: v2.10.4
-- 功能: 账户管理、虚拟持仓、实时交易、条件单策略、资产快照
-- ==========================================================

-- 1. 用户扩展资料表 (与 Auth.Users 关联)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT DEFAULT 'Invest_ZY_User',
    risk_level TEXT DEFAULT 'C3-稳健型',
    balance NUMERIC(20, 2) DEFAULT 1000000.00,
    total_equity NUMERIC(20, 2) DEFAULT 1000000.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 证券持仓表 (Holdings)
CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity NUMERIC(20, 4) DEFAULT 0,
    available_quantity NUMERIC(20, 4) DEFAULT 0,
    average_price NUMERIC(20, 4) DEFAULT 0,
    category TEXT DEFAULT 'STOCK',
    logo_url TEXT,
    last_price NUMERIC(20, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- 3. 交易流水表 (Transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    price NUMERIC(20, 4) NOT NULL,
    quantity NUMERIC(20, 4) NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    status TEXT DEFAULT 'SUCCESS',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 智能条件单表 (Conditional Orders)
CREATE TABLE IF NOT EXISTS public.conditional_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    order_type TEXT NOT NULL,
    status TEXT DEFAULT 'RUNNING',
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 资产历史快照表
CREATE TABLE IF NOT EXISTS public.asset_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    equity NUMERIC(20, 2) NOT NULL,
    balance NUMERIC(20, 2) NOT NULL,
    daily_profit NUMERIC(20, 2) NOT NULL,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, snapshot_date)
);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_snapshots ENABLE ROW LEVEL SECURITY;

-- 策略
DO $$ BEGIN
    CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Users manage own holdings" ON public.holdings FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users manage own conditional orders" ON public.conditional_orders FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;