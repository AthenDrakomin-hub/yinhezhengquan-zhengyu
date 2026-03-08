/**
 * 查询 Supabase Storage 存储桶配置
 * 直接使用项目配置
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 从 .env 文件读取配置
function loadEnvConfig() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env 文件不存在');
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  const config: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex);
        let value = trimmed.substring(eqIndex + 1);
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        config[key] = value;
      }
    }
  }

  return config;
}

async function getStorageBuckets() {
  const config = loadEnvConfig();
  
  const url = config.VITE_SUPABASE_URL || config.SUPABASE_URL;
  const key = config.SUPABASE_SERVICE_ROLE_KEY || config.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ 未找到 Supabase 配置');
    console.error('请确保 .env 文件中包含:');
    console.error('  VITE_SUPABASE_URL 或 SUPABASE_URL');
    console.error('  VITE_SUPABASE_ANON_KEY 或 SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  console.log('🔍 正在查询 Storage 存储桶配置...');
  console.log(`   URL: ${url}`);
  console.log(`   使用 ${config.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key'}\n`);

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 使用 Storage API 列出存储桶
  const { data: buckets, error: bucketsError } = await client.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ 查询存储桶失败:', bucketsError.message);
    return;
  }

  if (!buckets || buckets.length === 0) {
    console.log('⚠️ 未找到任何存储桶');
    console.log('\n💡 建议：');
    console.log('1. 登录 Supabase Dashboard');
    console.log('2. 进入 Storage 页面');
    console.log('3. 点击 "New bucket" 创建存储桶');
    console.log('4. 将存储桶设置为 Public');
    return;
  }

  console.log(`✅ 找到 ${buckets.length} 个存储桶:\n`);

  for (const bucket of buckets) {
    console.log('─'.repeat(60));
    console.log(`📦 存储桶: ${bucket.name}`);
    console.log('─'.repeat(60));
    console.log(`  ID: ${bucket.id}`);
    console.log(`  公开访问: ${bucket.public ? '✅ 是' : '❌ 否'}`);
    console.log(`  创建时间: ${bucket.created_at}`);
    console.log(`  更新时间: ${bucket.updated_at}`);
    
    // 获取存储桶的公开 URL 示例
    const { data: { publicUrl } } = client.storage
      .from(bucket.name)
      .getPublicUrl('logo.png');
    
    console.log(`  示例 URL: ${publicUrl}`);
    console.log();

    // 列出存储桶中的文件
    const { data: files, error: filesError } = await client.storage
      .from(bucket.name)
      .list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (!filesError && files && files.length > 0) {
      console.log(`  📁 文件列表 (前10个):`);
      for (const file of files) {
        if (file.name) {
          const size = file.metadata?.size 
            ? `${(file.metadata.size / 1024).toFixed(2)} KB` 
            : '文件夹';
          const updatedAt = file.updated_at 
            ? new Date(file.updated_at).toLocaleDateString('zh-CN')
            : '';
          console.log(`    ├─ ${file.name}`);
          console.log(`    │   大小: ${size}${updatedAt ? ` | 更新: ${updatedAt}` : ''}`);
        }
      }
    } else if (!filesError) {
      console.log('  📁 文件列表: (空存储桶)');
    }
    console.log();
  }

  // 生成配置建议
  console.log('═'.repeat(60));
  console.log('💡 环境变量配置建议');
  console.log('═'.repeat(60));
  console.log();
  
  const publicBuckets = buckets.filter(b => b.public);
  
  if (publicBuckets.length === 0) {
    console.log('⚠️ 没有找到公开存储桶');
    console.log();
    console.log('设置方法：');
    console.log('1. Supabase Dashboard → Storage');
    console.log('2. 选择存储桶 → Configuration');
    console.log('3. 开启 "Public bucket" 开关');
  } else {
    console.log('# 1. 基础配置 (Vercel Dashboard)');
    console.log('VITE_SUPABASE_URL=' + url);
    console.log('VITE_SUPABASE_ANON_KEY=' + (config.VITE_SUPABASE_ANON_KEY || '<your-anon-key>'));
    console.log();
    
    for (const bucket of publicBuckets) {
      console.log(`# 2. Storage 配置 - ${bucket.name}`);
      console.log(`VITE_STORAGE_BUCKET=${bucket.name}`);
      console.log(`VITE_STORAGE_FOLDER=images`);
      console.log();
    }
    
    console.log('═'.repeat(60));
    console.log('📋 推荐的 Storage 目录结构');
    console.log('═'.repeat(60));
    console.log();
    console.log(`${publicBuckets[0].name}/ (存储桶)`);
    console.log('└── images/');
    console.log('    ├── logo.png              # 网站 Logo');
    console.log('    ├── banner-1.jpg          # Banner 图片');
    console.log('    ├── banner-2.jpg');
    console.log('    ├── carousel-1.jpg        # 轮播图');
    console.log('    ├── carousel-2.png');
    console.log('    ├── carousel-3.png');
    console.log('    ├── service-icon-1.png    # 服务图标');
    console.log('    ├── service-icon-2.png');
    console.log('    ├── service-icon-3.png');
    console.log('    ├── service-icon-4.png');
    console.log('    ├── avatar-default.png    # 默认头像');
    console.log('    └── seal.png              # 公章图片');
    console.log();
    
    console.log('═'.repeat(60));
    console.log('🔗 使用示例');
    console.log('═'.repeat(60));
    console.log();
    console.log('// 方式1: 使用工具函数');
    console.log(`getImageUrl('logo.png')`);
    console.log(`// → ${publicBuckets[0].name}/images/logo.png`);
    console.log();
    console.log('// 方式2: 带图片优化');
    console.log(`getImageUrl('banner.jpg', { width: 1200, quality: 80, format: 'webp' })`);
    console.log(`// → 自动使用 render/image API 优化图片`);
    console.log();
    console.log('// 方式3: 预设快捷函数');
    console.log('getLogoUrl()');
    console.log('getBannerUrl(1)');
    console.log('getCarouselUrl(1)');
  }
  console.log();
}

getStorageBuckets().catch(console.error);
