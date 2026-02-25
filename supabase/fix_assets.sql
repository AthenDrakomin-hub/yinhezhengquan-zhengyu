-- assets表修复脚本
-- 解决406错误和assets查询问题

-- 1. 首先确保assets表存在（从schema.sql复制）
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_asset DECIMAL(18,2) DEFAULT 0,
  available_balance DECIMAL(18,2) DEFAULT 500000.00,
  frozen_balance DECIMAL(18,2) DEFAULT 0,
  today_profit_loss DECIMAL(18,2) DEFAULT 0,
  hidden_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- 2. 启用RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- 3. 创建或替换RLS策略
DROP POLICY IF EXISTS "用户可以查看自己的资产" ON public.assets;
CREATE POLICY "用户可以查看自己的资产" ON public.assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可以查看所有资产" ON public.assets;
CREATE POLICY "管理员可以查看所有资产" ON public.assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "管理员可以更新资产" ON public.assets;
CREATE POLICY "管理员可以更新资产" ON public.assets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. 为现有用户创建assets记录（如果不存在）
INSERT INTO public.assets (user_id, total_asset, available_balance, frozen_balance, today_profit_loss, hidden_mode)
SELECT 
  au.id as user_id,
  500000.00 as total_asset,
  500000.00 as available_balance,
  0.00 as frozen_balance,
  0.00 as today_profit_loss,
  false as hidden_mode
FROM auth.users au
LEFT JOIN public.assets a ON au.id = a.user_id
WHERE a.id IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);

-- 5. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);

-- 6. 创建或替换更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. 验证修复
DO $$
DECLARE
  user_count INTEGER;
  asset_count INTEGER;
BEGIN
  -- 统计用户数量
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- 统计assets记录数量
  SELECT COUNT(*) INTO asset_count FROM public.assets;
  
  RAISE NOTICE '用户总数: %, assets记录数: %', user_count, asset_count;
  
  -- 检查是否有用户没有assets记录
  IF EXISTS (
    SELECT 1 FROM auth.users au
    LEFT JOIN public.assets a ON au.id = a.user_id
    WHERE a.id IS NULL
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
  ) THEN
    RAISE WARNING '存在用户没有assets记录';
  ELSE
    RAISE NOTICE '所有用户都有assets记录';
  END IF;
END $$;
