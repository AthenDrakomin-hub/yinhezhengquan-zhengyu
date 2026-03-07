/**
 * 使用 Supabase Admin API 重置用户密码
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TEST_ACCOUNTS = [
  { email: 'superadmin@yinhe.test', password: 'Yinhe@2026' },
  { email: 'admin@yinhe.test', password: 'Yinhe@2026' },
  { email: 'user@yinhe.test', password: 'Yinhe@2026' },
];

async function resetPasswords() {
  console.log('🔧 重置用户密码...\n');

  for (const account of TEST_ACCOUNTS) {
    console.log(`处理: ${account.email}`);

    // 1. 获取用户 ID
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log(`  ❌ 获取用户列表失败: ${listError.message}`);
      continue;
    }

    const user = users?.users?.find(u => u.email === account.email);
    if (!user) {
      console.log(`  ⚠️  用户不存在`);
      continue;
    }

    // 2. 更新密码
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: account.password,
        email_confirm: true 
      }
    );

    if (updateError) {
      console.log(`  ❌ 更新密码失败: ${updateError.message}`);
    } else {
      console.log(`  ✅ 密码重置成功`);
    }
  }

  console.log('\n完成！');
}

resetPasswords()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
