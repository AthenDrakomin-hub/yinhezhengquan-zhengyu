/**
 * 插入测试数据
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

async function insertTestData() {
  console.log('📦 插入测试数据...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. 创建认证用户
  console.log('1️⃣ 创建认证用户...');
  
  const testUsers = [
    { email: 'admin@galaxy.com', password: 'Galaxy@123', role: 'admin', username: '超级管理员' },
    { email: 'admin001@galaxy.com', password: 'Galaxy@123', role: 'admin', username: '管理员001' },
    { email: 'user001@galaxy.com', password: 'Galaxy@123', role: 'user', username: '用户001' },
    { email: 'user002@galaxy.com', password: 'Galaxy@123', role: 'user', username: '用户002' },
    { email: 'user003@galaxy.com', password: 'Galaxy@123', role: 'user', username: '用户003' },
  ];

  const createdUsers: { id: string; email: string; role: string; username: string }[] = [];

  for (const user of testUsers) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === user.email);
    
    if (existing) {
      console.log(`  ⏭️ 用户 ${user.email} 已存在，ID: ${existing.id}`);
      createdUsers.push({ id: existing.id, ...user });
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { role: user.role, username: user.username }
      });
      
      if (error) {
        console.log(`  ❌ 创建用户 ${user.email} 失败: ${error.message}`);
      } else {
        console.log(`  ✅ 创建用户 ${user.email}，ID: ${newUser!.user.id}`);
        createdUsers.push({ id: newUser!.user.id, ...user });
      }
    }
  }

  // 2. 创建 profiles 记录
  console.log('\n2️⃣ 创建 profiles 记录...');
  
  for (const user of createdUsers) {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: 'ACTIVE',
      balance: 1000000,
      total_equity: 1000000,
      auth_id: user.id
    });
    
    console.log(`  ${error ? '❌ ' + error.message : '✅ ' + user.username}`);
  }

  // 3. 创建 assets 记录
  console.log('\n3️⃣ 创建 assets 记录...');
  
  for (const user of createdUsers) {
    const { error } = await supabase.from('assets').upsert({
      user_id: user.id,
      available_balance: 1000000,
      frozen_balance: 0,
      total_asset: 1000000,
      today_profit_loss: 0
    });
    
    console.log(`  ${error ? '❌ ' + error.message : '✅ ' + user.username}`);
  }

  // 4. 创建涨停股票数据
  console.log('\n4️⃣ 创建涨停股票数据...');
  
  const limitUpStocks = [
    { stock_code: '000001', stock_name: '平安银行', limit_up_price: 12.50, current_price: 12.50, open_times: 3 },
    { stock_code: '000002', stock_name: '万科A', limit_up_price: 8.80, current_price: 8.80, open_times: 2 },
    { stock_code: '000333', stock_name: '美的集团', limit_up_price: 65.00, current_price: 65.00, open_times: 1 },
    { stock_code: '000651', stock_name: '格力电器', limit_up_price: 42.30, current_price: 42.30, open_times: 5 },
  ];

  for (const stock of limitUpStocks) {
    const { error } = await supabase.from('limit_up_stocks').upsert(stock, { onConflict: 'stock_code' });
    console.log(`  ${error ? '❌' : '✅'} ${stock.stock_name}`);
  }

  // 5. 创建大宗交易产品
  console.log('\n5️⃣ 创建大宗交易产品...');
  
  const blockProducts = [
    { product_code: 'BLOCK001', product_name: '贵州茅台大宗', stock_code: '600519', stock_name: '贵州茅台', quantity: 10000, price: 1800, discount_rate: 0.95 },
    { product_code: 'BLOCK002', product_name: '宁德时代大宗', stock_code: '300750', stock_name: '宁德时代', quantity: 20000, price: 200, discount_rate: 0.92 },
    { product_code: 'BLOCK003', product_name: '比亚迪大宗', stock_code: '002594', stock_name: '比亚迪', quantity: 15000, price: 250, discount_rate: 0.90 },
  ];

  for (const product of blockProducts) {
    const { error } = await supabase.from('block_trade_products').upsert(product, { onConflict: 'product_code' });
    console.log(`  ${error ? '❌' : '✅'} ${product.product_name}`);
  }

  // 6. 创建交易规则
  console.log('\n6️⃣ 创建交易规则...');
  
  const rules = [
    { rule_type: 'TRADING_HOURS', config: { start: '09:30', end: '15:00', lunch_break: { start: '11:30', end: '13:00' } }, status: true },
    { rule_type: 'COMMISSION', config: { rate: 0.0003, min: 5 }, status: true },
    { rule_type: 'PRICE_LIMIT', config: { limit_up: 0.1, limit_down: -0.1, st_limit_up: 0.05 }, status: true },
    { rule_type: 'TRADE_UNIT', config: { min_shares: 100 }, status: true },
    { rule_type: 'IPO_RULES', config: { max_subscription_rate: 0.1, min_subscription: 1000 }, status: true },
    { rule_type: 'BLOCK_TRADE', config: { min_quantity: 10000, discount_range: [0.85, 0.98] }, status: true },
    { rule_type: 'LIMIT_UP_BOARD', config: { max_order_ratio: 0.2, priority_rule: 'time_priority' }, status: true },
    { rule_type: 'RISK_CONTROL', config: { max_single_trade_ratio: 0.3, max_position_ratio: 0.5 }, status: true },
  ];

  for (const rule of rules) {
    const { error } = await supabase.from('trade_rules').upsert(rule, { onConflict: 'rule_type' });
    console.log(`  ${error ? '❌' : '✅'} ${rule.rule_type}`);
  }

  // 7. 创建示例工单
  console.log('\n7️⃣ 创建示例工单...');
  
  const user001 = createdUsers.find(u => u.username === '用户001');
  const admin = createdUsers.find(u => u.role === 'admin');
  
  if (user001) {
    const { data: ticket, error: ticketError } = await supabase.from('support_tickets').insert({
      user_id: user001.id,
      ticket_type: 'TRADE',
      title: '交易问题咨询',
      description: '请问如何查询历史成交记录？',
      status: 'OPEN',
      priority: 'NORMAL'
    }).select().single();
    
    if (ticketError) {
      console.log(`  ❌ 工单创建失败: ${ticketError.message}`);
    } else {
      console.log(`  ✅ 工单创建成功`);
      
      // 添加系统消息
      await supabase.from('messages').insert({
        ticket_id: ticket.id,
        sender_id: user001.id,
        sender_type: 'USER',
        content: '请问如何查询历史成交记录？'
      });
      
      await supabase.from('messages').insert({
        ticket_id: ticket.id,
        sender_id: admin?.id || user001.id,
        sender_type: 'SYSTEM',
        content: '您的工单已提交，管理员将尽快回复。'
      });
      
      console.log(`  ✅ 工单消息创建成功`);
    }
  }

  // 8. 创建示例资金流水
  console.log('\n8️⃣ 创建示例资金流水...');
  
  for (const user of createdUsers.filter(u => u.role === 'user')) {
    const { error } = await supabase.from('fund_flows').insert([
      { user_id: user.id, flow_type: 'DEPOSIT', amount: 1000000, balance_after: 1000000, description: '初始资金存入' },
      { user_id: user.id, flow_type: 'ADJUSTMENT', amount: 0, balance_after: 1000000, description: '系统初始化' }
    ]);
    console.log(`  ${error ? '❌' : '✅'} ${user.username}`);
  }

  // 9. 验证数据
  console.log('\n\n📊 数据验证:');
  console.log('='.repeat(60));
  
  const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: assetCount } = await supabase.from('assets').select('*', { count: 'exact', head: true });
  const { count: ruleCount } = await supabase.from('trade_rules').select('*', { count: 'exact', head: true });
  const { count: stockCount } = await supabase.from('limit_up_stocks').select('*', { count: 'exact', head: true });
  const { count: blockCount } = await supabase.from('block_trade_products').select('*', { count: 'exact', head: true });
  const { count: ticketCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true });
  const { count: flowCount } = await supabase.from('fund_flows').select('*', { count: 'exact', head: true });
  
  console.log(`  用户数: ${userCount}`);
  console.log(`  资产记录: ${assetCount}`);
  console.log(`  交易规则: ${ruleCount}`);
  console.log(`  涨停股票: ${stockCount}`);
  console.log(`  大宗产品: ${blockCount}`);
  console.log(`  工单数: ${ticketCount}`);
  console.log(`  资金流水: ${flowCount}`);

  console.log('\n✅ 测试数据插入完成！');
}

insertTestData().catch(console.error);
