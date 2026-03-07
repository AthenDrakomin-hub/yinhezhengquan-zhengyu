/**
 * Supabase 存储桶初始化脚本 (Node.js 版本)
 * 创建人脸数据和投教内容的存储桶
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量:');
  console.error('   - VITE_SUPABASE_URL:', supabaseUrl ? '已设置' : '未设置');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '已设置' : '未设置');
  console.error('\n请检查 .env 文件是否包含这些变量');
  process.exit(1);
}

// 使用服务角色密钥创建客户端（需要完全权限来创建存储桶）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 存储桶定义
const BUCKETS = [
  {
    name: 'faces',
    public: false, // 人脸数据为私有
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    name: 'education',
    public: false, // 投教内容为私有
    fileSizeLimit: 104857600, // 100MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/pdf',
    ],
  },
  {
    name: 'avatars',
    public: true, // 用户头像为公开
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    name: 'documents',
    public: false, // 文档为私有
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
];

/**
 * 初始化存储桶
 */
async function initStorageBuckets() {
  console.log('🚀 开始初始化 Supabase 存储桶...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log('');

  // 1. 检查现有的存储桶
  console.log('📋 检查现有存储桶...');
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ 列出存储桶失败:', listError.message);
    console.error('   请确保 SUPABASE_SERVICE_ROLE_KEY 正确');
    return;
  }

  console.log(`   现有存储桶: ${existingBuckets?.map(b => b.name).join(', ') || '无'}\n`);

  // 2. 创建存储桶
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const bucket of BUCKETS) {
    const exists = existingBuckets?.some(b => b.name === bucket.name);

    if (exists) {
      console.log(`⏭️  存储桶 "${bucket.name}" 已存在，跳过创建`);
      skipped++;
      continue;
    }

    try {
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });

      if (error) {
        console.error(`❌ 创建存储桶 "${bucket.name}" 失败:`, error.message);
        failed++;
      } else {
        console.log(`✅ 存储桶 "${bucket.name}" 创建成功 (${bucket.public ? '公开' : '私有'})`);
        created++;
      }
    } catch (err: any) {
      console.error(`❌ 创建存储桶 "${bucket.name}" 时发生错误:`, err.message);
      failed++;
    }
  }

  // 3. 打印摘要
  console.log('\n' + '='.repeat(50));
  console.log('📊 初始化完成摘要:');
  console.log(`   ✅ 创建成功: ${created}`);
  console.log(`   ⏭️  已存在跳过: ${skipped}`);
  console.log(`   ❌ 创建失败: ${failed}`);
  console.log('='.repeat(50));

  // 4. 验证最终状态
  console.log('\n🔍 验证最终存储桶状态...');
  const { data: finalBuckets } = await supabase.storage.listBuckets();
  console.log(`   当前存储桶: ${finalBuckets?.map(b => `${b.name}(${b.public ? '公开' : '私有'})`).join(', ') || '无'}`);
}

// 运行初始化
initStorageBuckets()
  .then(() => {
    console.log('\n✨ 脚本执行完成！');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 初始化失败:', err);
    process.exit(1);
  });
