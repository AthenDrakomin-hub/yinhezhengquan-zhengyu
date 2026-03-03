import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres.rfnrosyfeivcbkimjlwo:GDragon19888.。@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function deepCheck() {
  try {
    await client.connect();
    
    // 1. 检查 auth.users 表结构
    console.log('📋 auth.users 表结构:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.table(columns.rows);
    
    // 2. 检查必需字段是否有值
    console.log('\n🔍 检查用户数据完整性:');
    const userData = await client.query(`
      SELECT 
        id,
        email,
        encrypted_password IS NOT NULL as has_password,
        email_confirmed_at IS NOT NULL as email_confirmed,
        created_at IS NOT NULL as has_created_at,
        updated_at IS NOT NULL as has_updated_at,
        instance_id IS NOT NULL as has_instance_id,
        aud
      FROM auth.users
      WHERE email = 'athendrakomin@proton.me'
    `);
    console.table(userData.rows);
    
    // 3. 检查 auth schema 函数
    console.log('\n⚙️ Auth 函数:');
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'auth'
      AND routine_name LIKE '%sign%'
      LIMIT 10
    `);
    console.table(functions.rows);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

deepCheck();
