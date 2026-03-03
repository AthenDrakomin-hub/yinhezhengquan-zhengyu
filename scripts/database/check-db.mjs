import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres.rfnrosyfeivcbkimjlwo:GDragon19888.。@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    await client.connect();
    console.log('✅ 数据库连接成功\n');
    
    // 检查 profiles 表结构
    const columns = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
      ORDER BY ordinal_position
    `);
    console.log('📋 profiles 表结构：');
    console.table(columns.rows);
    
    // 检查用户数据
    const users = await client.query(`
      SELECT id, email, username, role, admin_level, status
      FROM public.profiles
      LIMIT 5
    `);
    console.log('\n👥 用户数据：');
    console.table(users.rows);
    
    // 检查 RLS 策略
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
    `);
    console.log('\n🔒 RLS 策略：');
    console.table(policies.rows);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('详细信息:', error);
  } finally {
    await client.end();
  }
}

checkDatabase();
