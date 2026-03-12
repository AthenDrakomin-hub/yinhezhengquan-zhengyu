-- ============================================
-- 验证 Storage 配置是否正确的完整检查 SQL
-- ============================================

-- 1. 检查 bucket 是否为 public
SELECT 
    'Bucket 状态' as check_item,
    name,
    public as is_public,
    CASE WHEN public THEN '✅ Bucket 是公开的' ELSE '❌ Bucket 不是公开的' END as status
FROM storage.buckets 
WHERE name = 'tupian';

-- 2. 检查 RLS 是否开启
SELECT 
    'RLS 状态' as check_item,
    relname as table_name,
    relrowsecurity as rls_enabled,
    CASE WHEN relrowsecurity THEN '✅ RLS 已开启' ELSE '❌ RLS 未开启' END as status
FROM pg_class 
WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');

-- 3. 检查 policies 是否存在
SELECT 
    '策略列表' as check_item,
    policyname as policy_name,
    permissive,
    roles::text as roles,
    cmd as command,
    CASE 
        WHEN policyname = 'Allow public read access' THEN '✅ 公开读取策略'
        WHEN policyname LIKE '%authenticated%' THEN '✅ 认证用户策略'
        ELSE '⚠️ 未知策略'
    END as status
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- 4. 统计策略数量
SELECT 
    '策略统计' as check_item,
    COUNT(*) as total_policies,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✅ 至少有一个策略（可以正常访问）'
        ELSE '❌ 没有任何策略（图片无法访问）'
    END as status
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- 5. 检查 tupian bucket 中的文件
SELECT 
    '文件列表' as check_item,
    name as file_name,
    bucket_id,
    created_at,
    updated_at
FROM storage.objects 
WHERE bucket_id = 'tupian'
ORDER BY created_at DESC
LIMIT 10;

-- 6. 测试：模拟一个公开读取请求（查看是否能读到数据）
SELECT 
    '访问测试' as check_item,
    COUNT(*) as total_files,
    '如果上面的策略已创建，这个数字应该 > 0' as note
FROM storage.objects 
WHERE bucket_id = 'tupian';
