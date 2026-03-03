import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres.rfnrosyfeivcbkimjlwo:GDragon19888.。@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkAuth() {
  try {
    await client.connect();
    
    // 检查 auth.users 表
    const users = await client.query(`
      SELECT id, email, encrypted_password IS NOT NULL as has_password, 
             email_confirmed_at, created_at
      FROM auth.users
      WHERE email = 'athendrakomin@proton.me'
    `);
    
    console.log('👤 Auth 用户:');
    console.table(users.rows);
    
    // 检查 auth schema
    const schemas = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name IN ('auth', 'public')
    `);
    
    console.log('\n📂 Schema:');
    console.table(schemas.rows);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await client.end();
  }
}

checkAuth();
