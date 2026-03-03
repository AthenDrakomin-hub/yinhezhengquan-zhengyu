-- ==========================================================
-- 修复登录问题 - 添加缺失的 role 和 status 字段
-- 执行时间: 立即执行
-- 优先级: P0 (阻塞登录)
-- ==========================================================

-- 1. 添加 role 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;
        
        RAISE NOTICE '✅ 已添加 role 字段';
    ELSE
        RAISE NOTICE '⚠️ role 字段已存在';
    END IF;
END $$;

-- 2. 添加 status 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN status TEXT DEFAULT 'ACTIVE' NOT NULL;
        
        RAISE NOTICE '✅ 已添加 status 字段';
    ELSE
        RAISE NOTICE '⚠️ status 字段已存在';
    END IF;
END $$;

-- 3. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. 设置管理员账户
UPDATE public.profiles
SET role = 'admin', status = 'ACTIVE'
WHERE email IN ('admin@zhengyu.com', 'athendrakomin@proton.me');

-- 5. 激活所有现有用户（如果需要）
-- 取消注释下面这行以激活所有用户
-- UPDATE public.profiles SET status = 'ACTIVE' WHERE status IS NULL OR status = 'PENDING';

-- 6. 验证修复结果
SELECT 
    '修复完成' as status,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count
FROM public.profiles;

-- 7. 显示管理员账户
SELECT id, email, username, role, status, created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at DESC;
