-- ========================================================
-- 系统优化整合迁移
-- 版本: v1.0 (2024-03-07)
-- 功能: 交易优化、清算系统、用户触发器、管理员表
-- ========================================================

BEGIN;

-- ==========================================================
-- 1. 用户注册自动触发器
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建用户资料
  INSERT INTO public.profiles (
    id, email, username, role, admin_level, status, risk_level
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substring(NEW.id::text, 1, 8)),
    'user',
    'user',
    'ACTIVE',
    'C3-稳健型'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- 创建用户资产
  INSERT INTO public.assets (
    user_id, available_balance, frozen_balance, total_asset
  ) VALUES (
    NEW.id, 1000000.00, 0.00, 1000000.00
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 注册触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- 2. 通用更新时间触发器函数
-- ==========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================================
-- 3. 交易订单优化字段
-- ==========================================================

-- 添加手续费字段
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS fee DECIMAL(18,2) DEFAULT 0;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS filled_quantity NUMERIC(20, 4) DEFAULT 0;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS filled_amount DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'LIMIT' CHECK (order_type IN ('MARKET', 'LIMIT'));

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_created ON public.trades(created_at DESC);

-- ==========================================================
-- 4. 持仓表优化字段
-- ==========================================================

-- 添加锁定相关字段
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS locked_quantity NUMERIC(20, 4) DEFAULT 0;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS lock_until DATE;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS profit_loss NUMERIC(20, 4) DEFAULT 0;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_positions_user_symbol ON public.positions(user_id, symbol);

-- ==========================================================
-- 5. 用户资料表扩展字段
-- ==========================================================

-- 添加管理相关字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS real_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_secret TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES public.profiles(id);

-- 添加约束
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_admin_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_admin_level_check 
  CHECK (admin_level IN ('super_admin', 'admin', 'user'));

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON public.profiles(admin_level, status);

-- ==========================================================
-- 6. 清算日志表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.settlement_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    settlement_date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    total_volume DECIMAL(18,2) DEFAULT 0,
    unlocked_positions INTEGER DEFAULT 0,
    status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_date ON public.settlement_logs(settlement_date DESC);

-- RLS
ALTER TABLE public.settlement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view settlement_logs" ON public.settlement_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ==========================================================
-- 7. 交易幂等性表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.transaction_idempotency (
    transaction_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transaction_expires ON public.transaction_idempotency(expires_at);

-- ==========================================================
-- 8. 管理员操作日志表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    operation_type TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_operation_logs(admin_id, created_at DESC);

-- RLS
ALTER TABLE public.admin_operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage operation_logs" ON public.admin_operation_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ==========================================================
-- 9. 交易规则表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.trade_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL,
    rule_key TEXT NOT NULL UNIQUE,
    rule_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.trade_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage trade_rules" ON public.trade_rules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ==========================================================
-- 10. 更新时间触发器
-- ==========================================================

-- profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- positions
DROP TRIGGER IF EXISTS update_positions_updated_at ON public.positions;
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trades
DROP TRIGGER IF EXISTS update_trades_updated_at ON public.trades;
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trade_rules
DROP TRIGGER IF EXISTS update_trade_rules_updated_at ON public.trade_rules;
CREATE TRIGGER update_trade_rules_updated_at BEFORE UPDATE ON public.trade_rules 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- 11. 补充 RLS 策略
-- ==========================================================

-- profiles 管理员策略
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin'))
);

-- trades 管理员策略
DROP POLICY IF EXISTS "Admins manage all trades" ON public.trades;
CREATE POLICY "Admins manage all trades" ON public.trades FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

COMMIT;
