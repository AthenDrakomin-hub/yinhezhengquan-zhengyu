-- ==========================================================
-- 修复 wealth_products 表缺失字段
-- 创建时间: 2026-03-16
-- 问题: 代码查询 order 字段，但数据库表没有此字段
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. 添加缺失字段
-- ==========================================================

-- 添加排序字段
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- 添加是否精选字段
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 添加是否VIP专属字段
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS vip_only BOOLEAN DEFAULT FALSE;

-- 添加最低VIP等级字段
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS min_vip_level INTEGER DEFAULT 0;

-- 添加特性字段（数组）
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';

-- 添加开始日期字段
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS start_date DATE;

-- 添加结束日期字段
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS end_date DATE;

-- 添加 return_type 字段（如果不存在）
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS return_type TEXT DEFAULT 'fixed';

-- 添加 increment 字段（如果不存在）
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS increment NUMERIC DEFAULT 1000;

-- 添加 period_type 字段（如果不存在）
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'fixed';

-- 添加 tag 字段（如果不存在）
ALTER TABLE public.wealth_products ADD COLUMN IF NOT EXISTS tag TEXT;

-- ==========================================================
-- 2. 添加索引
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_wealth_products_order ON public.wealth_products("order");
CREATE INDEX IF NOT EXISTS idx_wealth_products_featured ON public.wealth_products(is_featured) WHERE is_featured = TRUE;

-- ==========================================================
-- 3. 更新 RLS 策略（使用统一的 is_admin 函数）
-- ==========================================================

DROP POLICY IF EXISTS "Public read wealth_products" ON public.wealth_products;
DROP POLICY IF EXISTS "Admin manage wealth_products" ON public.wealth_products;

-- 公开读取
CREATE POLICY "Public read wealth_products" ON public.wealth_products
    FOR SELECT USING (true);

-- 管理员完全访问
CREATE POLICY "Admin manage wealth_products" ON public.wealth_products
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
-- 4. 更新现有产品的 order 字段（按创建时间排序）
-- ==========================================================

UPDATE public.wealth_products
SET "order" = subq.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM public.wealth_products
) as subq
WHERE public.wealth_products.id = subq.id
AND public.wealth_products."order" IS NULL OR public.wealth_products."order" = 0;

-- ==========================================================
-- 5. 添加注释
-- ==========================================================

COMMENT ON COLUMN public.wealth_products."order" IS '排序序号，数字越小越靠前';
COMMENT ON COLUMN public.wealth_products.is_featured IS '是否为精选产品';
COMMENT ON COLUMN public.wealth_products.vip_only IS '是否为VIP专属产品';
COMMENT ON COLUMN public.wealth_products.min_vip_level IS '最低VIP等级要求';
COMMENT ON COLUMN public.wealth_products.features IS '产品特性标签数组';

COMMIT;
