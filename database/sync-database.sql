-- ==========================================================
-- 银河证券证裕交易单元 - 数据库同步脚本
-- 版本: v3.2.0
-- 执行位置: Supabase Dashboard > SQL Editor
-- 说明: 完整的数据库结构同步，支持幂等执行
-- ==========================================================

-- ==========================================================
-- 第一部分：创建缺失的表
-- ==========================================================

-- 1.1 用户通知表
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- 通知类型
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'SYSTEM',           -- 系统通知
        'TRADE',            -- 交易相关
        'FORCE_SELL',       -- 强制平仓
        'APPROVAL',         -- 审批结果
        'RISK_WARNING',     -- 风险预警
        'ACCOUNT',          -- 账户相关
        'ANNOUNCEMENT'      -- 公告
    )),
    
    -- 通知内容
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- 关联数据
    related_type TEXT,
    related_id TEXT,
    
    -- 状态
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- 优先级
    priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    
    -- 过期时间
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 强制平仓记录表
CREATE TABLE IF NOT EXISTS public.force_sell_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    position_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    
    -- 股票信息
    symbol TEXT NOT NULL,
    stock_name TEXT,
    
    -- 平仓信息
    quantity NUMERIC(20, 4) NOT NULL,
    price NUMERIC(20, 4),
    amount NUMERIC(20, 2),
    
    -- 原因和状态
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    
    -- 关联的交易ID
    trade_id UUID,
    
    -- 元数据
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 撮合池表（如果不存在）
CREATE TABLE IF NOT EXISTS public.trade_match_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trade_id UUID,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    stock_code TEXT NOT NULL,
    stock_name TEXT,
    trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL', 'IPO')),
    price NUMERIC(20, 4) NOT NULL,
    quantity NUMERIC(20, 4) NOT NULL,
    status TEXT DEFAULT 'MATCHING' CHECK (status IN ('MATCHING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    priority INTEGER DEFAULT 0,
    enter_time TIMESTAMPTZ DEFAULT NOW(),
    matched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 第二部分：profiles 表字段补充
-- ==========================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance NUMERIC(20, 2) DEFAULT 1000000.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_equity NUMERIC(20, 2) DEFAULT 1000000.00;

-- ==========================================================
-- 第三部分：positions 表字段补充
-- ==========================================================

-- 添加股票代码和名称字段
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS stock_code TEXT;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS stock_name TEXT;

-- 添加当前价格字段
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS current_price NUMERIC(20, 4);
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS profit_loss NUMERIC(20, 4) DEFAULT 0;

-- 添加风险等级字段
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW';

-- 添加强制平仓相关字段
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS is_forced_sell BOOLEAN DEFAULT FALSE;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS forced_sell_at TIMESTAMPTZ;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS forced_sell_reason TEXT;

-- ==========================================================
-- 第四部分：trades 表字段补充
-- ==========================================================

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS filled_at TIMESTAMPTZ;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS finish_time TIMESTAMPTZ;

-- ==========================================================
-- 第五部分：assets 表字段补充（如果不存在）
-- ==========================================================

-- 确保 assets 表存在
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    available_balance DECIMAL(18,2) DEFAULT 1000000.00,
    frozen_balance DECIMAL(18,2) DEFAULT 0.00,
    total_asset DECIMAL(18,2) DEFAULT 1000000.00,
    today_profit_loss DECIMAL(18,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 第六部分：创建索引
-- ==========================================================

-- profiles 索引
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- positions 索引
CREATE INDEX IF NOT EXISTS idx_positions_user ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_risk_level ON public.positions(risk_level);
CREATE INDEX IF NOT EXISTS idx_positions_forced_sell ON public.positions(is_forced_sell) WHERE is_forced_sell = TRUE;

-- trades 索引
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- fund_flows 索引
CREATE INDEX IF NOT EXISTS idx_fund_flows_user ON public.fund_flows(user_id, created_at DESC);

-- user_notifications 索引
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.user_notifications(notification_type);

-- force_sell_records 索引
CREATE INDEX IF NOT EXISTS idx_force_sell_user ON public.force_sell_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_force_sell_admin ON public.force_sell_records(admin_id, created_at DESC);

-- trade_match_pool 索引
CREATE INDEX IF NOT EXISTS idx_match_pool_status ON public.trade_match_pool(status);
CREATE INDEX IF NOT EXISTS idx_match_pool_stock ON public.trade_match_pool(stock_code);
CREATE INDEX IF NOT EXISTS idx_match_pool_user ON public.trade_match_pool(user_id);

-- ==========================================================
-- 第七部分：启用 RLS
-- ==========================================================

-- 用户相关表
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;

-- 新增表
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.force_sell_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_match_pool ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 第八部分：创建 RLS 策略
-- ==========================================================

-- 8.1 profiles 策略
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
    
    CREATE POLICY "Users view own profile" ON public.profiles 
        FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users update own profile" ON public.profiles 
        FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8.2 assets 策略
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users view own assets" ON public.assets;
    DROP POLICY IF EXISTS "Users update own assets" ON public.assets;
    
    CREATE POLICY "Users view own assets" ON public.assets 
        FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users update own assets" ON public.assets 
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8.3 positions 策略
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users manage own positions" ON public.positions;
    
    CREATE POLICY "Users manage own positions" ON public.positions 
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8.4 trades 策略
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users manage own trades" ON public.trades;
    
    CREATE POLICY "Users manage own trades" ON public.trades 
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8.5 fund_flows 策略
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users view own fund_flows" ON public.fund_flows;
    
    CREATE POLICY "Users view own fund_flows" ON public.fund_flows 
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8.6 user_notifications 策略
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users view own notifications" ON public.user_notifications;
    DROP POLICY IF EXISTS "Users update own notifications" ON public.user_notifications;
    DROP POLICY IF EXISTS "Users insert own notifications" ON public.user_notifications;
    
    CREATE POLICY "Users view own notifications" ON public.user_notifications
        FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users update own notifications" ON public.user_notifications
        FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users insert own notifications" ON public.user_notifications
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8.7 force_sell_records 策略
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users view own force_sell_records" ON public.force_sell_records;
    DROP POLICY IF EXISTS "Admins manage force_sell_records" ON public.force_sell_records;
    
    CREATE POLICY "Users view own force_sell_records" ON public.force_sell_records
        FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Admins manage force_sell_records" ON public.force_sell_records
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8.8 trade_match_pool 策略
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users view own match_pool" ON public.trade_match_pool;
    DROP POLICY IF EXISTS "Admins manage match_pool" ON public.trade_match_pool;
    
    CREATE POLICY "Users view own match_pool" ON public.trade_match_pool
        FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Admins manage match_pool" ON public.trade_match_pool
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==========================================================
-- 第九部分：更新时间触发器
-- ==========================================================

-- 创建更新时间函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为关键表添加触发器
DO $$ BEGIN
    -- profiles
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- assets
    DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
    CREATE TRIGGER update_assets_updated_at
        BEFORE UPDATE ON public.assets
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- positions
    DROP TRIGGER IF EXISTS update_positions_updated_at ON public.positions;
    CREATE TRIGGER update_positions_updated_at
        BEFORE UPDATE ON public.positions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- trades
    DROP TRIGGER IF EXISTS update_trades_updated_at ON public.trades;
    CREATE TRIGGER update_trades_updated_at
        BEFORE UPDATE ON public.trades
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- force_sell_records
    DROP TRIGGER IF EXISTS update_force_sell_updated_at ON public.force_sell_records;
    CREATE TRIGGER update_force_sell_updated_at
        BEFORE UPDATE ON public.force_sell_records
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==========================================================
-- 第十部分：创建视图
-- ==========================================================

CREATE OR REPLACE VIEW public.position_risk_analysis AS
SELECT 
    p.id,
    p.user_id,
    p.symbol,
    COALESCE(p.stock_code, p.symbol) as stock_code,
    COALESCE(p.stock_name, p.name) as stock_name,
    p.quantity,
    p.available_quantity,
    p.average_price,
    COALESCE(p.current_price, p.average_price) as current_price,
    (p.quantity * COALESCE(p.current_price, p.average_price)) as market_value,
    p.risk_level,
    p.is_forced_sell,
    pr.username,
    pr.risk_level as user_risk_level
FROM public.positions p
LEFT JOIN public.profiles pr ON p.user_id = pr.id
WHERE p.quantity > 0
ORDER BY 
    CASE p.risk_level 
        WHEN 'HIGH' THEN 1 
        WHEN 'MEDIUM' THEN 2 
        ELSE 3 
    END,
    p.quantity DESC;

GRANT SELECT ON public.position_risk_analysis TO authenticated;

-- ==========================================================
-- 第十一部分：初始化默认数据
-- ==========================================================

-- 插入默认交易规则（使用实际表结构：rule_type, config, status）
INSERT INTO public.trade_rules (rule_type, config, status)
VALUES 
    ('TRADING_HOURS', '{"start": "09:30", "end": "15:00", "lunch_break": {"start": "11:30", "end": "13:00"}}', true),
    ('COMMISSION', '{"rate": 0.0003, "min": 5}', true),
    ('PRICE_LIMIT', '{"limit_up": 0.1, "limit_down": -0.1, "st_limit_up": 0.05}', true),
    ('TRADE_UNIT', '{"min_shares": 100}', true)
ON CONFLICT (rule_type) DO NOTHING;

-- ==========================================================
-- 验证结果
-- ==========================================================

SELECT '✅ 数据库同步完成！' as status;

-- 显示表统计
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL SELECT 'assets', COUNT(*) FROM assets
UNION ALL SELECT 'positions', COUNT(*) FROM positions
UNION ALL SELECT 'trades', COUNT(*) FROM trades
UNION ALL SELECT 'user_notifications', COUNT(*) FROM user_notifications
UNION ALL SELECT 'force_sell_records', COUNT(*) FROM force_sell_records
UNION ALL SELECT 'trade_match_pool', COUNT(*) FROM trade_match_pool;
