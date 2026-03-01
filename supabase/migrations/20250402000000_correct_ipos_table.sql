-- ========================================================
-- 正确的 public.ipos 表结构
-- 版本: v1.0 (2026-02-28)
-- ========================================================

BEGIN;

-- 1) 创建扩展（用于 gen_random_uuid）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) 删除旧表（如果存在冲突的旧结构）
DROP TABLE IF EXISTS public.ipos CASCADE;

-- 3) 创建新表
CREATE TABLE public.ipos (
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
  update_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4) 创建索引
CREATE INDEX idx_ipos_symbol ON public.ipos(symbol);
CREATE INDEX idx_ipos_market ON public.ipos(market);
CREATE INDEX idx_ipos_status ON public.ipos(status);
CREATE INDEX idx_ipos_listing_date ON public.ipos(listing_date);

-- 5) 启用 RLS
ALTER TABLE public.ipos ENABLE ROW LEVEL SECURITY;

-- 6) RLS 策略：所有人可读（包括匿名用户）
DROP POLICY IF EXISTS "allow_public_read_ipos" ON public.ipos;
CREATE POLICY "allow_public_read_ipos" ON public.ipos
  FOR SELECT USING (true);

-- 7) RLS 策略：仅管理员可插入
DROP POLICY IF EXISTS "allow_admin_insert_ipos" ON public.ipos;
CREATE POLICY "allow_admin_insert_ipos" ON public.ipos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8) RLS 策略：仅管理员可更新
DROP POLICY IF EXISTS "allow_admin_update_ipos" ON public.ipos;
CREATE POLICY "allow_admin_update_ipos" ON public.ipos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 9) RLS 策略：仅管理员可删除
DROP POLICY IF EXISTS "allow_admin_delete_ipos" ON public.ipos;
CREATE POLICY "allow_admin_delete_ipos" ON public.ipos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 10) 权限设置
GRANT SELECT ON public.ipos TO anon, authenticated;
GRANT ALL ON public.ipos TO service_role;

COMMIT;
