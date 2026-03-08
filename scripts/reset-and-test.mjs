import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔧 为 superadmin@yinhe.com 重置密码...\n');

const newPassword = 'SuperAdmin123!';

const { data, error } = await supabase.auth.admin.updateUserById(
  '796c99bb-7be4-4d66-b122-5bc59802fb17',
  { password: newPassword }
);

if (error) {
  console.log('❌ 重置失败:', error.message);
  process.exit(1);
}

console.log('✅ 密码重置成功！\n');

// 测试登录
console.log('🧪 测试登录...');
const client = createClient(supabaseUrl, supabaseAnonKey);
const { data: loginData, error: loginError } = await client.auth.signInWithPassword({
  email: 'superadmin@yinhe.com',
  password: newPassword,
});

if (loginError) {
  console.log('❌ 登录失败:', loginError.message);
  process.exit(1);
}

console.log('✅ 登录成功！');
console.log('   用户ID:', loginData.user.id);

const { data: profile } = await client.from('profiles').select('*').eq('id', loginData.user.id).single();
console.log('\nProfile:');
console.log('   用户名:', profile?.username);
console.log('   管理员级别:', profile?.admin_level);
console.log('   状态:', profile?.status);
console.log('   资金:', profile?.balance);

await client.auth.signOut();

console.log('\n═══════════════════════════════════════');
console.log('🎉 登录凭证已准备好！');
console.log('═══════════════════════════════════════');
console.log('📧 邮箱: superadmin@yinhe.com');
console.log('🔑 密码:', newPassword);
console.log('👤 权限: 管理员');
console.log('🌐 管理端: http://localhost:5000/admin/login');
console.log('🌐 客户端: http://localhost:5000/auth/login');
