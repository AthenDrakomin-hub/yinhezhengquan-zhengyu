import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rfnrosyfeivcbkimjlwo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbnJvc3lmZWl2Y2JraW1qbHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTQwNjMsImV4cCI6MjA4MzEzMDA2M30.MBPJwbwbT12W99bMHPqFtj_oMqWBXFOYnL6ZzeSyveo'
);

async function testLogin() {
  console.log('🔐 测试登录...\n');
  
  // 1. 测试普通管理员
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@zhengyu.com',
    password: 'Admin123！'
  });
  
  if (authError) {
    console.error('❌ 登录失败:', authError.message);
    return;
  }
  
  console.log('✅ 登录成功');
  console.log('用户 ID:', authData.user.id);
  console.log('邮箱:', authData.user.email);
  
  // 2. 查询 profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();
  
  if (profileError) {
    console.error('❌ 查询 profile 失败:', profileError.message);
    console.error('详细:', profileError);
    return;
  }
  
  console.log('\n✅ Profile 数据:');
  console.log(profile);
  
  // 3. 登出
  await supabase.auth.signOut();
  console.log('\n✅ 已登出');
}

testLogin();
