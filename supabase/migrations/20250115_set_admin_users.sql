-- 设置系统管理员和管理员用户
-- 执行日期: 2025-01-15

-- 1. 更新系统管理员账号
UPDATE profiles
SET
    admin_level = 'super_admin',
    status = 'ACTIVE'
WHERE email = 'admin@yinhe.com';

-- 2. 更新管理员账号
UPDATE profiles
SET
    admin_level = 'admin',
    status = 'ACTIVE'
WHERE email = 'manager@yinhe.com';

-- 3. 确认普通用户账号为普通用户
UPDATE profiles
SET
    admin_level = NULL,
    status = 'ACTIVE'
WHERE email = 'user@yinhe.com';

-- 4. 验证设置结果
SELECT
    p.id,
    p.username,
    p.email,
    p.admin_level,
    p.status,
    p.balance,
    p.total_equity
FROM profiles p
WHERE p.email IN ('admin@yinhe.com', 'manager@yinhe.com', 'user@yinhe.com')
ORDER BY p.admin_level DESC NULLS LAST;
