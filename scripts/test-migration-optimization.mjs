#!/usr/bin/env node

/**
 * 迁移优化系统测试脚本
 * 测试迁移版本控制、智能检查和事务支持功能
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * 读取SQL文件内容
 */
function readSqlFile(filename) {
  const filePath = join(__dirname, '..', 'supabase', 'migrations', filename);
  return readFileSync(filePath, 'utf-8');
}

/**
 * 测试迁移优化系统
 */
async function testMigrationOptimization() {
  console.log('🚀 开始测试迁移优化系统\n');
  
  try {
    // 1. 测试 migrations 表是否存在
    console.log('1. 检查 migrations 表...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'migrations');
    
    if (tablesError) {
      console.error('❌ 查询 migrations 表失败:', tablesError.message);
      return;
    }
    
    if (tables.length === 0) {
      console.log('⚠️ migrations 表不存在，需要先运行迁移优化系统');
      console.log('   执行: \\i 20260302000002_migration_optimization.sql');
    } else {
      console.log('✅ migrations 表已存在');
    }
    
    // 2. 测试智能检查函数
    console.log('\n2. 测试智能检查函数...');
    
    // 测试 table_exists 函数
    const { data: tableExistsResult, error: tableExistsError } = await supabase
      .rpc('table_exists', { table_name: 'profiles' });
    
    if (tableExistsError) {
      console.log('⚠️ table_exists 函数测试失败（可能函数未创建）:', tableExistsError.message);
    } else {
      console.log(`✅ table_exists('profiles') = ${tableExistsResult}`);
    }
    
    // 3. 测试 migration_status 视图
    console.log('\n3. 测试 migration_status 视图...');
    const { data: migrationStatus, error: statusError } = await supabase
      .from('migration_status')
      .select('*')
      .limit(5);
    
    if (statusError) {
      console.log('⚠️ migration_status 视图查询失败（可能视图未创建）:', statusError.message);
    } else {
      console.log(`✅ migration_status 视图查询成功，找到 ${migrationStatus.length} 条记录`);
      if (migrationStatus.length > 0) {
        console.log('   示例记录:');
        migrationStatus.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.migration_name} - ${record.status_display}`);
        });
      }
    }
    
    // 4. 测试合并市场数据表
    console.log('\n4. 检查市场数据表...');
    const marketTables = ['ipos', 'block_trade_products', 'limit_up_stocks', 'fund_flows'];
    
    for (const tableName of marketTables) {
      const { data: tableCheck, error: tableCheckError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);
      
      if (tableCheckError) {
        console.error(`❌ 检查 ${tableName} 表失败:`, tableCheckError.message);
      } else {
        if (tableCheck.length > 0) {
          console.log(`✅ ${tableName} 表已存在`);
        } else {
          console.log(`⚠️ ${tableName} 表不存在，需要运行合并迁移`);
        }
      }
    }
    
    // 5. 测试事务支持
    console.log('\n5. 测试事务支持...');
    console.log('   检查迁移文件是否包含 BEGIN/COMMIT:');
    
    const migrationFiles = [
      '20250327000000_init.sql',
      '20260301000000_fix_rls_policies.sql',
      '20260302000002_migration_optimization.sql',
      '20260302000003_merged_market_data_tables.sql'
    ];
    
    for (const filename of migrationFiles) {
      try {
        const content = readSqlFile(filename);
        const hasBegin = content.includes('BEGIN;');
        const hasCommit = content.includes('COMMIT;');
        
        if (hasBegin && hasCommit) {
          console.log(`   ✅ ${filename} - 包含完整的事务支持`);
        } else if (hasBegin || hasCommit) {
          console.log(`   ⚠️ ${filename} - 事务支持不完整`);
        } else {
          console.log(`   ❌ ${filename} - 缺少事务支持`);
        }
      } catch (error) {
        console.log(`   ❓ ${filename} - 文件读取失败: ${error.message}`);
      }
    }
    
    // 6. 测试智能检查语法
    console.log('\n6. 测试智能检查语法...');
    const testFiles = [
      '20250402000000_correct_ipos_table.sql',
      '20250403000000_create_block_trade_products.sql',
      '20250403000001_create_limit_up_stocks.sql'
    ];
    
    const checks = {
      'CREATE TABLE IF NOT EXISTS': 0,
      'DROP TABLE IF EXISTS': 0,
      'CREATE INDEX IF NOT EXISTS': 0,
      'DROP POLICY IF EXISTS': 0,
      'CREATE EXTENSION IF NOT EXISTS': 0
    };
    
    for (const filename of testFiles) {
      try {
        const content = readSqlFile(filename);
        for (const check in checks) {
          if (content.includes(check)) {
            checks[check]++;
          }
        }
      } catch (error) {
        // 忽略文件读取错误
      }
    }
    
    console.log('   智能检查语法统计:');
    for (const [check, count] of Object.entries(checks)) {
      if (count > 0) {
        console.log(`   ✅ ${check} - 在 ${count} 个文件中使用`);
      } else {
        console.log(`   ⚠️ ${check} - 未使用`);
      }
    }
    
    console.log('\n🎉 迁移优化系统测试完成！');
    console.log('\n📋 建议操作:');
    console.log('1. 如果 migrations 表不存在，先运行迁移优化系统');
    console.log('2. 使用合并迁移文件减少执行次数');
    console.log('3. 利用 migration_status 视图跟踪迁移状态');
    console.log('4. 所有新迁移都应使用事务包装和智能检查');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log(`
迁移优化系统测试脚本

用法:
  node test-migration-optimization.mjs

环境变量:
  SUPABASE_URL              Supabase项目URL
  SUPABASE_SERVICE_ROLE_KEY Supabase服务角色密钥

功能:
  1. 检查 migrations 表是否存在
  2. 测试智能检查函数
  3. 测试 migration_status 视图
  4. 检查市场数据表
  5. 验证事务支持
  6. 统计智能检查语法使用情况

示例:
  SUPABASE_URL=https://xxx.supabase.co \\
  SUPABASE_SERVICE_ROLE_KEY=eyxxx \\
  node test-migration-optimization.mjs
  `);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  await testMigrationOptimization();
}

// 运行主函数
main().catch(error => {
  console.error('❌ 脚本执行失败:', error.message);
  process.exit(1);
});