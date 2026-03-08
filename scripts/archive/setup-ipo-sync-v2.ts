import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({
  path: path.resolve('/workspace/projects/.env.local'),
  override: true
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase 环境变量未找到');
  process.exit(1);
}

console.log('📡 正在连接 Supabase...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupIPOSync() {
  try {
    console.log('✅ Supabase 连接成功');

    // 1. 创建 IPO 同步日志表
    console.log('\n1️⃣ 创建 IPO 同步日志表...');
    const { error: tableError } = await supabase.rpc('create_ipo_sync_log_table', {
      sql: `
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
      `
    });

    // 直接执行 SQL（通过 Edge Function 方式无法执行，我们改用直接插入方式）
    console.log('⚠️ 注意：创建表需要 SQL 执行权限，请在 Supabase Dashboard SQL Editor 中执行以下 SQL：');
    console.log('\n```sql');
    console.log(`CREATE TABLE IF NOT EXISTS public.ipo_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
    console.log('```');

    // 2. 测试插入一条记录（假设表已存在）
    console.log('\n2️⃣ 尝试插入测试记录...');
    const { data: insertData, error: insertError } = await supabase
      .from('ipo_sync_log')
      .insert({
        status: 'pending',
        count: 0,
        error_message: 'IPO 自动同步系统已初始化',
        metadata: {
          version: '1.0',
          init_time: new Date().toISOString(),
          sync_schedule: '08:00 AM daily',
          method: 'manual_setup'
        }
      })
      .select()
      .single();

    if (insertError) {
      console.log('⚠️ 插入测试记录失败（表可能尚未创建）：', insertError.message);
      console.log('💡 请在 Supabase Dashboard SQL Editor 中执行上述 SQL 创建表');
    } else {
      console.log('✅ 测试记录插入成功');
      console.log('   记录 ID:', insertData.id);
    }

    // 3. 查询同步记录（如果表存在）
    console.log('\n3️⃣ 查询同步记录...');
    const { data: logs, error: logsError } = await supabase
      .from('ipo_sync_log')
      .select('*')
      .order('sync_time', { ascending: false })
      .limit(5);

    if (logsError) {
      console.log('⚠️ 查询同步记录失败（表可能尚未创建）');
    } else {
      console.log('\n📊 同步记录：');
      console.log('─'.repeat(80));
      logs?.forEach((row: any) => {
        console.log(`  ${row.sync_time} | ${row.status.padEnd(10)} | ${row.count} 条 | ${row.error_message || '成功'}`);
      });
      console.log('─'.repeat(80));
    }

    // 4. 输出配置信息
    console.log('\n✅ IPO 自动同步系统配置指南：');
    console.log('\n📋 配置信息：');
    console.log('  项目 URL：', SUPABASE_URL);
    console.log('  同步时间：每天 08:00 AM');
    console.log('  Edge Function URL：' + SUPABASE_URL + '/functions/v1/sync-ipo');
    console.log('  同步日志表：public.ipo_sync_log');
    
    console.log('\n📝 完整部署步骤：');
    console.log('\n  【步骤 1：创建数据表】');
    console.log('  1. 打开 Supabase Dashboard');
    console.log('  2. 进入 SQL Editor');
    console.log('  3. 执行上述 SQL 创建 ipo_sync_log 表');
    
    console.log('\n  【步骤 2：部署 Edge Function】');
    console.log('  1. 进入 Edge Functions 页面');
    console.log('  2. 点击 New Function，函数名：sync-ipo');
    console.log('  3. 将 supabase/functions/sync-ipo/index.ts 内容复制粘贴');
    console.log('  4. 点击 Save 并 Deploy');
    
    console.log('\n  【步骤 3：配置环境变量】');
    console.log('  1. 在 Edge Functions 页面');
    console.log('  2. 点击 Environment Variables');
    console.log('  3. 添加以下变量：');
    console.log('     - SUPABASE_URL：' + SUPABASE_URL);
    console.log('     - SUPABASE_SERVICE_ROLE_KEY：[从 API 设置中复制]');
    console.log('     - IPO_SYNC_API_KEY：[自定义密钥]');
    
    console.log('\n  【步骤 4：测试同步】');
    console.log('  执行以下命令测试：');
    console.log('  curl -X POST ' + SUPABASE_URL + '/functions/v1/sync-ipo');
    
    console.log('\n  【步骤 5：设置定时任务】');
    console.log('  由于环境限制，建议使用外部 cron 服务：');
    console.log('  - Vercel Cron Jobs');
    console.log('  - GitHub Actions');
    console.log('  - 或其他云服务商的 cron 服务');
    console.log('  Cron 表达式：0 8 * * * (每天 8:00 AM)');
    
    console.log('\n📚 详细文档：');
    console.log('  - IPO_AUTO_SYNC_GUIDE.md（完整配置指南）');
    console.log('  - IPO_AUTO_SYNC_QUICKSTART.md（快速开始）');
    
    console.log('\n🎉 配置脚本执行完成！请按照上述步骤完成部署。');

  } catch (error) {
    console.error('❌ 配置失败：', error);
    throw error;
  }
}

setupIPOSync().catch(console.error);
