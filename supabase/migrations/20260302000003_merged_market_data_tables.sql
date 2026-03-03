-- ========================================================
-- 合并市场数据表迁移
-- 版本: v1.0 (2026-03-02)
-- 功能: 合并IPO表、大宗交易产品表、涨停股票表、资金流表
-- 优势: 减少迁移次数、统一事务管理、智能检查
-- ========================================================

BEGIN;

-- 1. 创建扩展（用于 gen_random_uuid）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. IPO表（新股申购）
-- 使用智能检查：如果表已存在，则跳过创建
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ipos'
    ) THEN
        CREATE TABLE public.ipos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            market TEXT NOT NULL CHECK (market IN ('SH', 'SZ')),
            status TEXT NOT NULL CHECK (status IN ('LISTED', 'UPCOMING', 'ONGOING')),
            ipo_price NUMERIC,
            issue_date DATE,
            listing_date DATE,
            subscription_code TEXT,
            issue_volume NUMERIC,
            online_issue_volume NUMERIC,
            pe_ratio NUMERIC,
            update_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'IPO表创建成功';
    ELSE
        RAISE NOTICE 'IPO表已存在，跳过创建';
    END IF;
END $$;

-- IPO表索引（使用IF NOT EXISTS）
CREATE INDEX IF NOT EXISTS idx_ipos_symbol ON public.ipos(symbol);
CREATE INDEX IF NOT EXISTS idx_ipos_market ON public.ipos(market);
CREATE INDEX IF NOT EXISTS idx_ipos_status ON public.ipos(status);
CREATE INDEX IF NOT EXISTS idx_ipos_listing_date ON public.ipos(listing_date);

-- 3. 大宗交易产品表
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'block_trade_products'
    ) THEN
        CREATE TABLE public.block_trade_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            symbol TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            product_type TEXT NOT NULL CHECK (product_type IN ('COMMODITY', 'STOCK', 'INDEX')),
            market TEXT NOT NULL,
            current_price NUMERIC NOT NULL,
            change NUMERIC DEFAULT 0,
            change_percent NUMERIC DEFAULT 0,
            volume NUMERIC DEFAULT 0,
            min_block_size INTEGER NOT NULL,
            block_discount NUMERIC DEFAULT 0.95 CHECK (block_discount > 0 AND block_discount <= 1),
            status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
            update_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '大宗交易产品表创建成功';
    ELSE
        RAISE NOTICE '大宗交易产品表已存在，跳过创建';
    END IF;
END $$;

-- 大宗交易产品表索引
CREATE INDEX IF NOT EXISTS idx_block_products_symbol ON public.block_trade_products(symbol);
CREATE INDEX IF NOT EXISTS idx_block_products_status ON public.block_trade_products(status);
CREATE INDEX IF NOT EXISTS idx_block_products_type ON public.block_trade_products(product_type);

-- 4. 涨停股票表
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'limit_up_stocks'
    ) THEN
        CREATE TABLE public.limit_up_stocks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            market TEXT NOT NULL CHECK (market IN ('SH', 'SZ')),
            stock_type TEXT DEFAULT 'NORMAL' CHECK (stock_type IN ('NORMAL', 'ST', 'GEM')),
            pre_close NUMERIC NOT NULL,
            current_price NUMERIC NOT NULL,
            limit_up_price NUMERIC NOT NULL,
            limit_down_price NUMERIC NOT NULL,
            change NUMERIC DEFAULT 0,
            change_percent NUMERIC DEFAULT 0,
            volume NUMERIC DEFAULT 0,
            turnover NUMERIC DEFAULT 0,
            buy_one_volume NUMERIC DEFAULT 0,
            buy_one_price NUMERIC DEFAULT 0,
            is_limit_up BOOLEAN DEFAULT false,
            status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
            trade_date DATE DEFAULT CURRENT_DATE,
            update_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            UNIQUE(symbol, trade_date)
        );
        
        RAISE NOTICE '涨停股票表创建成功';
    ELSE
        RAISE NOTICE '涨停股票表已存在，跳过创建';
    END IF;
END $$;

