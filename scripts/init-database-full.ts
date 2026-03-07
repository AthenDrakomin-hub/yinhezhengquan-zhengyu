/**
 * 完整数据库初始化脚本
 * 用于创建银河证券证裕交易单元的所有数据库表和结构
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function initDatabase() {
  console.log('🚀 开始完整数据库初始化...\n');
  console.log('='.repeat(60));

  // ========== 第一步：创建核心表 ==========
  console.log('\n📦 第一步：创建核心表');

  // 1. profiles 表
  console.log('  创建 profiles 表...');
  const { error: profilesError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
        status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
        display_name TEXT,
        avatar_url TEXT,
        balance NUMERIC(20, 2) DEFAULT 1000000.00,
        total_equity NUMERIC(20, 2) DEFAULT 1000000.00,
        auth_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${profilesError ? '❌ ' + profilesError.message : '✅ profiles 表创建成功'}`);

  // 2. assets 表
  console.log('  创建 assets 表...');
  const { error: assetsError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.assets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
        available_balance DECIMAL(18,2) DEFAULT 1000000.00,
        frozen_balance DECIMAL(18,2) DEFAULT 0.00,
        total_asset DECIMAL(18,2) DEFAULT 1000000.00,
        today_profit_loss DECIMAL(18,2) DEFAULT 0.00,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${assetsError ? '❌ ' + assetsError.message : '✅ assets 表创建成功'}`);

  // 3. positions 表
  console.log('  创建 positions 表...');
  const { error: positionsError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.positions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT,
        stock_code TEXT,
        stock_name TEXT,
        quantity NUMERIC(20, 4) NOT NULL DEFAULT 0,
        available_quantity NUMERIC(20, 4) NOT NULL DEFAULT 0,
        average_price NUMERIC(20, 4) NOT NULL DEFAULT 0,
        current_price NUMERIC(20, 4),
        profit_loss NUMERIC(20, 4) DEFAULT 0,
        risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
        is_forced_sell BOOLEAN DEFAULT FALSE,
        forced_sell_at TIMESTAMPTZ,
        forced_sell_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${positionsError ? '❌ ' + positionsError.message : '✅ positions 表创建成功'}`);

  // 4. trades 表
  console.log('  创建 trades 表...');
  const { error: tradesError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.trades (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        stock_code TEXT NOT NULL,
        stock_name TEXT,
        trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP')),
        price NUMERIC(20, 4) NOT NULL,
        quantity NUMERIC(20, 4) NOT NULL,
        amount NUMERIC(20, 2) NOT NULL,
        status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MATCHING', 'FILLED', 'CANCELLED', 'FAILED')),
        filled_at TIMESTAMPTZ,
        finish_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${tradesError ? '❌ ' + tradesError.message : '✅ trades 表创建成功'}`);

  // 5. fund_flows 表
  console.log('  创建 fund_flows 表...');
  const { error: flowsError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.fund_flows (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        flow_type TEXT NOT NULL CHECK (flow_type IN ('DEPOSIT', 'WITHDRAW', 'BUY', 'SELL', 'DIVIDEND', 'ADJUSTMENT')),
        amount NUMERIC(20, 2) NOT NULL,
        balance_after NUMERIC(20, 2),
        description TEXT,
        related_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${flowsError ? '❌ ' + flowsError.message : '✅ fund_flows 表创建成功'}`);

  // 6. conditional_orders 表
  console.log('  创建 conditional_orders 表...');
  const { error: condError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.conditional_orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        stock_code TEXT NOT NULL,
        stock_name TEXT,
        order_type TEXT NOT NULL CHECK (order_type IN ('STOP_LOSS', 'TAKE_PROFIT', 'TRAILING_STOP', 'PRICE_ALERT')),
        trigger_price NUMERIC(20, 4) NOT NULL,
        quantity NUMERIC(20, 4) NOT NULL,
        status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIGGERED', 'CANCELLED', 'EXPIRED')),
        triggered_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${condError ? '❌ ' + condError.message : '✅ conditional_orders 表创建成功'}`);

  // 7. trade_match_pool 表
  console.log('  创建 trade_match_pool 表...');
  const { error: poolError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.trade_match_pool (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        trade_id UUID,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        stock_code TEXT NOT NULL,
        stock_name TEXT,
        trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL', 'IPO')),
        price NUMERIC(20, 4) NOT NULL,
        quantity NUMERIC(20, 4) NOT NULL,
        market_type TEXT DEFAULT 'NORMAL',
        status TEXT DEFAULT 'MATCHING' CHECK (status IN ('MATCHING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
        priority INTEGER DEFAULT 0,
        enter_time TIMESTAMPTZ DEFAULT NOW(),
        matched_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${poolError ? '❌ ' + poolError.message : '✅ trade_match_pool 表创建成功'}`);

  // 8. trade_rules 表
  console.log('  创建 trade_rules 表...');
  const { error: rulesError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.trade_rules (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        rule_type TEXT UNIQUE NOT NULL,
        config JSONB NOT NULL,
        status BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${rulesError ? '❌ ' + rulesError.message : '✅ trade_rules 表创建成功'}`);

  // 9. user_notifications 表
  console.log('  创建 user_notifications 表...');
  const { error: notifError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.user_notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        notification_type TEXT NOT NULL CHECK (notification_type IN ('SYSTEM', 'TRADE', 'FORCE_SELL', 'APPROVAL', 'RISK_WARNING', 'ACCOUNT', 'ANNOUNCEMENT')),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        related_type TEXT,
        related_id TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMPTZ,
        priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${notifError ? '❌ ' + notifError.message : '✅ user_notifications 表创建成功'}`);

  // 10. force_sell_records 表
  console.log('  创建 force_sell_records 表...');
  const { error: fsError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.force_sell_records (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        position_id UUID,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
        symbol TEXT NOT NULL,
        stock_name TEXT,
        quantity NUMERIC(20, 4) NOT NULL,
        price NUMERIC(20, 4),
        amount NUMERIC(20, 2),
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
        trade_id UUID,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${fsError ? '❌ ' + fsError.message : '✅ force_sell_records 表创建成功'}`);

  // 11. admin_operation_logs 表
  console.log('  创建 admin_operation_logs 表...');
  const { error: logError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        operation_type TEXT NOT NULL,
        target_type TEXT,
        target_id UUID,
        details JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${logError ? '❌ ' + logError.message : '✅ admin_operation_logs 表创建成功'}`);

  // 12. support_tickets 表
  console.log('  创建 support_tickets 表...');
  const { error: ticketError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.support_tickets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        ticket_type TEXT NOT NULL CHECK (ticket_type IN ('TECHNICAL', 'ACCOUNT', 'TRADE', 'SUGGESTION', 'COMPLAINT', 'OTHER')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
        priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        assigned_to UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${ticketError ? '❌ ' + ticketError.message : '✅ support_tickets 表创建成功'}`);

  // 13. messages 表
  console.log('  创建 messages 表...');
  const { error: msgError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        sender_type TEXT NOT NULL CHECK (sender_type IN ('USER', 'ADMIN', 'SYSTEM')),
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${msgError ? '❌ ' + msgError.message : '✅ messages 表创建成功'}`);

  // 14. settlement_logs 表
  console.log('  创建 settlement_logs 表...');
  const { error: settleError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS public.settlement_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        settlement_date DATE NOT NULL,
        total_trades INTEGER DEFAULT 0,
        total_volume NUMERIC(20, 2) DEFAULT 0,
        total_amount NUMERIC(20, 2) DEFAULT 0,
        status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log(`    ${settleError ? '❌ ' + settleError.message : '✅ settlement_logs 表创建成功'}`);

  // 15. 市场数据表
  console.log('  创建市场数据表...');
  
  const marketTables = [
    {
      name: 'ipos',
      sql: `
        CREATE TABLE IF NOT EXISTS public.ipos (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          stock_code TEXT NOT NULL UNIQUE,
          stock_name TEXT NOT NULL,
          issue_price NUMERIC(20, 4),
          issue_quantity NUMERIC(20, 4),
          subscription_start DATE,
          subscription_end DATE,
          listing_date DATE,
          status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBSCRIBING', 'COMPLETED', 'CANCELLED')),
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'limit_up_stocks',
      sql: `
        CREATE TABLE IF NOT EXISTS public.limit_up_stocks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          stock_code TEXT NOT NULL,
          stock_name TEXT NOT NULL,
          limit_up_price NUMERIC(20, 4) NOT NULL,
          current_price NUMERIC(20, 4),
          limit_up_time TIMESTAMPTZ,
          open_times INTEGER DEFAULT 0,
          status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'block_trade_products',
      sql: `
        CREATE TABLE IF NOT EXISTS public.block_trade_products (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          product_code TEXT NOT NULL UNIQUE,
          product_name TEXT NOT NULL,
          stock_code TEXT NOT NULL,
          stock_name TEXT,
          quantity NUMERIC(20, 4) NOT NULL,
          price NUMERIC(20, 4) NOT NULL,
          discount_rate NUMERIC(5, 4),
          status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SOLD')),
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'banners',
      sql: `
        CREATE TABLE IF NOT EXISTS public.banners (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          subtitle TEXT,
          image_url TEXT,
          link_url TEXT,
          sort_order INTEGER DEFAULT 0,
          status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'reports',
      sql: `
        CREATE TABLE IF NOT EXISTS public.reports (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT,
          stock_code TEXT,
          report_type TEXT CHECK (report_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'SPECIAL')),
          content TEXT,
          file_url TEXT,
          status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
          published_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'education_topics',
      sql: `
        CREATE TABLE IF NOT EXISTS public.education_topics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT CHECK (category IN ('BASICS', 'STRATEGY', 'RISK', 'TOOLS')),
          difficulty TEXT CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
          author TEXT,
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          status TEXT DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'calendar_events',
      sql: `
        CREATE TABLE IF NOT EXISTS public.calendar_events (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          event_date DATE NOT NULL,
          event_type TEXT CHECK (event_type IN ('IPO', 'DIVIDEND', 'MEETING', 'HOLIDAY', 'OTHER')),
          related_stock TEXT,
          importance TEXT DEFAULT 'NORMAL' CHECK (importance IN ('LOW', 'NORMAL', 'HIGH')),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    }
  ];

  for (const table of marketTables) {
    const { error } = await supabase.rpc('exec_sql', { query: table.sql });
    console.log(`    ${error ? '❌' : '✅'} ${table.name} 表`);
  }

  console.log('\n✅ 核心表创建完成！');

  // ========== 第二步：创建索引 ==========
  console.log('\n📊 第二步：创建索引');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);',
    'CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);',
    'CREATE INDEX IF NOT EXISTS idx_positions_user ON public.positions(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_positions_risk_level ON public.positions(risk_level);',
    'CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);',
    'CREATE INDEX IF NOT EXISTS idx_fund_flows_user ON public.fund_flows(user_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.user_notifications(user_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_match_pool_status ON public.trade_match_pool(status);',
  ];

  for (const idxSql of indexes) {
    const { error } = await supabase.rpc('exec_sql', { query: idxSql });
    if (error) console.log(`    ⚠️ 索引创建警告: ${error.message}`);
  }
  console.log('  ✅ 索引创建完成');

  // ========== 第三步：启用 RLS ==========
  console.log('\n🔒 第三步：启用 RLS');

  const rlsTables = [
    'profiles', 'assets', 'positions', 'trades', 'fund_flows', 
    'conditional_orders', 'trade_match_pool', 'user_notifications', 
    'force_sell_records', 'support_tickets', 'messages'
  ];

  for (const table of rlsTables) {
    const { error } = await supabase.rpc('exec_sql', { 
      query: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;` 
    });
    if (error) console.log(`    ⚠️ RLS 启用警告 (${table}): ${error.message}`);
  }
  console.log('  ✅ RLS 启用完成');

  // ========== 第四步：验证 ==========
  console.log('\n🔍 第四步：验证表创建');

  const { data: tables } = await supabase.rpc('exec_sql', {
    query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
  });

  console.log('\n已创建的表:');
  console.log(tables);

  console.log('\n' + '='.repeat(60));
  console.log('✅ 数据库初始化完成！');
}

initDatabase().catch(console.error);
