-- ========================================================
-- 大宗交易产品表 (block_trade_products)
-- 版本: v1.0 (2026-02-28)
-- ========================================================

BEGIN;

-- 1) 创建表
CREATE TABLE IF NOT EXISTS public.block_trade_products (
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

-- 2) 创建索引
CREATE INDEX idx_block_products_symbol ON public.block_trade_products(symbol);
CREATE INDEX idx_block_products_status ON public.block_trade_products(status);
CREATE INDEX idx_block_products_type ON public.block_trade_products(product_type);

-- 3) 启用 RLS
ALTER TABLE public.block_trade_products ENABLE ROW LEVEL SECURITY;

-- 4) RLS 策略：所有人可读
DROP POLICY IF EXISTS "allow_public_read_block_products" ON public.block_trade_products;
CREATE POLICY "allow_public_read_block_products" ON public.block_trade_products
  FOR SELECT USING (true);

-- 5) RLS 策略：仅管理员可写
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

-- 6) 权限设置
GRANT SELECT ON public.block_trade_products TO anon, authenticated;
GRANT ALL ON public.block_trade_products TO service_role;

-- 7) 插入初始数据
INSERT INTO public.block_trade_products (symbol, name, product_type, market, current_price, min_block_size, block_discount)
VALUES 
  ('XAUUSD', '黄金现货', 'COMMODITY', 'COMMODITY', 2050.00, 100, 0.99),
  ('XAGUSD', '白银现货', 'COMMODITY', 'COMMODITY', 25.50, 1000, 0.99),
  ('600519', '贵州茅台', 'STOCK', 'SH', 1680.00, 10000, 0.90)
ON CONFLICT (symbol) DO UPDATE SET
  current_price = EXCLUDED.current_price,
  update_time = NOW();

COMMIT;
