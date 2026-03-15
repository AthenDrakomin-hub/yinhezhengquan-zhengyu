#!/usr/bin/env python3
"""
Supabase 数据库迁移脚本
直接连接到远程 Supabase PostgreSQL 执行迁移 SQL
"""

import os
import sys

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Supabase PostgreSQL 连接信息
# 使用 Session Pooler 连接（亚太区域）
SUPABASE_DB_URL = os.environ.get(
    "SUPABASE_DB_URL",
    "postgres://postgres.kvlvbhzrrpspzaoiormt:HX0ydyF1nVKMDxMy@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&channel_binding=disable"
)

MIGRATION_SQL = """
-- ========================================================
-- 扩展功能数据表迁移
-- ========================================================

-- 1. ETF产品表
CREATE TABLE IF NOT EXISTS public.etf_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    market TEXT NOT NULL DEFAULT 'CN' CHECK (market IN ('CN', 'HK')),
    price NUMERIC DEFAULT 0,
    change NUMERIC DEFAULT 0,
    change_percent NUMERIC DEFAULT 0,
    prev_close NUMERIC DEFAULT 0,
    volume BIGINT DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'stock',
    scale NUMERIC DEFAULT 0,
    management_fee NUMERIC DEFAULT 0,
    tracking_index TEXT,
    tracking_error NUMERIC,
    listed_date DATE,
    logo_url TEXT,
    data_source TEXT DEFAULT 'yinhe',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etf_products_symbol ON public.etf_products(symbol);
CREATE INDEX IF NOT EXISTS idx_etf_products_category ON public.etf_products(category);

-- 2. 理财产品表
CREATE TABLE IF NOT EXISTS public.wealth_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'deposit' CHECK (type IN ('deposit', 'fund', 'bond', 'insurance')),
    expected_return NUMERIC,
    return_type TEXT DEFAULT 'annual',
    min_amount NUMERIC DEFAULT 1000,
    increment NUMERIC DEFAULT 1000,
    period_days INT,
    period_type TEXT DEFAULT 'fixed',
    risk_level INT DEFAULT 2 CHECK (risk_level BETWEEN 1 AND 5),
    quota NUMERIC DEFAULT 0,
    max_quota NUMERIC,
    per_user_limit NUMERIC,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    tag TEXT,
    description TEXT,
    issuer TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wealth_products_type ON public.wealth_products(type);
CREATE INDEX IF NOT EXISTS idx_wealth_products_status ON public.wealth_products(status);

-- 3. 板块数据表
CREATE TABLE IF NOT EXISTS public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('industry', 'concept', 'region')),
    price NUMERIC DEFAULT 0,
    change NUMERIC DEFAULT 0,
    change_percent NUMERIC DEFAULT 0,
    prev_close NUMERIC DEFAULT 0,
    volume BIGINT DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    leading_stock_code TEXT,
    leading_stock_name TEXT,
    leading_stock_change NUMERIC,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sectors_code ON public.sectors(code);
CREATE INDEX IF NOT EXISTS idx_sectors_type ON public.sectors(type);

-- 4. 板块成分股表
CREATE TABLE IF NOT EXISTS public.sector_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_code TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    stock_name TEXT,
    weight NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sector_code, stock_code)
);

CREATE INDEX IF NOT EXISTS idx_sector_stocks_sector ON public.sector_stocks(sector_code);
CREATE INDEX IF NOT EXISTS idx_sector_stocks_stock ON public.sector_stocks(stock_code);

-- 5. 融资融券账户表
CREATE TABLE IF NOT EXISTS public.margin_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    total_asset NUMERIC DEFAULT 0,
    available_cash NUMERIC DEFAULT 0,
    margin_balance NUMERIC DEFAULT 0,
    short_balance NUMERIC DEFAULT 0,
    maintenance_ratio NUMERIC DEFAULT 0,
    margin_limit NUMERIC DEFAULT 0,
    short_limit NUMERIC DEFAULT 0,
    available_margin NUMERIC DEFAULT 0,
    available_short NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'liquidated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_margin_accounts_user ON public.margin_accounts(user_id);

-- 6. 融资融券持仓表
CREATE TABLE IF NOT EXISTS public.margin_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.margin_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT,
    quantity NUMERIC DEFAULT 0,
    available_quantity NUMERIC DEFAULT 0,
    position_type TEXT NOT NULL CHECK (position_type IN ('margin', 'short')),
    cost_price NUMERIC DEFAULT 0,
    current_price NUMERIC DEFAULT 0,
    market_value NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    interest_rate NUMERIC DEFAULT 0,
    interest_accrued NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, symbol, position_type)
);

CREATE INDEX IF NOT EXISTS idx_margin_positions_account ON public.margin_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_margin_positions_user ON public.margin_positions(user_id);

-- 7. 用户设置表
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    fast_order_mode BOOLEAN DEFAULT false,
    default_strategy TEXT DEFAULT 'limit',
    default_leverage NUMERIC DEFAULT 1,
    auto_stop_loss BOOLEAN DEFAULT false,
    language TEXT DEFAULT 'zh-CN' CHECK (language IN ('zh-CN', 'zh-HK', 'en-US')),
    font_size TEXT DEFAULT 'standard' CHECK (font_size IN ('standard', 'large')),
    haptic_feedback BOOLEAN DEFAULT true,
    sound_effects BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('dark', 'light', 'system')),
    default_kline_period TEXT DEFAULT 'day',
    up_color TEXT DEFAULT 'red',
    show_avg_line BOOLEAN DEFAULT true,
    show_volume BOOLEAN DEFAULT true,
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval INT DEFAULT 5,
    default_validity TEXT DEFAULT 'GTC',
    trigger_method TEXT DEFAULT 'price',
    condition_notify BOOLEAN DEFAULT true,
    trade_alerts_enabled BOOLEAN DEFAULT true,
    price_alerts_enabled BOOLEAN DEFAULT true,
    system_news_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);
"""

