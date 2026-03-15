-- ========================================================
-- 第二阶段：基金与理财产品系统迁移
-- 包含：基金产品、基金持仓、基金订单、理财持仓、理财订单、收益记录
-- ========================================================

BEGIN;

-- ==========================================================
-- 1. 基金产品表 (funds)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,                -- 基金代码
    name VARCHAR(100) NOT NULL,                      -- 基金名称
    
    -- 基金类型
    fund_type VARCHAR(30) DEFAULT '混合型',           -- 股票型/债券型/混合型/指数型/货币型/商品型/QDII
    
    -- 净值相关
    nav DECIMAL(18, 4) DEFAULT 1.0000,               -- 单位净值
    nav_date DATE,                                    -- 净值日期
    day_change DECIMAL(18, 4) DEFAULT 0,             -- 日涨跌额
    day_change_rate DECIMAL(10, 4) DEFAULT 0,        -- 日涨跌幅(%)
    
    -- 收益相关
    one_week_return DECIMAL(10, 4),                  -- 近一周收益率
    one_month_return DECIMAL(10, 4),                 -- 近一月收益率
    three_month_return DECIMAL(10, 4),               -- 近三月收益率
    six_month_return DECIMAL(10, 4),                 -- 近六月收益率
    one_year_return DECIMAL(10, 4),                  -- 近一年收益率
    since_inception_return DECIMAL(10, 4),           -- 成立以来收益率
    
    -- 规模相关
    scale DECIMAL(20, 2),                            -- 基金规模(亿元)
    
    -- 费率
    purchase_fee_rate DECIMAL(10, 4) DEFAULT 0.0015, -- 申购费率
    redeem_fee_rate DECIMAL(10, 4) DEFAULT 0.005,    -- 赎回费率
    management_fee DECIMAL(10, 4) DEFAULT 0.015,     -- 管理费率(年)
    custody_fee DECIMAL(10, 4) DEFAULT 0.0025,       -- 托管费率(年)
    
    -- 申购限制
    min_purchase DECIMAL(20, 2) DEFAULT 10,          -- 最低申购金额
    min_increment DECIMAL(20, 2) DEFAULT 1,          -- 最小递增金额
    max_purchase DECIMAL(20, 2),                     -- 单日申购上限
    
    -- 风险等级
    risk_level INT DEFAULT 3 CHECK (risk_level BETWEEN 1 AND 5),
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'liquidated')),
    can_purchase BOOLEAN DEFAULT TRUE,               -- 是否可申购
    can_redeem BOOLEAN DEFAULT TRUE,                 -- 是否可赎回
    
    -- 元数据
    manager VARCHAR(100),                            -- 基金经理
    company VARCHAR(100),                            -- 基金公司
    establish_date DATE,                             -- 成立日期
    logo_url TEXT,
    description TEXT,
    
    -- 同步信息
    data_source VARCHAR(20) DEFAULT 'yinhe',         -- 数据来源
    last_sync_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funds_code ON public.funds(code);
CREATE INDEX IF NOT EXISTS idx_funds_type ON public.funds(fund_type);
CREATE INDEX IF NOT EXISTS idx_funds_status ON public.funds(status);
CREATE INDEX IF NOT EXISTS idx_funds_nav_date ON public.funds(nav_date);

COMMENT ON TABLE public.funds IS '基金产品表';

-- ==========================================================
-- 2. 基金净值历史表 (fund_nav_history)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.fund_nav_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_code VARCHAR(20) NOT NULL,                  -- 基金代码
    
    nav_date DATE NOT NULL,                          -- 净值日期
    nav DECIMAL(18, 4) NOT NULL,                     -- 单位净值
    acc_nav DECIMAL(18, 4),                          -- 累计净值
    day_change DECIMAL(18, 4) DEFAULT 0,             -- 日涨跌额
    day_change_rate DECIMAL(10, 4) DEFAULT 0,        -- 日涨跌幅
    
    -- 分红信息
    dividend DECIMAL(18, 4) DEFAULT 0,               -- 分红
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(fund_code, nav_date)
);

