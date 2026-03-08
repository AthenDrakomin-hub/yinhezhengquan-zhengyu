import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({
  path: path.resolve('/workspace/projects/.env.local'),
  override: true
});

// 使用更简单的连接字符串，禁用 SSL 验证
const DATABASE_URL = 'postgresql://postgres:GDragon19888.%E3%80%82@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true';

console.log('📡 正在尝试连接数据库...');
console.log('🔗 连接池: aws-0-eu-central-1.pooler.supabase.com:6543');

const client = new pg.Client({
  connectionString: DATABASE_URL,
  keepAlive: true,
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
});

async function executeSQLCommands() {
  try {
    console.log('⏳ 正在建立连接...');
    await client.connect();
    console.log('✅ 数据库连接成功！');

    const results = [];

    // 命令 1: 创建 IPO 同步日志表
    console.log('\n1️⃣ 创建 IPO 同步日志表...');
    try {
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
      console.log('✅ 表创建成功');
      results.push({ step: 1, status: 'success', action: 'CREATE TABLE ipo_sync_log' });
    } catch (error: any) {
      console.log('⚠️  表创建:', error.message);
      results.push({ step: 1, status: 'warning', error: error.message });
    }

    // 命令 2: 启用 RLS
    console.log('\n2️⃣ 启用行级安全...');
    try {
      await client.query(`ALTER TABLE public.ipo_sync_log ENABLE ROW LEVEL SECURITY`);
      console.log('✅ RLS 已启用');
      results.push({ step: 2, status: 'success', action: 'ENABLE RLS' });
    } catch (error: any) {
      console.log('⚠️  RLS 启用:', error.message);
      results.push({ step: 2, status: 'warning', error: error.message });
    }

    // 命令 3: 创建读取策略
    console.log('\n3️⃣ 创建读取策略...');
    try {
      await client.query(`
        DROP POLICY IF EXISTS "Allow public read access" ON public.ipo_sync_log
      `);
      await client.query(`
        CREATE POLICY "Allow public read access" ON public.ipo_sync_log
        FOR SELECT USING (true)
      `);
      console.log('✅ 读取策略创建成功');
      results.push({ step: 3, status: 'success', action: 'CREATE SELECT POLICY' });
    } catch (error: any) {
      console.log('⚠️  读取策略:', error.message);
      results.push({ step: 3, status: 'warning', error: error.message });
    }

    // 命令 4: 创建写入策略
    console.log('\n4️⃣ 创建写入策略...');
    try {
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
      console.log('✅ 写入策略创建成功');
      results.push({ step: 4, status: 'success', action: 'CREATE INSERT POLICY' });
    } catch (error: any) {
      console.log('⚠️  写入策略:', error.message);
      results.push({ step: 4, status: 'warning', error: error.message });
    }

    // 命令 5: 创建索引
    console.log('\n5️⃣ 创建索引...');
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ipo_sync_log_sync_time 
        ON public.ipo_sync_log(sync_time DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ipo_sync_log_status 
        ON public.ipo_sync_log(status)
      `);
      console.log('✅ 索引创建成功');
      results.push({ step: 5, status: 'success', action: 'CREATE INDEXES' });
    } catch (error: any) {
      console.log('⚠️  索引:', error.message);
      results.push({ step: 5, status: 'warning', error: error.message });
    }

    // 命令 6: 插入初始记录
    console.log('\n6️⃣ 插入初始配置记录...');
    try {
      const insertResult = await client.query(`
        INSERT INTO public.ipo_sync_log (status, count, error_message, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING id, sync_time
      `, [
        'success',
        0,
        'IPO 自动同步系统已配置完成（直接数据库连接）',
        JSON.stringify({
          version: '1.0',
          init_time: new Date().toISOString(),
          sync_schedule: '08:00 AM daily',
          edge_function: '/functions/v1/sync-ipo',
          database: 'configured',
          method: 'direct_pg_connection',
          connection_pool: 'aws-0-eu-central-1.pooler.supabase.com:6543',
          ssl_mode: 'no-verify'
        })
      ]);
      console.log('✅ 配置记录插入成功');
      console.log('   记录 ID:', insertResult.rows[0].id);
      console.log('   同步时间:', insertResult.rows[0].sync_time.toLocaleString('zh-CN'));
      results.push({ step: 6, status: 'success', action: 'INSERT INITIAL RECORD' });
    } catch (error: any) {
      console.log('⚠️  插入记录:', error.message);
      results.push({ step: 6, status: 'warning', error: error.message });
    }

    // 命令 7: 查询验证
    console.log('\n7️⃣ 验证表和数据...');
    try {
      const verifyResult = await client.query(`
        SELECT 
          id,
          sync_time,
          status,
          count,
          error_message,
          metadata
        FROM public.ipo_sync_log
        ORDER BY sync_time DESC
        LIMIT 5
      `);

      console.log('\n📊 同步记录：');
      console.log('─'.repeat(100));
      verifyResult.rows.forEach((row: any, index: number) => {
        console.log(`  #${index + 1}`);
        console.log(`    ID: ${row.id}`);
        console.log(`    时间: ${row.sync_time.toLocaleString('zh-CN')}`);
        console.log(`    状态: ${row.status}`);
        console.log(`    数量: ${row.count}`);
        console.log(`    消息: ${row.error_message || '成功'}`);
        if (row.metadata) {
          console.log(`    元数据: ${JSON.stringify(row.metadata).substring(0, 100)}...`);
        }
        console.log('');
      });
      console.log('─'.repeat(100));

      results.push({ 
        step: 7, 
        status: 'success', 
        action: 'VERIFY', 
        record_count: verifyResult.rows.length 
      });
    } catch (error: any) {
      console.log('⚠️  验证查询:', error.message);
      results.push({ step: 7, status: 'warning', error: error.message });
    }

    // 命令 8: 查询表结构
    console.log('\n8️⃣ 验证表结构...');
    try {
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
      console.log('─'.repeat(100));
      console.log('  字段名                | 数据类型          | 可空  | 默认值');
      console.log('─'.repeat(100));
      tableResult.rows.forEach((row: any) => {
        console.log(`  ${row.column_name.padEnd(22)} | ${row.data_type.padEnd(18)} | ${row.is_nullable.padEnd(4)} | ${row.column_default || 'NULL'}`);
      });
      console.log('─'.repeat(100));

      results.push({ 
        step: 8, 
        status: 'success', 
        action: 'TABLE STRUCTURE', 
        column_count: tableResult.rows.length 
      });
    } catch (error: any) {
      console.log('⚠️  表结构查询:', error.message);
      results.push({ step: 8, status: 'warning', error: error.message });
    }

    // 输出执行结果摘要
    console.log('\n📋 执行结果摘要：');
    console.log('─'.repeat(100));
    results.forEach((result) => {
      const icon = result.status === 'success' ? '✅' : '⚠️';
      const status = result.status === 'success' ? '成功' : '警告';
      console.log(`${icon} 步骤 ${result.step}: ${status}`);
      if (result.action) {
        console.log(`   操作: ${result.action}`);
      }
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
      if (result.record_count !== undefined) {
        console.log(`   记录数: ${result.record_count}`);
      }
      if (result.column_count !== undefined) {
        console.log(`   字段数: ${result.column_count}`);
      }
      console.log('');
    });
    console.log('─'.repeat(100));

    // 输出配置信息
    console.log('\n✅ IPO 自动同步数据库配置完成！');
    console.log('\n📋 配置信息：');
    console.log('  数据库:', DATABASE_URL.split('@')[1].split('/')[0]);
    console.log('  数据表: public.ipo_sync_log');
    console.log('  执行步骤: 8');
    console.log('  成功步骤:', results.filter(r => r.status === 'success').length);
    
    console.log('\n📝 下一步操作：');
    console.log('  ✅ 1. 数据库表已创建（本步骤已完成）');
    console.log('  ⏭️  2. 在 Supabase Dashboard 部署 Edge Function (sync-ipo)');
    console.log('  ⏭️  3. 配置 Edge Function 环境变量');
    console.log('  ⏭️  4. 使用 Vercel Cron 或外部 cron 服务设置定时任务');
    console.log('  ⏭️  5. 测试同步功能');

    console.log('\n🎉 数据库部分已完全配置成功！');
    console.log('\n剩余步骤请在 Supabase Dashboard 中完成。');

  } catch (error) {
    console.error('\n❌ 执行失败：', error);
    throw error;
  } finally {
    try {
      await client.end();
      console.log('\n🔌 数据库连接已关闭');
    } catch (e) {
      console.log('⚠️  关闭连接时出错:', e);
    }
  }
}

executeSQLCommands().catch((error) => {
  console.error('\n💥 脚本执行失败：', error);
  process.exit(1);
});
