/**
 * 详细列出 tupian 存储桶所有文件
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvConfig() {
  const envPath = path.join(process.cwd(), '.env');
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

async function listAllFiles() {
  const config = loadEnvConfig();
  const url = config.VITE_SUPABASE_URL || config.SUPABASE_URL;
  const key = config.SUPABASE_SERVICE_ROLE_KEY || config.VITE_SUPABASE_ANON_KEY;

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔍 正在扫描 tupian 存储桶...\n');

  // 获取所有文件（包括子目录）
  const { data: files, error } = await client.storage
    .from('tupian')
    .list('', { 
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) {
    console.error('❌ 查询失败:', error.message);
    return;
  }

  if (!files || files.length === 0) {
    console.log('⚠️ 存储桶为空');
    return;
  }

  // 分类统计
  const categories = {
    logo: [] as any[],
    banner: [] as any[],
    carousel: [] as any[],
    icon: [] as any[],
    avatar: [] as any[],
    background: [] as any[],
    other: [] as any[]
  };

  console.log(`📦 共找到 ${files.length} 个文件/文件夹:\n`);
  console.log('═'.repeat(80));

  for (const file of files) {
    if (!file.name) continue;
    
    const name = file.name.toLowerCase();
    const size = file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : 'N/A';
    const updated = file.updated_at ? new Date(file.updated_at).toLocaleDateString('zh-CN') : 'N/A';
    
    // 分类
    if (name.includes('logo')) {
      categories.logo.push({ ...file, displaySize: size, displayDate: updated });
    } else if (name.includes('banner') || name.includes('121') || name.includes('213')) {
      categories.banner.push({ ...file, displaySize: size, displayDate: updated });
    } else if (name.includes('carousel')) {
      categories.carousel.push({ ...file, displaySize: size, displayDate: updated });
    } else if (name.includes('icon') || name.includes('research')) {
      categories.icon.push({ ...file, displaySize: size, displayDate: updated });
    } else if (name.includes('avatar') || name.includes('photo') || name.includes('yinxiaohe')) {
      categories.avatar.push({ ...file, displaySize: size, displayDate: updated });
    } else if (name.includes('bg') || name.includes('milky') || name.includes('background')) {
      categories.background.push({ ...file, displaySize: size, displayDate: updated });
    } else {
      categories.other.push({ ...file, displaySize: size, displayDate: updated });
    }
  }

  // 打印分类
  const printCategory = (title: string, items: any[]) => {
    if (items.length === 0) return;
    console.log(`\n📁 ${title} (${items.length}个):`);
    console.log('─'.repeat(80));
    items.forEach((file, idx) => {
      const isLast = idx === items.length - 1;
      console.log(`${isLast ? '└──' : '├──'} ${file.name}`);
      console.log(`${isLast ? '    ' : '│   '} 大小: ${file.displaySize} | 更新: ${file.displayDate}`);
    });
  };

  printCategory('Logo 相关', categories.logo);
  printCategory('Banner/轮播图', categories.banner);
  printCategory('轮播图 (carousel)', categories.carousel);
  printCategory('图标/研究', categories.icon);
  printCategory('头像/形象', categories.avatar);
  printCategory('背景图', categories.background);
  printCategory('其他', categories.other);

  // 生成建议
  console.log('\n\n' + '═'.repeat(80));
  console.log('💡 图片整理建议');
  console.log('═'.repeat(80));
  
  console.log('\n📋 建议的目录结构:');
  console.log('tupian/');
  console.log('├── logo/');
  console.log('│   ├── logo.png          (主Logo)');
  console.log('│   └── logo-white.png    (白色版本)');
  console.log('├── banners/');
  console.log('│   ├── banner-1.jpg');
  console.log('│   ├── banner-2.jpg');
  console.log('│   └── banner-3.jpg');
  console.log('├── carousel/');
  console.log('│   ├── slide-1.jpg');
  console.log('│   ├── slide-2.jpg');
  console.log('│   └── slide-3.jpg');
  console.log('├── icons/');
  console.log('│   ├── service-1.png');
  console.log('│   ├── service-2.png');
  console.log('│   ├── service-3.png');
  console.log('│   └── service-4.png');
  console.log('├── avatars/');
  console.log('│   ├── default.png');
  console.log('│   └── agent.png');
  console.log('└── backgrounds/');
  console.log('    ├── hero-bg.jpg');
  console.log('    └── section-bg.jpg');

  console.log('\n\n🔧 当前文件映射建议:');
  console.log('─'.repeat(80));
  
  // 为每个分类中的文件给出建议
  const mappings: string[] = [];
  
  categories.logo.forEach((f: any) => {
    if (f.name.includes('removebg')) {
      mappings.push(`${f.name} → logo/logo-transparent.png (透明背景Logo)`);
    } else if (f.name.includes('.jpeg') || f.name.includes('logol')) {
      mappings.push(`${f.name} → logo/logo-alternate.jpg (备选Logo)`);
    } else {
      mappings.push(`${f.name} → logo/logo.png (主Logo)`);
    }
  });
  
  categories.banner.forEach((f: any, i: number) => {
    mappings.push(`${f.name} → banners/banner-${i + 1}.jpg`);
  });
  
  categories.icon.forEach((f: any, i: number) => {
    mappings.push(`${f.name} → icons/service-${i + 1}.png`);
  });
  
  categories.avatar.forEach((f: any) => {
    if (f.name.includes('yinxiaohe')) {
      mappings.push(`${f.name} → avatars/mascot.png (吉祥物)`);
    } else {
      mappings.push(`${f.name} → avatars/default.jpg`);
    }
  });
  
  categories.background.forEach((f: any, i: number) => {
    mappings.push(`${f.name} → backgrounds/bg-${i + 1}.jpg`);
  });
  
  categories.other.forEach((f: any) => {
    mappings.push(`${f.name} → others/${f.name}`);
  });

  mappings.forEach(m => console.log(`  ${m}`));
}

listAllFiles().catch(console.error);
