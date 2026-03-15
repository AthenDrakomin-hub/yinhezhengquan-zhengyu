-- ==========================================================
-- 修复 funds 表缺失字段并添加兼容视图
-- 创建时间: 2026-03-16
-- 问题: 代码查询 order/is_featured 字段，但数据库表没有
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. 添加缺失字段
-- ==========================================================

-- 添加排序字段
ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- 添加是否精选字段
ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 添加标签字段
ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 添加类型字段（小写格式，兼容代码）
ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS type VARCHAR(30);

-- 同步 type 字段（从 fund_type 复制）
UPDATE public.funds SET type = LOWER(REPLACE(fund_type, '型', '')) WHERE type IS NULL;

-- ==========================================================
-- 2. 添加索引
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_funds_order ON public.funds("order");
CREATE INDEX IF NOT EXISTS idx_funds_featured ON public.funds(is_featured) WHERE is_featured = TRUE;

-- ==========================================================
-- 3. 更新 RLS 策略（使用统一的 is_admin 函数）
-- ==========================================================

DROP POLICY IF EXISTS "Public read funds" ON public.funds;
DROP POLICY IF EXISTS "Admin manage funds" ON public.funds;

-- 公开读取
CREATE POLICY "Public read funds" ON public.funds
    FOR SELECT USING (true);

-- 管理员完全访问
CREATE POLICY "Admin manage funds" ON public.funds
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role IN ('ADMIN', 'SUPER_ADMIN') OR p.admin_level IN ('admin', 'super_admin'))
        )
    );

-- ==========================================================
-- 4. 更新现有基金的 order 字段（按创建时间排序）
-- ==========================================================

UPDATE public.funds
SET "order" = subq.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM public.funds
) as subq
WHERE public.funds.id = subq.id
AND (public.funds."order" IS NULL OR public.funds."order" = 0);

-- ==========================================================
-- 5. 创建兼容视图 fund_products（指向 funds 表）
-- ==========================================================

CREATE OR REPLACE VIEW public.fund_products AS
SELECT 
    id,
    code,
    name,
    COALESCE(type, LOWER(REPLACE(fund_type, '型', ''))) as type,
    nav,
    nav_date,
    day_change_rate as day_growth,
    one_week_return as week_growth,
    one_month_return as month_growth,
    one_year_return as year_growth,
    since_inception_return as total_growth,
    risk_level,
    min_purchase,
    purchase_fee_rate as purchase_fee,
    redeem_fee_rate as redemption_fee,
    status,
    manager,
    company,
    description,
    "order",
    is_featured,
    tags,
    created_at,
    updated_at
FROM public.funds;

-- 为视图设置权限
GRANT SELECT ON public.fund_products TO authenticated;
GRANT SELECT ON public.fund_products TO anon;

-- ==========================================================
-- 6. 添加注释
-- ==========================================================

COMMENT ON COLUMN public.funds."order" IS '排序序号，数字越小越靠前';
COMMENT ON COLUMN public.funds.is_featured IS '是否为精选基金';
COMMENT ON COLUMN public.funds.tags IS '标签数组';

COMMENT ON VIEW public.fund_products IS '基金产品兼容视图，映射 funds 表';

COMMIT;
