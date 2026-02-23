#!/usr/bin/env node

/**
 * 管理员账号初始化脚本
 * 使用Supabase Admin API创建管理员用户并初始化数据
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    - SUPABASE_URL: Supabase项目URL
 *    - SUPABASE_SERVICE_ROLE_KEY: Supabase服务角色密钥
 * 2. 运行：node create-admin.js
 */

const { createClient } = require('@supabase/supabase-js');

// 配置参数
const ADMIN_EMAIL = 'admin@yinhezhengquan.com';
const ADMIN_PASSWORD = 'Admin@123456'; // 临时密码，首次登录后请修改
const ADMIN_USERNAME = '超级管理员';
const ADMIN_PHONE = '13800000000'; // 请根据需要修改
const INITIAL_BALANCE = 1000000.00;

// 检查环境变量
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('错误：请设置环境变量：');
  console.error('  SUPABASE_URL: Supabase项目URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY: Supabase服务角色密钥');
  console.error('');
  console.error('获取方式：');
  console.error('  1. 登录Supabase控制台 → Project Settings → API');
  console.error('  2. 复制Project URL作为SUPABASE_URL');
  console.error('  3. 复制service_role密钥作为SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('示例：');
  console.error('  export SUPABASE_URL="https://xyz.supabase.co"');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."');
  process.exit(1);
}

// 创建Supabase客户端（使用服务角色密钥，可以绕过RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('开始创建管理员账号...');
  console.log(`邮箱: ${ADMIN_EMAIL}`);
  console.log(`用户名: ${ADMIN_USERNAME}`);
  console.log('');

  try {
    // 步骤1：检查用户是否已存在
    console.log('1. 检查用户是否已存在...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('  检查用户失败:', listError.message);
      throw listError;
    }
    
    const existingUser = existingUsers.users.find(user => user.email === ADMIN_EMAIL);
    
    let userId;
    if (existingUser) {
      console.log(`  用户已存在，ID: ${existingUser.id}`);
      userId = existingUser.id;
      
      // 检查用户邮箱是否已确认
      if (!existingUser.email_confirmed_at) {
        console.log('  警告：用户邮箱未确认，可能需要手动确认');
      }
    } else {
      // 步骤2：创建新用户
      console.log('2. 创建新用户...');
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true, // 自动确认邮箱
        user_metadata: {
          username: ADMIN_USERNAME
        }
      });
      
      if (createError) {
        console.error('  创建用户失败:', createError.message);
        throw createError;
      }
      
      userId = authData.user.id;
      console.log(`  用户创建成功，ID: ${userId}`);
    }

    // 步骤3：创建/更新管理员资料
    console.log('3. 创建管理员资料...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: ADMIN_USERNAME,
        role: 'admin',
        risk_level: 'C5',
        phone: ADMIN_PHONE,
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (profileError) {
      console.error('  创建资料失败:', profileError.message);
      throw profileError;
    }
    console.log('  管理员资料设置完成');

    // 步骤4：创建/更新管理员资产
    console.log('4. 创建管理员资产...');
    const { error: assetError } = await supabase
      .from('assets')
      .upsert({
        user_id: userId,
        available_balance: INITIAL_BALANCE,
        total_asset: INITIAL_BALANCE,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (assetError) {
      console.error('  创建资产失败:', assetError.message);
      throw assetError;
    }
    console.log(`  管理员资产设置完成：${INITIAL_BALANCE.toLocaleString()}元`);

    // 步骤5：初始化默认交易规则
    console.log('5. 初始化默认交易规则...');
    const tradeRules = [
      {
        rule_type: 'IPO',
        config: { win_rate: 0.005, min_apply_quantity: 500, max_apply_amount: 1000000 },
        updated_by: userId
      },
      {
        rule_type: 'BLOCK_TRADE',
        config: { min_quantity: 100000, match_window: '30s', need_admin_confirm: true },
        updated_by: userId
      },
      {
        rule_type: 'DERIVATIVES',
        config: { min_leverage: 5, max_leverage: 50, margin_ratio: 0.02, liquidation_threshold: 0.8 },
        updated_by: userId
      },
      {
        rule_type: 'LIMIT_UP',
        config: { order_priority: 'high', trigger_threshold: 0.095, max_single_order: 10000 },
        updated_by: userId
      }
    ];

    for (const rule of tradeRules) {
      const { error: ruleError } = await supabase
        .from('trade_rules')
        .upsert({
          ...rule,
          status: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'rule_type'
        });
      
      if (ruleError) {
        console.error(`  初始化规则 ${rule.rule_type} 失败:`, ruleError.message);
        throw ruleError;
      }
    }
    console.log('  默认交易规则初始化完成');

    // 步骤6：验证结果
    console.log('');
    console.log('6. 验证初始化结果...');
    
    // 验证管理员资料
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('  管理员资料验证:');
    console.log(`    - 用户名: ${profileData?.username || '未找到'}`);
    console.log(`    - 角色: ${profileData?.role || '未找到'}`);
    console.log(`    - 状态: ${profileData?.status || '未找到'}`);

    // 验证管理员资产
    const { data: assetData } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log('  管理员资产验证:');
    console.log(`    - 可用余额: ${assetData?.available_balance || 0}元`);
    console.log(`    - 总资产: ${assetData?.total_asset || 0}元`);

    // 验证交易规则
    const { data: rulesData } = await supabase
      .from('trade_rules')
      .select('rule_type, status, updated_by')
      .order('rule_type');
    
    console.log('  交易规则验证:');
    rulesData?.forEach(rule => {
      console.log(`    - ${rule.rule_type}: ${rule.status ? '启用' : '禁用'}`);
    });

    console.log('');
    console.log('='.repeat(50));
    console.log('管理员账号初始化完成！');
    console.log('='.repeat(50));
    console.log('');
    console.log('登录信息:');
    console.log(`  邮箱: ${ADMIN_EMAIL}`);
    console.log(`  密码: ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('重要安全提示:');
    console.log('  1. 首次登录后请立即修改密码');
    console.log('  2. 建议启用多因素认证(MFA)');
    console.log('  3. 生产环境请使用更复杂的密码');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('初始化失败:');
    console.error(error.message);
    console.error('');
    console.error('常见问题解决:');
    console.error('  1. 确保SUPABASE_SERVICE_ROLE_KEY有足够权限');
    console.error('  2. 确保数据库表已创建（已执行schema.sql）');
    console.error('  3. 检查网络连接和Supabase项目状态');
    process.exit(1);
  }
}

// 执行主函数
createAdminUser();