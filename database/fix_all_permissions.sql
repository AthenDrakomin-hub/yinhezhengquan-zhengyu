-- 修复缺失的表和权限

-- 1. 为 positions 表添加权限策略
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.positions;
CREATE POLICY "allow_all_authenticated" 
ON public.positions 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. 为 assets 表添加权限策略
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.assets;
CREATE POLICY "allow_all_authenticated" 
ON public.assets 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. 为 trades 表添加权限策略
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.trades;
CREATE POLICY "allow_all_authenticated" 
ON public.trades 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. 检查是否需要创建 holdings 表（如果不存在）
-- holdings 表可能已被 positions 表替代，检查表是否存在
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'holdings'
);

-- 5. 验证所有策略
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'positions', 'assets', 'trades')
ORDER BY tablename;
