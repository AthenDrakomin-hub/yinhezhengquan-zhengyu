// hooks/useAdminGuard.ts
// 管理员IP验证守卫hook

import { supabase } from '@/lib/supabase';

// 定义缓存键名和有效时长（1小时）
const IP_AUTH_CACHE_KEY = 'admin_ip_verified_at';
const CACHE_DURATION = 60 * 60 * 1000; // 1小时

export const useAdminGuard = () => {
  const checkIP = async () => {
    // 1. 开发环境豁免（带警告）
    if (import.meta.env.DEV) {
      console.warn("⚠️ 开发环境：已跳过IP验证，生产环境将强制执行");
      return { allowed: true, ip: '127.0.0.1', devMode: true };
    }

    // 2. 检查 1 小时缓存
    const lastVerified = localStorage.getItem(IP_AUTH_CACHE_KEY);
    const now = Date.now();
    
      if (lastVerified && now - parseInt(lastVerified) < CACHE_DURATION) {
        console.log("🚀 IP 验证仍有效 (1h内)，跳过网络请求");
        return { allowed: true, ip: 'cached' };
      }

    console.log("[AdminLogin] 开始 IP 验证...");
    
    // 重试配置
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s
    
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 3. 设置超时保护（5秒）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // 4. 调用Edge Function验证IP
        const { data, error } = await supabase.functions.invoke('admin-verify', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error(`Edge Function调用失败 (尝试 ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
          lastError = error;
          
          // 如果是网络错误且还有重试机会，则等待后重试
          if (attempt < MAX_RETRIES && (
            error.message?.includes('network') || 
            error.message?.includes('timeout') ||
            error.message?.includes('fetch')
          )) {
            console.log(`等待 ${RETRY_DELAYS[attempt]}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
            continue;
          }
          
          // 重试次数用完或不是网络错误，返回失败
          return { 
            allowed: false, 
            ip: 'unknown',
            message: "IP验证服务不可用，请检查网络连接或联系管理员。" 
          };
        }
        
        if (!data?.allowed) {
          // IP被明确拒绝，不重试
          return { 
            allowed: false, 
            message: data?.message || "您的IP地址不在白名单内，无法访问管理后台。" 
          };
        }
        
        // 验证通过，记录当前时间戳
        localStorage.setItem(IP_AUTH_CACHE_KEY, now.toString());
        return { allowed: true, ip: data.ip };
        
      } catch (err: any) {
        console.error(`IP验证异常 (尝试 ${attempt + 1}/${MAX_RETRIES + 1}):`, err);
        lastError = err;
        
        // 如果是网络相关异常且还有重试机会，则等待后重试
        if (attempt < MAX_RETRIES && (
          err.name === 'AbortError' || 
          err.message?.includes('network') ||
          err.message?.includes('fetch')
        )) {
          console.log(`等待 ${RETRY_DELAYS[attempt]}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }
        
        // 重试次数用完或不是网络错误，返回失败
        const errorMessage = err.name === 'AbortError' 
          ? "IP验证请求超时，请检查网络连接。"
          : "IP验证服务异常，请稍后重试或联系管理员。";
        
        return { 
          allowed: false, 
          ip: 'unknown',
          message: errorMessage
        };
      }
    }
    
    // 所有重试都失败
    console.error('所有重试尝试均失败:', lastError);
    return { 
      allowed: false, 
      ip: 'unknown',
      message: "IP验证服务暂时不可用，请稍后重试。" 
    };
  };

  return { checkIP };
};