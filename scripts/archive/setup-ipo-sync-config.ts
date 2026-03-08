import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({
  path: path.resolve('/workspace/projects/.env.local'),
  override: true
});

const connectionString = process.env.VITE_POSTGRES_URL_NON_POOLING || process.env.VITE_POSTGRES_URL;

if (!connectionString) {
  console.error('❌ 数据库连接字符串未找到');
  process.exit(1);
}

console.log('📡 正在连接数据库...');

const client = new pg.Client({
  connectionString,
  ssl: { 
    rejectUnauthorized: false,
    mode: 'require'
  }
});

async function setupIPOSync() {
  try {
    await client.connect();
    console.log('✅ 数据库连接成功');

    // 1. 创建 IPO 同步日志表
    console.log('\n1️⃣ 创建 IPO 同步日志表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.ipo_sync_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        sync_time TIMESTAMPTZ DEFAULT NOW(),
        status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
        count INTEGER DEFAULT 0,
        execution_time_ms INTEGER,
        error_message TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ 同步日志表创建成功');

    // 2. 启用 pg_cron 扩展
    console.log('\n2️⃣ 启用 pg_cron 扩展...');
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS pg_cron");
      console.log('✅ pg_cron 扩展已启用');
    } catch (error) {
      console.log('⚠️ pg_cron 扩展启用失败（可能需要超级用户权限）');
    }

    // 3. 插入初始配置记录
    console.log('\n3️⃣ 插入初始配置记录...');
    await client.query(`
      INSERT INTO public.ipo_sync_log (status, count, error_message, metadata)
      VALUES ('pending', 0, 'IPO 自动同步系统已初始化', jsonb_build_object(
        'version', '1.0',
        'init_time', NOW(),
        'sync_schedule', '08:00 AM daily'
      ))
    `);
    console.log('✅ 配置记录已插入');

    // 4. 查询最近的同步记录
    console.log('\n4️⃣ 查询最近的同步记录...');
    const result = await client.query(`
      SELECT 
        id,
        sync_time,
        status,
        count,
        error_message
      FROM public.ipo_sync_log
      ORDER BY sync_time DESC
      LIMIT 5
    `);

    console.log('\n📊 同步记录：');
    console.log('─'.repeat(80));
    result.rows.forEach(row => {
      console.log(`  ${row.sync_time.toISOString()} | ${row.status.padEnd(10)} | ${row.count} 条`);
    });
    console.log('─'.repeat(80));

    // 5. 输出配置信息
    console.log('\n✅ IPO 自动同步配置完成！');
    console.log('\n📋 配置信息：');
    console.log('  同步时间：每天 08:00 AM');
    console.log('  Edge Function URL：https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/sync-ipo');
    console.log('  同步日志表：public.ipo_sync_log');
    console.log('\n📝 下一步操作：');
    console.log('  1. 在 Supabase Dashboard 部署 Edge Function');
    console.log('  2. 配置 Edge Function 环境变量');
    console.log('  3. 设置定时任务（外部 cron 或 Supabase cron jobs）');
    console.log('  4. 测试同步功能');

  } catch (error) {
    console.error('❌ 配置失败：', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

setupIPOSync().catch(console.error);
