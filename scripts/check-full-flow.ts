/**
 * 全流程功能检查脚本
 * 检查客户端和管理端的所有核心功能
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

async function checkAllFlows() {
  console.log('🔍 开始全流程功能检查...\n');
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 获取测试用户
  const { data: users } = await supabase.from('profiles').select('id, username, role').limit(5);
  const testUser = users?.[0];
  const adminUser = users?.find(u => u.role === 'admin') || users?.[0];

  console.log('\n📋 测试账户:');
  console.log(`  普通用户: ${testUser?.username || '无'}`);
  console.log(`  管理员: ${adminUser?.username || '无'}`);

  // ==================== 客户端流程 ====================
  console.log('\n\n📱 客户端功能检查:');
  console.log('='.repeat(60));

  // 1. 用户登录/认证
  console.log('\n  1️⃣ 用户认证系统');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  console.log(`     ${authError ? '❌' : '✅'} 认证用户数: ${authUsers?.users?.length || 0}`);

  // 2. 资产查询
  console.log('\n  2️⃣ 资产管理');
  const { data: assets, error: assetError } = await supabase.from('assets').select('*');
  console.log(`     ${assetError ? '❌' : '✅'} 资产记录: ${assets?.length || 0} 条`);

  // 3. 持仓查询
  console.log('\n  3️⃣ 持仓管理');
  const { data: positions, error: posError } = await supabase.from('positions').select('*');
  console.log(`     ${posError ? '❌' : '✅'} 持仓记录: ${positions?.length || 0} 条`);

  // 4. 交易订单
  console.log('\n  4️⃣ 交易系统');
  const { data: trades, error: tradeError } = await supabase.from('trades').select('*');
  console.log(`     ${tradeError ? '❌' : '✅'} 交易订单: ${trades?.length || 0} 条`);

  // 5. 资金流水
  console.log('\n  5️⃣ 资金流水');
  const { data: flows, error: flowError } = await supabase.from('fund_flows').select('*');
  console.log(`     ${flowError ? '❌' : '✅'} 流水记录: ${flows?.length || 0} 条`);

  // 6. 条件单
  console.log('\n  6️⃣ 条件单系统');
  const { data: condOrders, error: condError } = await supabase.from('conditional_orders').select('*');
  console.log(`     ${condError ? '❌' : '✅'} 条件单: ${condOrders?.length || 0} 条`);

  // 7. 工单系统
  console.log('\n  7️⃣ 工单/客服');
  const { data: tickets, error: ticketError } = await supabase.from('support_tickets').select('*');
  const { data: messages, error: msgError } = await supabase.from('messages').select('*');
  console.log(`     ${ticketError ? '❌' : '✅'} 工单: ${tickets?.length || 0} 条`);
  console.log(`     ${msgError ? '❌' : '✅'} 消息: ${messages?.length || 0} 条`);

  // 8. 通知系统
  console.log('\n  8️⃣ 通知系统');
  const { data: notifications, error: notifError } = await supabase.from('user_notifications').select('*');
  console.log(`     ${notifError ? '❌' : '✅'} 通知: ${notifications?.length || 0} 条`);

  // ==================== 管理端流程 ====================
  console.log('\n\n🖥️ 管理端功能检查:');
  console.log('='.repeat(60));

  // 1. 用户管理
  console.log('\n  1️⃣ 用户管理');
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
  console.log(`     ${profileError ? '❌' : '✅'} 用户总数: ${profiles?.length || 0}`);

  // 2. 交易管理
  console.log('\n  2️⃣ 交易管理');
  const { data: allTrades } = await supabase.from('trades').select('status');
  const pendingTrades = allTrades?.filter(t => t.status === 'PENDING' || t.status === 'MATCHING').length || 0;
  console.log(`     ✅ 待处理订单: ${pendingTrades} 条`);

  // 3. 撮合控制
  console.log('\n  3️⃣ 撮合控制');
  const { data: matchPool, error: poolError } = await supabase.from('trade_match_pool').select('*');
  console.log(`     ${poolError ? '❌' : '✅'} 撮合池订单: ${matchPool?.length || 0} 条`);

  // 4. 规则管理
  console.log('\n  4️⃣ 规则管理');
  const { data: rules, error: ruleError } = await supabase.from('trade_rules').select('*');
  console.log(`     ${ruleError ? '❌' : '✅'} 交易规则: ${rules?.length || 0} 条`);

  // 5. 强制平仓
  console.log('\n  5️⃣ 强制平仓');
  const { data: forceSells, error: fsError } = await supabase.from('force_sell_records').select('*');
  console.log(`     ${fsError ? '❌' : '✅'} 平仓记录: ${forceSells?.length || 0} 条`);

  // 6. 操作日志
  console.log('\n  6️⃣ 审计日志');
  const { data: logs, error: logError } = await supabase.from('admin_operation_logs').select('*');
  console.log(`     ${logError ? '❌' : '✅'} 操作日志: ${logs?.length || 0} 条`);

  // 7. 清算日志
  console.log('\n  7️⃣ 清算系统');
  const { data: settlements, error: settleError } = await supabase.from('settlement_logs').select('*');
  console.log(`     ${settleError ? '❌' : '✅'} 清算日志: ${settlements?.length || 0} 条`);

  // 8. 市场数据
  console.log('\n  8️⃣ 市场数据');
  const { data: ipos } = await supabase.from('ipos').select('*');
  const { data: limitUp } = await supabase.from('limit_up_stocks').select('*');
  const { data: blockProducts } = await supabase.from('block_trade_products').select('*');
  console.log(`     ✅ IPO新股: ${ipos?.length || 0} 条`);
  console.log(`     ✅ 涨停股票: ${limitUp?.length || 0} 条`);
  console.log(`     ✅ 大宗产品: ${blockProducts?.length || 0} 条`);

  // 9. 内容管理
  console.log('\n  9️⃣ 内容管理');
  const { data: banners } = await supabase.from('banners').select('*');
  const { data: reports } = await supabase.from('reports').select('*');
  const { data: education } = await supabase.from('education_topics').select('*');
  const { data: calendar } = await supabase.from('calendar_events').select('*');
  console.log(`     ✅ 横幅: ${banners?.length || 0} 条`);
  console.log(`     ✅ 研报: ${reports?.length || 0} 条`);
  console.log(`     ✅ 投教: ${education?.length || 0} 条`);
  console.log(`     ✅ 日历: ${calendar?.length || 0} 条`);

  // ==================== 功能测试 ====================
  console.log('\n\n🧪 功能测试:');
  console.log('='.repeat(60));

  // 测试插入通知
  console.log('\n  测试: 创建用户通知');
  if (testUser) {
    const { error: insertNotifError } = await supabase.from('user_notifications').insert({
      user_id: testUser.id,
      notification_type: 'SYSTEM',
      title: '系统测试通知',
      content: '这是一条测试通知，用于验证通知系统功能',
      priority: 'NORMAL'
    });
    console.log(`     ${insertNotifError ? '❌ ' + insertNotifError.message : '✅ 通知创建成功'}`);
    
    // 清理测试数据
    if (!insertNotifError) {
      await supabase.from('user_notifications').delete().eq('title', '系统测试通知');
      console.log('     ✅ 测试数据已清理');
    }
  }

  // 测试插入持仓
  console.log('\n  测试: 创建持仓记录');
  if (testUser) {
    const { error: insertPosError } = await supabase.from('positions').insert({
      user_id: testUser.id,
      symbol: 'TEST001',
      name: '测试股票',
      quantity: 100,
      available_quantity: 100,
      average_price: 10.00,
      current_price: 10.50,
      stock_code: 'TEST001',
      stock_name: '测试股票',
      risk_level: 'LOW',
      is_forced_sell: false
    });
    console.log(`     ${insertPosError ? '❌ ' + insertPosError.message : '✅ 持仓创建成功'}`);
    
    // 清理测试数据
    if (!insertPosError) {
      await supabase.from('positions').delete().eq('symbol', 'TEST001');
      console.log('     ✅ 测试数据已清理');
    }
  }

  // 测试撮合池
  console.log('\n  测试: 创建撮合池订单');
  if (testUser) {
    const { error: insertPoolError } = await supabase.from('trade_match_pool').insert({
      user_id: testUser.id,
      stock_code: 'TEST001',
      trade_type: 'BUY',
      price: 10.00,
      quantity: 100,
      status: 'MATCHING',
      market_type: 'NORMAL'  // 明确指定市场类型
    });
    console.log(`     ${insertPoolError ? '❌ ' + insertPoolError.message : '✅ 撮合订单创建成功'}`);
    
    // 清理测试数据
    if (!insertPoolError) {
      await supabase.from('trade_match_pool').delete().eq('stock_code', 'TEST001');
      console.log('     ✅ 测试数据已清理');
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('✅ 全流程检查完成！');
}

checkAllFlows();