CREATE INDEX IF NOT EXISTS idx_fund_nav_history_fund ON public.fund_nav_history(fund_code);
CREATE INDEX IF NOT EXISTS idx_fund_nav_history_date ON public.fund_nav_history(nav_date DESC);

COMMENT ON TABLE public.fund_nav_history IS '基金净值历史表';

-- ==========================================================
-- 3. 基金订单表 (fund_orders)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.fund_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 基金信息
    fund_code VARCHAR(20) NOT NULL,
    fund_name VARCHAR(100),
    
    -- 订单类型
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('PURCHASE', 'REDEEM')),
    
    -- 申购/赎回信息
    amount DECIMAL(20, 2),                           -- 申购金额（申购时使用）
    shares DECIMAL(20, 4),                           -- 份额（赎回时使用）
    
    -- 确认信息
    confirm_nav DECIMAL(18, 4),                      -- 确认净值
    confirm_shares DECIMAL(20, 4),                   -- 确认份额（申购后）
    confirm_amount DECIMAL(20, 2),                   -- 确认金额（赎回后）
    
    -- 费用
    fee DECIMAL(20, 4) DEFAULT 0,                    -- 手续费
    
    -- 状态
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'SETTLED', 'CANCELLED', 'FAILED')),
    
    -- 时间
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,   -- 下单日期
    confirm_date DATE,                               -- 确认日期
    settle_date DATE,                                -- 结算日期
    
    -- 备注
    remark TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_orders_user ON public.fund_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_orders_fund ON public.fund_orders(fund_code);
CREATE INDEX IF NOT EXISTS idx_fund_orders_status ON public.fund_orders(status);
CREATE INDEX IF NOT EXISTS idx_fund_orders_date ON public.fund_orders(order_date DESC);

COMMENT ON TABLE public.fund_orders IS '基金申赎订单表';

-- ==========================================================
-- 4. 基金持仓表 (fund_holdings)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.fund_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 基金信息
    fund_code VARCHAR(20) NOT NULL,
    fund_name VARCHAR(100),
    
    -- 持仓信息
    total_shares DECIMAL(20, 4) DEFAULT 0,           -- 总份额
    available_shares DECIMAL(20, 4) DEFAULT 0,       -- 可赎回份额（T+1确认后可用）
    frozen_shares DECIMAL(20, 4) DEFAULT 0,          -- 冻结份额（赎回中的）
    
    -- 成本
    cost_amount DECIMAL(20, 2) DEFAULT 0,            -- 投入成本
    cost_nav DECIMAL(18, 4) DEFAULT 0,               -- 成本净值
    
    -- 当前市值
    current_nav DECIMAL(18, 4) DEFAULT 0,            -- 当前净值
    market_value DECIMAL(20, 2) DEFAULT 0,           -- 当前市值
    profit DECIMAL(20, 2) DEFAULT 0,                 -- 浮动盈亏
    profit_rate DECIMAL(10, 4) DEFAULT 0,            -- 收益率
    
    -- 分红
    total_dividend DECIMAL(20, 2) DEFAULT 0,         -- 累计分红
    
    -- 时间
    first_purchase_date DATE,                        -- 首次购买日期
    last_update_date DATE,                           -- 最后更新日期
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, fund_code)
);

CREATE INDEX IF NOT EXISTS idx_fund_holdings_user ON public.fund_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_holdings_fund ON public.fund_holdings(fund_code);

COMMENT ON TABLE public.fund_holdings IS '用户基金持仓表';

