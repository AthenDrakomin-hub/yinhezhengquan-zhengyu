-- 添加 metadata JSONB 字段到 trades 表
-- 用于存储各交易类型的额外信息（IPO发行价、大宗折扣、涨停价等）
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_trades_metadata ON public.trades USING gin(metadata);

-- 注释：metadata字段将存储以下类型的信息：
-- 1. IPO交易: {"issuePrice": 10.5, "listingDate": "2024-01-15", "ipoStatus": "ONGOING"}
-- 2. 大宗交易: {"blockDiscount": 0.95, "minBlockSize": 100000, "originalPrice": 50.25}
-- 3. 涨停打板: {"limitUpPrice": 15.80, "limitDownPrice": 12.96, "buyOneVolume": 50000}
-- 4. 普通交易: {} (空对象)

-- 注意：生产环境执行前请备份数据