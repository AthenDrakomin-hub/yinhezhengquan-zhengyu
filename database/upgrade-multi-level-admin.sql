-- ========================================
-- 多级管理员权限体系升级
-- ========================================

-- 1. 添加管理员层级字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_level TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES public.profiles(id);

-- 2. 创建管理员层级枚举约束
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_admin_level_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_admin_level_check 
    CHECK (admin_level IN ('super_admin', 'admin', 'user'));
  END IF;
END $$;

-- 3. 更新现有管理员为超级管理员
UPDATE public.profiles
SET admin_level = 'super_admin'
WHERE role = 'admin';

-- 4. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_managed_by ON public.profiles(managed_by);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level ON public.profiles(admin_level);

-- 5. 更新RLS策略 - 管理员只能看到自己创建的用户
DROP POLICY IF EXISTS "管理员查看用户" ON public.profiles;
CREATE POLICY "管理员查看用户" ON public.profiles
  FOR SELECT
  USING (
    -- 用户可以查看自己
    auth.uid() = id
    OR
    -- 超级管理员可以查看所有人
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND admin_level = 'super_admin'
    )
    OR
    -- 普通管理员可以查看自己创建的用户
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND admin_level = 'admin'
      AND auth.uid() = public.profiles.created_by
    )
  );

-- 6. 创建管理员操作函数
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  p_email TEXT,
  p_username TEXT,
  p_password TEXT,
  p_role TEXT DEFAULT 'user',
  p_admin_level TEXT DEFAULT 'user'
)
RETURNS JSONB AS $$
DECLARE
  v_admin_level TEXT;
  v_new_user_id UUID;
BEGIN
  -- 检查当前用户是否为管理员
  SELECT admin_level INTO v_admin_level
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_admin_level IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '无权限');
  END IF;

  -- 超级管理员可以创建任何角色
  -- 普通管理员只能创建普通用户
  IF v_admin_level = 'admin' AND p_admin_level != 'user' THEN
    RETURN jsonb_build_object('success', false, 'error', '普通管理员只能创建普通用户');
  END IF;

  -- 创建Auth用户
  -- 注意：这里需要使用Supabase Admin API，SQL无法直接创建Auth用户
  -- 实际实现需要在Edge Function中完成

  -- 创建Profile记录
  INSERT INTO public.profiles (
    email, 
    username, 
    role, 
    admin_level,
    created_by,
    managed_by,
    status
  ) VALUES (
    p_email,
    p_username,
    p_role,
    p_admin_level,
    auth.uid(),
    auth.uid(),
    'ACTIVE'
  ) RETURNING id INTO v_new_user_id;

  -- 创建资产记录
  INSERT INTO public.assets (user_id, available_balance, total_asset)
  VALUES (v_new_user_id, 1000000, 1000000);

  RETURN jsonb_build_object('success', true, 'user_id', v_new_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 验证升级
SELECT 
  '升级完成' as status,
  COUNT(*) FILTER (WHERE admin_level = 'super_admin') as super_admin_count,
  COUNT(*) FILTER (WHERE admin_level = 'admin') as admin_count,
  COUNT(*) FILTER (WHERE admin_level = 'user') as user_count
FROM public.profiles;

-- 8. 显示当前管理员结构
SELECT 
  id,
  email,
  username,
  role,
  admin_level,
  created_by,
  (SELECT email FROM public.profiles p2 WHERE p2.id = p1.created_by) as created_by_email
FROM public.profiles p1
ORDER BY admin_level DESC, created_at;
