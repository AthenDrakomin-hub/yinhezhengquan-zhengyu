-- ==========================================================
-- 中国银河证券——证裕交易单元 Nexus 核心数据库结构
-- 版本: v3.0.0
-- 数据库: PostgreSQL 15+ (Supabase)
-- 更新时间: 2024-03-07
-- ==========================================================
-- 
-- 使用说明:
-- 1. 在 Supabase SQL Editor 中按顺序执行
-- 2. 或使用 supabase db push 命令部署
-- 3. 生产环境请先备份数据
--
-- ==========================================================

-- ==========================================================
-- 第一部分：扩展和基础函数
-- ==========================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 通用更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================================
-- 第二部分：用户系统表
-- ==========================================================

-- 用户资料表 (与 auth.users 关联)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT DEFAULT 'Invest_ZY_User',
    real_name TEXT,
    phone TEXT,
    id_card TEXT,
    display_name TEXT,
    avatar_url TEXT,
    
    -- 权限相关
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    admin_level TEXT DEFAULT 'user' CHECK (admin_level IN ('super_admin', 'admin', 'user')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'BANNED', 'REJECTED')),
    
    -- 资产相关
    risk_level TEXT DEFAULT 'C3-稳健型',
    balance NUMERIC(20, 2) DEFAULT 1000000.00,
    total_equity NUMERIC(20, 2) DEFAULT 1000000.00,
    
    -- API相关
    api_key TEXT,
    api_secret TEXT,
    
    -- 管理关系
    created_by UUID REFERENCES public.profiles(id),
    managed_by UUID REFERENCES public.profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户资产表
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    available_balance DECIMAL(18,2) DEFAULT 1000000.00,
    frozen_balance DECIMAL(18,2) DEFAULT 0.00,
    total_asset DECIMAL(18,2) DEFAULT 1000000.00,
    today_profit_loss DECIMAL(18,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 第三部分：交易系统表
-- ==========================================================

-- 持仓表
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    market TEXT DEFAULT 'CN',
    quantity NUMERIC(20, 4) DEFAULT 0,
    available_quantity NUMERIC(20, 4) DEFAULT 0,
    locked_quantity NUMERIC(20, 4) DEFAULT 0,
    average_price NUMERIC(20, 4) DEFAULT 0,
    current_price NUMERIC(20, 4),
    profit_loss NUMERIC(20, 4) DEFAULT 0,
    lock_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- 交易订单表
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    market TEXT DEFAULT 'CN',
    trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    order_type TEXT DEFAULT 'LIMIT' CHECK (order_type IN ('MARKET', 'LIMIT')),
    price NUMERIC(20, 4) NOT NULL,
    quantity NUMERIC(20, 4) NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MATCHING', 'MATCHED', 'FILLED', 'CANCELLED', 'REJECTED')),
    filled_quantity NUMERIC(20, 4) DEFAULT 0,
    filled_amount NUMERIC(20, 2) DEFAULT 0,
    remark TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 条件单表
CREATE TABLE IF NOT EXISTS public.conditional_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('TP_SL', 'GRID')),
    status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'TRIGGERED', 'CANCELLED')),
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 资金流水表
CREATE TABLE IF NOT EXISTS public.fund_flows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    flow_type TEXT NOT NULL CHECK (flow_type IN ('DEPOSIT', 'WITHDRAW', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'FREEZE', 'UNFREEZE', 'REFUND')),
    amount DECIMAL(18,2) NOT NULL,
    balance_after DECIMAL(18,2) NOT NULL,
    related_trade_id UUID REFERENCES public.trades(id),
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 交易幂等性表
CREATE TABLE IF NOT EXISTS public.transaction_idempotency (
    transaction_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ==========================================================
-- 第四部分：市场数据表
-- ==========================================================

-- IPO新股表
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

-- 大宗交易产品表
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
    block_discount NUMERIC DEFAULT 0.95,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    update_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 涨停股票表
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

-- ==========================================================
-- 第五部分：内容管理表
-- ==========================================================

-- 研报表
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    date TEXT,
    summary TEXT,
    content TEXT,
    category TEXT DEFAULT '个股' CHECK (category IN ('个股', '行业', '宏观', '策略')),
    sentiment TEXT DEFAULT '中性' CHECK (sentiment IN ('看多', '中性', '看空')),
    tags TEXT[],
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 投教内容表
CREATE TABLE IF NOT EXISTS public.education_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    duration TEXT,
    content TEXT,
    "order" INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 日历事件表
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT '事件',
    time TEXT,
    markets TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 横幅公告表
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 第六部分：客服系统表
-- ==========================================================

-- 工单表
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED')),
    last_update TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count_user INTEGER DEFAULT 0,
    unread_count_admin INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息表
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 第七部分：管理后台表
-- ==========================================================

-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    operation_type TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 交易规则表
CREATE TABLE IF NOT EXISTS public.trade_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL,
    rule_key TEXT NOT NULL UNIQUE,
    rule_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 清算日志表
CREATE TABLE IF NOT EXISTS public.settlement_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    settlement_date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    total_volume DECIMAL(18,2) DEFAULT 0,
    unlocked_positions INTEGER DEFAULT 0,
    status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 第八部分：索引
-- ==========================================================

-- profiles 表索引
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level ON public.profiles(admin_level);

-- trades 表索引
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);

