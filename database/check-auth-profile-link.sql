-- ========================================
-- 检查和修复 auth.users 与 profiles 表关联
-- ========================================

-- 1. 检查 auth.users 中是否存在该邮箱
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'athendrakomin@proton.me';

-- 2. 检查 profiles 表中是否存在该用户
SELECT 
  id,
  email,
  username,
  role,
  admin_level,
  status
FROM public.profiles
WHERE email = 'athendrakomin@proton.me';

-- 3. 检查两表是否关联（id 是否一致）
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  p.role,
  p.admin_level,
  CASE 
    WHEN au.id = p.id THEN '✅ 已关联'
    ELSE '❌ 未关联'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'athendrakomin@proton.me';

-- 4. 如果 auth.users 存在但 profiles 不存在，创建 profile
INSERT INTO public.profiles (id, email, username, role, admin_level, status, created_by, managed_by)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', 'SuperAdmin'),
  'admin',
  'super_admin',
  'ACTIVE',
  NULL,
  NULL
FROM auth.users au
WHERE au.email = 'athendrakomin@proton.me'
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = au.id)
ON CONFLICT (id) DO NOTHING;

-- 5. 如果 profiles 存在但 id 不匹配，更新为正确的 id
UPDATE public.profiles
SET id = (SELECT id FROM auth.users WHERE email = 'athendrakomin@proton.me')
WHERE email = 'athendrakomin@proton.me'
  AND id != (SELECT id FROM auth.users WHERE email = 'athendrakomin@proton.me');

-- 6. 确保该用户是超级管理员
UPDATE public.profiles
SET 
  role = 'admin',
  admin_level = 'super_admin',
  status = 'ACTIVE',
  created_by = NULL,
  managed_by = NULL
WHERE email = 'athendrakomin@proton.me';

-- 7. 验证最终结果
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  p.username,
  p.role,
  p.admin_level,
  p.status,
  '✅ 关联成功，可以登录' as message
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'athendrakomin@proton.me';
