import { supabase } from './supabase';

/**
 * 带认证的 fetch 封装 - 自动附加最新的 access_token
 * @param url 请求 URL
 * @param opts fetch 选项
 * @returns Promise<Response>
 */
export async function fetchWithSupabaseToken(
  url: string, 
  opts: RequestInit = {}
): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  
  if (!token) {
    throw new Error('No active session token');
  }
  
  opts.headers = {
    ...(opts.headers || {}),
    'Authorization': `Bearer ${token}`,
  };
  
  return fetch(url, opts);
}

/**
 * Edge Function 验证管理员权限（推荐方式）
 * @param accessToken - access token
 * @returns 验证结果
 */
export async function verifyAdminWithEdgeFunction(
  accessToken: string
): Promise<{
  ok: boolean;
  status: number;
  admin: boolean;
  error: string | null;
  raw?: any;
}> {
  try {
    // 从环境变量读取 Edge Function URL
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-verify`;
    
    const res = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    const json = await res.json().catch(() => ({}));
    
    return {
      ok: res.ok,
      status: res.status,
      admin: json?.admin === true,
      error: json?.error || null,
      raw: json
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      admin: false,
      error: err.message || 'fetch error'
    };
  }
}
