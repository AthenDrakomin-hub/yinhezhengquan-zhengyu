-- 修复管理员RLS策略的SQL脚本

-- 修复profiles表的RLS策略
-- 当前策略使用JWT中的role字段，应该使用profiles表中的role字段

-- 1. 删除旧的RLS策略
DROP POLICY IF EXISTS "管理员可以查看所有个人资料" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以更新所有个人资料" ON public.profiles;

-- 2. 创建新的正确RLS策略
-- 管理员可以查看所有个人资料
CREATE POLICY "管理员可以查看所有个人资料" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin' 
      AND p.status = 'ACTIVE'
    )
  );

-- 管理员可以更新所有个人资料
CREATE POLICY "管理员可以更新所有个人资料" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin' 
      AND p.status = 'ACTIVE'
    )
  );

-- 3. 验证RLS策略更新
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. 测试当前用户的管理员权限
-- 这将显示当前认证用户是否有管理员权限
SELECT 
    auth.uid() as current_user_id,
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'admin' 
        AND p.status = 'ACTIVE'
    ) as is_admin_user,
    (SELECT role FROM public.profiles WHERE id = auth.uid()) as user_role,
    (SELECT status FROM public.profiles WHERE id = auth.uid()) as user_status;