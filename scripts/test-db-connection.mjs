import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

const { Client } = pg;

async function testDatabaseConnection() {
  console.log('🔍 开始测试数据库连接...\n');

  const connectionString = process.env.VITE_POSTGRES_URL_NON_POOLING.replace('sslmode=require', 'sslmode=no-verify');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 连接数据库
    console.log('📡 正在连接数据库...');
    await client.connect();
    console.log('✅ 数据库连接成功!\n');

    // 查询所有表
    console.log('📊 查询所有数据表...\n');
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`找到 ${tablesResult.rows.length} 个数据表:\n`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });

    // 查询每个表的列信息
    console.log('\n📋 查询表结构详情...\n');
    for (const table of tablesResult.rows) {
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [table.table_name]);

      console.log(`\n📦 表: ${table.table_name} (${columnsResult.rows.length} 列)`);
      console.log('─'.repeat(80));
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  • ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
      });
    }

    // 查询profiles表数据
    console.log('\n\n👥 查询 profiles 表数据...\n');
    const profilesResult = await client.query(`
      SELECT id, email, username, role, status, created_at
      FROM profiles
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    console.log(`找到 ${profilesResult.rows.length} 条用户记录:\n`);
    profilesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.email}`);
      console.log(`   用户名: ${row.username}`);
      console.log(`   角色: ${row.role}`);
      console.log(`   状态: ${row.status}`);
      console.log(`   创建时间: ${row.created_at}`);
      console.log('');
    });

    // 检查RLS策略
    console.log('\n🔒 查询 RLS 策略...\n');
    const rlsResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    console.log(`找到 ${rlsResult.rows.length} 条 RLS 策略:\n`);
    let currentTable = '';
    rlsResult.rows.forEach(policy => {
      if (policy.tablename !== currentTable) {
        currentTable = policy.tablename;
        console.log(`\n📋 表: ${policy.tablename}`);
        console.log('─'.repeat(80));
      }
      console.log(`  • ${policy.policyname}`);
      console.log(`    操作: ${policy.cmd} | 角色: ${policy.roles.join(', ')}`);
    });

    console.log('\n\n✅ 数据库测试完成!');

  } catch (error) {
    console.error('\n❌ 数据库连接失败:', error.message);
    console.error('\n详细错误信息:');
    console.error(error);
  } finally {
    await client.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

testDatabaseConnection();
