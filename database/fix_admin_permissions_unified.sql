BEGIN;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

UPDATE public.profiles 
SET is_admin = true 
WHERE (admin_level IN ('admin', 'super_admin') OR role = 'admin')
  AND is_admin = false;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.positions;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.assets;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.trades;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.holdings;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.transactions;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.conditional_orders;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.asset_snapshots;

-- ensure drops before creates for profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users" ON public.profiles;
DROP POLICY IF EXISTS "用户查看自己的 profile" ON public.profiles;
DROP POLICY IF EXISTS "管理员查看所有 profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "用户可以查看自己的个人资料" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以查看所有个人资料" ON public.profiles;
DROP POLICY IF EXISTS "用户可以更新自己的个人资料" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以更新所有个人资料" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

CREATE POLICY "profiles_self_select" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON public.profiles 
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_self_insert" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON public.profiles 
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_check
    WHERE admin_check.id = auth.uid()
    AND admin_check.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_check
    WHERE admin_check.id = auth.uid()
    AND admin_check.is_admin = true
  )
);

-- assets
DROP POLICY IF EXISTS "用户可以查看自己的资产" ON public.assets;
DROP POLICY IF EXISTS "管理员可以查看所有资产" ON public.assets;
DROP POLICY IF EXISTS "禁止用户直接修改资产" ON public.assets;
DROP POLICY IF EXISTS "管理员可以更新资产" ON public.assets;
DROP POLICY IF EXISTS "assets_self_select" ON public.assets;
DROP POLICY IF EXISTS "assets_admin_select" ON public.assets;
DROP POLICY IF EXISTS "assets_admin_update" ON public.assets;

CREATE POLICY "assets_self_select" ON public.assets 
FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "assets_admin_select" ON public.assets 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "assets_admin_update" ON public.assets 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- trades
DROP POLICY IF EXISTS "用户可以查看自己的交易" ON public.trades;
DROP POLICY IF EXISTS "管理员可以查看所有交易" ON public.trades;
DROP POLICY IF EXISTS "用户可以创建交易" ON public.trades;
DROP POLICY IF EXISTS "禁止用户修改交易" ON public.trades;
DROP POLICY IF EXISTS "管理员可以更新交易" ON public.trades;
DROP POLICY IF EXISTS "trades_self_select" ON public.trades;
DROP POLICY IF EXISTS "trades_admin_select" ON public.trades;
DROP POLICY IF EXISTS "trades_self_insert" ON public.trades;
DROP POLICY IF EXISTS "trades_admin_update" ON public.trades;

CREATE POLICY "trades_self_select" ON public.trades 
FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "trades_admin_select" ON public.trades 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "trades_self_insert" ON public.trades 
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "trades_admin_update" ON public.trades 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- positions
DROP POLICY IF EXISTS "用户可以查看自己的持仓" ON public.positions;
DROP POLICY IF EXISTS "管理员可以查看所有持仓" ON public.positions;
DROP POLICY IF EXISTS "禁止用户直接修改持仓" ON public.positions;
DROP POLICY IF EXISTS "管理员可以更新持仓" ON public.positions;
DROP POLICY IF EXISTS "positions_self_select" ON public.positions;
DROP POLICY IF EXISTS "positions_admin_select" ON public.positions;
DROP POLICY IF EXISTS "positions_admin_update" ON public.positions;

CREATE POLICY "positions_self_select" ON public.positions 
FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "positions_admin_select" ON public.positions 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "positions_admin_update" ON public.positions 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

DO $$
DECLARE
  is_admin_count INTEGER;
  admin_users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO is_admin_count
  FROM information_schema.columns
  WHERE table_name = 'profiles' 
    AND column_name = 'is_admin';
    
  IF is_admin_count = 0 THEN
    RAISE NOTICE '❌ is_admin字段添加失败';
  ELSE
    RAISE NOTICE '✅ is_admin字段已添加';
  END IF;
  
  SELECT COUNT(*) INTO admin_users_count
  FROM public.profiles
  WHERE is_admin = true;
  
  RAISE NOTICE '✅ 管理员用户数量: %', admin_users_count;
  
  RAISE NOTICE '✅ profiles表策略数量: %', 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles');
  RAISE NOTICE '✅ assets表策略数量: %', 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'assets');
  RAISE NOTICE '✅ trades表策略数量: %', 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'trades');
END $$;

SELECT 
  id,
  email,
  username,
  role,
  admin_level,
  is_admin,
  status
FROM public.profiles
WHERE is_admin = true OR admin_level IN ('admin', 'super_admin') OR role = 'admin'
ORDER BY 
  CASE 
    WHEN admin_level = 'super_admin' THEN 1
    WHEN admin_level = 'admin' THEN 2
    WHEN role = 'admin' THEN 3
    ELSE 4
  END,
  created_at DESC;

COMMIT;