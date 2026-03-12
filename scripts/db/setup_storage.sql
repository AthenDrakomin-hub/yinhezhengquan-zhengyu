-- ============================================
-- Supabase Storage 生产环境配置 SQL
-- 解决图片加载失败问题
-- ============================================

-- ============================================
-- 1. 确保 tupian bucket 存在并设置为公开
-- ============================================

-- 先检查 bucket 是否存在
SELECT * FROM storage.buckets WHERE name = 'tupian';

-- 如果 bucket 不存在，创建它
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tupian',
    'tupian',
    true,  -- 设置为公开
    52428800,  -- 50MB 文件大小限制
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- 2. 配置 Storage Policies（访问权限）
-- ============================================

-- 删除可能已存在的旧策略（避免冲突）
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to tupian bucket" ON storage.objects;

-- 策略1: 允许任何人读取 tupian bucket 中的文件
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'tupian');

-- 策略2: 允许已登录用户上传文件到 tupian bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tupian');

-- 策略3: 允许已登录用户更新自己的文件
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tupian' AND owner = auth.uid());

-- 策略4: 允许已登录用户删除自己的文件
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tupian' AND owner = auth.uid());

-- ============================================
-- 3. 验证配置
-- ============================================

-- 查看 bucket 信息
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'tupian';

-- 查看 policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- ============================================
-- 4. 检查 CORS 配置（在 Supabase Dashboard 中配置）
-- ============================================
-- 注意：CORS 配置无法通过 SQL 设置，需要在 Supabase Dashboard 中手动配置
-- 
-- 配置路径：
-- Supabase Dashboard → Storage → Policies → CORS Configuration
-- 
-- 需要添加的配置：
-- {
--   "origins": [
--     "http://localhost:5000",
--     "http://localhost:5173", 
--     "https://your-vercel-domain.vercel.app",
--     "https://your-custom-domain.com"
--   ],
--   "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
--   "headers": ["authorization", "x-client-info", "apikey", "content-type"]
-- }
--
-- ============================================

-- ============================================
-- 5. 测试查询 - 查看 tupian bucket 中的文件
-- ============================================
SELECT 
    name,
    owner,
    created_at,
    updated_at,
    bucket_id
FROM storage.objects 
WHERE bucket_id = 'tupian'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 6. 如果需要重置/重新配置，使用以下命令
-- ============================================

-- 重置所有策略（谨慎使用）
-- DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- 删除 bucket（会删除所有文件，谨慎使用）
-- DELETE FROM storage.buckets WHERE name = 'tupian';
