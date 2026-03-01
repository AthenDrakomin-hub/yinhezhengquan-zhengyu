-- ==========================================================
-- 认证与权限审计修复脚本
-- 执行时间: 2026-03-01
-- 优先级: P0 (立即执行)
-- 功能: 修复 RLS 策略漏洞、统一权限检查、添加状态验证
-- ==========================================================

-- 1. 修复 profiles 表的 RLS 策略
-- 问题: 允许匿名用户查询所有数据
-- 修复: 限制只能查询自己的数据或管理员查询

DROP POLICY IF EXISTS "允许连接检查" ON public.profiles;

-- 用户可以查看自己的个人资料
DROP POLICY IF EXISTS "用户可以查看自己的个人资料" ON public.profiles;
CREATE POLICY "用户可以查看自己的个人资料" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
  );

-- 管理员可以查看所有个人资料（统一使用 profiles 表查询 + 状态检查）
DROP POLICY IF EXISTS "管理员可以查看所有个人资料" ON public.profiles;
CREATE POLICY "管理员可以查看所有个人资料" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 用户可以更新自己的个人资料（但不能修改 role 和 status）
DROP POLICY IF EXISTS "用户可以更新自己的个人资料" ON public.profiles;
CREATE POLICY "用户可以更新自己的个人资料" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
  );

-- 创建触发器函数防止用户修改敏感字段
CREATE OR REPLACE FUNCTION prevent_sensitive_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- 只有管理员可以修改 role 和 status
  IF (OLD.role != NEW.role OR OLD.status != NEW.status) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    ) THEN
      RAISE EXCEPTION '无权修改角色或状态字段';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER check_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sensitive_profile_changes();

-- 管理员可以更新所有个人资料
DROP POLICY IF EXISTS "管理员可以更新所有个人资料" ON public.profiles;
CREATE POLICY "管理员可以更新所有个人资料" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 2. 修复 assets 表的 RLS 策略
-- 添加状态检查，防止 PENDING/BANNED 用户访问

DROP POLICY IF EXISTS "用户可以查看自己的资产" ON public.assets;
CREATE POLICY "用户可以查看自己的资产" ON public.assets
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "管理员可以查看所有资产" ON public.assets;
CREATE POLICY "管理员可以查看所有资产" ON public.assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 禁止用户直接修改资产（应通过 Edge Function）
DROP POLICY IF EXISTS "禁止用户直接修改资产" ON public.assets;
CREATE POLICY "禁止用户直接修改资产" ON public.assets
  FOR UPDATE USING (false);

-- 管理员可以更新资产
DROP POLICY IF EXISTS "管理员可以更新资产" ON public.assets;
CREATE POLICY "管理员可以更新资产" ON public.assets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 3. 修复 trades 表的 RLS 策略
-- 添加状态检查和完整的 CRUD 策略

DROP POLICY IF EXISTS "用户可以查看自己的交易" ON public.trades;
CREATE POLICY "用户可以查看自己的交易" ON public.trades
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "管理员可以查看所有交易" ON public.trades;
CREATE POLICY "管理员可以查看所有交易" ON public.trades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "用户可以创建交易" ON public.trades;
CREATE POLICY "用户可以创建交易" ON public.trades
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

-- 禁止用户修改已创建的交易
DROP POLICY IF EXISTS "禁止用户修改交易" ON public.trades;
CREATE POLICY "禁止用户修改交易" ON public.trades
  FOR UPDATE USING (false);

-- 管理员可以更新交易（用于撮合干预）
DROP POLICY IF EXISTS "管理员可以更新交易" ON public.trades;
CREATE POLICY "管理员可以更新交易" ON public.trades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 4. 修复 positions 表的 RLS 策略
-- 添加状态检查

DROP POLICY IF EXISTS "用户可以查看自己的持仓" ON public.positions;
CREATE POLICY "用户可以查看自己的持仓" ON public.positions
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "管理员可以查看所有持仓" ON public.positions;
CREATE POLICY "管理员可以查看所有持仓" ON public.positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 禁止用户直接修改持仓（应通过 Edge Function）
DROP POLICY IF EXISTS "禁止用户直接修改持仓" ON public.positions;
CREATE POLICY "禁止用户直接修改持仓" ON public.positions
  FOR UPDATE USING (false);

-- 管理员可以更新持仓
DROP POLICY IF EXISTS "管理员可以更新持仓" ON public.positions;
CREATE POLICY "管理员可以更新持仓" ON public.positions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 5. 修复 conditional_orders 表的 RLS 策略
-- 添加状态检查

DROP POLICY IF EXISTS "用户可以管理自己的条件单" ON public.conditional_orders;
CREATE POLICY "用户可以查看自己的条件单" ON public.conditional_orders
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

CREATE POLICY "用户可以创建条件单" ON public.conditional_orders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

CREATE POLICY "用户可以更新自己的条件单" ON public.conditional_orders
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

CREATE POLICY "用户可以删除自己的条件单" ON public.conditional_orders
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

-- 管理员可以查看所有条件单
CREATE POLICY "管理员可以查看所有条件单" ON public.conditional_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 6. 验证修复结果
SELECT 
  'RLS策略修复完成' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'assets', 'trades', 'positions', 'conditional_orders');

-- 7. 测试查询（需要在应用中执行）
-- 测试1: 未登录用户无法查询 profiles
-- SELECT * FROM public.profiles; -- 应返回空结果

-- 测试2: 普通用户只能查询自己的数据
-- SELECT * FROM public.assets WHERE user_id = auth.uid(); -- 应返回自己的资产

-- 测试3: 管理员可以查询所有数据
-- SELECT * FROM public.assets; -- 管理员应返回所有资产

-- 测试4: PENDING 用户无法查询数据
-- UPDATE public.profiles SET status = 'PENDING' WHERE id = auth.uid();
-- SELECT * FROM public.assets; -- 应返回空结果

-- 测试5: BANNED 用户无法查询数据
-- UPDATE public.profiles SET status = 'BANNED' WHERE id = auth.uid();
-- SELECT * FROM public.assets; -- 应返回空结果
