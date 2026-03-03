-- ========================================
-- 设置用户权限层级
-- ========================================

-- 1. 设置 athendrakomin@proton.me 为超级管理员（系统管理员）
UPDATE public.profiles
SET 
  role = 'admin',
  admin_level = 'super_admin',
  created_by = NULL,
  managed_by = NULL
WHERE email = 'athendrakomin@proton.me';

-- 2. 设置 admin@zhengyu.com 为普通管理员（管理员001）
UPDATE public.profiles
SET 
  role = 'admin',
  admin_level = 'admin',
  created_by = (SELECT id FROM public.profiles WHERE email = 'athendrakomin@proton.me'),
  managed_by = (SELECT id FROM public.profiles WHERE email = 'athendrakomin@proton.me')
WHERE email = 'admin@zhengyu.com';

-- 3. 设置 zhangsan@qq.com 为普通用户（用户001）
UPDATE public.profiles
SET 
  role = 'user',
  admin_level = 'user',
  created_by = (SELECT id FROM public.profiles WHERE email = 'admin@zhengyu.com'),
  managed_by = (SELECT id FROM public.profiles WHERE email = 'admin@zhengyu.com')
WHERE email = 'zhangsan@qq.com';

-- 4. 验证设置结果
SELECT 
  email,
  username,
  role,
  admin_level,
  (SELECT email FROM public.profiles p2 WHERE p2.id = p1.created_by) as created_by_email,
  (SELECT email FROM public.profiles p2 WHERE p2.id = p1.managed_by) as managed_by_email,
  status
FROM public.profiles p1
WHERE email IN ('athendrakomin@proton.me', 'admin@zhengyu.com', 'zhangsan@qq.com')
ORDER BY 
  CASE admin_level
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'user' THEN 3
  END;

-- 5. 显示权限层级结构
SELECT 
  '权限层级设置完成' as status,
  '超级管理员: athendrakomin@proton.me' as super_admin,
  '普通管理员: admin@zhengyu.com (由超级管理员创建)' as admin,
  '普通用户: zhangsan@qq.com (由管理员001创建)' as user;
