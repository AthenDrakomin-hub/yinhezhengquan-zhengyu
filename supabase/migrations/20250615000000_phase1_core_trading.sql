-- ========================================================
-- 第一阶段核心功能迁移
-- 包含：模拟银行账户、成交记录、清算流水、手续费配置
-- ========================================================

BEGIN;

-- ==========================================================
-- 1. 模拟银行账户表 (bank_accounts)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 银行信息
    bank_code VARCHAR(20) NOT NULL,              -- 银行代码：ICBC, CCB, ABC等
    bank_name VARCHAR(50) NOT NULL,              -- 银行名称
    account_no VARCHAR(30) NOT NULL,             -- 银行账号（脱敏存储）
    account_name VARCHAR(50),                    -- 账户名称
    
    -- 余额信息
    balance DECIMAL(20, 2) DEFAULT 100000.00,    -- 银行余额（默认10万）
    
    -- 状态
    is_default BOOLEAN DEFAULT FALSE,            -- 是否默认银行卡
    status VARCHAR(20) DEFAULT 'ACTIVE',         -- ACTIVE, FROZEN, CLOSED
    
    -- 限额
    daily_limit DECIMAL(20, 2) DEFAULT 500000,   -- 单日转账限额
    single_limit DECIMAL(20, 2) DEFAULT 100000,  -- 单笔限额
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, bank_code, account_no)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON public.bank_accounts(status);

COMMENT ON TABLE public.bank_accounts IS '模拟银行账户表';

-- ==========================================================
-- 2. 银证转账记录表 (bank_transfers)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.bank_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    
    -- 转账信息
    transfer_type VARCHAR(20) NOT NULL,          -- IN(银行转证券), OUT(证券转银行)
    amount DECIMAL(20, 2) NOT NULL,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'PENDING',        -- PENDING, SUCCESS, FAILED
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- 备注
    remark TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_user ON public.bank_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_status ON public.bank_transfers(status);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_created ON public.bank_transfers(created_at DESC);

COMMENT ON TABLE public.bank_transfers IS '银证转账记录表';

-- ==========================================================
-- 3. 成交记录表 (trade_executions)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.trade_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联订单
    buy_trade_id UUID REFERENCES public.trades(id),
    sell_trade_id UUID REFERENCES public.trades(id),
    buy_user_id UUID REFERENCES auth.users(id),
    sell_user_id UUID REFERENCES auth.users(id),
    
    -- 股票信息
    stock_code VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100),
    
    -- 成交信息
    match_price DECIMAL(18, 4) NOT NULL,
    match_quantity INTEGER NOT NULL,
    match_amount DECIMAL(20, 2) GENERATED ALWAYS AS (match_price * match_quantity) STORED,
    
    -- 手续费
    buy_fee DECIMAL(20, 2) DEFAULT 0,
    sell_fee DECIMAL(20, 2) DEFAULT 0,
    sell_tax DECIMAL(20, 2) DEFAULT 0,           -- 印花税（仅卖出）
    
    -- 时间戳
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 撮合批次ID（用于关联同一批次的撮合）
    batch_id UUID DEFAULT gen_random_uuid()
);

