-- 查询所有用户账号信息
-- 在 Supabase Dashboard -> SQL Editor 中执行

-- 0. 先查看 profiles 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- 1. 查询 profiles 表中的所有用户（使用 * 查看所有字段）
SELECT *
FROM public.profiles
ORDER BY created_at DESC;

-- 2. 查询 auth.users 表中的所有认证用户
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- 3. 关联查询：找出有 auth 记录但没有 profile 的用户
SELECT 
    u.id,
    u.email,
    u.created_at as auth_created_at,
    p.id as profile_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. 查询管理员账号（如果有 role 字段）
SELECT *
FROM public.profiles
WHERE role = 'admin';
