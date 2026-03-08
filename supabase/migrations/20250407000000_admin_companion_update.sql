-- ==========================================================
-- 管理端功能配套更新
-- 创建时间: 2025-04-07
-- 说明: 添加强制平仓相关字段和表、用户通知系统
-- ==========================================================

-- ==========================================================
-- 1. positions 表添加字段
-- ==========================================================

-- 添加风险等级字段
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW' 
CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW'));

-- 添加是否被强制平仓标记
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS is_forced_sell BOOLEAN DEFAULT FALSE;

-- 添加强制平仓时间
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS forced_sell_at TIMESTAMPTZ;

-- 添加强制平仓原因
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS forced_sell_reason TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_positions_risk_level ON public.positions(risk_level);
CREATE INDEX IF NOT EXISTS idx_positions_forced_sell ON public.positions(is_forced_sell) WHERE is_forced_sell = TRUE;

-- ==========================================================
-- 2. 强制平仓记录表
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.force_sell_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
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
    trade_id UUID REFERENCES public.trades(id),
    
    -- 元数据
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_force_sell_user ON public.force_sell_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_force_sell_admin ON public.force_sell_records(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_force_sell_symbol ON public.force_sell_records(symbol);

-- RLS
ALTER TABLE public.force_sell_records ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的强制平仓记录
CREATE POLICY "Users view own force_sell_records" ON public.force_sell_records
    FOR SELECT USING (auth.uid() = user_id);

-- 管理员可以查看所有记录
CREATE POLICY "Admins view all force_sell_records" ON public.force_sell_records
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 只有管理员可以插入
CREATE POLICY "Admins insert force_sell_records" ON public.force_sell_records
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ==========================================================
-- 3. 用户通知表
-- ==========================================================

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
    related_type TEXT,      -- 关联类型: trade, position, order 等
    related_id TEXT,        -- 关联ID
    
    -- 状态
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- 优先级
    priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    
    -- 过期时间
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.user_notifications(priority);

-- RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的通知
CREATE POLICY "Users view own notifications" ON public.user_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- 用户可以更新自己的通知（标记已读）
CREATE POLICY "Users update own notifications" ON public.user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 只有管理员和系统可以插入通知
CREATE POLICY "Admins insert notifications" ON public.user_notifications
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR auth.uid() IS NOT NULL  -- 允许服务端插入
    );

-- ==========================================================
-- 4. 触发器：自动更新 updated_at
-- ==========================================================

-- 为 force_sell_records 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_force_sell_records_updated_at ON public.force_sell_records;
CREATE TRIGGER update_force_sell_records_updated_at
    BEFORE UPDATE ON public.force_sell_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- 5. 触发器：强制平仓时自动创建通知
-- ==========================================================

CREATE OR REPLACE FUNCTION notify_force_sell()
RETURNS TRIGGER AS $$
BEGIN
    -- 当插入强制平仓记录时，自动创建用户通知
    INSERT INTO public.user_notifications (
        user_id,
        notification_type,
        title,
        content,
        related_type,
        related_id,
        priority
    ) VALUES (
        NEW.user_id,
        'FORCE_SELL',
        '持仓强制平仓通知',
        format('您的持仓 %s (%s) 已被强制平仓 %s 股。原因：%s',
            NEW.stock_name,
            NEW.symbol,
            NEW.quantity,
            NEW.reason
        ),
        'position',
        NEW.position_id::TEXT,
        'URGENT'
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_notify_force_sell ON public.force_sell_records;
CREATE TRIGGER trigger_notify_force_sell
    AFTER INSERT ON public.force_sell_records
    FOR EACH ROW
    EXECUTE FUNCTION notify_force_sell();

-- ==========================================================
-- 6. 添加交易类型
-- ==========================================================

-- 为 trades 表添加强制平仓交易类型
ALTER TABLE public.trades 
DROP CONSTRAINT IF EXISTS trades_trade_type_check;

ALTER TABLE public.trades 
ADD CONSTRAINT trades_trade_type_check 
CHECK (trade_type IN ('BUY', 'SELL', 'IPO', 'FORCE_SELL'));

-- 为 fund_flows 表添加强制平仓流水类型
ALTER TABLE public.fund_flows 
DROP CONSTRAINT IF EXISTS fund_flows_flow_type_check;

ALTER TABLE public.fund_flows 
ADD CONSTRAINT fund_flows_flow_type_check 
CHECK (flow_type IN ('DEPOSIT', 'WITHDRAW', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'FREEZE', 'UNFREEZE', 'REFUND', 'FORCE_SELL'));

-- ==========================================================
-- 7. 风险评级视图
-- ==========================================================

CREATE OR REPLACE VIEW public.position_risk_analysis AS
SELECT 
    p.id,
    p.user_id,
    p.symbol,
    p.name as stock_name,
    p.quantity,
    p.available_quantity,
    p.average_price,
    p.current_price,
    (p.quantity * p.current_price) as market_value,
    ((p.current_price - p.average_price) * p.quantity) as profit_loss,
    CASE 
        WHEN p.average_price > 0 THEN ((p.current_price - p.average_price) / p.average_price * 100)
        ELSE 0 
    END as profit_loss_percent,
    p.risk_level,
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

-- 授权视图访问权限
GRANT SELECT ON public.position_risk_analysis TO authenticated;

-- ==========================================================
-- 8. 注释
-- ==========================================================

COMMENT ON TABLE public.force_sell_records IS '强制平仓记录表';
COMMENT ON TABLE public.user_notifications IS '用户通知表';
COMMENT ON COLUMN public.positions.risk_level IS '持仓风险等级: HIGH-高风险, MEDIUM-中风险, LOW-低风险';
COMMENT ON COLUMN public.positions.is_forced_sell IS '是否已被强制平仓';
