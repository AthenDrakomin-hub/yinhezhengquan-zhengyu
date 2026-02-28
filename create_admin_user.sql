-- 创建管理员用户的SQL脚本

-- 方法1: 如果您已经有auth.users账户，只需更新profiles表
-- 请将 'your-existing-user-id' 替换为您的实际用户ID
UPDATE public.profiles 
SET role = 'admin'
WHERE id = 'your-existing-user-id';  -- 替换为您的用户ID

-- 方法2: 如果需要创建新的管理员用户（需要先在Supabase Auth中创建用户）
-- 然后插入profiles记录
INSERT INTO public.profiles (
    id,
    username,
    real_name,
    role,
    risk_level,
    phone,
    id_card,
    status
) VALUES (
    'new-admin-user-id',  -- 替换为新用户的UUID
    '管理员用户名',
    '管理员真实姓名',
    'admin',
    'C3',
    '13800138000',  -- 手机号
    '110101199001011234',  -- 身份证号
    'ACTIVE'
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    username = EXCLUDED.username,
    real_name = EXCLUDED.real_name,
    status = 'ACTIVE';

-- 验证创建结果
SELECT 
    id,
    username,
    real_name,
    role,
    status,
    created_at
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 检查RLS策略是否允许管理员访问
-- 确保有以下策略存在：
-- 1. 用户可以查看自己的个人资料
-- 2. 管理员可以查看所有个人资料

-- 查看当前的RLS策略
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';