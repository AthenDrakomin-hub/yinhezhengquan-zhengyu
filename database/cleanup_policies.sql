-- 清理所有表的冗余策略，只保留 allow_all_authenticated

-- assets 表
DROP POLICY IF EXISTS "用户可以查看自己的资产" ON public.assets;
DROP POLICY IF EXISTS "禁止用户直接修改资产" ON public.assets;
DROP POLICY IF EXISTS "管理员可以更新资产" ON public.assets;
DROP POLICY IF EXISTS "管理员可以查看所有资产" ON public.assets;

-- positions 表
DROP POLICY IF EXISTS "用户可以查看自己的持仓" ON public.positions;
DROP POLICY IF EXISTS "禁止用户直接修改持仓" ON public.positions;
DROP POLICY IF EXISTS "管理员可以更新持仓" ON public.positions;
DROP POLICY IF EXISTS "管理员可以查看所有持仓" ON public.positions;

-- trades 表
DROP POLICY IF EXISTS "用户可以创建交易" ON public.trades;
DROP POLICY IF EXISTS "用户可以查看自己的交易" ON public.trades;
DROP POLICY IF EXISTS "禁止用户修改交易" ON public.trades;
DROP POLICY IF EXISTS "管理员可以更新交易" ON public.trades;
DROP POLICY IF EXISTS "管理员可以查看所有交易" ON public.trades;

-- 验证清理结果
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'positions', 'assets', 'trades')
ORDER BY tablename;
