import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const { Client } = pg;

async function fullSystemCheck() {
  console.log('🔍 开始完整系统检查...\n');
  console.log('='.repeat(80));

  const client = new Client({
    connectionString: process.env.VITE_POSTGRES_URL_NON_POOLING.replace('sslmode=require', 'sslmode=no-verify'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 1. 检查profiles表结构
    console.log('📋 检查 profiles 表结构...');
    console.log('-'.repeat(80));
    const profileColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'profiles' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    const requiredColumns = ['id', 'email', 'username', 'role', 'status', 'risk_level', 'created_at', 'updated_at'];
    const existingColumns = profileColumns.rows.map(r => r.column_name);
    
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        const colInfo = profileColumns.rows.find(r => r.column_name === col);
        console.log(`✅ ${col.padEnd(20)} ${colInfo.data_type.padEnd(20)} ${colInfo.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      } else {
        console.log(`❌ ${col.padEnd(20)} 缺失`);
      }
    });

    // 2. 检查用户数据
    console.log('\n👥 检查用户数据...');
    console.log('-'.repeat(80));
    const users = await client.query(`
      SELECT id, email, username, role, status 
      FROM profiles 
      ORDER BY created_at DESC;
    `);
    
    console.log(`找到 ${users.rows.length} 个用户:\n`);
    users.rows.forEach((user, i) => {
      const roleIcon = user.role === 'admin' ? '👑' : '👤';
      const statusIcon = user.status === 'ACTIVE' ? '✅' : user.status === 'PENDING' ? '⏳' : '❌';
      console.log(`${i + 1}. ${roleIcon} ${user.email}`);
      console.log(`   用户名: ${user.username} | 角色: ${user.role} | 状态: ${statusIcon} ${user.status}`);
    });

    // 3. 检查RLS策略
    console.log('\n🔒 检查 RLS 策略...');
    console.log('-'.repeat(80));
    
    const rlsEnabled = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('profiles', 'assets', 'trades', 'positions')
      ORDER BY tablename;
    `);
    
    rlsEnabled.rows.forEach(table => {
      const icon = table.rowsecurity ? '✅' : '❌';
      console.log(`${icon} ${table.tablename.padEnd(20)} RLS ${table.rowsecurity ? '已启用' : '未启用'}`);
    });

    const profilePolicies = await client.query(`
      SELECT policyname, cmd, roles
      FROM pg_policies
      WHERE tablename = 'profiles'
      ORDER BY policyname;
    `);
    
    console.log(`\nprofiles 表策略 (${profilePolicies.rows.length} 条):`);
    profilePolicies.rows.forEach(p => {
      console.log(`  • ${p.policyname} (${p.cmd})`);
    });

    // 4. 检查关键表是否存在
    console.log('\n📦 检查关键表...');
    console.log('-'.repeat(80));
    
    const requiredTables = [
      'profiles', 'assets', 'positions', 'trades', 'fund_flows',
      'trade_match_pool', 'trade_rules', 'admin_operation_logs',
      'ipos', 'limit_up_stocks', 'block_trade_products'
    ];
    
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const tableNames = existingTables.rows.map(r => r.table_name);
    
    requiredTables.forEach(table => {
      const icon = tableNames.includes(table) ? '✅' : '❌';
      console.log(`${icon} ${table}`);
    });

    // 5. 检查assets表
    console.log('\n💰 检查 assets 表...');
    console.log('-'.repeat(80));
    
    const assets = await client.query(`
      SELECT a.user_id, p.email, a.available_balance, a.frozen_balance, a.total_asset
      FROM assets a
      LEFT JOIN profiles p ON a.user_id = p.id
      ORDER BY a.created_at DESC;
    `);
    
    if (assets.rows.length === 0) {
      console.log('⚠️ 没有资产记录，用户首次登录时会自动创建');
    } else {
      console.log(`找到 ${assets.rows.length} 条资产记录:\n`);
      assets.rows.forEach((asset, i) => {
        console.log(`${i + 1}. ${asset.email || '未知用户'}`);
        console.log(`   可用余额: ${asset.available_balance} | 冻结: ${asset.frozen_balance} | 总资产: ${asset.total_asset}`);
      });
    }

    // 6. 检查Edge Functions
    console.log('\n🔌 检查 Edge Functions...');
    console.log('-'.repeat(80));
    
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
    
    const functions = [
      'create-trade-order',
      'cancel-trade-order',
      'approve-trade-order',
      'match-trade-order',
      'get-market-data',
      'fetch-stock-f10',
      'fetch-galaxy-news',
      'admin-operations',
      'nexus-sync'
    ];
    
    let deployedCount = 0;
    for (const func of functions) {
      const url = `${SUPABASE_URL}/functions/v1/${func}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: true })
        });
        
        if (response.status !== 404) {
          console.log(`✅ ${func}`);
          deployedCount++;
        } else {
          console.log(`❌ ${func} (未部署)`);
        }
      } catch (error) {
        console.log(`❌ ${func} (连接失败)`);
      }
    }
    
    console.log(`\n部署统计: ${deployedCount}/${functions.length}`);

    // 7. 检查环境变量
    console.log('\n⚙️ 检查环境变量...');
    console.log('-'.repeat(80));
    
    const envVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VITE_USE_REAL_MARKET_DATA',
      'VITE_QOS_KEY'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      const icon = value ? '✅' : '❌';
      console.log(`${icon} ${varName.padEnd(35)} ${value ? '已设置' : '未设置'}`);
    });

    // 8. 最终检查清单
    console.log('\n📋 系统就绪检查清单...');
    console.log('='.repeat(80));
    
    const checks = [
      { name: '数据库连接', status: true },
      { name: 'profiles表结构完整', status: requiredColumns.every(c => existingColumns.includes(c)) },
      { name: '管理员账户存在', status: users.rows.some(u => u.role === 'admin' && u.status === 'ACTIVE') },
      { name: 'RLS策略已启用', status: rlsEnabled.rows.every(t => t.rowsecurity) },
      { name: '关键表完整', status: requiredTables.every(t => tableNames.includes(t)) },
      { name: 'Edge Functions已部署', status: deployedCount === functions.length },
      { name: '环境变量配置完整', status: envVars.every(v => process.env[v]) }
    ];
    
    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });
    
    const allPassed = checks.every(c => c.status);
    
    console.log('\n' + '='.repeat(80));
    if (allPassed) {
      console.log('✅ 系统检查通过！可以开始测试登录功能。');
    } else {
      console.log('⚠️ 系统检查发现问题，请修复后再测试。');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
  } finally {
    await client.end();
  }
}

fullSystemCheck();
