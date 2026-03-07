/**
 * 创建 education 存储桶（使用较小的大小限制）
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createEducationBucket() {
  console.log('尝试创建 education 存储桶（大小限制: 50MB）...');

  // 先尝试创建
  const { data: createData, error: createError } = await supabase.storage.createBucket('education', {
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm',
      'application/pdf'
    ]
  });

  if (createError) {
    console.log('创建失败:', createError.message);
    console.log('尝试更新现有存储桶...');

    // 如果已存在，尝试更新
    const { error: updateError } = await supabase.storage.updateBucket('education', {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: [
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/webm',
        'application/pdf'
      ]
    });

    if (updateError) {
      console.error('更新失败:', updateError.message);
    } else {
      console.log('✅ education 存储桶更新成功');
    }
  } else {
    console.log('✅ education 存储桶创建成功');
  }

  // 验证所有存储桶
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (!error) {
    console.log('\n📋 当前所有存储桶:');
    buckets?.forEach(b => {
      console.log(`   - ${b.name} (${b.public ? '公开' : '私有'})`);
    });
  }
}

createEducationBucket().catch(console.error);
