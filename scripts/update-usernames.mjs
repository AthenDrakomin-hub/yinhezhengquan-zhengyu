import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres.rfnrosyfeivcbkimjlwo:GDragon19888.。@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function updateUsernames() {
  try {
    await client.connect();
    
    await client.query(`
      UPDATE public.profiles SET username = '超级管理员' WHERE email = 'athendrakomin@proton.me';
      UPDATE public.profiles SET username = '管理员001' WHERE email = 'admin@zhengyu.com';
      UPDATE public.profiles SET username = '用户001' WHERE email = 'zhangsan@qq.com';
    `);
    
    const result = await client.query(`
      SELECT email, username, role, admin_level
      FROM public.profiles
      WHERE email IN ('athendrakomin@proton.me', 'admin@zhengyu.com', 'zhangsan@qq.com')
      ORDER BY CASE admin_level WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
    `);
    
    console.log('✅ 用户名已更新：');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ 失败:', error.message);
  } finally {
    await client.end();
  }
}

updateUsernames();
