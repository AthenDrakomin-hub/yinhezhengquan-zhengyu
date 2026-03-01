-- ========================================================
-- 涨停股票表 (limit_up_stocks)
-- 版本: v1.0 (2026-02-28)
-- ========================================================

BEGIN;

-- 1) 创建表
CREATE TABLE IF NOT EXISTS public.limit_up_stocks (
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

-- 2) 创建索引
CREATE INDEX idx_limit_up_symbol ON public.limit_up_stocks(symbol);
CREATE INDEX idx_limit_up_status ON public.limit_up_stocks(is_limit_up, status);
CREATE INDEX idx_limit_up_trade_date ON public.limit_up_stocks(trade_date DESC);
CREATE INDEX idx_limit_up_market ON public.limit_up_stocks(market);

-- 3) 启用 RLS
ALTER TABLE public.limit_up_stocks ENABLE ROW LEVEL SECURITY;

-- 4) RLS 策略：所有人可读
DROP POLICY IF EXISTS "allow_public_read_limit_up" ON public.limit_up_stocks;
CREATE POLICY "allow_public_read_limit_up" ON public.limit_up_stocks
  FOR SELECT USING (true);

-- 5) RLS 策略：仅管理员可写
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

-- 6) 权限设置
GRANT SELECT ON public.limit_up_stocks TO anon, authenticated;
GRANT ALL ON public.limit_up_stocks TO service_role;

-- 7) 插入测试数据
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

COMMIT;