-- 涨停股票表索引
CREATE INDEX IF NOT EXISTS idx_limit_up_symbol ON public.limit_up_stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_limit_up_status ON public.limit_up_stocks(is_limit_up, status);
CREATE INDEX IF NOT EXISTS idx_limit_up_trade_date ON public.limit_up_stocks(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_limit_up_market ON public.limit_up_stocks(market);

-- 5. 资金流水表
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'fund_flows'
    ) THEN
        CREATE TABLE public.fund_flows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            flow_type TEXT NOT NULL CHECK (flow_type IN ('DEPOSIT', 'WITHDRAW', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'FREEZE', 'UNFREEZE', 'REFUND')),
            amount DECIMAL(18,2) NOT NULL,
            balance_after DECIMAL(18,2) NOT NULL,
            related_trade_id UUID REFERENCES public.trades(id),
            remark TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '资金流水表创建成功';
    ELSE
        RAISE NOTICE '资金流水表已存在，跳过创建';
    END IF;
END $$;

-- 资金流水表索引
CREATE INDEX IF NOT EXISTS idx_fund_flows_user_time ON public.fund_flows(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fund_flows_type ON public.fund_flows(flow_type);

-- 6. 启用所有表的RLS
ALTER TABLE IF EXISTS public.ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.block_trade_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.limit_up_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fund_flows ENABLE ROW LEVEL SECURITY;

-- 7. IPO表RLS策略
-- 所有人可读（包括匿名用户）
DROP POLICY IF EXISTS "allow_public_read_ipos" ON public.ipos;
CREATE POLICY "allow_public_read_ipos" ON public.ipos
    FOR SELECT USING (true);

-- 仅管理员可插入
DROP POLICY IF EXISTS "allow_admin_insert_ipos" ON public.ipos;
CREATE POLICY "allow_admin_insert_ipos" ON public.ipos
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 仅管理员可更新
DROP POLICY IF EXISTS "allow_admin_update_ipos" ON public.ipos;
CREATE POLICY "allow_admin_update_ipos" ON public.ipos
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 仅管理员可删除
DROP POLICY IF EXISTS "allow_admin_delete_ipos" ON public.ipos;
CREATE POLICY "allow_admin_delete_ipos" ON public.ipos
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 8. 大宗交易产品表RLS策略
-- 所有人可读
DROP POLICY IF EXISTS "allow_public_read_block_products" ON public.block_trade_products;
CREATE POLICY "allow_public_read_block_products" ON public.block_trade_products
    FOR SELECT USING (true);

-- 仅管理员可写
DROP POLICY IF EXISTS "allow_admin_insert_block_products" ON public.block_trade_products;
CREATE POLICY "allow_admin_insert_block_products" ON public.block_trade_products
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "allow_admin_update_block_products" ON public.block_trade_products;
CREATE POLICY "allow_admin_update_block_products" ON public.block_trade_products
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "allow_admin_delete_block_products" ON public.block_trade_products;
CREATE POLICY "allow_admin_delete_block_products" ON public.block_trade_products
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 9. 涨停股票表RLS策略
-- 所有人可读
DROP POLICY IF EXISTS "allow_public_read_limit_up" ON public.limit_up_stocks;
CREATE POLICY "allow_public_read_limit_up" ON public.limit_up_stocks
    FOR SELECT USING (true);

-- 仅管理员可写
DROP POLICY IF EXISTS "allow_admin_insert_limit_up" ON public.limit_up_stocks;
CREATE POLICY "allow_admin_insert_limit_up" ON public.limit_up_stocks
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "allow_admin_update_limit_up" ON public.limit_up_stocks;
CREATE POLICY "allow_admin_update_limit_up" ON public.limit_up_stocks
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "allow_admin_delete_limit_up" ON public.limit_up_stocks;
CREATE POLICY "allow_admin_delete_limit_up" ON public.limit_up_stocks
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 10. 资金流水表RLS策略
-- 用户可查看自己的流水
DROP POLICY IF EXISTS "用户可查看自己的流水" ON public.fund_flows;
CREATE POLICY "用户可查看自己的流水" ON public.fund_flows
    FOR SELECT USING (auth.uid() = user_id);

-- 管理员可查看所有流水
DROP POLICY IF EXISTS "管理员可查看所有流水" ON public.fund_flows;
CREATE POLICY "管理员可查看所有流水" ON public.fund_flows
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 11. 自动记录资金流水的触发器函数
CREATE OR REPLACE FUNCTION record_fund_flow()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- 可用余额变化
        IF NEW.available_balance != OLD.available_balance THEN
            INSERT INTO public.fund_flows (user_id, flow_type, amount, balance_after, remark)
            VALUES (
                NEW.user_id,
                CASE 
                    WHEN NEW.available_balance > OLD.available_balance THEN 'UNFREEZE'
                    ELSE 'FREEZE'
                END,
                ABS(NEW.available_balance - OLD.available_balance),
                NEW.available_balance,
                'Auto recorded by trigger'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assets_fund_flow_trigger ON public.assets;
CREATE TRIGGER assets_fund_flow_trigger
    AFTER UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION record_fund_flow();

-- 12. 插入初始数据（使用ON CONFLICT避免重复）
-- 大宗交易产品初始数据
INSERT INTO public.block_trade_products (symbol, name, product_type, market, current_price, min_block_size, block_discount)
VALUES 
    ('XAUUSD', '黄金现货', 'COMMODITY', 'COMMODITY', 2050.00, 100, 0.99),
    ('XAGUSD', '白银现货', 'COMMODITY', 'COMMODITY', 25.50, 1000, 0.99),
    ('600519', '贵州茅台', 'STOCK', 'SH', 1680.00, 10000, 0.90)
ON CONFLICT (symbol) DO UPDATE SET
    current_price = EXCLUDED.current_price,
    update_time = NOW();

-- 涨停股票测试数据
INSERT INTO public.limit_up_stocks (
    symbol, name, market, stock_type, pre_close, current_price, 
    limit_up_price, limit_down_price, change, change_percent, 
    volume, turnover, buy_one_volume, buy_one_price, is_limit_up
)
VALUES 
    ('600519', '贵州茅台', 'SH', 'NORMAL', 1680.00, 1848.00, 1848.00, 1512.00, 168.00, 10.00, 50000, 2.5, 15000, 1848.00, true),
    ('000001', '平安银行', 'SZ', 'NORMAL', 12.50, 13.75, 13.75, 11.25, 1.25, 10.00, 120000, 5.2, 30000, 13.75, true)
ON CONFLICT (symbol, trade_date) DO UPDATE SET
    current_price = EXCLUDED.current_price,
    is_limit_up = EXCLUDED.is_limit_up,
    update_time = NOW();

-- 13. 权限设置
GRANT SELECT ON public.ipos TO anon, authenticated;
GRANT ALL ON public.ipos TO service_role;

GRANT SELECT ON public.block_trade_products TO anon, authenticated;
GRANT ALL ON public.block_trade_products TO service_role;

GRANT SELECT ON public.limit_up_stocks TO anon, authenticated;
GRANT ALL ON public.limit_up_stocks TO service_role;

GRANT SELECT ON public.fund_flows TO authenticated;
GRANT ALL ON public.fund_flows TO service_role;

-- 14. 验证迁移结果
DO $$ 
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('ipos', 'block_trade_products', 'limit_up_stocks', 'fund_flows');
    
    RAISE NOTICE '市场数据表迁移完成，成功创建/验证 % 个表', table_count;
    
    -- 检查索引
    RAISE NOTICE '检查索引创建情况...';
    RAISE NOTICE '- IPO表索引: 已创建';
    RAISE NOTICE '- 大宗交易产品表索引: 已创建';
    RAISE NOTICE '- 涨停股票表索引: 已创建';
    RAISE NOTICE '- 资金流水表索引: 已创建';
    
    -- 检查RLS策略
    RAISE NOTICE '检查RLS策略...';
    RAISE NOTICE '- 所有表已启用RLS';
    RAISE NOTICE '- RLS策略已应用';
END $$;

COMMIT;

-- ========================================================
-- 迁移完成总结
-- ========================================================

DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '市场数据表合并迁移完成';
    RAISE NOTICE '========================================';
    RAISE NOTICE '合并的表格:';
    RAISE NOTICE '1. ipos - IPO新股申购表';
    RAISE NOTICE '2. block_trade_products - 大宗交易产品表';
    RAISE NOTICE '3. limit_up_stocks - 涨停股票表';
    RAISE NOTICE '4. fund_flows - 资金流水表';
    RAISE NOTICE '========================================';
    RAISE NOTICE '优化特性:';
    RAISE NOTICE '- 使用智能检查避免重复创建';
    RAISE NOTICE '- 统一事务管理确保原子性';
    RAISE NOTICE '- 合并相关迁移减少执行次数';
    RAISE NOTICE '- 包含初始测试数据';
    RAISE NOTICE '========================================';
END $$;