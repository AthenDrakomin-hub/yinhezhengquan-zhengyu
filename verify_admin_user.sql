-- 验证管理员用户身份的SQL查询

-- 1. 查看所有用户及其角色信息
SELECT 
    p.id,
    p.username,
    p.real_name,
    p.role,
    p.status,
    p.created_at,
    u.email as auth_email,
    u.created_at as auth_created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- 2. 专门查找管理员用户
SELECT 
    p.id,
    p.username,
    p.real_name,
    p.role,
    p.status,
    p.created_at,
    u.email as auth_email
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;

-- 3. 验证特定用户的管理员权限
-- 请将 'your-user-id-here' 替换为您的实际用户ID
SELECT 
    p.id,
    p.username,
    p.role,
    p.status,
    CASE 
        WHEN p.role = 'admin' THEN '是管理员'
        ELSE '不是管理员'
    END as is_admin,
    p.created_at
FROM public.profiles p
WHERE p.id = 'your-user-id-here';  -- 替换为您的用户ID

-- 4. 检查用户状态是否正常
SELECT 
    p.id,
    p.username,
    p.role,
    p.status,
    CASE 
        WHEN p.status = 'ACTIVE' THEN '账户正常'
        WHEN p.status = 'BANNED' THEN '账户被禁用'
        WHEN p.status = 'PENDING' THEN '账户待审核'
        ELSE '未知状态'
    END as status_description
FROM public.profiles p
WHERE p.role = 'admin';

-- 5. 查看RLS策略确保权限设置正确
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';