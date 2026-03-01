import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 1. 兼容 Vite 环境变量类型（避免 TS 报错）
interface ImportMetaEnv {
  VITE_SUPABASE_URL?: string;
  VITE_PUBLIC_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 2. 安全读取环境变量（移除兜底占位符，强制校验）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// 3. 开发环境调试日志（避免生产环境泄露）
if (import.meta.env.DEV) {
  console.log('🔍 Supabase 配置检查:');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '已设置' : '未设置');
  console.log('VITE_PUBLIC_SUPABASE_ANON_KEY:', import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ? '已设置' : '未设置');
  console.log('supabaseUrl:', supabaseUrl);
  console.log('supabaseAnonKey:', supabaseAnonKey ? '已设置' : '未设置');
}

// 4. 强制校验环境变量（提前报错，避免隐性失败）
if (!supabaseUrl) {
  throw new Error('⚠️ VITE_SUPABASE_URL 环境变量未配置，请检查 .env 文件');
}
if (!supabaseAnonKey) {
  throw new Error('⚠️ VITE_PUBLIC_SUPABASE_ANON_KEY 环境变量未配置，请检查 .env 文件');
}

// 5. 初始化 Supabase 客户端（禁用自动初始化，添加手动初始化支持）
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: import.meta.env.DEV ? false : true, // 开发环境不持久化会话
    autoRefreshToken: true,
    detectSessionInUrl: false, // 开发环境关闭URL解析，避免会话混乱
    initialize: false, // 禁用自动初始化，避免未登录时触发会话检测
  },
  // 移除自定义 fetch，使用 Supabase 原生请求逻辑（核心修复）
  // global: { ... }  注释掉，恢复默认
});

// 6. 手动初始化认证会话
export const manualInitAuth = async (): Promise<void> => {
  try {
    await supabase.auth.initialize();
    if (import.meta.env.DEV) {
      console.log('🔐 手动初始化认证会话完成');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('手动初始化认证会话失败:', error);
    }
    throw error;
  }
};

// 7. 带手动初始化的登录函数
export const loginWithPassword = async (email: string, password: string) => {
  try {
    // 先手动初始化认证
    await manualInitAuth();
    
    // 执行登录
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

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

// 7. 获取当前用户 Profile（保留原有健壮逻辑）
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

// 8. 检查是否为管理员（保留原有逻辑）
export const isAdmin = async (): Promise<boolean> => {
  try {
    const profile = await getCurrentProfile();
    return profile?.role === 'admin';
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('检查管理员权限异常:', (err as Error).message);
    }
    return false;
  }
};

// 9. 演示环境标识（统一判断逻辑）
// 检查是否为演示模式：URL包含placeholder或不包含有效的supabase域名
export const isDemoMode = supabaseUrl.includes('placeholder') || !supabaseUrl.includes('supabase.co');

// 10. 兜底导出
export default supabase;