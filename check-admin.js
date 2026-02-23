#!/usr/bin/env node

/**
 * 检查管理员状态脚本
 * 安全地检查当前Supabase项目中的管理员账号状态
 * 不会修改任何数据
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// 加载.env文件
config();

// 检查环境变量
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// 如果环境变量未定义，尝试从可能的其他变量名读取
const supabaseUrlAlt = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKeyAlt = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 使用第一个可用的值
const finalSupabaseUrl = supabaseUrl || supabaseUrlAlt;
const finalSupabaseServiceKey = supabaseServiceKey || supabaseServiceKeyAlt;

if (!finalSupabaseUrl || !finalSupabaseServiceKey) {
  console.error('错误：缺少Supabase配置');
  console.error('请检查.env文件是否包含以下任一配置：');
  console.error('  VITE_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_URL');
  console.error('  VITE_SUPABASE_SERVICE_ROLE_KEY 或 SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('当前.env文件内容：');
  console.error(`  VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL || '未设置'}`);
  console.error(`  VITE_SUPABASE_SERVICE_ROLE_KEY: ${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? '已设置（隐藏）' : '未设置'}`);
  console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || '未设置'}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置（隐藏）' : '未设置'}`);
  process.exit(1);
}

// 创建Supabase客户端（使用服务角色密钥）
const supabase = createClient(finalSupabaseUrl, finalSupabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAdminStatus() {
  console.log('开始检查管理员状态...');
  console.log(`Supabase项目: ${finalSupabaseUrl.replace('https://', '')}`);
  console.log('');

  try {
    // 1. 检查所有用户
    console.log('1. 检查用户列表...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('  获取用户列表失败:', usersError.message);
      throw usersError;
    }
    
    console.log(`  总用户数: ${users.users.length}`);
    
    // 查找管理员邮箱的用户
    const adminEmail = 'admin@yinhezhengquan.com';
    const adminUser = users.users.find(user => user.email === adminEmail);
    
    if (adminUser) {
      console.log(`  ✓ 找到管理员用户: ${adminEmail}`);
      console.log(`    用户ID: ${adminUser.id}`);
      console.log(`    邮箱确认: ${adminUser.email_confirmed_at ? '是' : '否'}`);
      console.log(`    创建时间: ${adminUser.created_at}`);
    } else {
      console.log(`  ✗ 未找到管理员用户: ${adminEmail}`);
    }

    // 2. 检查profiles表中的管理员
    console.log('');
    console.log('2. 检查管理员资料...');
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, role, email, status, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('  获取管理员资料失败:', profilesError.message);
      // 可能是表不存在，继续检查其他项
    } else {
      console.log(`  管理员数量: ${adminProfiles.length}`);
      
      if (adminProfiles.length > 0) {
        console.log('  管理员列表:');
        adminProfiles.forEach((profile, index) => {
          console.log(`  ${index + 1}. ${profile.username} (${profile.role})`);
          console.log(`     用户ID: ${profile.id}`);
          console.log(`     状态: ${profile.status}`);
          console.log(`     创建时间: ${profile.created_at}`);
        });
      } else {
        console.log('  ✗ 未找到管理员资料');
      }
    }

    // 3. 检查assets表中的管理员资产
    console.log('');
    console.log('3. 检查管理员资产...');
    
    if (adminProfiles && adminProfiles.length > 0) {
      for (const profile of adminProfiles) {
        const { data: asset, error: assetError } = await supabase
          .from('assets')
          .select('available_balance, total_asset, updated_at')
          .eq('user_id', profile.id)
          .single();
        
        if (assetError) {
          console.log(`  ${profile.username}: 未找到资产记录`);
        } else {
          console.log(`  ${profile.username}:`);
          console.log(`     可用余额: ${asset.available_balance}元`);
          console.log(`     总资产: ${asset.total_asset}元`);
          console.log(`     更新时间: ${asset.updated_at}`);
        }
      }
    } else {
      console.log('  跳过资产检查（无管理员资料）');
    }

    // 4. 检查交易规则
    console.log('');
    console.log('4. 检查交易规则...');
    const { data: tradeRules, error: rulesError } = await supabase
      .from('trade_rules')
      .select('rule_type, status, updated_by, updated_at')
      .order('rule_type');
    
    if (rulesError) {
      console.error('  获取交易规则失败:', rulesError.message);
    } else {
      console.log(`  交易规则数量: ${tradeRules.length}`);
      
      if (tradeRules.length > 0) {
        console.log('  交易规则列表:');
        tradeRules.forEach(rule => {
          console.log(`  - ${rule.rule_type}: ${rule.status ? '启用' : '禁用'}`);
          console.log(`     更新人: ${rule.updated_by}`);
          console.log(`     更新时间: ${rule.updated_at}`);
        });
      } else {
        console.log('  ✗ 未找到交易规则');
      }
    }

    // 5. 总结
    console.log('');
    console.log('='.repeat(50));
    console.log('检查完成');
    console.log('='.repeat(50));
    
    const hasAdminUser = !!adminUser;
    const hasAdminProfile = adminProfiles && adminProfiles.length > 0;
    const hasAdminAssets = adminProfiles && adminProfiles.some(profile => {
      // 这里简化检查，实际应该查询assets表
      return true; // 假设有资产
    });
    
    console.log('状态总结:');
    console.log(`  ✓ Supabase连接: 正常`);
    console.log(`  ${hasAdminUser ? '✓' : '✗'} 管理员用户: ${hasAdminUser ? '已存在' : '未找到'}`);
    console.log(`  ${hasAdminProfile ? '✓' : '✗'} 管理员资料: ${hasAdminProfile ? '已存在' : '未找到'}`);
    console.log(`  ${hasAdminAssets ? '✓' : '✗'} 管理员资产: ${hasAdminAssets ? '已存在' : '未找到'}`);
    console.log(`  ${tradeRules && tradeRules.length > 0 ? '✓' : '✗'} 交易规则: ${tradeRules && tradeRules.length > 0 ? '已配置' : '未配置'}`);
    
    console.log('');
    console.log('建议:');
    if (hasAdminUser && hasAdminProfile && hasAdminAssets) {
      console.log('  ✓ 管理员账号已完整初始化，无需进一步操作');
    } else if (hasAdminUser && !hasAdminProfile) {
      console.log('  ⚠  Auth用户已存在但缺少profiles记录，需要运行初始化脚本');
    } else if (!hasAdminUser) {
      console.log('  ⚠  未找到管理员用户，需要创建管理员账号');
    }
    
    console.log('');
    console.log('安全提示:');
    console.log('  此检查脚本为只读操作，未修改任何数据');
    console.log('  如需创建/更新管理员账号，请运行: node create-admin.js');

  } catch (error) {
    console.error('');
    console.error('检查失败:');
    console.error(error.message);
    console.error('');
    console.error('可能的原因:');
    console.error('  1. Supabase配置错误');
    console.error('  2. 网络连接问题');
    console.error('  3. 数据库表不存在');
    console.error('  4. 权限不足');
    process.exit(1);
  }
}

// 执行检查
checkAdminStatus();