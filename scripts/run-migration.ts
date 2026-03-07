/**
 * 执行数据库迁移脚本
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🚀 开始执行数据库迁移...\n');

  // 读取迁移文件
  const migrationPath = join(__dirname, 'migrations', '008_storage_migration.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // 由于 Supabase JS 客户端不支持直接执行多条 SQL，我们需要分步执行
  // 这里使用 RPC 或者单独的 SQL 语句

  console.log('📋 迁移内容预览:');
  console.log('   1. 为 profiles 表添加人脸数据字段');
  console.log('   2. 创建 education_content 表');
  console.log('   3. 创建 user_learning_progress 表');
  console.log('   4. 设置 RLS 策略');
  console.log('   5. 创建触发器');
  console.log('   6. 插入示例数据\n');

  // 检查 profiles 表是否存在人脸字段
  const { data: profilesCheck, error: profilesError } = await supabase
    .from('profiles')
    .select('face_image_key')
    .limit(1);

  if (profilesError && profilesError.message.includes('column')) {
    console.log('⚠️  profiles 表缺少人脸字段，需要通过 Supabase Dashboard 执行迁移');
    console.log('   请打开: https://supabase.com/dashboard/project/rfnrosyfeivcbkimjlwo/sql');
    console.log('   粘贴以下 SQL 执行:');
    console.log('');
    console.log('-- 添加人脸数据字段');
    console.log('ALTER TABLE profiles');
    console.log('ADD COLUMN IF NOT EXISTS face_image_key TEXT,');
    console.log('ADD COLUMN IF NOT EXISTS face_image_url TEXT,');
    console.log('ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT FALSE,');
    console.log('ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMP WITH TIME ZONE;');
    console.log('');
  } else if (!profilesError) {
    console.log('✅ profiles 表人脸字段已存在');
  }

  // 检查 education_content 表是否存在
  const { data: eduCheck, error: eduError } = await supabase
    .from('education_content')
    .select('id')
    .limit(1);

  if (eduError && eduError.code === '42P01') {
    console.log('\n⚠️  education_content 表不存在，需要通过 Supabase Dashboard 创建');
    console.log('   请在 SQL 编辑器中执行完整的迁移脚本:');
    console.log('   文件路径: scripts/migrations/008_storage_migration.sql');
  } else if (!eduError) {
    console.log('✅ education_content 表已存在');
    console.log(`   当前有 ${eduCheck?.length || 0} 条内容`);
  }

  // 检查 user_learning_progress 表是否存在
  const { data: progressCheck, error: progressError } = await supabase
    .from('user_learning_progress')
    .select('id')
    .limit(1);

  if (progressError && progressError.code === '42P01') {
    console.log('\n⚠️  user_learning_progress 表不存在');
  } else if (!progressError) {
    console.log('✅ user_learning_progress 表已存在');
  }

  console.log('\n📋 检查完成！');
  console.log('\n💡 提示: 如果表不存在，请打开 Supabase Dashboard SQL 编辑器:');
  console.log('   https://supabase.com/dashboard/project/rfnrosyfeivcbkimjlwo/sql');
  console.log('   并执行 scripts/migrations/008_storage_migration.sql 文件中的内容');
}

runMigration().catch(console.error);
