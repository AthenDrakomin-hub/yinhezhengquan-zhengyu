-- 管理员权限诊断脚本

-- 1. 首先检查是否存在管理员用户
SELECT 
    '管理员用户检查' as check_type,
    COUNT(*) as admin_count,
    STRING_AGG(id::text, ', ') as admin_ids
FROM public.profiles 
WHERE role = 'admin';

-- 2. 检查所有用户的角色和状态
SELECT 
    id,
    username,
    role,
    status,
    created_at
FROM public.profiles 
ORDER BY role DESC, created_at DESC;

-- 3. 检查当前RLS策略配置
SELECT 
    policyname,
    cmd,
    qual as policy_condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. 如果您已登录，可以运行以下查询来检查当前用户权限
-- (取消注释下面的行来运行)
/*
SELECT 
    '当前用户权限检查' as check_type,
    auth.uid() as current_user_id,
    (SELECT username FROM public.profiles WHERE id = auth.uid()) as current_username,
    (SELECT role FROM public.profiles WHERE id = auth.uid()) as current_role,
    (SELECT status FROM public.profiles WHERE id = auth.uid()) as current_status,
    CASE 
        WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
        AND (SELECT status FROM public.profiles WHERE id = auth.uid()) = 'ACTIVE'
        THEN '具有管理员权限'
        ELSE '无管理员权限'
    END as admin_access_status;
*/

-- 5. 检查assets表的RLS策略（管理界面也需要访问资产数据）
SELECT 
    policyname,
    cmd,
    qual as policy_condition
FROM pg_policies 
WHERE tablename = 'assets'
ORDER BY policyname;