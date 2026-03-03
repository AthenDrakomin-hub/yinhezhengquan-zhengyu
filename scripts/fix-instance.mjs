import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres.rfnrosyfeivcbkimjlwo:GDragon19888.。@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixInstanceId() {
  try {
    await client.connect();
    
    // 获取一个有效的 instance_id
    const validInstance = await client.query(`
      SELECT DISTINCT instance_id 
      FROM auth.users 
      WHERE instance_id IS NOT NULL 
      LIMIT 1
    `);
    
    const instanceId = validInstance.rows[0]?.instance_id || '00000000-0000-0000-0000-000000000000';
    
    console.log('使用 instance_id:', instanceId);
    
    // 更新所有用户
    await client.query(`
      UPDATE auth.users
      SET 
        instance_id = $1,
        aud = 'authenticated'
      WHERE email IN ('athendrakomin@proton.me', 'admin@zhengyu.com', 'zhangsan@qq.com')
    `, [instanceId]);
    
    const result = await client.query(`
      SELECT id, email, instance_id, aud, confirmed_at
      FROM auth.users
      WHERE email IN ('athendrakomin@proton.me', 'admin@zhengyu.com', 'zhangsan@qq.com')
    `);
    
    console.log('\n✅ 用户已修复:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await client.end();
  }
}

fixInstanceId();
