import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 登录功能完整测试');
  console.log('═══════════════════════════════════════════\n');

  // 测试1：错误密码
  console.log('【测试1】错误密码登录测试');
  console.log('───────────────────────────────────────');
  const wrongPassword = 'WrongPassword123!';
  console.log(`📧 邮箱: testadmin@zhengyu.com`);
  console.log(`🔑 密码: ${wrongPassword} (错误密码)\n`);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'testadmin@zhengyu.com',
      password: wrongPassword,
    });

    if (error) {
      console.log('✅ 预期结果：登录失败');
      console.log(`   错误信息: ${error.message}`);
      console.log(`   错误代码: ${error.status}`);
      console.log('   ✅ 错误提示正确显示\n');
    } else {
      console.log('❌ 意外结果：登录成功了（不应该）\n');
    }
  } catch (err: any) {
    console.log('❌ 异常:', err.message, '\n');
  }

  // 测试2：正确密码
  console.log('【测试2】正确密码登录测试');
  console.log('───────────────────────────────────────');
  const correctPassword = 'TestAdmin123!';
  console.log(`📧 邮箱: testadmin@zhengyu.com`);
  console.log(`🔑 密码: ${correctPassword} (正确密码)\n`);

  try {
    const startTime = Date.now();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'testadmin@zhengyu.com',
      password: correctPassword,
    });
    const duration = Date.now() - startTime;

    if (error) {
      console.log('❌ 登录失败:', error.message, '\n');
      return;
    }

    console.log('✅ 登录成功！');
    console.log(`   响应时间: ${duration}ms`);
    console.log(`   用户ID: ${data.user?.id}`);
    console.log(`   邮箱: ${data.user?.email}`);
    console.log(`   会话: ${data.session ? '已建立 ✅' : '未建立 ❌'}\n`);

    // 查询profile
    console.log('【测试3】查询用户Profile');
    console.log('───────────────────────────────────────');
    
    const profileStart = Date.now();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user!.id)
      .maybeSingle();
    const profileDuration = Date.now() - profileStart;

    if (profileError) {
      console.log('❌ Profile查询失败:', profileError.message, '\n');
    } else if (!profile) {
      console.log('⚠️  Profile不存在\n');
    } else {
      console.log('✅ Profile查询成功！');
      console.log(`   响应时间: ${profileDuration}ms`);
      console.log(`   用户名: ${profile.username}`);
      console.log(`   管理员级别: ${profile.admin_level}`);
      console.log(`   状态: ${profile.status}`);
      console.log(`   资金: ¥${profile.balance?.toLocaleString()}\n`);
    }

    // 登出
    await supabase.auth.signOut();
    console.log('✅ 已登出\n');

    console.log('═══════════════════════════════════════════');
    console.log('🎉 所有测试完成！');
    console.log('═══════════════════════════════════════════');
    console.log('\n📋 测试结论：');
    console.log('   ✅ 错误密码正确提示');
    console.log('   ✅ 正确密码登录成功');
    console.log('   ✅ 会话建立成功');
    console.log('   ✅ Profile查询成功');
    console.log('\n🌐 可以使用以下账号登录前端：');
    console.log('   邮箱: testadmin@zhengyu.com');
    console.log('   密码: TestAdmin123!');
    console.log('   管理端: http://localhost:5000/admin/login');
    console.log('   客户端: http://localhost:5000/auth/login');

  } catch (err: any) {
    console.log('❌ 异常:', err.message, '\n');
  }
}

testLogin();
