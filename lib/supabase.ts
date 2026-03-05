import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 1. 兼容 Vite 环境变量类型
interface ImportMetaEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 2. 安全读取环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 3. 开发环境调试日志
if (import.meta.env.DEV) {
  console.log('🔍 Supabase 配置检查:');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '已设置' : '未设置');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '已设置' : '未设置');
}

// 4. 强制校验环境变量
if (!supabaseUrl) {
  throw new Error('⚠️ VITE_SUPABASE_URL 环境变量未配置，请检查 .env 文件');
}
if (!supabaseAnonKey) {
  throw new Error('⚠️ VITE_SUPABASE_ANON_KEY 环境变量未配置，请检查 .env 文件');
}

// 5. 初始化 Supabase 客户端（禁用自动初始化，添加手动初始化支持）
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // 所有环境都持久化会话
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// 6. 手动初始化认证会话（已移除 initialize: false，此函数可选）
export const manualInitAuth = async (): Promise<void> => {
  try {
    const { data } = await supabase.auth.getSession();
    if (import.meta.env.DEV) {
      console.log('🔐 会话检查完成:', data.session ? '已登录' : '未登录');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('会话检查失败:', error);
    }
  }
};

// 7. 带会话检查的登录函数
export const loginWithPassword = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// 6. Profile 类型定义（TS 友好）
export interface Profile {
  id: string;
  role: 'admin' | 'user' | 'guest';
  [key: string]: any; // 兼容其他自定义字段
}

// 7. 统一的权限校验函数
/**
 * 检查用户是否为管理员
 * 逻辑统一：只要是 super_admin 或 admin 级别即视为管理员
 * @param profile 用户资料对象
 * @returns 是否为管理员
 */
export const checkIsAdmin = (profile: any): boolean => {
  if (!profile) return false;
  return profile.admin_level === 'super_admin' || profile.admin_level === 'admin';
};

/**
 * 检查用户是否为超级管理员
 * @param profile 用户资料对象
 * @returns 是否为超级管理员
 */
export const checkIsSuperAdmin = (profile: any): boolean => {
  if (!profile) return false;
  return profile.admin_level === 'super_admin';
};

// 8. 获取当前用户 Profile（保留原有健壮逻辑）
export const getCurrentProfile = async (): Promise<Profile | null> => {
  try {
    const authResponse = await supabase.auth.getUser();
    if (authResponse.error || !authResponse.data.user) {
      if (import.meta.env.DEV) {
        console.error('获取用户信息失败:', authResponse.error?.message || '未登录');
      }
      return null;
    }

    const user = authResponse.data.user;
    const profileResponse = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileResponse.error) {
      if (import.meta.env.DEV) {
        console.error('获取 Profile 失败:', profileResponse.error.message);
      }
      return null;
    }

    return profileResponse.data as Profile;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('获取 Profile 异常:', (err as Error).message);
    }
    return null;
  }
};

// 8. 检查是否为管理员（基于profiles表的admin_level字段）
export const isAdmin = async (): Promise<boolean> => {
  try {
    const profile = await getCurrentProfile();
    // 使用统一的权限校验函数
    return checkIsAdmin(profile);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('检查管理员权限异常:', (err as Error).message);
    }
    return false;
  }
};

// 9. 检查是否为管理员用户（兼容旧逻辑，现在统一使用profiles表）
export const isAdminUser = async (): Promise<boolean> => {
  try {
    // 直接使用isAdmin函数，统一逻辑
    return await isAdmin();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('检查管理员用户异常:', (err as Error).message);
    }
    return false;
  }
};

// 10. 使用Edge Function验证管理员权限
export const verifyAdminWithEdgeFunction = async (accessToken: string): Promise<{ ok: boolean; admin: boolean; error?: string; status?: number }> => {
  try {
    // 从环境变量读取Edge Function URL，避免硬编码
    const functionUrl = import.meta.env.VITE_SUPABASE_FUNCTION_URL || 
                       `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-verify`;
    
    if (!functionUrl) {
      throw new Error('Edge Function URL未配置，请设置VITE_SUPABASE_FUNCTION_URL环境变量');
    }

    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`Edge Function调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      ...data,
      status: response.status
    };
  } catch (error: any) {
    console.error('调用 admin-verify 函数失败:', error);
    return {
      ok: false,
      admin: false,
      error: error.message || 'function_call_failed',
      status: 500
    };
  }
};

// 11. 演示环境标识（统一判断逻辑）
// 检查是否为演示模式：URL包含placeholder或不包含有效的supabase域名
export const isDemoMode = supabaseUrl.includes('placeholder') || !supabaseUrl.includes('supabase.co');

// 12. 兜底导出
export default supabase;