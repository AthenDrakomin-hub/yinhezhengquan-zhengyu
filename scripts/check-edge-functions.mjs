import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// 本地定义的Edge Functions（扁平化后的实际名称）
const LOCAL_FUNCTIONS = [
  'admin-operations',
  'fetch-galaxy-news',
  'fetch-stock-f10',
  'get-market-data',
  'nexus-sync',
  'approve-trade-order',
  'cancel-trade-order',
  'create-trade-order',
  'match-trade-order'
];

async function checkEdgeFunctions() {
  console.log('🔍 检查 Edge Functions 部署状态...\n');
  console.log(`Supabase URL: ${SUPABASE_URL}\n`);

  const results = [];

  for (const func of LOCAL_FUNCTIONS) {
    const funcName = func.replace('/', '-');
    const url = `${SUPABASE_URL}/functions/v1/${funcName}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      });

      const status = response.status;
      const statusText = response.statusText;
      
      let result = {
        name: func,
        deployed: false,
        status: status,
        message: ''
      };

      if (status === 404) {
        result.message = '❌ 未部署';
      } else if (status === 401 || status === 403) {
        result.deployed = true;
        result.message = '✅ 已部署 (需要认证)';
      } else if (status === 400 || status === 500) {
        result.deployed = true;
        result.message = '✅ 已部署 (参数错误/服务器错误)';
      } else if (status === 200) {
        result.deployed = true;
        result.message = '✅ 已部署且正常响应';
      } else {
        result.deployed = true;
        result.message = `⚠️ 已部署 (状态码: ${status})`;
      }

      results.push(result);
      console.log(`${result.message.padEnd(40)} ${func}`);

    } catch (error) {
      results.push({
        name: func,
        deployed: false,
        status: 0,
        message: '❌ 连接失败'
      });
      console.log(`❌ 连接失败                              ${func}`);
    }
  }

  // 统计
  console.log('\n' + '='.repeat(80));
  const deployed = results.filter(r => r.deployed).length;
  const total = results.length;
  console.log(`\n📊 部署统计: ${deployed}/${total} 个函数已部署`);

  if (deployed < total) {
    console.log('\n⚠️ 未部署的函数:');
    results.filter(r => !r.deployed).forEach(r => {
      console.log(`   • ${r.name}`);
    });

    console.log('\n💡 部署命令:');
    results.filter(r => !r.deployed).forEach(r => {
      const funcName = r.name.replace('/', '-');
      console.log(`   supabase functions deploy ${funcName} --project-ref rfnrosyfeivcbkimjlwo`);
    });
  } else {
    console.log('\n✅ 所有 Edge Functions 已部署!');
  }

  console.log('\n' + '='.repeat(80));
}

checkEdgeFunctions();
