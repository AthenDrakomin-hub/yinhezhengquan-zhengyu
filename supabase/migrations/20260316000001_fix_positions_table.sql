-- ==========================================================
-- 修复 positions 表（确保存在并添加 RLS 策略）
-- 创建时间: 2026-03-16
-- 问题: positions 表可能不存在，需要创建
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. 创建 positions 表（如果不存在）
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 股票信息
    symbol VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100),
    logo_url TEXT,
    
    -- 持仓数量
    quantity DECIMAL(20, 4) DEFAULT 0,
    available_quantity DECIMAL(20, 4) DEFAULT 0,
    locked_quantity DECIMAL(20, 4) DEFAULT 0,
    
    -- 价格信息
    cost_price DECIMAL(18, 4) DEFAULT 0,
    average_price DECIMAL(18, 4) DEFAULT 0,
    current_price DECIMAL(18, 4),
    market_value DECIMAL(20, 2) GENERATED ALWAYS AS (quantity * COALESCE(current_price, cost_price)) STORED,
    
    -- 盈亏
    profit_loss DECIMAL(20, 4) DEFAULT 0,
    
    -- 风险等级
    risk_level VARCHAR(10) DEFAULT 'LOW' CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW')),
    
    -- 强制平仓相关
    is_forced_sell BOOLEAN DEFAULT FALSE,
    forced_sell_at TIMESTAMPTZ,
    forced_sell_reason TEXT,
    
    -- 锁定期
    lock_until DATE,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 唯一约束
    UNIQUE(user_id, symbol)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_symbol ON public.positions(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_positions_quantity ON public.positions(quantity) WHERE quantity > 0;
CREATE INDEX IF NOT EXISTS idx_positions_risk_level ON public.positions(risk_level);
CREATE INDEX IF NOT EXISTS idx_positions_forced_sell ON public.positions(is_forced_sell) WHERE is_forced_sell = TRUE;

-- 启用 RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 2. 创建 RLS 策略
-- ==========================================================

-- 用户查看自己的持仓
DROP POLICY IF EXISTS "Users view own positions" ON public.positions;
CREATE POLICY "Users view own positions" ON public.positions
    FOR SELECT USING (auth.uid() = user_id);

-- 用户更新自己的持仓
DROP POLICY IF EXISTS "Users update own positions" ON public.positions;
CREATE POLICY "Users update own positions" ON public.positions
    FOR UPDATE USING (auth.uid() = user_id);

-- 用户插入自己的持仓
DROP POLICY IF EXISTS "Users insert own positions" ON public.positions;
CREATE POLICY "Users insert own positions" ON public.positions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理员完全访问
DROP POLICY IF EXISTS "admin_positions_all" ON public.positions;
CREATE POLICY "admin_positions_all" ON public.positions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role IN ('ADMIN', 'SUPER_ADMIN') OR p.admin_level IN ('admin', 'super_admin'))
        )
    );

-- Service role 完全访问
DROP POLICY IF EXISTS "Service role full access" ON public.positions;
CREATE POLICY "Service role full access" ON public.positions
    FOR ALL
    USING (auth.role() = 'service_role');

-- ==========================================================
-- 3. 添加触发器
-- ==========================================================

-- 更新时间触发器
DROP TRIGGER IF EXISTS update_positions_updated_at ON public.positions;
CREATE TRIGGER update_positions_updated_at 
    BEFORE UPDATE ON public.positions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- 4. 添加注释
-- ==========================================================

COMMENT ON TABLE public.positions IS '用户持仓表 - 存储用户的股票持仓信息';
COMMENT ON COLUMN public.positions.symbol IS '股票代码';
COMMENT ON COLUMN public.positions.quantity IS '持仓数量';
COMMENT ON COLUMN public.positions.available_quantity IS '可用数量（未冻结）';
COMMENT ON COLUMN public.positions.cost_price IS '成本价';
COMMENT ON COLUMN public.positions.current_price IS '当前价格';
COMMENT ON COLUMN public.positions.risk_level IS '风险等级：HIGH(高风险), MEDIUM(中风险), LOW(低风险)';

COMMIT;
