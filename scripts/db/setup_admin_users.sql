-- ========================================
-- 管理员用户设置脚本
-- ========================================
-- 使用说明:
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 复制并执行此脚本
-- 4. 验证用户创建结果
-- ========================================

-- 步骤 1: 检查现有用户
SELECT '检查现有用户:' as step;
SELECT
    id,
    username,
    email,
    admin_level,
    status,
    balance,
    total_equity
FROM profiles
WHERE email IN ('admin@yinhe.com', 'manager@yinhe.com', 'user@yinhe.com');

-- 步骤 2: 设置系统管理员 (超级管理员)
-- 邮箱: admin@yinhe.com
-- 密码: Admin123456 (需要在客户端首次登录时设置)
-- 权限: 超级管理员，可访问所有管理功能
-- 资金: 1,000,000 元（允许同时登录客户端交易）
SELECT '设置系统管理员:' as step;
UPDATE profiles
SET
    admin_level = 'super_admin',
    status = 'ACTIVE'
WHERE email = 'admin@yinhe.com';

-- 步骤 3: 设置管理员
-- 邮箱: manager@yinhe.com
-- 密码: Manager123456 (需要在客户端首次登录时设置)
-- 权限: 管理员，可访问管理端功能
-- 资金: 500,000 元（允许同时登录客户端交易）
SELECT '设置管理员:' as step;
UPDATE profiles
SET
    admin_level = 'admin',
    status = 'ACTIVE'
WHERE email = 'manager@yinhe.com';

-- 步骤 4: 设置普通用户
-- 邮箱: user@yinhe.com
-- 密码: User123456 (需要在客户端首次登录时设置)
-- 权限: 普通用户，只能访问客户端
-- 资金: 100,000 元
SELECT '设置普通用户:' as step;
UPDATE profiles
SET
    admin_level = NULL,
    status = 'ACTIVE'
WHERE email = 'user@yinhe.com';

-- 步骤 5: 验证设置结果
SELECT '验证设置结果:' as step;
SELECT
    p.id,
    p.username,
    p.email,
    p.admin_level,
    p.status,
    p.balance,
    p.total_equity,
    CASE
        WHEN p.admin_level = 'super_admin' THEN '超级管理员 (可访问客户端 + 管理端)'
        WHEN p.admin_level = 'admin' THEN '管理员 (可访问客户端 + 管理端)'
        ELSE '普通用户 (仅可访问客户端)'
    END as role_description
FROM profiles p
WHERE p.email IN ('admin@yinhe.com', 'manager@yinhe.com', 'user@yinhe.com')
ORDER BY p.admin_level DESC NULLS LAST;

-- ========================================
-- 使用说明
-- ========================================
-- 1. 系统管理员 (admin@yinhe.com)
--    - 可以访问: /client/* 和 /admin/*
--    - 可以进行交易和管理操作
--    - 初始资金: 1,000,000 元
--
-- 2. 管理员 (manager@yinhe.com)
--    - 可以访问: /client/* 和 /admin/*
--    - 可以进行交易和管理操作
--    - 初始资金: 500,000 元
--
-- 3. 普通用户 (user@yinhe.com)
--    - 可以访问: /client/*
--    - 只能进行客户端交易操作
--    - 初始资金: 100,000 元
--
-- 登录流程:
-- 1. 访问 https://invest-zy.vercel.app/auth/login
-- 2. 输入邮箱和密码
-- 3. 系统会自动跳转到客户端首页 (/client/trade)
-- 4. 管理员可以手动访问 /admin/dashboard 进入管理端
-- ========================================
