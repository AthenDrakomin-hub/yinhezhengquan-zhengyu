#!/usr/bin/env node

/**
 * 使用 Supabase CLI 部署 Edge Functions
 * 运行: node scripts/deploy-functions.js
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const PROJECT_REF = process.env.VITE_SUPABASE_URL?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

if (!PROJECT_REF) {
  console.error('❌ 无法提取项目 ID');
  process.exit(1);
}

const functionsDir = join(process.cwd(), 'supabase', 'functions');
const functions = readdirSync(functionsDir).filter(name => {
  const path = join(functionsDir, name);
  return statSync(path).isDirectory();
});

console.log(`\n🔍 找到 ${functions.length} 个 Edge Functions:`);
functions.forEach(fn => console.log(`  - ${fn}`));
console.log(`\n📦 项目 ID: ${PROJECT_REF}`);
console.log('\n🚀 开始部署...\n');

let success = 0;
let failed = 0;

for (const fn of functions) {
  try {
    console.log(`📤 部署 ${fn}...`);
    execSync(`npx supabase functions deploy ${fn} --project-ref ${PROJECT_REF}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✅ ${fn} 部署成功\n`);
    success++;
  } catch (error) {
    console.error(`❌ ${fn} 部署失败\n`);
    failed++;
  }
}

console.log(`\n🎉 部署完成！`);
console.log(`✅ 成功: ${success}`);
console.log(`❌ 失败: ${failed}`);

if (failed > 0) {
  console.log('\n💡 提示:');
  console.log('1. 确保已安装 Supabase CLI: npm install -g supabase');
  console.log('2. 确保已登录: npx supabase login');
  console.log('3. 检查项目权限');
}
