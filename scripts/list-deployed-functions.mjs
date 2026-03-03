import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 尝试从项目根目录加载 .env
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function listDeployedFunctions() {
  console.log('🔍 查询 Supabase 上已部署的 Edge Functions...\n');

  try {
    // 尝试通过Management API查询
    const projectRef = 'rfnrosyfeivcbkimjlwo';
    const url = `https://api.supabase.com/v1/projects/${projectRef}/functions`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ Management API 查询失败，尝试直接测试函数端点...\n');
      await testFunctionEndpoints();
      return;
    }

    const functions = await response.json();
    
    if (functions.length === 0) {
      console.log('📭 Supabase 上没有已部署的 Edge Functions\n');
    } else {
      console.log(`找到 ${functions.length} 个已部署的函数:\n`);
      functions.forEach((func, index) => {
        console.log(`${index + 1}. ${func.name}`);
        console.log(`   ID: ${func.id}`);
        console.log(`   状态: ${func.status}`);
        console.log(`   版本: ${func.version || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    console.log('\n尝试直接测试函数端点...\n');
    await testFunctionEndpoints();
  }
}

async function testFunctionEndpoints() {
  const possibleFunctions = [
    // 当前项目结构
    'admin-admin-operations',
    'market-fetch-galaxy-news',
    'market-fetch-stock-f10',
    'market-get-market-data',
    'sync-nexus-sync',
    'trade-approve-trade-order',
    'trade-cancel-trade-order',
    'trade-create-trade-order',
    'trade-match-trade-order',
    // 可能的旧命名（无前缀）
    'admin-operations',
    'fetch-galaxy-news',
    'fetch-stock-f10',
    'get-market-data',
    'nexus-sync',
    'approve-trade-order',
    'cancel-trade-order',
    'create-trade-order',
    'match-trade-order',
    // 其他可能的变体
    'admin',
    'trade',
    'market',
    'sync',
    'hello-world',
    'test'
  ];

  console.log('测试所有可能存在的函数端点:\n');
  const deployed = [];

  for (const funcName of possibleFunctions) {
    const url = `${SUPABASE_URL}/functions/v1/${funcName}`;
    
    try {
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (response.status !== 404) {
        deployed.push(funcName);
        console.log(`✅ ${funcName} (状态码: ${response.status})`);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  if (deployed.length === 0) {
    console.log('\n❌ 没有找到任何已部署的函数');
  } else {
    console.log(`\n找到 ${deployed.length} 个已部署的函数:`);
    deployed.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });
  }
}

listDeployedFunctions();