CREATE INDEX IF NOT EXISTS idx_trade_executions_buy ON public.trade_executions(buy_trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_sell ON public.trade_executions(sell_trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_stock ON public.trade_executions(stock_code);
CREATE INDEX IF NOT EXISTS idx_trade_executions_time ON public.trade_executions(matched_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_executions_batch ON public.trade_executions(batch_id);

COMMENT ON TABLE public.trade_executions IS '成交记录表';

-- ==========================================================
-- 4. 资金流水表 (fund_flows)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.fund_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 流水类型
    flow_type VARCHAR(30) NOT NULL,              -- DEPOSIT, WITHDRAW, BUY, SELL, FEE, TRANSFER_IN, TRANSFER_OUT, DIVIDEND
    related_id UUID,                             -- 关联交易/转账ID
    
    -- 金额
    amount DECIMAL(20, 2) NOT NULL,              -- 变动金额（正数为入，负数为出）
    balance_before DECIMAL(20, 2),               -- 变动前余额
    balance_after DECIMAL(20, 2),                -- 变动后余额
    
    -- 描述
    description VARCHAR(200),
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_flows_user ON public.fund_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_flows_type ON public.fund_flows(flow_type);
CREATE INDEX IF NOT EXISTS idx_fund_flows_created ON public.fund_flows(created_at DESC);

COMMENT ON TABLE public.fund_flows IS '资金流水表';

-- ==========================================================
-- 5. 手续费配置表 (fee_config)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.fee_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 适用范围
    market_type VARCHAR(20) NOT NULL,            -- A_SHARE, HK
    trade_type VARCHAR(20) NOT NULL,             -- BUY, SELL
    
    -- 费率配置
    commission_rate DECIMAL(10, 6) DEFAULT 0.0003,    -- 佣金费率（万分之三）
    commission_min DECIMAL(10, 2) DEFAULT 5.00,        -- 最低佣金
    stamp_tax_rate DECIMAL(10, 6) DEFAULT 0.001,       -- 印花税率（千分之一，仅卖出）
    transfer_fee_rate DECIMAL(10, 6) DEFAULT 0.00001,  -- 过户费率
    
    -- VIP折扣
    vip_discount DECIMAL(5, 4) DEFAULT 1.0,            -- VIP折扣系数
    
    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(market_type, trade_type)
);

-- 初始化费率配置
INSERT INTO public.fee_config (market_type, trade_type, commission_rate, commission_min, stamp_tax_rate, transfer_fee_rate)
VALUES 
    ('A_SHARE', 'BUY', 0.0003, 5.00, 0, 0.00001),
    ('A_SHARE', 'SELL', 0.0003, 5.00, 0.001, 0.00001),
    ('HK', 'BUY', 0.0003, 5.00, 0, 0),
    ('HK', 'SELL', 0.0003, 5.00, 0, 0)
ON CONFLICT (market_type, trade_type) DO NOTHING;

COMMENT ON TABLE public.fee_config IS '手续费配置表';

-- ==========================================================
-- 6. 撮合日志表 (match_logs)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.match_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 批次信息
    batch_id UUID DEFAULT gen_random_uuid(),
    
    -- 撮合统计
    total_orders INTEGER DEFAULT 0,              -- 待撮合订单数
    matched_count INTEGER DEFAULT 0,             -- 成功撮合数
    failed_count INTEGER DEFAULT 0,              -- 失败数
    
    -- 时间戳
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,                         -- 执行耗时（毫秒）
    
    -- 结果
    status VARCHAR(20) DEFAULT 'RUNNING',        -- RUNNING, COMPLETED, FAILED
    error_message TEXT,
    
    -- 详细日志
    details JSONB DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_match_logs_batch ON public.match_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_status ON public.match_logs(status);
CREATE INDEX IF NOT EXISTS idx_match_logs_created ON public.match_logs(started_at DESC);

COMMENT ON TABLE public.match_logs IS '撮合日志表';

-- ==========================================================
-- 7. RLS 策略
-- ==========================================================

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access bank_accounts" ON public.bank_accounts FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own bank transfers" ON public.bank_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access bank_transfers" ON public.bank_transfers FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own fund flows" ON public.fund_flows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access fund_flows" ON public.fund_flows FOR ALL USING (auth.role() = 'service_role');

-- ==========================================================
-- 8. 计算手续费的函数
-- ==========================================================

CREATE OR REPLACE FUNCTION calculate_trade_fee(
    p_market_type VARCHAR(20),
    p_trade_type VARCHAR(20),
    p_amount DECIMAL(20, 2),
    p_is_vip BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_config RECORD;
    v_commission DECIMAL(20, 2);
    v_stamp_tax DECIMAL(20, 2);
    v_transfer_fee DECIMAL(20, 2);
    v_total_fee DECIMAL(20, 2);
    v_discount DECIMAL(5, 4);
BEGIN
    -- 获取费率配置
    SELECT * INTO v_config FROM fee_config 
    WHERE market_type = p_market_type AND trade_type = p_trade_type AND is_active = TRUE;
    
    IF NOT FOUND THEN
        -- 默认配置
        v_config := ROW(null, null, null, 0.0003, 5.00, 0.001, 0.00001, 1.0, true, null, null);
    END IF;
    
    -- VIP折扣
    v_discount := CASE WHEN p_is_vip THEN COALESCE(v_config.vip_discount, 0.8) ELSE 1.0 END;
    
    -- 计算佣金
    v_commission := GREATEST(p_amount * COALESCE(v_config.commission_rate, 0.0003) * v_discount, COALESCE(v_config.commission_min, 5.00));
    
    -- 计算印花税（仅卖出）
    v_stamp_tax := CASE WHEN p_trade_type = 'SELL' THEN p_amount * COALESCE(v_config.stamp_tax_rate, 0.001) ELSE 0 END;
    
    -- 计算过户费（仅A股）
    v_transfer_fee := CASE WHEN p_market_type = 'A_SHARE' THEN p_amount * COALESCE(v_config.transfer_fee_rate, 0.00001) ELSE 0 END;
    
    -- 总费用
    v_total_fee := v_commission + v_stamp_tax + v_transfer_fee;
    
    RETURN json_build_object(
        'commission', v_commission,
        'stamp_tax', v_stamp_tax,
        'transfer_fee', v_transfer_fee,
        'total_fee', v_total_fee
    );
END;
$$;

COMMENT ON FUNCTION calculate_trade_fee IS '计算交易手续费';

-- ==========================================================
-- 9. 记录资金流水函数
-- ==========================================================

CREATE OR REPLACE FUNCTION record_fund_flow(
    p_user_id UUID,
    p_flow_type VARCHAR(30),
    p_amount DECIMAL(20, 2),
    p_related_id UUID DEFAULT NULL,
    p_description VARCHAR(200) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance_before DECIMAL(20, 2);
    v_balance_after DECIMAL(20, 2);
    v_flow_id UUID;
BEGIN
    -- 获取当前余额
    SELECT available_balance INTO v_balance_before
    FROM assets WHERE user_id = p_user_id;
    
    v_balance_after := v_balance_before + p_amount;
    
    -- 插入流水记录
    INSERT INTO fund_flows (user_id, flow_type, amount, related_id, balance_before, balance_after, description)
    VALUES (p_user_id, p_flow_type, p_amount, p_related_id, v_balance_before, v_balance_after, p_description)
    RETURNING id INTO v_flow_id;
    
    RETURN v_flow_id;
END;
$$;

COMMENT ON FUNCTION record_fund_flow IS '记录资金流水';

COMMIT;
