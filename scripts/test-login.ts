/**
 * 测试登录功能
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试账号
const TEST_ACCOUNTS = [
  {
    email: 'superadmin@yinhe.test',
    password: 'Yinhe@2026',
    expected_role: 'super_admin',
    expected_redirect: '/admin/dashboard',
    description: '超级管理员',
  },
  {
    email: 'admin@yinhe.test',
    password: 'Yinhe@2026',
    expected_role: 'admin',
    expected_redirect: '/admin/dashboard',
    description: '管理员',
  },
  {
    email: 'user@yinhe.test',
    password: 'Yinhe@2026',
    expected_role: 'user',
    expected_redirect: '/client/dashboard',
    description: '普通用户',
  },
];

async function testLogin() {
  console.log('🧪 开始测试登录功能...\n');

  const results = [];

  for (const account of TEST_ACCOUNTS) {
    console.log(`📝 测试账号: ${account.email}`);
    console.log(`   期望角色: ${account.expected_role}`);
    console.log(`   期望跳转: ${account.expected_redirect}`);

    try {
      // 1. 测试登录
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (loginError) {
        console.error(`   ❌ 登录失败:`, loginError.message);
        results.push({ ...account, status: 'login_failed', error: loginError.message });
        continue;
      }

      console.log(`   ✅ 登录成功`);

      // 2. 获取用户 profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, username, role, admin_level, status')
        .eq('id', loginData.user.id)
        .single();

      if (profileError) {
        console.error(`   ⚠️  获取 profile 失败:`, profileError.message);
        results.push({ ...account, status: 'profile_failed', error: profileError.message });
      } else {
        console.log(`   ✅ Profile 获取成功:`);
        console.log(`      - 用户名: ${profile.username}`);
        console.log(`      - 角色: ${profile.admin_level}`);
        console.log(`      - 状态: ${profile.status}`);

        // 3. 验证角色
        const actualRole = profile.admin_level || profile.role;
        const roleMatch = actualRole === account.expected_role;
        console.log(`      - 角色验证: ${roleMatch ? '✅ 匹配' : '❌ 不匹配'}`);

        // 4. 确定跳转路由
        const actualRedirect = ['admin', 'super_admin'].includes(actualRole)
          ? '/admin/dashboard'
          : '/client/dashboard';
        const redirectMatch = actualRedirect === account.expected_redirect;
        console.log(`      - 跳转路由: ${actualRedirect}`);
        console.log(`      - 跳转验证: ${redirectMatch ? '✅ 匹配' : '❌ 不匹配'}`);

        results.push({
          ...account,
          status: 'success',
          profile,
          roleMatch,
          redirectMatch,
          actualRole,
          actualRedirect,
        });
      }

      // 5. 登出
      await supabase.auth.signOut();
      console.log(`   ✅ 已登出\n`);

    } catch (err: any) {
      console.error(`   ❌ 测试失败:`, err.message);
      results.push({ ...account, status: 'error', error: err.message });
    }

    console.log('');
  }

  // 打印结果汇总
  console.log('='.repeat(60));
  console.log('📊 测试结果汇总:');
  console.log('='.repeat(60));

  let successCount = 0;
  for (const result of results) {
    const status = result.status === 'success' ? '✅ 成功' : '❌ 失败';
    console.log(`\n${result.description} (${result.email}): ${status}`);
    if (result.status === 'success') {
      console.log(`   角色验证: ${result.roleMatch ? '✅' : '❌'}`);
      console.log(`   路由验证: ${result.redirectMatch ? '✅' : '❌'}`);
      if (result.roleMatch && result.redirectMatch) successCount++;
    } else {
      console.log(`   错误: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📈 通过率: ${successCount}/${results.length}`);
  console.log('='.repeat(60));

  return results;
}

testLogin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('测试失败:', err);
    process.exit(1);
  });
