-- ========================================
-- 检查和修复 profiles 表结构
-- ========================================

-- 1. 检查 profiles 表当前结构
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. 检查是否缺少字段
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') 
    THEN '✅ role 字段存在' 
    ELSE '❌ role 字段缺失' 
  END as role_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_level') 
    THEN '✅ admin_level 字段存在' 
    ELSE '❌ admin_level 字段缺失' 
  END as admin_level_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') 
    THEN '✅ status 字段存在' 
    ELSE '❌ status 字段缺失' 
  END as status_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_by') 
    THEN '✅ created_by 字段存在' 
    ELSE '❌ created_by 字段缺失' 
  END as created_by_status;

-- 3. 如果字段缺失，添加字段（安全执行）
DO $$ 
BEGIN
  -- 添加 role 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
  
  -- 添加 admin_level 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_level') THEN
    ALTER TABLE public.profiles ADD COLUMN admin_level TEXT DEFAULT 'user';
  END IF;
  
  -- 添加 status 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'ACTIVE';
  END IF;
  
  -- 添加 created_by 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_by') THEN
    ALTER TABLE public.profiles ADD COLUMN created_by UUID REFERENCES public.profiles(id);
  END IF;
  
  -- 添加 managed_by 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'managed_by') THEN
    ALTER TABLE public.profiles ADD COLUMN managed_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- 4. 验证修复结果
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('role', 'admin_level', 'status', 'created_by', 'managed_by')
ORDER BY column_name;

-- 5. 查看当前所有用户
SELECT 
  id,
  email,
  username,
  role,
  admin_level,
  status
FROM public.profiles
ORDER BY 
  CASE admin_level
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    ELSE 3
  END;