-- ==========================================================
-- 5. 理财产品持仓表 (wealth_holdings)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.wealth_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 产品信息
    product_code VARCHAR(20) NOT NULL,
    product_name VARCHAR(100),
    
    -- 持仓信息
    principal DECIMAL(20, 2) NOT NULL,               -- 本金
    current_amount DECIMAL(20, 2) DEFAULT 0,         -- 当前金额（本金+收益）
    accrued_interest DECIMAL(20, 2) DEFAULT 0,       -- 已计收益
    
    -- 时间
    purchase_date DATE NOT NULL,                     -- 购买日期
    value_date DATE,                                 -- 起息日
    maturity_date DATE,                              -- 到期日
    last_interest_date DATE,                         -- 上次计息日期
    
    -- 状态
    status VARCHAR(20) DEFAULT 'holding' CHECK (status IN ('holding', 'matured', 'redeemed')),
    
    -- 关联订单
    order_id UUID REFERENCES public.wealth_orders(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, product_code, purchase_date)
);

CREATE INDEX IF NOT EXISTS idx_wealth_holdings_user ON public.wealth_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_wealth_holdings_product ON public.wealth_holdings(product_code);
CREATE INDEX IF NOT EXISTS idx_wealth_holdings_status ON public.wealth_holdings(status);
CREATE INDEX IF NOT EXISTS idx_wealth_holdings_maturity ON public.wealth_holdings(maturity_date);

COMMENT ON TABLE public.wealth_holdings IS '用户理财产品持仓表';

-- ==========================================================
-- 6. 理财产品订单表 (wealth_orders)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.wealth_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 产品信息
    product_code VARCHAR(20) NOT NULL,
    product_name VARCHAR(100),
    
    -- 订单类型
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('PURCHASE', 'REDEEM')),
    
    -- 金额
    amount DECIMAL(20, 2) NOT NULL,                  -- 申购/赎回金额
    
    -- 收益
    interest DECIMAL(20, 2) DEFAULT 0,               -- 利息收益
    
    -- 状态
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'SETTLED', 'CANCELLED', 'FAILED')),
    
    -- 时间
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    value_date DATE,                                 -- 起息日
    maturity_date DATE,                              -- 到期日
    settle_date DATE,                                -- 结算日
    
    -- 备注
    remark TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wealth_orders_user ON public.wealth_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_wealth_orders_product ON public.wealth_orders(product_code);
CREATE INDEX IF NOT EXISTS idx_wealth_orders_status ON public.wealth_orders(status);
CREATE INDEX IF NOT EXISTS idx_wealth_orders_date ON public.wealth_orders(order_date DESC);

COMMENT ON TABLE public.wealth_orders IS '理财产品订单表';

-- ==========================================================
-- 7. 理财收益记录表 (wealth_interest_records)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.wealth_interest_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    holding_id UUID REFERENCES public.wealth_holdings(id) ON DELETE CASCADE,
    
    -- 产品信息
    product_code VARCHAR(20) NOT NULL,
    product_name VARCHAR(100),
    
    -- 收益信息
    principal DECIMAL(20, 2) NOT NULL,               -- 计息本金
    rate DECIMAL(10, 4) NOT NULL,                    -- 年化收益率
    days INT NOT NULL,                               -- 计息天数
    interest DECIMAL(20, 2) NOT NULL,                -- 利息金额
    
    -- 日期
    interest_date DATE NOT NULL,                     -- 计息日期
    start_date DATE,                                 -- 计息开始日期
    end_date DATE,                                   -- 计息结束日期
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wealth_interest_user ON public.wealth_interest_records(user_id);
CREATE INDEX IF NOT EXISTS idx_wealth_interest_holding ON public.wealth_interest_records(holding_id);
CREATE INDEX IF NOT EXISTS idx_wealth_interest_date ON public.wealth_interest_records(interest_date DESC);

COMMENT ON TABLE public.wealth_interest_records IS '理财收益记录表';

-- ==========================================================
-- 8. RLS 策略
-- ==========================================================

-- 基金产品：公开读取
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read funds" ON public.funds FOR SELECT USING (true);
CREATE POLICY "Admin manage funds" ON public.funds FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- 基金净值历史：公开读取
ALTER TABLE public.fund_nav_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fund_nav_history" ON public.fund_nav_history FOR SELECT USING (true);

