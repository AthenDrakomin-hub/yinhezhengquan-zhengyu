import fetch from 'node-fetch';

const SUPABASE_URL = 'https://kvlvbhzrrpspzaoiormt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bHZiaHpycnBzcHphb2lvcm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzQxNTcsImV4cCI6MjA4ODM1MDE1N30.g3uAEFueTC1jlESmcmxECdhRFvubDNf0l4n_gf_SSVU';

async function test() {
  // 尝试通过不同的方式触发 schema cache 刷新
  
  // 方法1: 发送 NOTIFY 请求
  console.log('=== 尝试触发 schema cache 刷新 ===');
  
  // 方法2: 使用 REST API 的 reload_schema rpc
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reload_schema`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  console.log('reload_schema 状态:', res.status);
  const text = await res.text();
  console.log('响应:', text);
  
  // 方法3: 尝试使用 Notify API
  const notifyRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'tx=rollback',
    },
    body: JSON.stringify({
      query: 'NOTIFY pgrst, \'reload schema\''
    }),
  });
  
  console.log('Notify 状态:', notifyRes.status);
}

test();
