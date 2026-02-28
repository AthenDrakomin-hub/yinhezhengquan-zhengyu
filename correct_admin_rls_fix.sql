-- 修复管理员RLS策略的正确SQL脚本

-- 首先检查当前的RLS策略
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 删除有问题的RLS策略
DROP POLICY IF EXISTS "管理员可以查看所有个人资料" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以更新所有个人资料" ON public.profiles;

-- 创建正确的RLS策略 - 使用子查询方式验证管理员权限
-- 管理员可以查看所有个人资料
CREATE POLICY "管理员可以查看所有个人资料" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin' 
      AND admin_profile.status = 'ACTIVE'
    )
  );

-- 管理员可以更新所有个人资料
CREATE POLICY "管理员可以更新所有个人资料" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin' 
      AND admin_profile.status = 'ACTIVE'
    )
  );

-- 验证RLS策略是否正确创建
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 测试当前用户的管理员权限（需要在已认证的会话中运行）
-- SELECT 
--     auth.uid() as current_user_id,
--     EXISTS (
--         SELECT 1 FROM public.profiles p 
--         WHERE p.id = auth.uid() 
--         AND p.role = 'admin' 
--         AND p.status = 'ACTIVE'
--     ) as is_admin_user;

-- 查看所有管理员用户
SELECT 
    id,
    username,
    role,
    status,
    created_at
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;