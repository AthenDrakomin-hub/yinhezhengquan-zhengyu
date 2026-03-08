import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  console.log('🧪 创建测试账号...\n');
  
  const testEmail = 'testadmin@zhengyu.com';
  const testPassword = 'TestAdmin123!';
  
  try {
    console.log('1️⃣ 创建Auth用户...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        username: '测试管理员'
      }
    });
    
    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('⚠️  用户已存在，尝试登录测试...');
        
        const clientSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!);
        const { data: loginData, error: loginError } = await clientSupabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });
        
        if (loginError) {
          console.log('❌ 登录失败，密码可能已被修改');
          return;
        }
        
        console.log('✅ 登录成功!');
        console.log('   用户ID:', loginData.user?.id);
        
        const { data: profile } = await clientSupabase
          .from('profiles')
          .select('*')
          .eq('id', loginData.user!.id)
          .single();
        
        console.log('   Profile:', profile);
        
        await clientSupabase.auth.signOut();
        return;
      }
      throw authError;
    }
    
    console.log('✅ Auth用户创建成功!');
    console.log('   用户ID:', authData.user?.id);
    
    console.log('\n2️⃣ 更新profile为管理员...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        admin_level: 'super_admin',
        status: 'active'
      })
      .eq('id', authData.user!.id);
    
    if (updateError) {
      console.log('⚠️  更新profile失败:', updateError.message);
    } else {
      console.log('✅ Profile已更新为超级管理员');
    }
    
    console.log('\n3️⃣ 测试登录...');
    const clientSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!);
    const { data: loginData, error: loginError } = await clientSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (loginError) throw loginError;
    
    console.log('✅ 登录测试成功!');
    console.log('   会话:', loginData.session ? '已建立' : '未建立');
    
    const { data: profile } = await clientSupabase
      .from('profiles')
      .select('*')
      .eq('id', loginData.user!.id)
      .single();
    
    console.log('   Profile:', {
      email: profile?.email,
      username: profile?.username,
      admin_level: profile?.admin_level,
      status: profile?.status
    });
    
    await clientSupabase.auth.signOut();
    
    console.log('\n🎉 测试账号创建成功！');
    console.log('═══════════════════════════════════');
    console.log('📋 登录凭证:');
    console.log(`   邮箱: ${testEmail}`);
    console.log(`   密码: ${testPassword}`);
    console.log('═══════════════════════════════════');
    console.log('\n🌐 管理端登录: http://localhost:5000/admin/login');
    console.log('🌐 客户端登录: http://localhost:5000/auth/login');
    
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  }
}

createTestUser();
