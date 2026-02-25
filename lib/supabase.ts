
import { createClient } from '@supabase/supabase-js';

// 从环境变量读取，优先使用 Vite 规范的 import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * 证裕交易单元核心客户端
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 增加锁超时时间，避免多标签页竞争
    lockTimeout: 20000, // 20秒
  },
});

/**
 * 获取当前用户 Profile
 */
export const getCurrentProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('获取 Profile 失败:', error);
    return null;
  }
  return data;
};

/**
 * 检查是否为管理员
 */
export const isAdmin = async () => {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin';
};

// 导出判断是否为演示环境的标志
export const isDemoMode = supabaseUrl.includes('placeholder') || !supabaseUrl;
