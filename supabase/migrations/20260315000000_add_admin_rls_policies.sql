-- ============================================
-- 管理员 RLS 策略迁移
-- 为管理员添加所有业务表的访问权限
-- ============================================

-- 通用管理员权限检查函数（可复用）
-- 注意：PostgreSQL 函数需要单独创建

-- ==================== assets 表 ====================
DROP POLICY IF EXISTS "admin_assets_all" ON public.assets;

CREATE POLICY "admin_assets_all" ON public.assets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ==================== profiles 表 ====================
DROP POLICY IF EXISTS "admin_profiles_all" ON public.profiles;

CREATE POLICY "admin_profiles_all" ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ==================== trades 表 ====================
DROP POLICY IF EXISTS "admin_trades_all" ON public.trades;

CREATE POLICY "admin_trades_all" ON public.trades
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ==================== holdings 表 ====================
DROP POLICY IF EXISTS "admin_holdings_all" ON public.holdings;

CREATE POLICY "admin_holdings_all" ON public.holdings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ==================== positions 表 ====================
DROP POLICY IF EXISTS "admin_positions_all" ON public.positions;

CREATE POLICY "admin_positions_all" ON public.positions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ==================== 验证策略已创建 ====================
-- 运行后可通过以下 SQL 验证：
-- SELECT tablename, policyname FROM pg_policies WHERE policyname LIKE 'admin_%';
