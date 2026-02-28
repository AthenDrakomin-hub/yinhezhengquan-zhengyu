-- 修复profiles表为空的问题

-- 1.首先检查当前数据库中的用户表结构
\dt public.*

-- 2. 检查auth.users表中是否有用户
SELECT 
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC;

-- 3. 如果auth.users中有用户，创建对应的profiles记录
-- 请将 'your-user-id' 和 'your-email'替换为实际的用户信息
INSERT INTO public.profiles (
    id,
    username,
    role,
    status,
    created_at,
    updated_at
) VALUES (
    'your-user-id',  --替换为实际的用户UUID
    '管理员用户',      -- 用户名
    'admin',         -- 设置为管理员角色
    'ACTIVE',        --状态
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'ACTIVE',
    updated_at = NOW();

-- 4.验证插入结果
SELECT 
    id,
    username,
    role,
    status,
    created_at
FROM public.profiles;

-- 5. 创建必要的RLS策略
--启用profiles表的RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的资料
CREATE POLICY "用户可以查看自己的个人资料" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

--管员可以查看所有个人资料
CREATE POLICY "管理员可以查看所有个人资料" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin' 
            AND p.status = 'ACTIVE'
        )
    );

--验证策略创建
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';