-- positions 表索引
CREATE INDEX IF NOT EXISTS idx_positions_user ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON public.positions(symbol);

-- fund_flows 表索引
CREATE INDEX IF NOT EXISTS idx_fund_flows_user ON public.fund_flows(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fund_flows_type ON public.fund_flows(flow_type);

-- messages 表索引
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- ipos 表索引
CREATE INDEX IF NOT EXISTS idx_ipos_symbol ON public.ipos(symbol);
CREATE INDEX IF NOT EXISTS idx_ipos_status ON public.ipos(status);

-- limit_up_stocks 表索引
CREATE INDEX IF NOT EXISTS idx_limit_up_symbol ON public.limit_up_stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_limit_up_date ON public.limit_up_stocks(trade_date DESC);

-- ==========================================================
-- 第九部分：RLS 策略
-- ==========================================================

-- 启用所有表的 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_trade_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limit_up_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_logs ENABLE ROW LEVEL SECURITY;

-- profiles RLS 策略
CREATE POLICY "Users view own profiles" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- assets RLS 策略
CREATE POLICY "Users view own assets" ON public.assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all assets" ON public.assets FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- trades RLS 策略
CREATE POLICY "Users manage own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all trades" ON public.trades FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- positions RLS 策略
CREATE POLICY "Users view own positions" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own positions" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own positions" ON public.positions FOR UPDATE USING (auth.uid() = user_id);

-- fund_flows RLS 策略
CREATE POLICY "Users view own fund_flows" ON public.fund_flows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all fund_flows" ON public.fund_flows FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- 公共读取策略（市场数据）
CREATE POLICY "Public read ipos" ON public.ipos FOR SELECT USING (true);
CREATE POLICY "Public read block_trade_products" ON public.block_trade_products FOR SELECT USING (true);
CREATE POLICY "Public read limit_up_stocks" ON public.limit_up_stocks FOR SELECT USING (true);
CREATE POLICY "Public read reports" ON public.reports FOR SELECT USING (is_published = true);
CREATE POLICY "Public read education_topics" ON public.education_topics FOR SELECT USING (is_published = true);
CREATE POLICY "Public read calendar_events" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (is_active = true);

-- 管理员写入策略（市场数据）
CREATE POLICY "Admins manage ipos" ON public.ipos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage block_trade_products" ON public.block_trade_products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage limit_up_stocks" ON public.limit_up_stocks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage reports" ON public.reports FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage education_topics" ON public.education_topics FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage banners" ON public.banners FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- support_tickets RLS 策略
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all tickets" ON public.support_tickets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- messages RLS 策略
CREATE POLICY "Users view own ticket messages" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);
CREATE POLICY "Admins view all messages" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- admin_operation_logs RLS 策略（仅管理员）
CREATE POLICY "Admins manage operation_logs" ON public.admin_operation_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- trade_rules RLS 策略
CREATE POLICY "Admins manage trade_rules" ON public.trade_rules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- settlement_logs RLS 策略（仅管理员）
CREATE POLICY "Admins view settlement_logs" ON public.settlement_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- ==========================================================
-- 第十部分：触发器
-- ==========================================================

-- profiles 更新时间触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- assets 更新时间触发器
DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trades 更新时间触发器
DROP TRIGGER IF EXISTS update_trades_updated_at ON public.trades;
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- positions 更新时间触发器
DROP TRIGGER IF EXISTS update_positions_updated_at ON public.positions;
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- messages 更新时间触发器
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- 第十一部分：用户注册自动触发器
-- ==========================================================

-- 创建新用户时自动创建 profile 和 assets
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, username, role, admin_level, status, risk_level
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substring(NEW.id::text, 1, 8)),
    'user',
    'user',
    'ACTIVE',
    'C3-稳健型'
  );
  
  INSERT INTO public.assets (
    user_id, available_balance, frozen_balance, total_asset
  ) VALUES (
    NEW.id, 1000000.00, 0.00, 1000000.00
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 注册触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- 完成
-- ==========================================================
-- 
-- 数据库表清单 (20个表):
-- 
-- 用户系统:
--   - profiles      用户资料
--   - assets        用户资产
--
-- 交易系统:
--   - positions     持仓明细
--   - trades        交易订单
--   - conditional_orders  条件单
--   - fund_flows    资金流水
--   - transaction_idempotency  幂等性控制
--
-- 市场数据:
--   - ipos                  IPO新股
--   - block_trade_products  大宗交易产品
--   - limit_up_stocks       涨停股票
--
-- 内容管理:
--   - reports            研报
--   - education_topics   投教内容
--   - calendar_events    日历事件
--   - banners            横幅公告
--
-- 客服系统:
--   - support_tickets  工单
--   - messages         消息
--
-- 管理后台:
--   - admin_operation_logs  操作日志
--   - trade_rules           交易规则
--   - settlement_logs       清算日志
--
-- ==========================================================
