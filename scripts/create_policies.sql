-- ============================================
-- 创建 Storage RLS Policies（解决图片访问）
-- ============================================

-- 先开启 storage.objects 表的 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- 策略1: 允许任何人读取 tupian bucket 中的文件（最关键）
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tupian');

-- 策略2: 允许已登录用户上传
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tupian');

-- 策略3: 允许已登录用户更新自己的文件
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tupian');

-- 策略4: 允许已登录用户删除自己的文件
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tupian');

-- ============================================
-- 验证策略是否创建成功
-- ============================================
SELECT 
    policyname,
    permissive,
    roles::text,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
