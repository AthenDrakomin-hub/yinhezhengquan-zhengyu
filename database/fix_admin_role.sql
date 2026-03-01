-- 检查并修复管理员角色

-- 1. 查看当前管理员账户的角色
SELECT id, email, username, role, status
FROM public.profiles
WHERE email IN ('admin@zhengyu.com', 'athendrakomin@proton.me');

-- 2. 确保角色字段为 'admin'
UPDATE public.profiles
SET role = 'admin', status = 'ACTIVE'
WHERE email IN ('admin@zhengyu.com', 'athendrakomin@proton.me');

-- 3. 验证更新结果
SELECT id, email, username, role, status
FROM public.profiles
WHERE email IN ('admin@zhengyu.com', 'athendrakomin@proton.me');
