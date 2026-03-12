-- ========================================================
-- 股票信息数据表迁移
-- 版本: v1.0
-- 功能: 存储股票基本信息、财务数据、K线数据
-- 策略: 混合模式 - 公司资料/财务/K线存库，行情实时获取
-- ========================================================

BEGIN;

-- ==========================================================
-- 1. 股票基本信息表 (stock_info)
-- 存储：公司资料、财务数据、行业板块等
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.stock_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,                    -- 股票代码
    name TEXT NOT NULL,                             -- 股票名称
    market TEXT NOT NULL CHECK (market IN ('CN', 'HK')),  -- 市场
    
    -- 价格相关（缓存，用于快速展示）
    price NUMERIC DEFAULT 0,                        -- 最新价
    change NUMERIC DEFAULT 0,                       -- 涨跌额
    change_percent NUMERIC DEFAULT 0,               -- 涨跌幅
    prev_close NUMERIC DEFAULT 0,                   -- 昨收
    open NUMERIC DEFAULT 0,                         -- 今开
    high NUMERIC DEFAULT 0,                         -- 最高
    low NUMERIC DEFAULT 0,                          -- 最低
    volume BIGINT DEFAULT 0,                        -- 成交量
    amount NUMERIC DEFAULT 0,                       -- 成交额
    
    -- 公司资料
    industry TEXT,                                  -- 所属行业
    sector TEXT,                                    -- 所属板块
    listing_date DATE,                              -- 上市日期
    description TEXT,                               -- 公司简介
    chairman TEXT,                                  -- 董事长
    employees TEXT,                                 -- 员工人数
    website TEXT,                                   -- 公司网站
    main_business TEXT,                             -- 主营业务
    province TEXT,                                  -- 所在省份
    city TEXT,                                      -- 所在城市
    
    -- 财务数据
    pe NUMERIC,                                     -- 市盈率
    pb NUMERIC,                                     -- 市净率
    market_cap TEXT,                                -- 总市值
    total_shares TEXT,                              -- 总股本
    float_shares TEXT,                              -- 流通股
    dividend_yield TEXT,                            -- 股息率
    roe TEXT,                                       -- 净资产收益率
    net_profit_margin TEXT,                         -- 净利率
    gross_profit_margin TEXT,                       -- 毛利率
    debt_ratio TEXT,                                -- 资产负债率
    
    -- 元数据
    logo_url TEXT,                                  -- Logo URL
    data_source TEXT DEFAULT 'yinhe',               -- 数据来源
    last_sync_at TIMESTAMPTZ,                       -- 最后同步时间
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_stock_info_symbol ON public.stock_info(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_info_market ON public.stock_info(market);
CREATE INDEX IF NOT EXISTS idx_stock_info_industry ON public.stock_info(industry);
CREATE INDEX IF NOT EXISTS idx_stock_info_sector ON public.stock_info(sector);
CREATE INDEX IF NOT EXISTS idx_stock_info_sync ON public.stock_info(last_sync_at);

-- ==========================================================
-- 2. K线数据表 (stock_kline)
-- 存储：日K、周K、月K、60分钟K线等
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.stock_kline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,                           -- 股票代码
    period TEXT NOT NULL CHECK (period IN ('1m', '5m', '15m', '30m', '60m', 'day', 'week', 'month')),  -- 周期
    trade_date DATE NOT NULL,                       -- 交易日期
    trade_time TIME,                                -- 交易时间（分钟K线用）
    
    -- OHLCV
    open NUMERIC NOT NULL,                          -- 开盘价
    high NUMERIC NOT NULL,                          -- 最高价
    low NUMERIC NOT NULL,                           -- 最低价
    close NUMERIC NOT NULL,                         -- 收盘价
    volume BIGINT DEFAULT 0,                        -- 成交量
    amount NUMERIC DEFAULT 0,                       -- 成交额
    
    -- 额外数据
    turnover_rate NUMERIC,                          -- 换手率
    change_percent NUMERIC,                         -- 涨跌幅
    
    -- 元数据
    data_source TEXT DEFAULT 'yinhe',               -- 数据来源
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 唯一约束：同一股票、同一周期、同一日期只有一条记录
    UNIQUE(symbol, period, trade_date, COALESCE(trade_time, '00:00:00'::TIME))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_stock_kline_symbol ON public.stock_kline(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_kline_period ON public.stock_kline(period);
CREATE INDEX IF NOT EXISTS idx_stock_kline_date ON public.stock_kline(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_kline_symbol_period ON public.stock_kline(symbol, period, trade_date DESC);

-- ==========================================================
-- 3. 资金流向表 (stock_money_flow)
-- 存储：主力、散户、大单、小单资金流向
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.stock_money_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,                           -- 股票代码
    trade_date DATE NOT NULL,                       -- 交易日期
    
    -- 资金流向
    main_net_inflow NUMERIC DEFAULT 0,              -- 主力净流入
    retail_net_inflow NUMERIC DEFAULT 0,            -- 散户净流入
    super_large_net_inflow NUMERIC DEFAULT 0,       -- 超大单净流入
    large_net_inflow NUMERIC DEFAULT 0,             -- 大单净流入
    medium_net_inflow NUMERIC DEFAULT 0,            -- 中单净流入
    small_net_inflow NUMERIC DEFAULT 0,             -- 小单净流入
    
    -- 元数据
    data_source TEXT DEFAULT 'yinhe',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 唯一约束
    UNIQUE(symbol, trade_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_money_flow_symbol ON public.stock_money_flow(symbol);
CREATE INDEX IF NOT EXISTS idx_money_flow_date ON public.stock_money_flow(trade_date DESC);

-- ==========================================================
-- 4. RLS 策略
-- ==========================================================

-- 启用 RLS
ALTER TABLE public.stock_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_kline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_money_flow ENABLE ROW LEVEL SECURITY;

-- 公开读取（股票数据对所有人开放）
CREATE POLICY "allow_public_read_stock_info" ON public.stock_info FOR SELECT USING (true);
CREATE POLICY "allow_public_read_stock_kline" ON public.stock_kline FOR SELECT USING (true);
CREATE POLICY "allow_public_read_money_flow" ON public.stock_money_flow FOR SELECT USING (true);

-- 管理员和服务角色可以写入
CREATE POLICY "allow_admin_write_stock_info" ON public.stock_info FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "allow_admin_write_stock_kline" ON public.stock_kline FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "allow_admin_write_money_flow" ON public.stock_money_flow FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 服务角色（Edge Function）可以写入
CREATE POLICY "allow_service_write_stock_info" ON public.stock_info FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);
CREATE POLICY "allow_service_write_stock_kline" ON public.stock_kline FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);
CREATE POLICY "allow_service_write_money_flow" ON public.stock_money_flow FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

-- ==========================================================
-- 5. 触发器：自动更新 updated_at
-- ==========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_info_updated_at
    BEFORE UPDATE ON public.stock_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- 6. 插入常用股票数据（种子数据）
-- ==========================================================

INSERT INTO public.stock_info (symbol, name, market, industry, sector) VALUES
-- A股热门
('600519', '贵州茅台', 'CN', '白酒', '食品饮料'),
('000858', '五粮液', 'CN', '白酒', '食品饮料'),
('601318', '中国平安', 'CN', '保险', '金融'),
('000001', '平安银行', 'CN', '银行', '金融'),
('300750', '宁德时代', 'CN', '电池', '新能源'),
('600036', '招商银行', 'CN', '银行', '金融'),
('601166', '兴业银行', 'CN', '银行', '金融'),
('600887', '伊利股份', 'CN', '乳制品', '食品饮料'),
('600276', '恒瑞医药', 'CN', '化学制药', '医药'),
('600900', '长江电力', 'CN', '电力', '公用事业'),
('601398', '工商银行', 'CN', '银行', '金融'),
('601288', '农业银行', 'CN', '银行', '金融'),
('600030', '中信证券', 'CN', '证券', '金融'),
('601888', '中国中免', 'CN', '旅游零售', '消费'),
('002594', '比亚迪', 'CN', '汽车', '新能源'),
('000333', '美的集团', 'CN', '家电', '消费'),
('600000', '浦发银行', 'CN', '银行', '金融'),
('000002', '万科A', 'CN', '房地产', '地产'),
('601012', '隆基绿能', 'CN', '光伏', '新能源'),
('002415', '海康威视', 'CN', '安防', '科技'),
-- 港股热门
('00700', '腾讯控股', 'HK', '互联网', '科技'),
('09988', '阿里巴巴', 'HK', '互联网', '科技'),
('03690', '美团', 'HK', '互联网', '科技'),
('01810', '小米集团', 'HK', '手机', '科技'),
('01024', '快手', 'HK', '互联网', '科技'),
('00941', '中国移动', 'HK', '通信', '通信'),
('02318', '中国平安', 'HK', '保险', '金融'),
('01299', '友邦保险', 'HK', '保险', '金融'),
('00883', '中国海洋石油', 'HK', '石油', '能源'),
('00388', '香港交易所', 'HK', '交易所', '金融')
ON CONFLICT (symbol) DO NOTHING;

COMMIT;
