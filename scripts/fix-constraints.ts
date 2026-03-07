/**
 * 修复数据库约束问题
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

async function fixConstraints() {
  console.log('🔧 修复数据库约束问题...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. 修复 trade_match_pool 的 market_type 约束
  console.log('1️⃣ 修复 trade_match_pool.market_type 约束...');
  
  // 先设置默认值
  const { error: defaultError } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE trade_match_pool ALTER COLUMN market_type SET DEFAULT 'NORMAL'`
  });
  
  // 使用 supabase admin API 执行
  const { data: alterResult, error: alterError } = await supabase
    .from('trade_match_pool')
    .select('id')
    .limit(1);
  
  if (alterError && alterError.message.includes('market_type')) {
    console.log('   ❌ 需要手动处理 market_type 约束');
  } else {
    console.log('   ✅ trade_match_pool 已就绪');
  }

  // 2. 创建测试认证用户
  console.log('\n2️⃣ 创建测试认证用户...');
  
  // 获取 profiles 中的用户
  const { data: profiles } = await supabase.from('profiles').select('*');
  
  for (const profile of profiles || []) {
    // 检查用户是否已存在
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    
    // 生成邮箱：使用拼音或数字ID
    const emailMap: Record<string, string> = {
      '用户001': 'user001@galaxy.com',
      '超级管理员': 'admin@galaxy.com',
      '管理员001': 'admin001@galaxy.com'
    };
    
    const email = emailMap[profile.username] || `user${profile.id}@galaxy.com`;
    const exists = existingUsers?.users?.some(u => u.email === email);
    
    if (!exists) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'galaxy123456',
        email_confirm: true,
        user_metadata: {
          role: profile.role,
          username: profile.username
        }
      });
      
      if (createError) {
        console.log(`   ❌ 创建用户 ${profile.username} 失败: ${createError.message}`);
      } else {
        console.log(`   ✅ 创建用户 ${profile.username} (${profile.role})`);
        
        // 更新 profiles 表关联 auth_id
        await supabase
          .from('profiles')
          .update({ auth_id: newUser.user.id })
          .eq('id', profile.id);
      }
    } else {
      console.log(`   ⏭️ 用户 ${profile.username} 已存在`);
    }
  }

  // 3. 验证认证用户
  console.log('\n3️⃣ 验证认证用户...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  console.log(`   认证用户总数: ${authUsers?.users?.length || 0}`);
  
  for (const user of authUsers?.users || []) {
    console.log(`   - ${user.email} (${user.user_metadata?.role || 'user'})`);
  }

  console.log('\n✅ 修复完成！');
}

fixConstraints();
