/**
 * 银河证券颜色统一脚本
 * 将所有不一致的颜色替换为银河证券官方配色
 */

import * as fs from 'fs';
import * as path from 'path';

// 颜色映射规则
const colorMappings = [
  // 主色调：青色 -> 银河红
  { from: '#E63946', to: '#E63946', desc: '银河红（品牌主色）' },
  { from: '#C62836', to: '#C62836', desc: '银河红深色' },
  
  // 辅助色：深蓝 -> 科技蓝
  { from: '#0066CC', to: '#0066CC', desc: '科技蓝（辅助色）' },
  { from: '#004C99', to: '#004C99', desc: '科技蓝深色' },
  { from: '#004C99', to: '#004C99', desc: '科技蓝深色' },
  
  // 深色背景
  { from: '#1E1E1E', to: '#1E1E1E', desc: '深色背景' },
  
  // 浅蓝色背景
  { from: '#E3F2FD', to: '#E3F2FD', desc: '科技蓝浅色背景' },
  { from: '#E3F2FD', to: '#E3F2FD', desc: '科技蓝浅色背景' },
];

// 需要排除的目录
const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'supabase'];

// 需要处理的文件扩展名
const extensions = ['.tsx', '.ts', '.css'];

// 统计信息
let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

/**
 * 递归遍历目录
 */
function walkDir(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        walkDir(filePath, callback);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(filePath);
      if (extensions.includes(ext)) {
        callback(filePath);
      }
    }
  }
}

/**
 * 替换文件中的颜色
 */
function replaceColors(filePath: string) {
  totalFiles++;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  let fileReplacements = 0;
  
  for (const mapping of colorMappings) {
    const regex = new RegExp(mapping.from, 'gi');
    const matches = content.match(regex);
    
    if (matches) {
      content = content.replace(regex, mapping.to);
      fileReplacements += matches.length;
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modifiedFiles++;
    totalReplacements += fileReplacements;
    console.log(`✅ ${filePath} (${fileReplacements} 处替换)`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🎨 开始统一银河证券配色...\n');
  
  const rootDir = process.cwd();
  
  walkDir(rootDir, replaceColors);
  
  console.log('\n✅ 颜色统一完成！\n');
  console.log('📊 统计信息：');
  console.log(`  - 扫描文件：${totalFiles}`);
  console.log(`  - 修改文件：${modifiedFiles}`);
  console.log(`  - 总替换数：${totalReplacements}`);
  console.log('\n📋 颜色映射：');
  
  for (const mapping of colorMappings) {
    console.log(`  - ${mapping.from} -> ${mapping.to} (${mapping.desc})`);
  }
}

main();
