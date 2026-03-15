-- ==========================================================
-- 统一所有 RLS 策略（修复 role 大小写不一致问题）
-- 创建时间: 2026-03-16
-- 问题: RLS 策略中 role 字段值大小写不一致
-- ==========================================================

BEGIN;

-- ==========================================================
-- 通用管理员检查函数
-- ==========================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND (
            UPPER(role) IN ('ADMIN', 'SUPER_ADMIN')
            OR admin_level IN ('admin', 'super_admin')
        )
    );
END;
$$;

-- ==========================================================
-- 1. profiles 表 RLS
-- ==========================================================

-- 删除旧策略
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;

-- 用户查看自己的资料
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- 用户更新自己的资料
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 管理员完全访问
CREATE POLICY "Admins manage all profiles" ON public.profiles
    FOR ALL
    TO authenticated
    USING (is_admin());

-- ==========================================================
-- 2. assets 表 RLS
-- ==========================================================

DROP POLICY IF EXISTS "Users view own assets" ON public.assets;
DROP POLICY IF EXISTS "Users update own assets" ON public.assets;
DROP POLICY IF EXISTS "Service role full access" ON public.assets;
DROP POLICY IF EXISTS "admin_assets_all" ON public.assets;

-- 用户查看自己的资产
CREATE POLICY "Users view own assets" ON public.assets
    FOR SELECT USING (auth.uid() = user_id);

-- 用户更新自己的资产
CREATE POLICY "Users update own assets" ON public.assets
    FOR UPDATE USING (auth.uid() = user_id);

-- 管理员完全访问
CREATE POLICY "admin_assets_all" ON public.assets
    FOR ALL
    TO authenticated
    USING (is_admin());

-- ==========================================================
-- 3. trades 表 RLS
-- ==========================================================

DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON public.trades;
DROP POLICY IF EXISTS "Service role full access" ON public.trades;
DROP POLICY IF EXISTS "admin_trades_all" ON public.trades;

-- 用户查看自己的交易
CREATE POLICY "Users view own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

-- 用户插入自己的交易
CREATE POLICY "Users insert own trades" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户更新自己的交易
CREATE POLICY "Users update own trades" ON public.trades
    FOR UPDATE USING (auth.uid() = user_id);

-- 管理员完全访问
CREATE POLICY "admin_trades_all" ON public.trades
    FOR ALL
    TO authenticated
    USING (is_admin());

-- ==========================================================
-- 4. positions 表 RLS
-- ==========================================================

DROP POLICY IF EXISTS "Users view own positions" ON public.positions;
DROP POLICY IF EXISTS "Users update own positions" ON public.positions;
DROP POLICY IF EXISTS "Users insert own positions" ON public.positions;
DROP POLICY IF EXISTS "Service role full access" ON public.positions;
DROP POLICY IF EXISTS "admin_positions_all" ON public.positions;

-- 用户查看自己的持仓
CREATE POLICY "Users view own positions" ON public.positions
    FOR SELECT USING (auth.uid() = user_id);

-- 用户更新自己的持仓
CREATE POLICY "Users update own positions" ON public.positions
    FOR UPDATE USING (auth.uid() = user_id);

-- 用户插入自己的持仓
CREATE POLICY "Users insert own positions" ON public.positions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理员完全访问
CREATE POLICY "admin_positions_all" ON public.positions
    FOR ALL
    TO authenticated
    USING (is_admin());

-- ==========================================================
-- 5. holdings 表 RLS（兼容旧表）
-- ==========================================================

DROP POLICY IF EXISTS "Users manage own holdings" ON public.holdings;
DROP POLICY IF EXISTS "admin_holdings_all" ON public.holdings;

-- 用户管理自己的持仓
CREATE POLICY "Users manage own holdings" ON public.holdings
    FOR ALL USING (auth.uid() = user_id);

-- 管理员完全访问
CREATE POLICY "admin_holdings_all" ON public.holdings
    FOR ALL
    TO authenticated
    USING (is_admin());

-- ==========================================================
-- 6. support_tickets 表 RLS
-- ==========================================================

DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins insert tickets" ON public.support_tickets;

-- 用户查看自己的工单
DO $$ BEGIN
    CREATE POLICY "Users view own tickets" ON public.support_tickets
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 管理员查看所有工单
DO $$ BEGIN
    CREATE POLICY "Admins view all tickets" ON public.support_tickets
        FOR SELECT
        TO authenticated
        USING (is_admin());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 管理员更新工单
DO $$ BEGIN
    CREATE POLICY "Admins update tickets" ON public.support_tickets
        FOR UPDATE
        TO authenticated
        USING (is_admin());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================
-- 7. messages 表 RLS
-- ==========================================================

DROP POLICY IF EXISTS "用户可读自己工单的消息" ON public.messages;
DROP POLICY IF EXISTS "管理员可读所有消息" ON public.messages;
DROP POLICY IF EXISTS "用户可发送消息到自己的工单" ON public.messages;
DROP POLICY IF EXISTS "管理员可发送消息到任何工单" ON public.messages;

-- 用户读取自己工单的消息
DO $$ BEGIN
    CREATE POLICY "Users read own ticket messages" ON public.messages
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.support_tickets
                WHERE id = ticket_id AND user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 管理员读取所有消息
DO $$ BEGIN
    CREATE POLICY "Admins read all messages" ON public.messages
        FOR SELECT
        TO authenticated
        USING (is_admin());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================
-- 8. admin_operation_logs 表 RLS
-- ==========================================================

DROP POLICY IF EXISTS "Admins manage operation_logs" ON public.admin_operation_logs;

DO $$ BEGIN
    CREATE POLICY "Admins manage operation_logs" ON public.admin_operation_logs
        FOR ALL
        TO authenticated
        USING (is_admin());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================
-- 9. trade_rules 表 RLS
-- ==========================================================

DROP POLICY IF EXISTS "Admins manage trade_rules" ON public.trade_rules;

DO $$ BEGIN
    CREATE POLICY "Admins manage trade_rules" ON public.trade_rules
        FOR ALL
        TO authenticated
        USING (is_admin());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================
-- 10. force_sell_records 表 RLS
-- ==========================================================

DROP POLICY IF EXISTS "Users view own force_sell_records" ON public.force_sell_records;
DROP POLICY IF EXISTS "Admins view all force_sell_records" ON public.force_sell_records;
DROP POLICY IF EXISTS "Admins insert force_sell_records" ON public.force_sell_records;

-- 用户查看自己的强制平仓记录
DO $$ BEGIN
    CREATE POLICY "Users view own force_sell_records" ON public.force_sell_records
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 管理员完全访问
DO $$ BEGIN
    CREATE POLICY "Admins manage force_sell_records" ON public.force_sell_records
        FOR ALL
        TO authenticated
        USING (is_admin());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================
-- 11. grant function execute permission
-- ==========================================================

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

COMMIT;
