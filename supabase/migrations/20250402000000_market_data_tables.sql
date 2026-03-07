-- ========================================================
-- 市场数据表整合迁移
-- 版本: v1.0 (2024-03-07)
-- 功能: IPO新股、大宗交易产品、涨停股票、资金流水
-- ========================================================

BEGIN;

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- 1. IPO新股表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.ipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('SH', 'SZ')),
    status TEXT NOT NULL CHECK (status IN ('LISTED', 'UPCOMING', 'ONGOING')),
    ipo_price NUMERIC,
    issue_date DATE,
    listing_date DATE,
    subscription_code TEXT,
    issue_volume NUMERIC,
    online_issue_volume NUMERIC,
    pe_ratio NUMERIC,
    update_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipos_symbol ON public.ipos(symbol);
CREATE INDEX IF NOT EXISTS idx_ipos_status ON public.ipos(status);
CREATE INDEX IF NOT EXISTS idx_ipos_listing_date ON public.ipos(listing_date);

-- ==========================================================
-- 2. 大宗交易产品表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.block_trade_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('COMMODITY', 'STOCK', 'INDEX')),
    market TEXT NOT NULL,
    current_price NUMERIC NOT NULL,
    change NUMERIC DEFAULT 0,
    change_percent NUMERIC DEFAULT 0,
    volume NUMERIC DEFAULT 0,
    min_block_size INTEGER NOT NULL,
    block_discount NUMERIC DEFAULT 0.95 CHECK (block_discount > 0 AND block_discount <= 1),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    update_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_block_products_symbol ON public.block_trade_products(symbol);
CREATE INDEX IF NOT EXISTS idx_block_products_status ON public.block_trade_products(status);

-- ==========================================================
-- 3. 涨停股票表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.limit_up_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('SH', 'SZ')),
    stock_type TEXT DEFAULT 'NORMAL' CHECK (stock_type IN ('NORMAL', 'ST', 'GEM')),
    pre_close NUMERIC NOT NULL,
    current_price NUMERIC NOT NULL,
    limit_up_price NUMERIC NOT NULL,
    limit_down_price NUMERIC NOT NULL,
    change NUMERIC DEFAULT 0,
    change_percent NUMERIC DEFAULT 0,
    volume NUMERIC DEFAULT 0,
    turnover NUMERIC DEFAULT 0,
    is_limit_up BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'ACTIVE',
    trade_date DATE DEFAULT CURRENT_DATE,
    update_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_limit_up_symbol ON public.limit_up_stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_limit_up_date ON public.limit_up_stocks(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_limit_up_status ON public.limit_up_stocks(is_limit_up, status);

-- ==========================================================
-- 4. 资金流水表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.fund_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    flow_type TEXT NOT NULL CHECK (flow_type IN ('DEPOSIT', 'WITHDRAW', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'FREEZE', 'UNFREEZE', 'REFUND')),
    amount DECIMAL(18,2) NOT NULL,
    balance_after DECIMAL(18,2) NOT NULL,
    related_trade_id UUID REFERENCES public.trades(id),
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_flows_user ON public.fund_flows(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fund_flows_type ON public.fund_flows(flow_type);

-- ==========================================================
-- 5. RLS 策略
-- ==========================================================

-- 启用 RLS
ALTER TABLE public.ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_trade_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limit_up_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_flows ENABLE ROW LEVEL SECURITY;

-- IPO 公开读取
DROP POLICY IF EXISTS "allow_public_read_ipos" ON public.ipos;
CREATE POLICY "allow_public_read_ipos" ON public.ipos FOR SELECT USING (true);

-- IPO 管理员写入
DROP POLICY IF EXISTS "allow_admin_manage_ipos" ON public.ipos;
CREATE POLICY "allow_admin_manage_ipos" ON public.ipos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 大宗交易产品公开读取
DROP POLICY IF EXISTS "allow_public_read_block" ON public.block_trade_products;
CREATE POLICY "allow_public_read_block" ON public.block_trade_products FOR SELECT USING (true);

-- 大宗交易产品管理员写入
DROP POLICY IF EXISTS "allow_admin_manage_block" ON public.block_trade_products;
CREATE POLICY "allow_admin_manage_block" ON public.block_trade_products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 涨停股票公开读取
DROP POLICY IF EXISTS "allow_public_read_limit_up" ON public.limit_up_stocks;
CREATE POLICY "allow_public_read_limit_up" ON public.limit_up_stocks FOR SELECT USING (true);

-- 涨停股票管理员写入
DROP POLICY IF EXISTS "allow_admin_manage_limit_up" ON public.limit_up_stocks;
CREATE POLICY "allow_admin_manage_limit_up" ON public.limit_up_stocks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 资金流水用户只能查看自己的
DROP POLICY IF EXISTS "allow_user_read_own_flows" ON public.fund_flows;
CREATE POLICY "allow_user_read_own_flows" ON public.fund_flows FOR SELECT USING (auth.uid() = user_id);

-- 资金流水管理员可查看所有
DROP POLICY IF EXISTS "allow_admin_read_flows" ON public.fund_flows;
CREATE POLICY "allow_admin_read_flows" ON public.fund_flows FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

COMMIT;
