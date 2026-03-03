import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  connectionString: 'postgres://postgres.rfnrosyfeivcbkimjlwo:GDragon19888.。@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function executeSql() {
  try {
    await client.connect();
    console.log('✅ 已连接到数据库');
    
    const sql = fs.readFileSync(path.join(__dirname, 'database', 'one-click-fix-all.sql'), 'utf8');
    
    await client.query(sql);
    console.log('✅ SQL 执行成功');
    
    const result = await client.query(`
      SELECT email, username, role, admin_level, status
      FROM public.profiles
      WHERE email IN ('athendrakomin@proton.me', 'admin@zhengyu.com', 'zhangsan@qq.com')
      ORDER BY CASE admin_level WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
    `);
    
    console.log('\n✅ 用户权限设置结果：');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
  } finally {
    await client.end();
  }
}

executeSql();
