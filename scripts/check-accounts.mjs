import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres.rfnrosyfeivcbkimjlwo:GDragon19888.。@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkAccounts() {
  try {
    await client.connect();
    
    // 检查 auth.users
    console.log('📋 auth.users 中的账号:');
    const authUsers = await client.query(`
      SELECT id, email, encrypted_password IS NOT NULL as has_password, 
             email_confirmed_at, confirmed_at, created_at
      FROM auth.users
      WHERE email IN ('admin@zhengyu.com', 'zhangsan@qq.com')
    `);
    console.table(authUsers.rows);
    
    // 检查 profiles
    console.log('\n📋 profiles 中的账号:');
    const profiles = await client.query(`
      SELECT id, email, username, role, admin_level, status
      FROM public.profiles
      WHERE email IN ('admin@zhengyu.com', 'zhangsan@qq.com')
    `);
    console.table(profiles.rows);
    
    // 检查所有 auth.users
    console.log('\n📋 所有 auth.users:');
    const allUsers = await client.query(`
      SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 10
    `);
    console.table(allUsers.rows);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await client.end();
  }
}

checkAccounts();
