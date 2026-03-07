/**
 * 创建初始角色账号 - 使用 signUp 方式
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

// 使用服务角色密钥创建客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 初始账号定义
const INITIAL_ACCOUNTS = [
  {
    email: 'superadmin@yinhe.test',
    password: 'Yinhe@2026',
    username: '超级管理员',
    role: 'admin' as const,
    admin_level: 'super_admin' as const,
    real_name: '系统超级管理员',
    description: '拥有系统最高权限，可管理所有用户和数据',
  },
  {
    email: 'admin@yinhe.test',
    password: 'Yinhe@2026',
    username: '管理员',
    role: 'admin' as const,
    admin_level: 'admin' as const,
    real_name: '系统管理员',
    description: '拥有管理后台权限，可管理用户、交易、投教等',
  },
  {
    email: 'user@yinhe.test',
    password: 'Yinhe@2026',
    username: '测试用户',
    role: 'user' as const,
    admin_level: 'user' as const,
    real_name: '普通测试用户',
    description: '普通客户端用户，可进行交易、查看行情等',
  },
];

async function createInitialAccounts() {
  console.log('🚀 开始创建初始角色账号...\n');

  const results = [];

  for (const account of INITIAL_ACCOUNTS) {
    console.log(`📝 处理账号: ${account.email}`);
    console.log(`   角色: ${account.admin_level}`);

    try {
      // 1. 检查 profile 是否已存在
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, username, role, admin_level')
        .eq('email', account.email)
        .maybeSingle();

      if (existingProfile) {
        console.log(`   ⏭️  用户已存在，更新权限...`);
        
        // 更新 profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            username: account.username,
            real_name: account.real_name,
            role: account.role,
            admin_level: account.admin_level,
            status: 'ACTIVE',
          })
          .eq('id', existingProfile.id);

        if (updateError) {
          console.error(`   ⚠️  更新失败:`, updateError.message);
        } else {
          console.log(`   ✅ 权限更新成功`);
        }

        results.push({
          ...account,
          id: existingProfile.id,
          status: 'updated',
        });
        continue;
      }

      // 2. 使用 signUp 创建用户
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            username: account.username,
            real_name: account.real_name,
          },
        },
      });

      if (signUpError) {
        // 如果用户已存在，尝试直接更新 profile
        if (signUpError.message.includes('already registered')) {
          console.log(`   ⏭️  用户已注册，查找并更新 profile...`);
          
          // 通过 auth.users 表查找用户 ID
          // 由于我们不能直接查询 auth.users，使用邮箱匹配 profiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', account.email);
          
          if (profiles && profiles.length > 0) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                username: account.username,
                real_name: account.real_name,
                role: account.role,
                admin_level: account.admin_level,
                status: 'ACTIVE',
              })
              .eq('id', profiles[0].id);

            if (updateError) {
              console.error(`   ⚠️  更新失败:`, updateError.message);
            } else {
              console.log(`   ✅ 权限更新成功`);
              results.push({
                ...account,
                id: profiles[0].id,
                status: 'updated',
              });
            }
          }
          continue;
        }
        console.error(`   ❌ 创建用户失败:`, signUpError.message);
        continue;
      }

      if (!signUpData.user) {
        console.error(`   ❌ 创建用户失败: 无返回用户数据`);
        continue;
      }

      console.log(`   ✅ 用户创建成功: ${signUpData.user.id}`);

      // 3. 等待触发器创建 profile
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 4. 更新 profile 的角色字段
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: account.username,
          real_name: account.real_name,
          role: account.role,
          admin_level: account.admin_level,
          status: 'ACTIVE',
        })
        .eq('id', signUpData.user.id);

      if (profileError) {
        console.error(`   ⚠️  更新 profile 失败:`, profileError.message);
      } else {
        console.log(`   ✅ profile 角色设置成功`);
      }

      // 5. 为普通用户创建初始资产
      if (account.role === 'user') {
        const { error: assetError } = await supabase
          .from('assets')
          .upsert({
            user_id: signUpData.user.id,
            available_balance: 1000000,
            frozen_balance: 0,
            total_equity: 1000000,
            market_value: 0,
          });

        if (assetError) {
          console.log(`   ⚠️  创建初始资产失败:`, assetError.message);
        } else {
          console.log(`   ✅ 初始资产创建成功: ¥1,000,000`);
        }
      }

      results.push({
        ...account,
        id: signUpData.user.id,
        status: 'created',
      });

    } catch (err: any) {
      console.error(`   ❌ 处理失败:`, err.message);
    }

    console.log('');
  }

  // 打印结果汇总
  console.log('='.repeat(60));
  console.log('📊 账号创建结果汇总:');
  console.log('='.repeat(60));

  for (const result of results) {
    console.log(`\n📌 ${result.description}`);
    console.log(`   邮箱: ${result.email}`);
    console.log(`   密码: ${result.password}`);
    console.log(`   角色: ${result.admin_level}`);
    console.log(`   状态: ${result.status}`);
    console.log(`   登录入口: ${result.role === 'user' ? '/auth/login (客户端)' : '/admin/login (管理端)'}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ 初始账号创建完成！');
  console.log('='.repeat(60));

  return results;
}

createInitialAccounts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
