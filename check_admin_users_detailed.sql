-- 检查管理员用户在auth.users表中的详细信息

-- 1. 检查两个管理员用户在auth.users表中的记录
SELECT 
    p.id,
    p.username,
    p.role,
    p.status,
    u.email as auth_email,
    u.phone as auth_phone,
    u.created_at as auth_created_at,
    u.updated_at as auth_updated_at,
    u.last_sign_in_at as last_sign_in,
    u.email_confirmed_at as email_confirmed_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.id IN ('8984f08b-5366-446c-bc02-445b69eeda13', 'f60b6c8f-38fb-4617-829b-5773809f70a2')
ORDER BY p.created_at DESC;

-- 2. 验证这两个用户的详细权限信息
SELECT 
    p.id,
    p.username,
    p.real_name,
    p.role,
    p.status,
    p.phone,
    p.id_card,
    p.api_key,
    p.created_at,
    p.updated_at
FROM public.profiles p
WHERE p.id IN ('8984f08b-5366-446c-bc02-445b69eeda13', 'f60b6c8f-38fb-4617-829b-5773809f70a2');

-- 3. 检查RLS策略是否正确配置
SELECT 
    policyname,
    cmd,
    qual as condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. 检查assets表的RLS策略（管理界面访问资产数据所需）
SELECT 
    policyname,
    cmd,
    qual as condition
FROM pg_policies 
WHERE tablename = 'assets'
ORDER BY policyname;

-- 5. 检查trade_rules表的RLS策略（管理界面访问规则数据所需）
SELECT 
    policyname,
    cmd,
    qual as condition
FROM pg_policies 
WHERE tablename = 'trade_rules'
ORDER BY policyname;