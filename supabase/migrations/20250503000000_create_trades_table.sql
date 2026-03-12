-- =====================================================
-- 交易订单表迁移脚本
-- 创建 trades 表，用于存储所有交易订单
-- =====================================================

-- 1. 创建交易订单表
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 市场信息
    market_type VARCHAR(20) DEFAULT 'A_SHARE', -- A_SHARE, HK, IPO, BLOCK, LIMIT_UP
    
    -- 交易类型
    trade_type VARCHAR(20) NOT NULL, -- BUY, SELL, IPO_SUBSCRIBE, BLOCK_BUY, LIMIT_UP_BUY, FORCE_SELL
    
    -- 股票信息
    stock_code VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100),
    
    -- 价格和数量
    price DECIMAL(18, 4) NOT NULL,
    quantity INTEGER NOT NULL,
    amount DECIMAL(20, 2) GENERATED ALWAYS AS (price * quantity) STORED,
    
    -- 杠杆和费用
    leverage DECIMAL(10, 2) DEFAULT 1,
    fee DECIMAL(20, 2) DEFAULT 0,
    
    -- 执行信息
    executed_quantity INTEGER DEFAULT 0,
    executed_amount DECIMAL(20, 2) DEFAULT 0,
    remaining_quantity INTEGER,
    
    -- 审批流程
    need_approval BOOLEAN DEFAULT false,
    approval_status VARCHAR(20), -- PENDING, APPROVED, REJECTED
    approved_by UUID REFERENCES auth.users(id),
    approval_time TIMESTAMPTZ,
    approval_remark TEXT,
    
    -- 订单状态
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SUBMITTED, MATCHING, PARTIAL, SUCCESS, CANCELLED, FAILED, REJECTED
    order_type VARCHAR(20) DEFAULT 'MARKET', -- MARKET, LIMIT
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submit_time TIMESTAMPTZ,
    finish_time TIMESTAMPTZ,
    
    -- 关联信息
    related_trade_id UUID REFERENCES public.trades(id),
    match_pool_id UUID,
    
    -- 备注
    remark TEXT,
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_trade_type CHECK (trade_type IN (
        'BUY', 'SELL', 'IPO_SUBSCRIBE', 'IPO_WIN', 'IPO_LOSE',
        'BLOCK_BUY', 'BLOCK_SELL', 'LIMIT_UP_BUY', 'FORCE_SELL'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'PENDING', 'SUBMITTED', 'MATCHING', 'PARTIAL', 
        'SUCCESS', 'CANCELLED', 'FAILED', 'REJECTED'
    )),
    CONSTRAINT valid_approval_status CHECK (approval_status IS NULL OR approval_status IN (
        'PENDING', 'APPROVED', 'REJECTED'
    ))
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_stock_code ON public.trades(stock_code);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_trade_type ON public.trades(trade_type);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_approval_status ON public.trades(approval_status) WHERE need_approval = true;

-- 3. 启用 RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略
CREATE POLICY "Users can view their own trades" 
    ON public.trades FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" 
    ON public.trades FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" 
    ON public.trades FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" 
    ON public.trades FOR ALL 
    USING (auth.role() = 'service_role');

-- 5. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 添加注释
COMMENT ON TABLE public.trades IS '交易订单表 - 存储所有交易订单（A股、港股、IPO、大宗交易、涨停打板）';
COMMENT ON COLUMN public.trades.market_type IS '市场类型：A_SHARE(A股), HK(港股), IPO(新股), BLOCK(大宗), LIMIT_UP(涨停)';
COMMENT ON COLUMN public.trades.trade_type IS '交易类型：BUY, SELL, IPO_SUBSCRIBE, BLOCK_BUY, LIMIT_UP_BUY, FORCE_SELL';
COMMENT ON COLUMN public.trades.status IS '订单状态：PENDING(待提交), SUBMITTED(已提交), MATCHING(撮合中), PARTIAL(部分成交), SUCCESS(成功), CANCELLED(已取消), FAILED(失败), REJECTED(已拒绝)';
COMMENT ON COLUMN public.trades.approval_status IS '审批状态：PENDING(待审批), APPROVED(已通过), REJECTED(已拒绝)';
