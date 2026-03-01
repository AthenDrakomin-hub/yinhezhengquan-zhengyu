-- 创建管理员账号
-- 先执行 check_accounts.sql 查看表结构和现有数据

-- 方法1：为现有 auth.users 添加 profile
INSERT INTO public.profiles (id, email, username, risk_level)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'username', 'Admin'),
    'C3-稳健型'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO NOTHING;

-- 方法2：将现有用户升级为管理员
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
