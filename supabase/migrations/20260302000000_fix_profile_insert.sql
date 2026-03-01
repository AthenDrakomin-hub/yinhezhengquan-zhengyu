-- 修复 profiles 表的 INSERT 权限
-- 允许新用户创建自己的 profile 记录

-- 添加 INSERT 策略
DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" 
    ON public.profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
