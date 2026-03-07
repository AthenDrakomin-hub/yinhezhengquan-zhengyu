/**
 * 数据库状态检查脚本
 * 使用方法: npx tsx scripts/check-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

// 关键表列表
const keyTables = [
  'profiles', 'assets', 'positions', 'holdings', 
  'trades', 'transactions', 'fund_flows',
  'admin_operation_logs', 'trade_rules', 'settlement_logs',
  'support_tickets', 'messages', 'user_notifications',
  'force_sell_records', 'trade_match_pool', 'conditional_orders',
  'ipos', 'limit_up_stocks', 'block_trade_products', 'banners',
  'reports', 'education_topics', 'calendar_events'
];

async function checkDatabase() {
  console.log('🔍 开始检查数据库状态...\n');
  console.log('📍 Supabase URL:', SUPABASE_URL);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('📋 检查关键表是否存在:');
    console.log('='.repeat(50));

    const existingTables: string[] = [];
    const missingTables: string[] = [];

    for (const table of keyTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          if (error.code === '42P01') {
            console.log(`  ❌ ${table} - 不存在`);
            missingTables.push(table);
          } else {
            console.log(`  ⚠️  ${table} - 存在但有权限问题: ${error.code}`);
            existingTables.push(table);
          }
        } else {
          console.log(`  ✅ ${table} - 存在`);
          existingTables.push(table);
        }
      } catch (e: any) {
        console.log(`  ❌ ${table} - 检查失败: ${e.message}`);
        missingTables.push(table);
      }
    }

    // 检查数据统计
    console.log('\n\n📊 数据统计:');
    console.log('='.repeat(50));

    for (const table of existingTables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          console.log(`  ${table}: ${count} 条记录`);
        }
      } catch (e) {
        // 忽略错误
      }
    }

    // 检查 profiles 表结构
    console.log('\n\n📊 profiles 表字段检查:');
    console.log('='.repeat(50));
    
    try {
      const { data: profileSample, error } = await supabase.from('profiles').select('*').limit(1);
      if (!error && profileSample && profileSample.length > 0) {
        console.log('  已有字段:', Object.keys(profileSample[0]).join(', '));
      } else if (!error) {
        console.log('  表为空');
      }
    } catch (e: any) {
      console.log('  检查失败:', e.message);
    }

    // 检查 positions 表结构
    console.log('\n\n📊 positions 表字段检查:');
    console.log('='.repeat(50));
    
    try {
      const { data: positionSample, error } = await supabase.from('positions').select('*').limit(1);
      if (!error && positionSample && positionSample.length > 0) {
        const fields = Object.keys(positionSample[0]);
        console.log('  已有字段:', fields.join(', '));
        
        // 检查是否需要添加新字段
        const requiredFields = ['risk_level', 'is_forced_sell', 'forced_sell_at', 'forced_sell_reason', 'stock_code', 'stock_name', 'current_price'];
        const missingFields = requiredFields.filter(f => !fields.includes(f));
        if (missingFields.length > 0) {
          console.log('  ⚠️  缺失字段:', missingFields.join(', '));
        } else {
          console.log('  ✅ 所有必要字段都存在');
        }
      } else if (!error) {
        console.log('  表为空');
      }
    } catch (e: any) {
      console.log('  检查失败:', e.message);
    }

    console.log('\n\n📋 缺失的表:');
    console.log('='.repeat(50));
    if (missingTables.length > 0) {
      missingTables.forEach(t => console.log(`  - ${t}`));
    } else {
      console.log('  所有表都已存在');
    }

    console.log('\n\n✅ 数据库检查完成！');
    
    return { existingTables, missingTables };
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
    return { existingTables: [], missingTables: keyTables };
  }
}

checkDatabase();
