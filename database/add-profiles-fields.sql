-- ========================================
-- 添加 profiles 表缺失字段
-- ========================================

-- 添加 role 字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 添加 status 字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- 添加 admin_level 字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_level TEXT DEFAULT 'user';

-- 添加 created_by 字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- 添加 managed_by 字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES public.profiles(id);

-- 添加约束
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS profiles_admin_level_check 
CHECK (admin_level IN ('super_admin', 'admin', 'user'));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level ON public.profiles(admin_level);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_managed_by ON public.profiles(managed_by);

-- 验证
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('role', 'status', 'admin_level', 'created_by', 'managed_by')
ORDER BY column_name;
