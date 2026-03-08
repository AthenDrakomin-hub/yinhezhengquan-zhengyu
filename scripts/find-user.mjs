import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data: { users }, error } = await supabase.auth.admin.listUsers();

console.log('📋 所有Auth用户:\n');
users.forEach(u => {
  console.log('邮箱:', u.email);
  console.log('ID:', u.id);
  console.log('---');
});
