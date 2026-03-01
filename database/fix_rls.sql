-- 清理所有 profiles 表的 RLS 策略并重建

-- 1. 删除所有策略
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users" ON public.profiles;
DROP POLICY IF EXISTS "用户查看自己的 profile" ON public.profiles;
DROP POLICY IF EXISTS "管理员查看所有 profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "用户可以查看自己的个人资料" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以查看所有个人资料" ON public.profiles;
DROP POLICY IF EXISTS "用户可以更新自己的个人资料" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以更新所有个人资料" ON public.profiles;

-- 2. 创建简单策略
CREATE POLICY "allow_all_authenticated" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. 验证
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
