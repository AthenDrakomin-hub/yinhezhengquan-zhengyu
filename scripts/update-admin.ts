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

async function updateAdmin() {
  console.log('🔧 更新用户权限为超级管理员...\n');

  const userId = '582e0b47-b04a-4040-a6cd-21637130bba5';

  const { data, error } = await supabase
    .from('profiles')
    .update({
      admin_level: 'super_admin',
      status: 'active'
    })
    .eq('id', userId)
    .select();

  if (error) {
    console.log('❌ 更新失败:', error.message);
    return;
  }

  console.log('✅ 更新成功！');
  console.log('更新结果:', data);
}

updateAdmin();