-- 基金订单：用户自己管理
ALTER TABLE public.fund_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fund_orders" ON public.fund_orders FOR ALL USING (auth.uid() = user_id);

-- 基金持仓：用户自己管理
ALTER TABLE public.fund_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fund_holdings" ON public.fund_holdings FOR ALL USING (auth.uid() = user_id);

-- 理财持仓：用户自己管理
ALTER TABLE public.wealth_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wealth_holdings" ON public.wealth_holdings FOR ALL USING (auth.uid() = user_id);

-- 理财订单：用户自己管理
ALTER TABLE public.wealth_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wealth_orders" ON public.wealth_orders FOR ALL USING (auth.uid() = user_id);

-- 理财收益记录：用户自己查看
ALTER TABLE public.wealth_interest_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wealth_interest_records" ON public.wealth_interest_records FOR SELECT USING (auth.uid() = user_id);

-- ==========================================================
-- 9. 触发器：自动更新 updated_at
-- ==========================================================

DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['funds', 'fund_orders', 'fund_holdings', 'wealth_holdings', 'wealth_orders'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- ==========================================================
-- 10. 初始化基金产品数据
-- ==========================================================

INSERT INTO public.funds (code, name, fund_type, nav, nav_date, day_change_rate, one_year_return, risk_level, purchase_fee_rate, redeem_fee_rate, min_purchase, manager, company, description, can_purchase, can_redeem)
VALUES 
    ('110022', '易方达消费行业股票', '股票型', 4.5234, CURRENT_DATE - 1, 0.52, 28.5, 4, 0.0015, 0.005, 10, '萧楠', '易方达基金', '主要投资于消费行业上市公司', true, true),
    ('000961', '天弘沪深300ETF联接A', '指数型', 1.8521, CURRENT_DATE - 1, -0.48, 15.2, 3, 0.0010, 0.005, 10, '张子法', '天弘基金', '追踪沪深300指数', true, true),
    ('050025', '博时黄金ETF联接C', '商品型', 5.8963, CURRENT_DATE - 1, 0.89, 22.3, 3, 0.0008, 0.005, 10, '赵云阳', '博时基金', '投资黄金现货合约', true, true),
    ('161725', '招商中证白酒指数', '指数型', 1.2345, CURRENT_DATE - 1, 1.28, 35.6, 4, 0.0012, 0.005, 10, '侯昊', '招商基金', '追踪中证白酒指数', true, true),
    ('519772', '交银定期支付双息平衡', '债券型', 1.4523, CURRENT_DATE - 1, 0.08, 6.8, 2, 0.0006, 0.005, 100, '于海颖', '交银施罗德', '稳健型债券基金', true, true),
    ('511010', '国泰上证5年期国债ETF', '债券型', 122.3500, CURRENT_DATE - 1, 0.02, 4.5, 1, 0.0003, 0.002, 1000, '王玉', '国泰基金', '追踪上证5年期国债指数', true, true),
    ('000198', '天弘余额宝货币', '货币型', 1.0000, CURRENT_DATE - 1, 0.00, 1.8, 1, 0, 0, 1, '王登峰', '天弘基金', '货币市场基金，灵活存取', true, true),
    ('000001', '华夏成长混合', '混合型', 2.3456, CURRENT_DATE - 1, 0.35, 12.5, 3, 0.0015, 0.005, 10, '代瑞亮', '华夏基金', '成长型混合基金', true, true)
ON CONFLICT (code) DO NOTHING;

-- ==========================================================
-- 11. 初始化理财产品数据补充
-- ==========================================================

INSERT INTO public.wealth_products (code, name, type, expected_return, return_type, min_amount, increment, period_days, period_type, risk_level, quota, max_quota, per_user_limit, status, tag, description, issuer)
VALUES 
    ('YH003', '银河月月盈', 'deposit', 2.8, 'annual', 5000, 1000, 30, 'fixed', 1, 20000000, 20000000, 500000, 'active', '稳健', '银河证券月度理财产品，稳健收益', '银河证券'),
    ('YH004', '银河双季宝', 'deposit', 3.5, 'annual', 10000, 1000, 180, 'fixed', 2, 30000000, 30000000, 1000000, 'active', '热销', '半年期稳健理财，收益可观', '银河证券'),
    ('YH005', '银河年年红', 'deposit', 4.2, 'annual', 50000, 10000, 365, 'fixed', 2, 50000000, 50000000, 2000000, 'active', '新品', '一年期定期理财，锁定高收益', '银河证券'),
    ('YH006', '银河灵活宝', 'deposit', 2.2, 'annual', 1000, 100, 0, 'flexible', 1, 100000000, 100000000, 5000000, 'active', '灵活', '灵活存取，随时赎回', '银河证券')
ON CONFLICT (code) DO NOTHING;

-- ==========================================================
-- 12. 函数：计算基金申购份额
-- ==========================================================

CREATE OR REPLACE FUNCTION calculate_fund_shares(
    p_amount DECIMAL(20, 2),
    p_nav DECIMAL(18, 4),
    p_fee_rate DECIMAL(10, 4)
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_fee DECIMAL(20, 4);
    v_net_amount DECIMAL(20, 2);
    v_shares DECIMAL(20, 4);
BEGIN
    -- 计算申购费
    v_fee := p_amount * p_fee_rate;
    v_net_amount := p_amount - v_fee;
    
    -- 计算份额
    v_shares := v_net_amount / p_nav;
    
    RETURN json_build_object(
        'amount', p_amount,
        'fee', v_fee,
        'net_amount', v_net_amount,
        'nav', p_nav,
        'shares', v_shares
    );
END;
$$;

COMMENT ON FUNCTION calculate_fund_shares IS '计算基金申购份额';

-- ==========================================================
-- 13. 函数：计算基金赎回金额
-- ==========================================================

CREATE OR REPLACE FUNCTION calculate_fund_redeem(
    p_shares DECIMAL(20, 4),
    p_nav DECIMAL(18, 4),
    p_fee_rate DECIMAL(10, 4),
    p_holding_days INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_amount DECIMAL(20, 2);
    v_fee DECIMAL(20, 4);
    v_actual_fee_rate DECIMAL(10, 4);
    v_net_amount DECIMAL(20, 2);
BEGIN
    -- 计算赎回金额
    v_amount := p_shares * p_nav;
    
    -- 赎回费率（持有时间越长费率越低）
    IF p_holding_days >= 730 THEN
        v_actual_fee_rate := 0;
    ELSIF p_holding_days >= 365 THEN
        v_actual_fee_rate := p_fee_rate * 0.25;
    ELSIF p_holding_days >= 180 THEN
        v_actual_fee_rate := p_fee_rate * 0.5;
    ELSIF p_holding_days >= 30 THEN
        v_actual_fee_rate := p_fee_rate * 0.75;
    ELSE
        v_actual_fee_rate := p_fee_rate;
    END IF;
    
    v_fee := v_amount * v_actual_fee_rate;
    v_net_amount := v_amount - v_fee;
    
    RETURN json_build_object(
        'shares', p_shares,
        'nav', p_nav,
        'amount', v_amount,
        'fee_rate', v_actual_fee_rate,
        'fee', v_fee,
        'net_amount', v_net_amount
    );
END;
$$;

COMMENT ON FUNCTION calculate_fund_redeem IS '计算基金赎回金额';

-- ==========================================================
-- 14. 函数：计算理财收益
-- ==========================================================

CREATE OR REPLACE FUNCTION calculate_wealth_interest(
    p_principal DECIMAL(20, 2),
    p_rate DECIMAL(10, 4),
    p_days INT
)
RETURNS DECIMAL(20, 2)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 利息 = 本金 * 年化收益率 * 天数 / 365
    RETURN ROUND(p_principal * p_rate / 100 * p_days / 365, 2);
END;
$$;

COMMENT ON FUNCTION calculate_wealth_interest IS '计算理财收益';

COMMIT;
