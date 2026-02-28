-- 扩展新股信息表(ipos)以支持更多字段，对齐新浪财经数据
-- 添加申购代码、发行数量、市盈率等相关字段

-- 检查并创建 ipos 表（如果不存在）
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

-- 添加新字段（如果不存在）
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.ipos ADD COLUMN subscription_code TEXT;
    EXCEPTION
        WHEN duplicate_column THEN
            -- 如果列已存在，则忽略
            RAISE NOTICE 'Column subscription_code already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN issue_volume BIGINT; -- 发行总量(万股)
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column issue_volume already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN online_issue_volume BIGINT; -- 上网发行量(万股)
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column online_issue_volume already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN pe_ratio NUMERIC(8,2); -- 市盈率
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column pe_ratio already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN issue_date DATE; -- 发行日期
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column issue_date already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN online_issue_date DATE; -- 上网发行日期
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column online_issue_date already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN lottery_date DATE; -- 配号日期
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column lottery_date already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN refund_date DATE; -- 退款日期
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column refund_date already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN listing_date_plan DATE; -- 计划上市日期
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column listing_date_plan already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN issue_method TEXT; -- 发行方式
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column issue_method already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN underwriter TEXT; -- 主承销商
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column underwriter already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN min_subscription_unit INTEGER DEFAULT 500; -- 最小申购单位
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column min_subscription_unit already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN max_subscription_quantity BIGINT; -- 个人申购上限(股)
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column max_subscription_quantity already exists';
    END;

    BEGIN
        ALTER TABLE public.ipos ADD COLUMN lockup_period INTEGER; -- 锁定期(月)
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column lockup_period already exists';
    END;
END $$;

-- 更新表注释
COMMENT ON COLUMN public.ipos.subscription_code IS '申购代码';
COMMENT ON COLUMN public.ipos.issue_volume IS '发行总量(万股)';
COMMENT ON COLUMN public.ipos.online_issue_volume IS '上网发行量(万股)';
COMMENT ON COLUMN public.ipos.pe_ratio IS '发行市盈率';
COMMENT ON COLUMN public.ipos.issue_date IS '发行日期';
COMMENT ON COLUMN public.ipos.online_issue_date IS '上网发行日期';
COMMENT ON COLUMN public.ipos.lottery_date IS '配号日期';
COMMENT ON COLUMN public.ipos.refund_date IS '退款日期';
COMMENT ON COLUMN public.ipos.listing_date_plan IS '计划上市日期';
COMMENT ON COLUMN public.ipos.issue_method IS '发行方式';
COMMENT ON COLUMN public.ipos.underwriter IS '主承销商';
COMMENT ON COLUMN public.ipos.min_subscription_unit IS '最小申购单位(股)';
COMMENT ON COLUMN public.ipos.max_subscription_quantity IS '个人申购上限(股)';
COMMENT ON COLUMN public.ipos.lockup_period IS '锁定期(月)';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_ipos_subscription_code ON public.ipos(subscription_code);
CREATE INDEX IF NOT EXISTS idx_ipos_online_issue_date ON public.ipos(online_issue_date);
CREATE INDEX IF NOT EXISTS idx_ipos_status_subscription_date ON public.ipos(status, online_issue_date);