-- ========================================================
-- 扩展功能数据表迁移
-- 版本: v1.0
-- 功能: ETF产品、理财产品、板块数据、融资融券账户、用户设置
-- ========================================================

BEGIN;

-- ==========================================================
-- 1. ETF产品表 (etf_products)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.etf_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,                    -- ETF代码
    name TEXT NOT NULL,                             -- ETF名称
    market TEXT NOT NULL DEFAULT 'CN' CHECK (market IN ('CN', 'HK')),
    
    -- 价格相关
    price NUMERIC DEFAULT 0,                        -- 最新价
    change NUMERIC DEFAULT 0,                       -- 涨跌额
    change_percent NUMERIC DEFAULT 0,               -- 涨跌幅
    prev_close NUMERIC DEFAULT 0,                   -- 昨收
    volume BIGINT DEFAULT 0,                        -- 成交量
    amount NUMERIC DEFAULT 0,                       -- 成交额
    
    -- ETF特有字段
    category TEXT DEFAULT 'stock',                  -- 类型：stock/bond/commodity/money/cross
    scale NUMERIC DEFAULT 0,                        -- 规模（亿）
    management_fee NUMERIC DEFAULT 0,               -- 管理费率
    tracking_index TEXT,                            -- 跟踪指数
    tracking_error NUMERIC,                         -- 跟踪误差
    listed_date DATE,                               -- 成立日期
    
    -- 元数据
    logo_url TEXT,
    data_source TEXT DEFAULT 'yinhe',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etf_products_symbol ON public.etf_products(symbol);
CREATE INDEX IF NOT EXISTS idx_etf_products_category ON public.etf_products(category);
CREATE INDEX IF NOT EXISTS idx_etf_products_market ON public.etf_products(market);

COMMENT ON TABLE public.etf_products IS 'ETF产品表';

-- ==========================================================
-- 2. 理财产品表 (wealth_products)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.wealth_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,                      -- 产品代码
    name TEXT NOT NULL,                             -- 产品名称
    type TEXT NOT NULL DEFAULT 'deposit' CHECK (type IN ('deposit', 'fund', 'bond', 'insurance')),
    
    -- 收益相关
    expected_return NUMERIC,                        -- 预期收益率
    return_type TEXT DEFAULT 'annual',              -- 收益类型：annual/daily
    
    -- 投资相关
    min_amount NUMERIC DEFAULT 1000,                -- 起购金额
    increment NUMERIC DEFAULT 1000,                 -- 递增金额
    period_days INT,                                -- 投资期限（天）
    period_type TEXT DEFAULT 'fixed',               -- 期限类型：fixed/flexible
    
    -- 风险相关
    risk_level INT DEFAULT 2 CHECK (risk_level BETWEEN 1 AND 5),
    
    -- 额度相关
    quota NUMERIC DEFAULT 0,                        -- 剩余额度
    max_quota NUMERIC,                              -- 总额度
    per_user_limit NUMERIC,                         -- 单用户限额
    
    -- 状态
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    tag TEXT,                                       -- 标签：热销/新品/限量等
    
    -- 元数据
    description TEXT,
    issuer TEXT,                                    -- 发行机构
    start_date DATE,                                -- 起息日
    end_date DATE,                                  -- 到期日
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wealth_products_type ON public.wealth_products(type);
CREATE INDEX IF NOT EXISTS idx_wealth_products_status ON public.wealth_products(status);
CREATE INDEX IF NOT EXISTS idx_wealth_products_risk ON public.wealth_products(risk_level);

COMMENT ON TABLE public.wealth_products IS '理财产品表';

-- ==========================================================
-- 3. 板块数据表 (sectors)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,                      -- 板块代码
    name TEXT NOT NULL,                             -- 板块名称
    type TEXT NOT NULL CHECK (type IN ('industry', 'concept', 'region')),
    
    -- 价格相关
    price NUMERIC DEFAULT 0,                        -- 板块指数
    change NUMERIC DEFAULT 0,                       -- 涨跌额
    change_percent NUMERIC DEFAULT 0,               -- 涨跌幅
    prev_close NUMERIC DEFAULT 0,                   -- 昨收
    
    -- 成交相关
    volume BIGINT DEFAULT 0,                        -- 成交量
    amount NUMERIC DEFAULT 0,                       -- 成交额
    
    -- 领涨股
    leading_stock_code TEXT,                        -- 领涨股代码
    leading_stock_name TEXT,                        -- 领涨股名称
    leading_stock_change NUMERIC,                   -- 领涨股涨幅
    
    -- 元数据
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sectors_code ON public.sectors(code);
CREATE INDEX IF NOT EXISTS idx_sectors_type ON public.sectors(type);
CREATE INDEX IF NOT EXISTS idx_sectors_change ON public.sectors(change_percent DESC);

COMMENT ON TABLE public.sectors IS '板块数据表';

-- ==========================================================
-- 4. 板块成分股表 (sector_stocks)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.sector_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_code TEXT NOT NULL REFERENCES public.sectors(code) ON DELETE CASCADE,
    stock_code TEXT NOT NULL,
    stock_name TEXT,
    
    -- 权重
    weight NUMERIC DEFAULT 0,                       -- 权重
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sector_code, stock_code)
);

CREATE INDEX IF NOT EXISTS idx_sector_stocks_sector ON public.sector_stocks(sector_code);
CREATE INDEX IF NOT EXISTS idx_sector_stocks_stock ON public.sector_stocks(stock_code);

COMMENT ON TABLE public.sector_stocks IS '板块成分股表';

