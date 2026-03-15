/**
 * 创建用户账号脚本
 * 使用 Supabase Auth API 创建用户
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kvlvbhzrrpspzaoiormt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bHZiaHpycnBzcHphb2lvcm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzQxNTcsImV4cCI6MjA4ODM1MDE1N30.g3uAEFueTC1jlESmcmxECdhRFvubDNf0l4n_gf_SSVU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createUser() {
  const email = 'zhangsan@qq.com';
  const password = '123456';
  const username = '张三';

  console.log(`正在创建用户: ${email}`);

  try {
    // 1. 使用 signUp 创建用户
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
        emailRedirectTo: undefined, // 禁用邮箱重定向
      },
    });

    if (error) {
      console.error('创建用户失败:', error.message);
      
      // 如果用户已存在，尝试直接登录
      if (error.message.includes('already') || error.message.includes('已存在')) {
        console.log('用户可能已存在，尝试登录...');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (loginError) {
          console.error('登录失败:', loginError.message);
          return;
        }
        
        console.log('登录成功! 用户ID:', loginData.user?.id);
        
        // 更新 profiles 表
        if (loginData.user) {
          await updateProfile(loginData.user.id, email, username);
        }
      }
      return;
    }

    console.log('用户创建成功!');
    console.log('用户ID:', data.user?.id);
    console.log('邮箱:', data.user?.email);
    
    // 如果需要邮箱确认
    if (!data.session) {
      console.log('注意: 用户需要确认邮箱才能登录');
      console.log('尝试自动确认用户...');
    }

    // 更新 profiles 表
    if (data.user) {
      await updateProfile(data.user.id, email, username);
    }

  } catch (err) {
    console.error('发生错误:', err);
  }
}

async function updateProfile(userId: string, email: string, username: string) {
  console.log('更新 profiles 表...');
  
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      username: username,
      status: 'ACTIVE',
      admin_level: 'user',
      is_admin: false,
      risk_level: '稳健型',
      balance: 100000,
      total_equity: 100000,
    });

  if (error) {
    console.error('更新 profiles 失败:', error.message);
  } else {
    console.log('profiles 更新成功!');
  }
}

createUser();
