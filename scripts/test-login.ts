import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('🧪 开始测试登录功能...\n');
  
  // 测试账号
  const testEmail = 'superadmin@yinhe.com';
  const testPassword = 'Admin123456'; // 尝试常见密码
  
  console.log(`📧 测试邮箱: ${testEmail}`);
  console.log(`🔑 测试密码: ${testPassword}\n`);
  
  try {
    // 1. 测试登录
    console.log('1️⃣ 测试 signInWithPassword...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (authError) {
      console.error('❌ 登录失败:', authError.message);
      console.log('\n💡 请在Supabase控制台重置密码后再试');
      return;
    }
    
    console.log('✅ 登录成功!');
    console.log('   用户ID:', authData.user?.id);
    console.log('   会话:', authData.session ? '已建立' : '未建立');
    
    // 2. 查询profile
    console.log('\n2️⃣ 查询用户profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user!.id)
      .single();
    
    if (profileError) {
      console.error('❌ 查询profile失败:', profileError.message);
    } else {
      console.log('✅ Profile查询成功!');
      console.log('   用户名:', profile?.username);
      console.log('   邮箱:', profile?.email);
      console.log('   管理员级别:', profile?.admin_level);
      console.log('   状态:', profile?.status);
    }
    
    // 3. 登出
    console.log('\n3️⃣ 登出...');
    await supabase.auth.signOut();
    console.log('✅ 已登出');
    
    console.log('\n🎉 登录功能测试完成!');
    console.log('\n📋 结论: 登录API工作正常，问题可能在前端页面跳转逻辑');
    
  } catch (error: any) {
    console.error('❌ 测试异常:', error.message);
  }
}

testLogin();