-- ==========================================================
-- 5. 融资融券账户表 (margin_accounts)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.margin_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- 资产相关
    total_asset NUMERIC DEFAULT 0,                  -- 总资产
    available_cash NUMERIC DEFAULT 0,               -- 可用资金
    margin_balance NUMERIC DEFAULT 0,               -- 融资余额
    short_balance NUMERIC DEFAULT 0,                -- 融券余额
    maintenance_ratio NUMERIC DEFAULT 0,            -- 维持担保比例
    
    -- 额度相关
    margin_limit NUMERIC DEFAULT 0,                 -- 融资额度
    short_limit NUMERIC DEFAULT 0,                  -- 融券额度
    available_margin NUMERIC DEFAULT 0,             -- 可融资额度
    available_short NUMERIC DEFAULT 0,              -- 可融券额度
    
    -- 状态
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'liquidated')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_margin_accounts_user ON public.margin_accounts(user_id);

COMMENT ON TABLE public.margin_accounts IS '融资融券账户表';

-- ==========================================================
-- 6. 融资融券持仓表 (margin_positions)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.margin_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.margin_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- 股票信息
    symbol TEXT NOT NULL,
    name TEXT,
    
    -- 持仓信息
    quantity NUMERIC DEFAULT 0,                     -- 数量
    available_quantity NUMERIC DEFAULT 0,           -- 可用数量
    
    -- 类型
    position_type TEXT NOT NULL CHECK (position_type IN ('margin', 'short')),
    
    -- 成本相关
    cost_price NUMERIC DEFAULT 0,                   -- 成本价
    current_price NUMERIC DEFAULT 0,                -- 当前价
    market_value NUMERIC DEFAULT 0,                 -- 市值
    profit NUMERIC DEFAULT 0,                       -- 盈亏
    
    -- 利息
    interest_rate NUMERIC DEFAULT 0,                -- 利率
    interest_accrued NUMERIC DEFAULT 0,             -- 已计利息
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, symbol, position_type)
);

CREATE INDEX IF NOT EXISTS idx_margin_positions_account ON public.margin_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_margin_positions_user ON public.margin_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_margin_positions_symbol ON public.margin_positions(symbol);

COMMENT ON TABLE public.margin_positions IS '融资融券持仓表';

-- ==========================================================
-- 7. 用户设置表 (user_settings)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- 交易设置
    fast_order_mode BOOLEAN DEFAULT false,          -- 极速下单模式
    default_strategy TEXT DEFAULT 'limit',          -- 默认策略
    default_leverage NUMERIC DEFAULT 1,             -- 默认杠杆
    auto_stop_loss BOOLEAN DEFAULT false,           -- 自动止损
    
    -- 个人设置
    language TEXT DEFAULT 'zh-CN' CHECK (language IN ('zh-CN', 'zh-HK', 'en-US')),
    font_size TEXT DEFAULT 'standard' CHECK (font_size IN ('standard', 'large')),
    haptic_feedback BOOLEAN DEFAULT true,           -- 触觉反馈
    sound_effects BOOLEAN DEFAULT true,             -- 音效
    theme TEXT DEFAULT 'system' CHECK (theme IN ('dark', 'light', 'system')),
    
    -- 行情设置
    default_kline_period TEXT DEFAULT 'day',        -- 默认K线周期
    up_color TEXT DEFAULT 'red',                    -- 涨跌颜色
    show_avg_line BOOLEAN DEFAULT true,             -- 显示均线
    show_volume BOOLEAN DEFAULT true,               -- 显示成交量
    auto_refresh BOOLEAN DEFAULT true,              -- 自动刷新
    refresh_interval INT DEFAULT 5,                 -- 刷新间隔（秒）
    
    -- 条件单设置
    default_validity TEXT DEFAULT 'GTC',            -- 默认有效期
    trigger_method TEXT DEFAULT 'price',            -- 触发方式
    condition_notify BOOLEAN DEFAULT true,          -- 条件触发通知
    
    -- 通知设置
    trade_alerts_enabled BOOLEAN DEFAULT true,
    price_alerts_enabled BOOLEAN DEFAULT true,
    system_news_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);

COMMENT ON TABLE public.user_settings IS '用户设置表';

-- ==========================================================
-- 8. RLS 策略
-- ==========================================================

-- ETF产品：公开读取
ALTER TABLE public.etf_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read etf_products" ON public.etf_products FOR SELECT USING (true);
CREATE POLICY "Admin manage etf_products" ON public.etf_products FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- 理财产品：公开读取
ALTER TABLE public.wealth_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wealth_products" ON public.wealth_products FOR SELECT USING (true);
CREATE POLICY "Admin manage wealth_products" ON public.wealth_products FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- 板块：公开读取
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sectors" ON public.sectors FOR SELECT USING (true);
CREATE POLICY "Admin manage sectors" ON public.sectors FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- 板块成分股：公开读取
ALTER TABLE public.sector_stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sector_stocks" ON public.sector_stocks FOR SELECT USING (true);

-- 融资融券账户：用户自己管理
ALTER TABLE public.margin_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own margin_accounts" ON public.margin_accounts FOR ALL USING (auth.uid() = user_id);

-- 融资融券持仓：用户自己管理
ALTER TABLE public.margin_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own margin_positions" ON public.margin_positions FOR ALL USING (auth.uid() = user_id);

-- 用户设置：用户自己管理
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own user_settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- ==========================================================
-- 9. 触发器：自动更新 updated_at
-- ==========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加触发器
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['etf_products', 'wealth_products', 'sectors', 'margin_accounts', 'margin_positions', 'user_settings'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

COMMIT;
