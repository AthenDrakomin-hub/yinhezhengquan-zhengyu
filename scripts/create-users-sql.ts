/**
 * 使用 SQL 直接创建用户（修复约束）
 */
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const databaseUrl = process.env.DATABASE_URL!;
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sql = postgres(databaseUrl, { ssl: 'require', max: 1 });
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 初始账号定义
const INITIAL_ACCOUNTS = [
  {
    email: 'superadmin@yinhe.test',
    password: 'Yinhe@2026',
    username: '超级管理员',
    role: 'admin' as const,
    admin_level: 'super_admin' as const,
    real_name: '系统超级管理员',
    risk_level: 'C1' as const,
    description: '拥有系统最高权限，可管理所有用户和数据',
  },
  {
    email: 'admin@yinhe.test',
    password: 'Yinhe@2026',
    username: '管理员',
    role: 'admin' as const,
    admin_level: 'admin' as const,
    real_name: '系统管理员',
    risk_level: 'C1' as const,
    description: '拥有管理后台权限，可管理用户、交易、投教等',
  },
  {
    email: 'user@yinhe.test',
    password: 'Yinhe@2026',
    username: '测试用户',
    role: 'user' as const,
    admin_level: 'user' as const,
    real_name: '普通测试用户',
    risk_level: 'C3' as const,
    description: '普通客户端用户，可进行交易、查看行情等',
  },
];

async function createInitialAccounts() {
  console.log('🚀 开始创建初始角色账号 (SQL 方式)...\n');

  const results = [];

  for (const account of INITIAL_ACCOUNTS) {
    console.log(`📝 处理账号: ${account.email}`);
    console.log(`   角色: ${account.admin_level}`);

    try {
      // 1. 检查用户是否已存在
      const existingUser = await sql`
        SELECT id, email FROM auth.users WHERE email = ${account.email}
      `;

      if (existingUser.length > 0) {
        console.log(`   ⏭️  用户已存在，更新 profile...`);
        
        // 更新 profile
        await sql`
          UPDATE profiles 
          SET 
            username = ${account.username},
            real_name = ${account.real_name},
            role = ${account.role},
            admin_level = ${account.admin_level},
            risk_level = ${account.risk_level},
            status = 'ACTIVE'
          WHERE id = ${existingUser[0].id}
        `;

        console.log(`   ✅ profile 更新成功`);
        results.push({
          ...account,
          id: existingUser[0].id,
          status: 'updated',
        });
        continue;
      }

      // 2. 生成 UUID
      const userId = crypto.randomUUID();

      // 3. 创建用户
      const now = new Date().toISOString();
      
      await sql`
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          created_at,
          updated_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_super_admin,
          email_change,
          email_change_token_new,
          recovery_token,
          confirmation_token,
          email_change_token_current,
          email_change_confirm_status,
          confirmation_sent_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          ${userId}::uuid,
          'authenticated',
          'authenticated',
          ${account.email},
          crypt(${account.password}, gen_salt('bf')),
          ${now}::timestamp with time zone,
          ${now}::timestamp with time zone,
          ${now}::timestamp with time zone,
          '{"provider":"email","providers":["email"]}'::jsonb,
          ${JSON.stringify({ username: account.username, real_name: account.real_name })}::jsonb,
          false,
          '',
          '',
          '',
          '',
          '',
          0,
          ${now}::timestamp with time zone
        )
      `;

      console.log(`   ✅ auth.users 记录创建成功`);

      // 4. 等待触发器创建 profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 5. 更新 profile
      await sql`
        UPDATE profiles 
        SET 
          username = ${account.username},
          real_name = ${account.real_name},
          role = ${account.role},
          admin_level = ${account.admin_level},
          risk_level = ${account.risk_level},
          status = 'ACTIVE'
        WHERE id = ${userId}::uuid
      `;

      console.log(`   ✅ profile 角色设置成功`);

      // 6. 为普通用户创建初始资产
      if (account.role === 'user') {
        await sql`
          INSERT INTO assets (user_id, available_balance, frozen_balance, total_equity, market_value)
          VALUES (${userId}::uuid, 1000000, 0, 1000000, 0)
          ON CONFLICT (user_id) DO UPDATE SET
            available_balance = 1000000,
            total_equity = 1000000
        `;
        console.log(`   ✅ 初始资产创建成功: ¥1,000,000`);
      }

      results.push({
        ...account,
        id: userId,
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

  await sql.end();
  return results;
}

createInitialAccounts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
