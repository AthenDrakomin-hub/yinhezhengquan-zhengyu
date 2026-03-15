import fetch from 'node-fetch';

const SUPABASE_URL = 'https://kvlvbhzrrpspzaoiormt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bHZiaHpycnBzcHphb2lvcm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzQxNTcsImV4cCI6MjA4ODM1MDE1N30.g3uAEFueTC1jlESmcmxECdhRFvubDNf0l4n_gf_SSVU';

const functions = [
  'api',
  'auth-login',
  'get-profile',
  'admin-operations',
  'admin-verify',
  'clear-cache',
  'crawler',
  'data-reports',

  'campaign'
];

async function test() {
  for (const fn of functions) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    console.log(`${fn}: ${res.status}`);
  }
}

test();
