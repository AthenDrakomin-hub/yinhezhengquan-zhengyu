-- ============================================
-- 创建新的公开 storage bucket（无需修改 objects 表）
-- ============================================

-- 方法：创建一个新的 bucket，默认就是公开的
-- 注意：在 Supabase Dashboard 中操作，不要通过 SQL

-- 步骤：
-- 1. Dashboard → Storage → New bucket
-- 2. 名称：images
-- 3. 勾选 "Make this bucket public"
-- 4. 点击 Create

-- 然后重新上传图片到这个新 bucket

-- ============================================
-- 或者使用这个 SQL（如果权限足够）
-- ============================================

-- 检查当前用户权限
SELECT current_user, session_user;

-- 查看 storage schema 的权限
SELECT 
    n.nspname as schema_name,
    current_user,
    has_schema_privilege(current_user, n.nspname, 'USAGE') as has_usage,
    has_schema_privilege(current_user, n.nspname, 'CREATE') as has_create
FROM pg_namespace n
WHERE n.nspname = 'storage';
