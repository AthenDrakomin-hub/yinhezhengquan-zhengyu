-- 检查和验证IPO表的RLS策略

-- 1. 检查ipos表当前的RLS策略
SELECT 
    tablename,
    policyname,
    cmd,
    qual as condition
FROM pg_policies 
WHERE tablename = 'ipos'
ORDER BY policyname;

-- 2. 检查IPO表的数据
SELECT 
    id,
    symbol,
    name,
    price,
    market,
    status,
    created_at
FROM public.ipos
LIMIT 10;

-- 3. 检查是否有缺失的策略，如果没有，则应用正确的策略
-- （注意：根据迁移文件，应该已经有正确的策略）
DO $$ 
BEGIN
  -- 检查是否已存在策略，如果不存在则创建
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ipos' 
    AND policyname = '所有人可读新股信息'
  ) THEN
    RAISE NOTICE '正在创建 "所有人可读新股信息" 策略';
    CREATE POLICY "所有人可读新股信息" ON public.ipos
        FOR SELECT USING (true);
  ELSE
    RAISE NOTICE '"所有人可读新股信息" 策略已存在';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ipos' 
    AND policyname = '仅管理员可管理新股信息'
  ) THEN
    RAISE NOTICE '正在创建 "仅管理员可管理新股信息" 策略';
    CREATE POLICY "仅管理员可管理新股信息" ON public.ipos
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
  ELSE
    RAISE NOTICE '"仅管理员可管理新股信息" 策略已存在';
  END IF;
END $$;

-- 4. 再次验证策略是否已正确应用
SELECT 
    tablename,
    policyname,
    cmd,
    qual as condition
FROM pg_policies 
WHERE tablename = 'ipos'
ORDER BY policyname;

-- 5. 验证管理员用户能否访问IPO数据
SELECT 
    'IPO表访问权限验证' as check_type,
    COUNT(*) as total_ipos,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin' AND status = 'ACTIVE') as active_admins
FROM public.ipos;