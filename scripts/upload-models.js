/**
 * 上传 AI 模型到 Supabase Storage
 * 运行: node scripts/upload-models.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// 加载环境变量
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadModels() {
  const modelsDir = join(process.cwd(), 'public', 'models');
  const files = readdirSync(modelsDir);

  console.log(`📦 找到 ${files.length} 个模型文件`);

  for (const file of files) {
    const filePath = join(modelsDir, file);
    const fileBuffer = readFileSync(filePath);

    console.log(`⬆️  上传 ${file}...`);

    const { error } = await supabase.storage
      .from('ai-models')
      .upload(file, fileBuffer, {
        contentType: file.endsWith('.json') ? 'application/json' : 'application/octet-stream',
        upsert: true
      });

    if (error) {
      console.error(`❌ ${file} 上传失败:`, error.message);
    } else {
      console.log(`✅ ${file} 上传成功`);
    }
  }

  console.log('\n🎉 所有模型上传完成！');
  console.log('\n📝 下一步：');
  console.log('1. 在 Supabase Dashboard 设置 ai-models bucket 为公开');
  console.log('2. 删除 public/models 目录');
  console.log('3. 更新 utils/face.ts 使用 CDN URL');
}

uploadModels().catch(console.error);
