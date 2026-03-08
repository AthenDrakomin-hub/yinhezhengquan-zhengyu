import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({
  path: path.resolve('/workspace/projects/.env.local'),
  override: true
});

// 强制使用 IPv4 连接
const DATABASE_URL = 'postgresql://postgres:GDragon19888.%E3%80%82@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true';

if (!DATABASE_URL) {
  console.error('❌ 数据库连接字符串未找到');
  process.exit(1);
}

console.log('📡 正在连接数据库（使用连接池）...');
console.log('🔗 数据库:', DATABASE_URL.split('@')[1].split('/')[0]);

const client = new pg.Client({
  connectionString: DATABASE_URL,
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

    // 2. 启用行级安全
    console.log('\n2️⃣ 配置行级安全...');
    await client.query(`ALTER TABLE public.ipo_sync_log ENABLE ROW LEVEL SECURITY`);
    console.log('✅ RLS 已启用');

    // 3. 创建访问策略
    console.log('\n3️⃣ 创建访问策略...');
    await client.query(`
      DROP POLICY IF EXISTS "Allow public read access" ON public.ipo_sync_log
    `);
    await client.query(`
      CREATE POLICY "Allow public read access" ON public.ipo_sync_log
      FOR SELECT USING (true)
    `);

    await client.query(`
      DROP POLICY IF EXISTS "Allow service role write" ON public.ipo_sync_log
    `);
    await client.query(`
      CREATE POLICY "Allow service role write" ON public.ipo_sync_log
      FOR ALL USING (
        auth.role() = 'service_role' OR auth.role() = 'authenticated'
      ) WITH CHECK (
        auth.role() = 'service_role' OR auth.role() = 'authenticated'
      )
    `);
    console.log('✅ 访问策略创建成功');

    // 4. 创建索引
    console.log('\n4️⃣ 创建索引...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ipo_sync_log_sync_time 
      ON public.ipo_sync_log(sync_time DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ipo_sync_log_status 
      ON public.ipo_sync_log(status)
    `);
    console.log('✅ 索引创建成功');

    // 5. 插入初始配置记录
    console.log('\n5️⃣ 插入初始配置记录...');
    const result = await client.query(`
      INSERT INTO public.ipo_sync_log (status, count, error_message, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      'success',
      0,
      'IPO 自动同步系统已配置完成',
      JSON.stringify({
        version: '1.0',
        init_time: new Date().toISOString(),
        sync_schedule: '08:00 AM daily',
        edge_function: '/functions/v1/sync-ipo',
        database: 'configured',
        method: 'direct_db_connection',
        pooler: 'aws-0-eu-central-1.pooler.supabase.com:6543'
      })
    ]);

    console.log('✅ 配置记录插入成功');
    console.log('   记录 ID:', result.rows[0].id);

    // 6. 查询最近的同步记录
    console.log('\n6️⃣ 查询最近的同步记录...');
    const logsResult = await client.query(`
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
    logsResult.rows.forEach(row => {
      const timeStr = row.sync_time.toLocaleString('zh-CN');
      const statusStr = row.status.padEnd(10);
      console.log(`  ${timeStr} | ${statusStr} | ${row.count} 条 | ${row.error_message || '成功'}`);
    });
    console.log('─'.repeat(80));

    // 7. 查询表结构
    console.log('\n7️⃣ 验证表结构...');
    const tableResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'ipo_sync_log'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 表结构：');
    console.log('─'.repeat(80));
    tableResult.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | ${row.is_nullable}`);
    });
    console.log('─'.repeat(80));

    // 8. 输出配置信息
    console.log('\n✅ IPO 自动同步数据库配置完成！');
    console.log('\n📋 配置信息：');
    console.log('  数据库:', DATABASE_URL.split('@')[1].split('/')[0]);
    console.log('  数据表: public.ipo_sync_log');
    console.log('  记录总数:', logsResult.rows.length);
    console.log('  最新记录:', logsResult.rows[0].sync_time.toLocaleString('zh-CN'));
    
    console.log('\n📝 下一步操作：');
    console.log('  1. 在 Supabase Dashboard 部署 Edge Function (sync-ipo)');
    console.log('  2. 配置 Edge Function 环境变量');
    console.log('  3. 使用 Vercel Cron 或外部 cron 服务设置定时任务');
    console.log('  4. 测试同步功能');

    console.log('\n📚 详细文档：');
    console.log('  - IPO_AUTO_SYNC_GUIDE.md（完整配置指南）');
    console.log('  - IPO_AUTO_SYNC_QUICKSTART.md（快速开始）');
    console.log('  - database/create-ipo-sync-table.sql（SQL 脚本）');

    console.log('\n🎉 数据库配置成功完成！');

  } catch (error) {
    console.error('❌ 配置失败：', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

setupIPOSync().catch((error) => {
  console.error('❌ 脚本执行失败：', error);
  process.exit(1);
});
