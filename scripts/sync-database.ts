/**
 * 数据库同步脚本
 * 通过 Supabase API 执行 SQL 迁移
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

// SQL 语句列表（分批执行）
const migrations = [
  // 1. profiles 表字段补充
  {
    name: 'profiles 表字段补充',
    sql: `
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance NUMERIC(20, 2) DEFAULT 1000000.00;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_equity NUMERIC(20, 2) DEFAULT 1000000.00;
    `
  },
  // 2. positions 表字段补充
  {
    name: 'positions 表字段补充',
    sql: `
      ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS stock_code TEXT;
      ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS stock_name TEXT;
      ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW';
      ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS is_forced_sell BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS forced_sell_at TIMESTAMPTZ;
      ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS forced_sell_reason TEXT;
    `
  },
  // 3. trades 表类型扩展
  {
    name: 'trades 表类型扩展',
    sql: `
      ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS filled_at TIMESTAMPTZ;
      ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS finish_time TIMESTAMPTZ;
    `
  },
  // 4. 创建索引
  {
    name: '创建索引',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_positions_risk_level ON public.positions(risk_level);
      CREATE INDEX IF NOT EXISTS idx_positions_forced_sell ON public.positions(is_forced_sell) WHERE is_forced_sell = TRUE;
    `
  }
];

async function syncDatabase() {
  console.log('🚀 开始同步数据库...\n');
  console.log('📍 Supabase URL:', SUPABASE_URL);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 由于 Supabase JS SDK 不支持直接执行 DDL，我们需要提示用户手动执行
  console.log('\n⚠️  注意: Supabase JS SDK 不支持直接执行 DDL 语句');
  console.log('请在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL:\n');
  console.log('============================================================');
  console.log('文件路径: database/sync-database.sql');
  console.log('============================================================\n');
  
  console.log('或者复制以下 SQL 到 SQL Editor:\n');
  console.log('---\n');
  
  // 读取并显示 SQL 文件内容
  const fs = await import('fs');
  const sql = fs.readFileSync('database/sync-database.sql', 'utf-8');
  console.log(sql);
  console.log('\n---\n');

  console.log('\n📖 执行步骤:');
  console.log('1. 打开 Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. 选择项目: rfnrosyfeivcbkimjlwo');
  console.log('3. 点击左侧菜单 "SQL Editor"');
  console.log('4. 点击 "New Query"');
  console.log('5. 复制上面的 SQL 并粘贴');
  console.log('6. 点击 "Run" 执行');
  console.log('\n✅ 执行完成后，运行 npx tsx scripts/check-database.ts 验证');
}

syncDatabase();
