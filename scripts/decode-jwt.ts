import fetch from 'node-fetch';

const SUPABASE_URL = 'https://kvlvbhzrrpspzaoiormt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bHZiaHpycnBzcHphb2lvcm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzQxNTcsImV4cCI6MjA4ODM1MDE1N30.g3uAEFueTC1jlESmcmxECdhRFvubDNf0l4n_gf_SSVU';

function decodeJWT(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const payload = Buffer.from(parts[1], 'base64').toString('utf8');
  return JSON.parse(payload);
}

async function test() {
  console.log('=== JWT 解码测试 ===');
  
  // 登录获取 token
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'zhangsan@qq.com',
      password: '123456',
    }),
  });
  
  const loginData = await loginRes.json();
  
  if (!loginData.access_token) {
    console.error('登录失败:', loginData);
    return;
  }
  
  // 解码 access token
  console.log('\n--- Access Token Payload ---');
  const accessPayload = decodeJWT(loginData.access_token);
  console.log(JSON.stringify(accessPayload, null, 2));
  
  // 解码 anon key
  console.log('\n--- Anon Key Payload ---');
  const anonPayload = decodeJWT(SUPABASE_ANON_KEY);
  console.log(JSON.stringify(anonPayload, null, 2));
}

test();
