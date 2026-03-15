-- ============================================
-- 创建业务所需存储桶
-- faces: 用户人脸数据（私有）
-- education: 投教内容（公开）
-- avatars: 用户头像（公开）
-- documents: 文档资料（私有）
-- ============================================

-- ============================================
-- 1. 创建 faces 存储桶（私有，用于人脸识别数据）
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'faces',
    'faces',
    false,  -- 私有，需要签名URL访问
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = 10485760;

-- faces 存储桶策略：仅用户可访问自己的数据
DROP POLICY IF EXISTS "Users can view own face data" ON storage.objects;
CREATE POLICY "Users can view own face data"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'faces' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload own face data" ON storage.objects;
CREATE POLICY "Users can upload own face data"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'faces' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own face data" ON storage.objects;
CREATE POLICY "Users can delete own face data"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'faces' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 2. 创建 education 存储桶（公开，投教内容）
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'education',
    'education',
    true,  -- 公开
    524288000,  -- 500MB（视频文件较大）
    ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 524288000;

-- education 存储桶策略
DROP POLICY IF EXISTS "Public read education content" ON storage.objects;
CREATE POLICY "Public read education content"
ON storage.objects FOR SELECT
USING (bucket_id = 'education');

DROP POLICY IF EXISTS "Admin upload education content" ON storage.objects;
CREATE POLICY "Admin upload education content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'education');

-- ============================================
-- 3. 创建 avatars 存储桶（公开，用户头像）
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,  -- 公开
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880;

-- avatars 存储桶策略
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 4. 创建 documents 存储桶（私有，文档资料）
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,  -- 私有
    104857600,  -- 100MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = 104857600;

-- documents 存储桶策略
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 5. 验证配置
-- ============================================
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name IN ('faces', 'education', 'avatars', 'documents')
ORDER BY name;

-- 查看所有存储桶策略
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
