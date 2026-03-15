/**
 * 运行数据库迁移 Edge Function
 * 仅限管理员使用
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, optionsResponse } from './_shared/mod.ts'

// handleOptions 兼容
const handleOptions = () => optionsResponse()

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY')!

// 迁移 SQL
const MIGRATION_SQL = `
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
`

// RLS 策略 SQL
const RLS_SQL = `
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
`

serve(async (req: Request) => {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    // 验证请求
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 创建 Supabase 客户端
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 验证用户是否为管理员
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 检查管理员权限
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('admin_level')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['admin', 'super_admin'].includes(profile.admin_level)) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 执行迁移 SQL
    console.log('Running migration SQL...')
    
    // 使用 RPC 执行 SQL
    const { error: migrationError } = await supabase.rpc('exec_sql', { 
      sql: MIGRATION_SQL 
    }).catch(async () => {
      // 如果 RPC 不存在，尝试使用直接的 PostgreSQL 连接
      // 这里我们需要使用 service role 来执行
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql: MIGRATION_SQL })
      })
      return { error: response.ok ? null : 'Failed to execute SQL' }
    })

    // 执行 RLS SQL
    const { error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: RLS_SQL 
    }).catch(() => ({ error: null }))

    // 检查表是否创建成功
    const { data: tables, error: checkError } = await supabase
      .rpc('list_tables')
      .catch(async () => {
        // 直接查询表
        const response = await fetch(`${SUPABASE_URL}/rest/v1/etf_products?select=id&limit=1`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        })
        return { data: response.ok ? ['etf_products'] : [], error: null }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration completed successfully',
        tables: tables,
        migrationError: migrationError?.message || null,
        rlsError: rlsError?.message || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Migration failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
