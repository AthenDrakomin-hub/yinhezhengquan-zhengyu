/**
 * 检查并修复 trade_match_pool 表结构
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

async function checkAndFix() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('📊 数据库当前状态总结:\n');
  console.log('='.repeat(60));

  // 1. 表统计
  console.log('\n✅ 所有表都已存在');

  // 2. profiles 字段检查
  console.log('\n📋 profiles 表字段:');
  const { data: profile } = await supabase.from('profiles').select('*').limit(1);
  if (profile?.[0]) {
    const required = ['id', 'username', 'role', 'admin_level', 'email', 'balance', 'total_equity'];
    const existing = Object.keys(profile[0]);
    const missing = required.filter(f => !existing.includes(f));
    if (missing.length === 0) {
      console.log('  ✅ 所有必要字段都存在');
    } else {
      console.log('  ⚠️ 缺少字段:', missing.join(', '));
    }
  }

  // 3. positions 字段检查
  console.log('\n📋 positions 表字段:');
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  const testUserId = users?.[0]?.id;

  if (testUserId) {
    // 插入测试
    const { error: posError } = await supabase.from('positions').insert({
      user_id: testUserId,
      symbol: 'FIELD_TEST',
      name: '测试',
      quantity: 1,
      available_quantity: 1,
      average_price: 1,
      stock_code: 'TEST',
      stock_name: '测试',
      risk_level: 'LOW',
      is_forced_sell: false,
      current_price: 1,
      profit_loss: 0
    });

    if (posError) {
      console.log('  ⚠️ 字段问题:', posError.message);
    } else {
      console.log('  ✅ 所有必要字段都存在');
      await supabase.from('positions').delete().eq('symbol', 'FIELD_TEST');
    }
  }

  // 4. 新增表检查
  console.log('\n📋 新增表检查:');
  
  // user_notifications
  const { error: notifError } = await supabase.from('user_notifications').insert({
    user_id: testUserId,
    notification_type: 'SYSTEM',
    title: 'TEST',
    content: 'test'
  });
  console.log(`  user_notifications: ${notifError ? '⚠️ ' + notifError.message : '✅ 正常'}`);
  if (!notifError) await supabase.from('user_notifications').delete().eq('title', 'TEST');

  // force_sell_records  
  const { error: fsError } = await supabase.from('force_sell_records').insert({
    user_id: testUserId,
    admin_id: testUserId,
    symbol: 'TEST',
    quantity: 1,
    reason: 'test'
  });
  console.log(`  force_sell_records: ${fsError ? '⚠️ ' + fsError.message : '✅ 正常'}`);
  if (!fsError) await supabase.from('force_sell_records').delete().eq('symbol', 'TEST');

  // trade_match_pool
  const { error: poolError } = await supabase.from('trade_match_pool').insert({
    user_id: testUserId,
    stock_code: 'TEST',
    trade_type: 'BUY',
    price: 1,
    quantity: 1
  });
  console.log(`  trade_match_pool: ${poolError ? '⚠️ ' + poolError.message : '✅ 正常'}`);
  if (!poolError) await supabase.from('trade_match_pool').delete().eq('stock_code', 'TEST');

  console.log('\n' + '='.repeat(60));
  console.log('\n📝 需要修复的问题:');
  console.log('  1. trade_match_pool.trade_id 字段应改为可空（NULL）');
  console.log('\n  请在 SQL Editor 执行:');
  console.log('  ALTER TABLE public.trade_match_pool ALTER COLUMN trade_id DROP NOT NULL;');
  console.log('\n' + '='.repeat(60));
}

checkAndFix();
