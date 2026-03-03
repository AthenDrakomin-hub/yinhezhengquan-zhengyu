-- ========================================
-- 迁移描述：修复profiles表字段对齐问题和RLS策略
-- 作者：系统架构组
-- 创建时间：2026-03-03 04:00:00
-- 关联需求：修复管理员登录失败问题
-- ========================================

BEGIN;

-- 1. 添加缺失的UI字段到profiles表
-- 根据AuthContext.tsx中的查询字段，添加前端需要的字段

-- 添加real_name字段（真实姓名）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS real_name TEXT;

-- 添加phone字段（手机号）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 添加id_card字段（身份证号）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS id_card TEXT;

-- 添加api_key字段（API密钥）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- 添加api_secret字段（API密钥）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS api_secret TEXT;

-- 添加avatar_url字段（头像URL）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 添加display_name字段（显示名称）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. 确保admin_level约束符合规范
-- 根据规则文件要求，admin_level只能为'super_admin', 'admin', 'user'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_admin_level_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_admin_level_check 
CHECK (admin_level IN ('super_admin', 'admin', 'user'));

-- 3. 清理重复或冲突的RLS策略
-- 首先删除可能存在的重复策略
DO $$ 
BEGIN
    -- 删除可能存在的重复SELECT策略
    DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users view own profiles" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
    
    -- 删除可能存在的重复UPDATE策略
    DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users update own profiles" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
    
    -- 删除可能存在的重复INSERT策略
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users insert own profiles" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
    
    -- 删除可能存在的重复DELETE策略
    DROP POLICY IF EXISTS "Users delete own profile" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 4. 重新创建符合规范的RLS策略
-- 根据规则文件3.2命名规范："[角色/操作] [表名] [条件]"

-- 用户查看自己的资料（SELECT）
CREATE POLICY "Users view own profiles" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

-- 用户更新自己的资料（UPDATE）
CREATE POLICY "Users update own profiles" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

-- 用户插入自己的资料（INSERT）
CREATE POLICY "Users insert own profiles" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- 管理员可以管理所有用户资料（SELECT, UPDATE, INSERT, DELETE）
CREATE POLICY "Admins manage all profiles" ON public.profiles 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles AS admin_profile
        WHERE admin_profile.id = auth.uid()
        AND admin_profile.admin_level IN ('admin', 'super_admin')
    )
);

-- 5. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_real_name ON public.profiles(real_name);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level_status ON public.profiles(admin_level, status);

-- 6. 验证迁移结果
-- 检查所有字段是否已添加
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT ARRAY_AGG(column_name) INTO missing_columns
    FROM (
        SELECT 'real_name' AS column_name UNION ALL
        SELECT 'phone' UNION ALL
        SELECT 'id_card' UNION ALL
        SELECT 'api_key' UNION ALL
        SELECT 'api_secret' UNION ALL
        SELECT 'avatar_url' UNION ALL
        SELECT 'display_name'
    ) expected
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = expected.column_name
    );
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE '以下字段添加失败: %', missing_columns;
    ELSE
        RAISE NOTICE '所有字段已成功添加';
    END IF;
END $$;

-- 7. 创建或更新管理员用户
-- 确保admin@zhengyu.com用户存在并具有管理员权限
INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    real_name,
    role,
    admin_level,
    status,
    risk_level,
    balance,
    total_equity,
    created_at,
    updated_at
)
SELECT 
    '00000000-0000-0000-0000-000000000001'::UUID,
    'admin@zhengyu.com',
    'admin_zhengyu',
    '管理员',
    '证裕管理员',
    'admin',
    'super_admin',
    'ACTIVE',
    'C5-激进型',
    1000000.00,
    1000000.00,
    NOW(),
    NOW()
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    real_name = EXCLUDED.real_name,
    role = EXCLUDED.role,
    admin_level = EXCLUDED.admin_level,
    status = EXCLUDED.status,
    risk_level = EXCLUDED.risk_level,
    balance = EXCLUDED.balance,
    total_equity = EXCLUDED.total_equity,
    updated_at = NOW();

COMMIT;

-- ========================================
-- 迁移完成说明
-- 1. 添加了7个缺失字段，使profiles表与前端查询对齐
-- 2. 修复了admin_level约束，确保符合规范
-- 3. 清理了重复的RLS策略，重新创建了符合命名规范的策略
-- 4. 创建了优化查询的索引
-- 5. 确保管理员用户存在并具有正确权限
-- ========================================