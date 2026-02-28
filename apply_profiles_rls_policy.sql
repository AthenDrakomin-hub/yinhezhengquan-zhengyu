-- 应用缺失的RLS策略到profiles表

-- 检查当前profiles表的RLS策略
SELECT 
    tablename,
    policyname,
    cmd,
    qual as condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 应用正确的RLS策略到profiles表
-- 1. 用户可以查看自己的个人资料
DROP POLICY IF EXISTS "用户可以查看自己的个人资料" ON public.profiles;
CREATE POLICY "用户可以查看自己的个人资料" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. 管理员可以查看所有个人资料（使用正确的子查询方式）
DROP POLICY IF EXISTS "管理员可以查看所有个人资料" ON public.profiles;
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

-- 3. 管理员可以更新所有个人资料（使用正确的子查询方式）
DROP POLICY IF EXISTS "管理员可以更新所有个人资料" ON public.profiles;
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

-- 验证策略是否已应用
SELECT 
    tablename,
    policyname,
    cmd,
    qual as condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 验证管理员用户
SELECT 
    id,
    username,
    role,
    status
FROM public.profiles 
WHERE role = 'admin';