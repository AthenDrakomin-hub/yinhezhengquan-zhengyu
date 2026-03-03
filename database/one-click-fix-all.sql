-- ========================================
-- 一键修复多级管理员权限体系
-- 执行此脚本即可完成所有配置
-- ========================================

-- ============ 第一步：添加字段 ============
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS admin_level TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES public.profiles(id);

-- 添加约束
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_admin_level_check') THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_admin_level_check 
    CHECK (admin_level IN ('super_admin', 'admin', 'user'));
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level ON public.profiles(admin_level);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_managed_by ON public.profiles(managed_by);

-- ============ 第二步：创建自动触发器 ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, username, role, admin_level, status, risk_level
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substring(NEW.id::text, 1, 8)),
    'user',
    'user',
    'ACTIVE',
    'C3-稳健型'
  );
  
  INSERT INTO public.assets (
    user_id, available_balance, frozen_balance, total_asset
  ) VALUES (
    NEW.id, 1000000.00, 0.00, 1000000.00
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============ 第三步：修复现有用户关联 ============
-- 为 auth.users 中存在但 profiles 中不存在的用户创建 profile
INSERT INTO public.profiles (id, email, username, role, admin_level, status)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', 'User_' || substring(au.id::text, 1, 8)),
  'user',
  'user',
  'ACTIVE'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = au.id)
ON CONFLICT (id) DO NOTHING;

-- 为新创建的 profiles 创建 assets
INSERT INTO public.assets (user_id, available_balance, frozen_balance, total_asset)
SELECT 
  p.id,
  1000000.00,
  0.00,
  1000000.00
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============ 第四步：设置三个账号权限 ============
-- 超级管理员
UPDATE public.profiles
SET 
  role = 'admin',
  admin_level = 'super_admin',
  status = 'ACTIVE',
  created_by = NULL,
  managed_by = NULL
WHERE email = 'athendrakomin@proton.me';

-- 普通管理员
UPDATE public.profiles
SET 
  role = 'admin',
  admin_level = 'admin',
  status = 'ACTIVE',
  created_by = (SELECT id FROM public.profiles WHERE email = 'athendrakomin@proton.me'),
  managed_by = (SELECT id FROM public.profiles WHERE email = 'athendrakomin@proton.me')
WHERE email = 'admin@zhengyu.com';

-- 普通用户
UPDATE public.profiles
SET 
  role = 'user',
  admin_level = 'user',
  status = 'ACTIVE',
  created_by = (SELECT id FROM public.profiles WHERE email = 'admin@zhengyu.com'),
  managed_by = (SELECT id FROM public.profiles WHERE email = 'admin@zhengyu.com')
WHERE email = 'zhangsan@qq.com';

-- ============ 第五步：更新 RLS 策略 ============
DROP POLICY IF EXISTS "管理员查看用户" ON public.profiles;
CREATE POLICY "管理员查看用户" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND admin_level = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND admin_level = 'admin'
      AND auth.uid() = public.profiles.created_by
    )
  );

-- ============ 验证结果 ============
SELECT 
  '✅ 修复完成' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('role', 'admin_level', 'status')) as fields_added,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') as triggers_created;

-- 显示三个账号状态
SELECT 
  email,
  username,
  role,
  admin_level,
  status,
  (SELECT email FROM public.profiles p2 WHERE p2.id = p1.created_by) as created_by_email
FROM public.profiles p1
WHERE email IN ('athendrakomin@proton.me', 'admin@zhengyu.com', 'zhangsan@qq.com')
ORDER BY 
  CASE admin_level
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    ELSE 3
  END;
