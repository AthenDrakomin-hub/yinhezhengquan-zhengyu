-- ==========================================================
-- 修复 profiles 表结构和字段不一致问题
-- 创建时间: 2026-03-16
-- 问题: profiles 表缺少关键字段，且 role/admin_level 不一致
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. 添加 profiles 表缺失字段
-- ==========================================================

-- 添加 role 字段（用户角色：USER, ADMIN, SUPER_ADMIN）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER';
UPDATE public.profiles SET role = 'USER' WHERE role IS NULL;

-- 添加 status 字段（用户状态：ACTIVE, BANNED, PENDING）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
UPDATE public.profiles SET status = 'ACTIVE' WHERE status IS NULL;

-- 添加 phone 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 添加 id_card 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card TEXT;

-- 添加 real_name 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS real_name TEXT;

-- 添加 display_name 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 添加 avatar_url 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 添加 admin_level 字段（兼容旧逻辑）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_level TEXT DEFAULT 'user';

-- 添加 api_key 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_key TEXT;

-- 添加 api_secret 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_secret TEXT;

-- 添加 created_by 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- 添加 managed_by 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES public.profiles(id);

-- 添加 nickname 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname TEXT;

-- ==========================================================
-- 2. 添加约束和索引
-- ==========================================================

-- 添加 role 约束
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN'));

-- 添加 status 约束
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
  CHECK (status IN ('ACTIVE', 'BANNED', 'PENDING', 'INACTIVE'));

-- 添加 admin_level 约束
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_admin_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_admin_level_check 
  CHECK (admin_level IN ('super_admin', 'admin', 'user'));

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- ==========================================================
-- 3. 同步 role 和 admin_level 字段
-- ==========================================================

-- 同步 admin_level 到 role（大写格式）
UPDATE public.profiles SET role = 'SUPER_ADMIN' WHERE admin_level = 'super_admin';
UPDATE public.profiles SET role = 'ADMIN' WHERE admin_level = 'admin';
UPDATE public.profiles SET role = 'USER' WHERE admin_level = 'user' OR admin_level IS NULL;

-- 同步 role 到 admin_level（小写格式）
UPDATE public.profiles SET admin_level = 'super_admin' WHERE role = 'SUPER_ADMIN';
UPDATE public.profiles SET admin_level = 'admin' WHERE role = 'ADMIN';
UPDATE public.profiles SET admin_level = 'user' WHERE role = 'USER' OR role IS NULL;

-- ==========================================================
-- 4. 更新触发器函数（确保新用户有正确的字段）
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建用户资料
  INSERT INTO public.profiles (
    id, email, username, role, admin_level, status, risk_level
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substring(NEW.id::text, 1, 8)),
    'USER',
    'user',
    'ACTIVE',
    'C3-稳健型'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- 创建用户资产
  INSERT INTO public.assets (
    user_id, available_balance, frozen_balance, total_asset
  ) VALUES (
    NEW.id, 1000000.00, 0.00, 1000000.00
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 5. 统一 RLS 策略（使用 role 字段，大写格式）
-- ==========================================================

-- ==================== profiles 表 RLS ====================
-- 删除旧策略
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;

-- 创建新的管理员策略（支持 role 和 admin_level 两种方式）
CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    role IN ('ADMIN', 'SUPER_ADMIN') 
    OR admin_level IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role IN ('ADMIN', 'SUPER_ADMIN') OR p.admin_level IN ('admin', 'super_admin'))
    )
  );

-- ==================== assets 表 RLS ====================
-- 确保用户可以查看和更新自己的资产
DO $$ BEGIN
    CREATE POLICY "Users view own assets" ON public.assets 
      FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users update own assets" ON public.assets 
      FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 管理员策略
DROP POLICY IF EXISTS "admin_assets_all" ON public.assets;
CREATE POLICY "admin_assets_all" ON public.assets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role IN ('ADMIN', 'SUPER_ADMIN') OR p.admin_level IN ('admin', 'super_admin'))
    )
  );

-- ==================== trades 表 RLS ====================
DROP POLICY IF EXISTS "admin_trades_all" ON public.trades;
CREATE POLICY "admin_trades_all" ON public.trades
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role IN ('ADMIN', 'SUPER_ADMIN') OR p.admin_level IN ('admin', 'super_admin'))
    )
  );

-- ==================== holdings 表 RLS ====================
DROP POLICY IF EXISTS "admin_holdings_all" ON public.holdings;
CREATE POLICY "admin_holdings_all" ON public.holdings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role IN ('ADMIN', 'SUPER_ADMIN') OR p.admin_level IN ('admin', 'super_admin'))
    )
  );

-- ==================== positions 表 RLS ====================
DROP POLICY IF EXISTS "admin_positions_all" ON public.positions;
CREATE POLICY "admin_positions_all" ON public.positions
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
-- 6. 添加注释
-- ==========================================================

COMMENT ON COLUMN public.profiles.role IS '用户角色：USER(普通用户), ADMIN(管理员), SUPER_ADMIN(超级管理员)';
COMMENT ON COLUMN public.profiles.admin_level IS '管理员级别（兼容字段）：super_admin, admin, user';
COMMENT ON COLUMN public.profiles.status IS '用户状态：ACTIVE(正常), BANNED(封禁), PENDING(待审核), INACTIVE(未激活)';
COMMENT ON COLUMN public.profiles.phone IS '手机号';
COMMENT ON COLUMN public.profiles.id_card IS '身份证号';
COMMENT ON COLUMN public.profiles.real_name IS '真实姓名';

COMMIT;
