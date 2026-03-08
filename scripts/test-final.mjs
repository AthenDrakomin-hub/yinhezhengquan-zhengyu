import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🧪 测试登录...\n');

const { data: loginData, error: loginError } = await createClient(supabaseUrl, supabaseAnonKey).auth.signInWithPassword({
  email: 'testadmin@zhengyu.com',
  password: 'TestAdmin123!',
});

if (loginError) {
  console.log('❌ 登录失败:', loginError.message);
  process.exit(1);
}

console.log('✅ 登录成功！');
console.log('   用户ID:', loginData.user.id);
console.log('   会话:', loginData.session ? '已建立' : '未建立');

const client = createClient(supabaseUrl, supabaseAnonKey);
const { data: profile } = await client.from('profiles').select('*').eq('id', loginData.user.id).single();

console.log('\nProfile:', profile);

await client.auth.signOut();
console.log('\n✅ 测试完成！');
