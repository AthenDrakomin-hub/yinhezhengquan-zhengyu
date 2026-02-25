-- ==========================================================
-- 中国银河证券——证裕交易单元 Nexus 内容管理表结构
-- 版本: v2.11.0
-- 功能: 研报、投教、工单、日历、新股、衍生品、横幅等内容的数据库驱动
-- ==========================================================

-- 1. 研报表 (reports)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    date DATE NOT NULL,
    summary TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL CHECK (category IN ('个股', '行业', '宏观', '策略')),
    sentiment TEXT NOT NULL CHECK (sentiment IN ('看多', '中性', '看空')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 投教内容表 (education_topics)
CREATE TABLE IF NOT EXISTS public.education_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    duration TEXT,
    content TEXT,
    "order" INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 客服工单表 (support_tickets)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED')),
    last_update DATE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 日历事件表 (calendar_events)
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    time TEXT,
    markets TEXT[] DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 新股信息表 (ipos)
CREATE TABLE IF NOT EXISTS public.ipos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price NUMERIC(10,2),
    change NUMERIC(10,2) DEFAULT 0,
    change_percent NUMERIC(5,2) DEFAULT 0,
    market TEXT NOT NULL CHECK (market IN ('CN', 'HK', 'US', 'OTHER')),
    listing_date DATE,
    status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'LISTED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 衍生品表 (derivatives)
CREATE TABLE IF NOT EXISTS public.derivatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price NUMERIC(10,2),
    change NUMERIC(10,2) DEFAULT 0,
    change_percent NUMERIC(5,2) DEFAULT 0,
    market TEXT NOT NULL DEFAULT 'FUTURES',
    type TEXT NOT NULL CHECK (type IN ('FUTURES', 'OPTIONS', 'WARRANTS', 'OTHER')),
    underlying TEXT,
    strike NUMERIC(10,2),
    expiry DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 横幅公告表 (banners)
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    desc TEXT NOT NULL,
    img TEXT NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    related_symbol TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.derivatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- 创建策略
-- 研报表：所有人可读，仅管理员可写
DROP POLICY IF EXISTS "所有人可读研报" ON public.reports;
CREATE POLICY "所有人可读研报" ON public.reports
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "仅管理员可管理研报" ON public.reports;
CREATE POLICY "仅管理员可管理研报" ON public.reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 投教内容表：所有人可读，仅管理员可写
DROP POLICY IF EXISTS "所有人可读投教内容" ON public.education_topics;
CREATE POLICY "所有人可读投教内容" ON public.education_topics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "仅管理员可管理投教内容" ON public.education_topics;
CREATE POLICY "仅管理员可管理投教内容" ON public.education_topics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 客服工单表：用户可读自己的工单，管理员可读所有，仅管理员可写
DROP POLICY IF EXISTS "用户可读自己的工单" ON public.support_tickets;
CREATE POLICY "用户可读自己的工单" ON public.support_tickets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可读所有工单" ON public.support_tickets;
CREATE POLICY "管理员可读所有工单" ON public.support_tickets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "仅管理员可管理工单" ON public.support_tickets;
CREATE POLICY "仅管理员可管理工单" ON public.support_tickets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 日历事件表：所有人可读，仅管理员可写
DROP POLICY IF EXISTS "所有人可读日历事件" ON public.calendar_events;
CREATE POLICY "所有人可读日历事件" ON public.calendar_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "仅管理员可管理日历事件" ON public.calendar_events;
CREATE POLICY "仅管理员可管理日历事件" ON public.calendar_events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 新股信息表：所有人可读，仅管理员可写
DROP POLICY IF EXISTS "所有人可读新股信息" ON public.ipos;
CREATE POLICY "所有人可读新股信息" ON public.ipos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "仅管理员可管理新股信息" ON public.ipos;
CREATE POLICY "仅管理员可管理新股信息" ON public.ipos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 衍生品表：所有人可读，仅管理员可写
DROP POLICY IF EXISTS "所有人可读衍生品信息" ON public.derivatives;
CREATE POLICY "所有人可读衍生品信息" ON public.derivatives
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "仅管理员可管理衍生品信息" ON public.derivatives;
CREATE POLICY "仅管理员可管理衍生品信息" ON public.derivatives
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 横幅公告表：所有人可读，仅管理员可写
DROP POLICY IF EXISTS "所有人可读横幅公告" ON public.banners;
CREATE POLICY "所有人可读横幅公告" ON public.banners
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "仅管理员可管理横幅公告" ON public.banners;
CREATE POLICY "仅管理员可管理横幅公告" ON public.banners
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_reports_date ON public.reports(date);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_education_topics_order ON public.education_topics("order");
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_ipos_listing_date ON public.ipos(listing_date);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.banners(is_active);

-- 创建 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_education_topics_updated_at ON public.education_topics;
CREATE TRIGGER update_education_topics_updated_at BEFORE UPDATE ON public.education_topics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_ipos_updated_at ON public.ipos;
CREATE TRIGGER update_ipos_updated_at BEFORE UPDATE ON public.ipos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_derivatives_updated_at ON public.derivatives;
CREATE TRIGGER update_derivatives_updated_at BEFORE UPDATE ON public.derivatives FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_banners_updated_at ON public.banners;
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 插入初始数据（从模拟数据转换）
INSERT INTO public.reports (id, title, author, date, summary, category, sentiment) VALUES
('r1', '银河策略 2025: 分布式算力节点深度价值评估', '银河证券投研总部', '2025-03-26', '分布式算力需求进入爆发期，建议投资者关注“能源+算力”双重护城河标的。', '行业', '看多')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_topics (id, title, category, image, duration) VALUES
('e1', '两融交易进阶指南', '进阶', 'https://images.unsplash.com/photo-1611974717482-58f00017963d?auto=format&fit=crop&q=80&w=400', '15 mins')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.support_tickets (id, subject, status, last_update) VALUES
('T-9921', '两融账户展期申请审核', 'IN_PROGRESS', '2025-03-26')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.calendar_events (id, date, title, type, time, markets) VALUES
('c1', '2026-03-20', '美联储利率决议', '宏观', '02:00', ARRAY['US']),
('c2', '2026-03-25', '英伟达财报发布', '财报', '16:00', ARRAY['US']),
('c3', '2026-03-28', '银河证券年度策略会', '活动', '09:00', ARRAY['CN'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ipos (id, symbol, name, price, market, status) VALUES
(gen_random_uuid(), '780123', '银河量子', 18.50, 'CN', 'UPCOMING')
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO public.derivatives (id, symbol, name, price, change, change_percent, market, type) VALUES
(gen_random_uuid(), 'IF2506', '沪深300指数期货2506', 3624.5, 12.4, 0.34, 'FUTURES', 'FUTURES')
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO public.banners (id, title, desc, img, category, date, content, related_symbol) VALUES
('b1', '银河证券·证裕单元 26 周年庆', '深度解析：2000-2026 见证专业价值的数字化转型', 'https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/60905537-802a-466d-862d-03487372b64b.jpg', '年度品牌', '2025-03-27', '在 2026 年全球资产配置的新坐标下，中国银河证券研究部认为，数字化转型正迈入以“证裕交易单元”为核心的 2.0 阶段。', NULL),
('b2', '证裕单元 Nexus 核心系统升级', '集成极速行情内核，开启毫秒级算法对冲新时代', 'https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/75581daa-fd55-45c5-8376-f51bf6852fde.jpg', '科技赋能', '2025-03-25', '本次升级实现了底层交易引擎与 AI 大模型的直连。这是中国银河证券向“AI-Native”数字化券商转型的关键里程碑。', NULL),
('b3', '跨境直连：银河港股通流动性解密', '红利税预期调整下的高股息资产重估逻辑', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000', '市场深度', '2025-03-20', '随着互联互通机制的深化，银河证券证裕单元深度拆解了银行、公用事业及资源类标的的溢价回归路径。', '00700')
ON CONFLICT (id) DO NOTHING;
