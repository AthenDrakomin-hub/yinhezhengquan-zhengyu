import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres.rfnrosyfeivcbkimjlwo:GDragon19888.。@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixAuth() {
  try {
    await client.connect();
    
    await client.query(`
      UPDATE auth.users
      SET created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, NOW())
      WHERE email IN ('athendrakomin@proton.me', 'admin@zhengyu.com', 'zhangsan@qq.com')
    `);
    
    const result = await client.query(`
      SELECT id, email, created_at, updated_at
      FROM auth.users
      WHERE email IN ('athendrakomin@proton.me', 'admin@zhengyu.com', 'zhangsan@qq.com')
    `);
    
    console.log('✅ Auth 用户已修复:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await client.end();
  }
}

fixAuth();
