/**
 * 详细检查表字段结构
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

async function checkFields() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 通过插入一条测试数据来检测字段
  console.log('📊 检测 positions 表字段...\n');

  // 获取一个测试用户
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  const testUserId = users?.[0]?.id;

  if (!testUserId) {
    console.log('❌ 没有找到测试用户');
    return;
  }

  // 尝试插入测试数据（会失败，但能告诉我们缺少什么字段）
  const testData = {
    user_id: testUserId,
    symbol: 'TEST',
    name: '测试股票',
    quantity: 100,
    available_quantity: 100,
    average_price: 10,
    stock_code: 'TEST',
    stock_name: '测试股票',
    risk_level: 'LOW',
    is_forced_sell: false,
    current_price: 10,
    profit_loss: 0
  };

  const { error } = await supabase.from('positions').insert(testData);

  if (error) {
    console.log('插入测试结果:', error.message);
    
    // 解析错误信息
    if (error.message.includes('column')) {
      console.log('\n可能缺少的字段:', error.message);
    }
  } else {
    console.log('✅ 所有字段都存在，测试数据已插入');
    
    // 删除测试数据
    await supabase.from('positions').delete().eq('symbol', 'TEST');
    console.log('✅ 测试数据已清理');
  }

  // 检查 user_notifications 表
  console.log('\n📊 检测 user_notifications 表字段...\n');
  const notificationTest = {
    user_id: testUserId,
    notification_type: 'SYSTEM',
    title: '测试通知',
    content: '这是一条测试通知',
    priority: 'NORMAL'
  };

  const { error: notifError } = await supabase.from('user_notifications').insert(notificationTest);
  if (notifError) {
    console.log('通知表插入结果:', notifError.message);
  } else {
    console.log('✅ user_notifications 表正常');
    await supabase.from('user_notifications').delete().eq('title', '测试通知');
  }

  // 检查 force_sell_records 表
  console.log('\n📊 检测 force_sell_records 表字段...\n');
  const forceSellTest = {
    user_id: testUserId,
    admin_id: testUserId,
    symbol: 'TEST',
    quantity: 100,
    reason: '测试'
  };

  const { error: fsError } = await supabase.from('force_sell_records').insert(forceSellTest);
  if (fsError) {
    console.log('强制平仓表插入结果:', fsError.message);
  } else {
    console.log('✅ force_sell_records 表正常');
    await supabase.from('force_sell_records').delete().eq('symbol', 'TEST');
  }

  // 检查 trade_match_pool 表
  console.log('\n📊 检测 trade_match_pool 表字段...\n');
  const poolTest = {
    user_id: testUserId,
    stock_code: 'TEST',
    trade_type: 'BUY',
    price: 10,
    quantity: 100
  };

  const { error: poolError } = await supabase.from('trade_match_pool').insert(poolTest);
  if (poolError) {
    console.log('撮合池表插入结果:', poolError.message);
  } else {
    console.log('✅ trade_match_pool 表正常');
    await supabase.from('trade_match_pool').delete().eq('stock_code', 'TEST');
  }

  console.log('\n✅ 检查完成！');
}

checkFields();
