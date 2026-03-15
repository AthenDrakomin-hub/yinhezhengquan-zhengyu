-- ============================================================
-- 股票基础信息表
-- ============================================================
-- 说明：
-- 1. 存储A股市场所有股票的基础信息
-- 2. 支持沪市(SH)、深市(SZ)、北交所(BJ)
-- 3. 用于股票搜索、详情展示等功能
-- ============================================================

-- 股票基础信息表
CREATE TABLE IF NOT EXISTS stocks (
  code TEXT PRIMARY KEY,           -- 股票代码（如 600000）
  symbol TEXT NOT NULL,            -- 完整代码（如 sh600000）
  name TEXT NOT NULL,              -- 股票名称
  market TEXT NOT NULL,            -- 市场：SH/SZ/BJ
  industry TEXT,                   -- 所属行业
  sector TEXT,                     -- 所属板块
  list_date DATE,                  -- 上市日期
  total_shares BIGINT,             -- 总股本（万股）
  circ_shares BIGINT,              -- 流通股本（万股）
  status TEXT DEFAULT 'NORMAL',    -- 状态：NORMAL/ST/DELISTED
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_stocks_market ON stocks(market);
CREATE INDEX IF NOT EXISTS idx_stocks_industry ON stocks(industry);
CREATE INDEX IF NOT EXISTS idx_stocks_name ON stocks USING gin(to_tsvector('simple', name));

-- RLS
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON stocks FOR SELECT USING (true);

-- 插入热门股票种子数据
INSERT INTO stocks (code, symbol, name, market, industry, sector, list_date, total_shares, circ_shares) VALUES
-- 沪市主板
('600000', 'sh600000', '浦发银行', 'SH', '银行', '金融', '1999-11-10', 2935208, 2935208),
('600036', 'sh600036', '招商银行', 'SH', '银行', '金融', '2002-04-09', 2521994, 2521994),
('600519', 'sh600519', '贵州茅台', 'SH', '白酒', '消费', '2001-08-27', 1256198, 1256198),
('601318', 'sh601318', '中国平安', 'SH', '保险', '金融', '2007-03-01', 1828051, 1828051),
('601398', 'sh601398', '工商银行', 'SH', '银行', '金融', '2006-10-27', 35640625, 26961222),
('601857', 'sh601857', '中国石油', 'SH', '石油', '能源', '2007-11-05', 18302097, 18302097),
('601939', 'sh601939', '建设银行', 'SH', '银行', '金融', '2007-09-25', 25001097, 9593658),
('601988', 'sh601988', '中国银行', 'SH', '银行', '金融', '2006-07-05', 29438779, 21076545),
('600276', 'sh600276', '恒瑞医药', 'SH', '医药', '医疗健康', '2000-10-18', 637863, 637863),
('600887', 'sh600887', '伊利股份', 'SH', '食品饮料', '消费', '1996-03-12', 639889, 639889),
('601888', 'sh601888', '中国中免', 'SH', '零售', '消费', '2009-10-15', 195248, 195248),
('600900', 'sh600900', '长江电力', 'SH', '电力', '公用事业', '2003-11-18', 2273212, 2273212),
('601166', 'sh601166', '兴业银行', 'SH', '银行', '金融', '2007-02-05', 2077405, 2077405),
('600309', 'sh600309', '万华化学', 'SH', '化工', '基础化工', '2001-01-05', 313974, 313974),
('600585', 'sh600585', '海螺水泥', 'SH', '水泥', '建筑材料', '2002-02-07', 529930, 529930),
-- 深市主板
('000001', 'sz000001', '平安银行', 'SZ', '银行', '金融', '1991-04-03', 1940508, 1940508),
('000002', 'sz000002', '万科A', 'SZ', '房地产', '地产', '1991-01-29', 1193071, 1193071),
('000333', 'sz000333', '美的集团', 'SZ', '家电', '消费', '2013-09-18', 702169, 702169),
('000651', 'sz000651', '格力电器', 'SZ', '家电', '消费', '1996-11-18', 563141, 563141),
('000858', 'sz000858', '五粮液', 'SZ', '白酒', '消费', '1998-04-27', 388155, 388155),
('002594', 'sz002594', '比亚迪', 'SZ', '汽车', '新能源', '2011-06-30', 291114, 291114),
('002415', 'sz002415', '海康威视', 'SZ', '电子', '科技', '2010-05-28', 933040, 933040),
('002352', 'sz002352', '顺丰控股', 'SZ', '物流', '交通运输', '2010-02-05', 455644, 455644),
('000725', 'sz000725', '京东方A', 'SZ', '电子', '科技', '2001-01-12', 4145867, 4145867),
('002475', 'sz002475', '立讯精密', 'SZ', '电子', '科技', '2010-09-15', 713408, 713408),
-- 创业板
('300750', 'sz300750', '宁德时代', 'SZ', '电池', '新能源', '2018-06-11', 439881, 439881),
('300059', 'sz300059', '东方财富', 'SZ', '互联网', '金融科技', '2010-03-19', 1573804, 1573804),
('300015', 'sz300015', '爱尔眼科', 'SZ', '医疗', '医疗健康', '2009-10-30', 710595, 710595),
('300014', 'sz300014', '亿纬锂能', 'SZ', '电池', '新能源', '2009-10-30', 204852, 204852),
('300760', 'sz300760', '迈瑞医疗', 'SZ', '医疗设备', '医疗健康', '2018-10-16', 121259, 121259),
-- 科创板
('688981', 'sh688981', '中芯国际', 'SH', '半导体', '科技', '2020-07-16', 193846, 193846),
('688012', 'sh688012', '中微公司', 'SH', '半导体', '科技', '2019-07-22', 53549, 53549),
('688111', 'sh688111', '金山办公', 'SH', '软件', '科技', '2019-11-18', 46151, 46151),
('688599', 'sh688599', '天合光能', 'SH', '光伏', '新能源', '2020-06-10', 217343, 217343),
-- 北交所
('830799', 'bj830799', '贝特瑞', 'BJ', '电池材料', '新能源', '2021-11-15', 68708, 68708),
('836260', 'bj836260', '三星医疗', 'BJ', '医疗', '医疗健康', '2021-11-15', 125600, 125600)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry,
  sector = EXCLUDED.sector,
  updated_at = NOW();

-- 评论
COMMENT ON TABLE stocks IS '股票基础信息表';
COMMENT ON COLUMN stocks.code IS '股票代码';
COMMENT ON COLUMN stocks.symbol IS '完整代码（含市场前缀）';
COMMENT ON COLUMN stocks.market IS '市场：SH=沪市, SZ=深市, BJ=北交所';
COMMENT ON COLUMN stocks.industry IS '所属行业';
COMMENT ON COLUMN stocks.sector IS '所属板块';

-- 理财产品表
CREATE TABLE IF NOT EXISTS wealth_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,         -- 产品代码
  name TEXT NOT NULL,                -- 产品名称
  type TEXT NOT NULL,                -- 类型：DEPOSIT/BOND/FUND/STRUCTURED
  risk_level TEXT DEFAULT 'R2',      -- 风险等级：R1-R5
  expected_rate DECIMAL(5,2),        -- 预期收益率（%）
  min_amount DECIMAL(12,2) DEFAULT 1000, -- 起购金额
  period INTEGER,                    -- 期限（天）
  issuer TEXT,                       -- 发行机构
  status TEXT DEFAULT 'ONSALE',      -- 状态：ONSALE/ENDED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE wealth_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON wealth_products FOR SELECT USING (true);

-- 插入理财产品种子数据
INSERT INTO wealth_products (code, name, type, risk_level, expected_rate, min_amount, period, issuer) VALUES
('YH001', '银河稳利1号', 'BOND', 'R2', 3.45, 10000, 90, '银河证券'),
('YH002', '银河增益2号', 'BOND', 'R2', 3.85, 50000, 180, '银河证券'),
('YH003', '银河优选3号', 'STRUCTURED', 'R3', 4.50, 100000, 365, '银河证券'),
('YH004', '银河安盈1号', 'DEPOSIT', 'R1', 2.15, 1000, 30, '银河证券'),
('YH005', '银河天添利', 'DEPOSIT', 'R1', 1.85, 1, 1, '银河证券'),
('YH006', '银河双利宝', 'BOND', 'R2', 3.20, 5000, 60, '银河证券'),
('YH007', '银河科创主题', 'FUND', 'R4', 8.50, 10000, NULL, '银河证券'),
('YH008', '银河量化对冲', 'FUND', 'R3', 5.80, 50000, NULL, '银河证券'),
('YH009', '银河稳健增值', 'BOND', 'R2', 4.10, 20000, 270, '银河证券'),
('YH010', '银河央企债', 'BOND', 'R2', 3.95, 10000, 365, '银河证券')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  expected_rate = EXCLUDED.expected_rate;

-- 基金信息表
CREATE TABLE IF NOT EXISTS funds (
  code TEXT PRIMARY KEY,             -- 基金代码
  name TEXT NOT NULL,                -- 基金名称
  type TEXT NOT NULL,                -- 类型：STOCK/BOND/MIXED/MONEY/INDEX/ETF
  manager TEXT,                      -- 基金经理
  company TEXT,                      -- 基金公司
  nav DECIMAL(10,4),                 -- 单位净值
  nav_date DATE,                     -- 净值日期
  accumulated_nav DECIMAL(10,4),     -- 累计净值
  day_growth DECIMAL(6,2),           -- 日涨跌幅
  risk_level TEXT DEFAULT 'R3',      -- 风险等级
  status TEXT DEFAULT 'NORMAL',      -- 状态
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON funds FOR SELECT USING (true);

-- 插入基金种子数据
INSERT INTO funds (code, name, type, manager, company, nav, nav_date, accumulated_nav, day_growth, risk_level) VALUES
('110022', '易方达消费行业', 'STOCK', '萧楠', '易方达基金', 4.8520, '2024-03-14', 4.9720, 1.25, 'R4'),
('000011', '华夏大盘精选', 'STOCK', '刘彦春', '华夏基金', 18.5630, '2024-03-14', 28.5630, 0.85, 'R4'),
('161725', '招商中证白酒', 'INDEX', '侯昊', '招商基金', 1.2380, '2024-03-14', 2.4560, 2.15, 'R4'),
('159996', '消费ETF', 'ETF', '林伟斌', '华夏基金', 3.5680, '2024-03-14', 3.5680, 1.56, 'R4'),
('510300', '沪深300ETF', 'ETF', '方星', '华泰柏瑞', 3.8560, '2024-03-14', 3.8560, 0.75, 'R3'),
('510500', '中证500ETF', 'ETF', '刘珂', '南方基金', 5.8630, '2024-03-14', 5.8630, 0.92, 'R3'),
('159915', '创业板ETF', 'ETF', '王华', '易方达基金', 2.1560, '2024-03-14', 2.1560, 1.35, 'R4'),
('110018', '易方达增强回报A', 'BOND', '王晓晨', '易方达基金', 1.5230, '2024-03-14', 2.1560, 0.05, 'R2'),
('000001', '华夏成长混合', 'MIXED', '代毅', '华夏基金', 2.3560, '2024-03-14', 3.2560, 0.45, 'R3'),
('000198', '天弘余额宝', 'MONEY', '王登峰', '天弘基金', 1.0000, '2024-03-14', 1.0000, 0.01, 'R1')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  nav = EXCLUDED.nav,
  nav_date = EXCLUDED.nav_date;

-- 通知 PostgREST 重新加载 schema
NOTIFY pgrst, 'reload schema';
