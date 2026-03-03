-- ========================================
-- 历史数据迁移：为已存在的 auth.users 创建 profiles
-- 执行时间：2026-03-03
-- 用途：确保所有已有用户都有对应的 profile 记录
-- ========================================

-- 1. 检查哪些用户缺少 profile
SELECT 
  au.id,
  au.email,
  au.created_at,
  '缺少 profile' as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 2. 为缺少 profile 的用户创建记录
INSERT INTO public.profiles (
  id,
  email,
  username,
  role,
  admin_level,
  status,
  risk_level,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'username',
    SPLIT_PART(au.email, '@', 1),
    'User_' || SUBSTRING(au.id::text, 1, 8)
  ) as username,
  CASE 
    WHEN au.email LIKE '%admin%' THEN 'admin'
    ELSE 'user'
  END as role,
  CASE 
    WHEN au.email LIKE '%admin%' THEN 'admin'
    ELSE 'user'
  END as admin_level,
  'ACTIVE' as status,
  'C3-稳健型' as risk_level,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. 同时为这些用户创建 assets 记录（如果不存在）
INSERT INTO public.assets (
  user_id,
  available_balance,
  frozen_balance,
  total_asset,
  created_at,
  updated_at
)
SELECT 
  au.id,
  1000000.00,
  0.00,
  1000000.00,
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.assets a ON au.id = a.user_id
WHERE p.id IS NULL AND a.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 4. 验证迁移结果
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT p.id) as users_with_profile,
  COUNT(DISTINCT a.user_id) as users_with_assets
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.assets a ON au.id = a.user_id;

-- 5. 显示仍然缺少 profile 的用户（应该为 0）
SELECT 
  au.id,
  au.email,
  '仍然缺少 profile' as issue
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 6. 显示仍然缺少 assets 的用户（应该为 0）
SELECT 
  au.id,
  au.email,
  '仍然缺少 assets' as issue
FROM auth.users au
LEFT JOIN public.assets a ON au.id = a.user_id
WHERE a.user_id IS NULL;

-- ========================================
-- 使用说明:
-- 1. 在 Supabase Dashboard -> SQL Editor 中执行此脚本
-- 2. 或在本地使用 psql:
--    psql -h db.xxx.supabase.co -U postgres -d postgres -f migrate-historical-users.sql
-- 3. 执行后检查输出，确保所有用户都有 profile 和 assets
-- ========================================