RLS_SQL = """
-- RLS 策略
ALTER TABLE public.etf_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Public read etf_products" ON public.etf_products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.wealth_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Public read wealth_products" ON public.wealth_products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Public read sectors" ON public.sectors FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sector_stocks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Public read sector_stocks" ON public.sector_stocks FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.margin_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users manage own margin_accounts" ON public.margin_accounts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.margin_positions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users manage own margin_positions" ON public.margin_positions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users manage own user_settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
"""


def run_migration():
    """执行数据库迁移"""
    print("=" * 60)
    print("Supabase 数据库迁移")
    print("=" * 60)
    
    try:
        # 连接数据库
        print("\n[1/4] 连接远程 Supabase PostgreSQL...")
        conn = psycopg2.connect(SUPABASE_DB_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        
        # 测试连接
        cursor.execute("SELECT current_database(), current_user, version();")
        db_info = cursor.fetchone()
        print(f"  ✓ 数据库: {db_info[0]}")
        print(f"  ✓ 用户: {db_info[1]}")
        print(f"  ✓ 版本: {db_info[2][:50]}...")
        
        # 执行迁移 SQL
        print("\n[2/4] 创建数据表...")
        try:
            cursor.execute(MIGRATION_SQL)
            conn.commit()
            print("  ✓ 数据表创建成功")
        except Exception as e:
            conn.rollback()
            print(f"  ⚠ 数据表创建警告: {e}")
            # 尝试单独执行每个语句
            print("  → 尝试逐条执行...")
            statements = [s.strip() for s in MIGRATION_SQL.split(';') if s.strip() and not s.strip().startswith('--')]
            for stmt in statements:
                if stmt:
                    try:
                        cursor.execute(stmt)
                        conn.commit()
                    except Exception as e2:
                        conn.rollback()
                        if 'already exists' not in str(e2).lower():
                            print(f"    ⚠ {str(e2)[:100]}")
            print("  ✓ 数据表处理完成")
        
        # 执行 RLS SQL
        print("\n[3/4] 设置 RLS 策略...")
        try:
            cursor.execute(RLS_SQL)
            conn.commit()
            print("  ✓ RLS 策略设置成功")
        except Exception as e:
            conn.rollback()
            print(f"  ⚠ RLS 策略警告: {e}")
        
        # 验证表创建
        print("\n[4/4] 验证表创建...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('etf_products', 'wealth_products', 'sectors', 'sector_stocks', 'margin_accounts', 'margin_positions', 'user_settings')
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"  ✓ 已创建表: {[t[0] for t in tables]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("✓ 迁移完成！")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n✗ 迁移失败: {e}")
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
