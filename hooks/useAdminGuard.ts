// hooks/useAdminGuard.ts
// 管理员IP验证守卫hook

import { supabase } from '@/lib/supabase';

// 定义缓存键名和有效时长（24小时）
const IP_AUTH_CACHE_KEY = 'admin_ip_verified_at';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

export const useAdminGuard = () => {
  const checkIP = async () => {
    // 1. 开发环境豁免
    if (import.meta.env.DEV) {
      console.log("🛠️ 开发环境：已自动跳过 IP 验证");
      return { allowed: true, ip: '127.0.0.1' };
    }

    // 2. 检查 24 小时缓存
    const lastVerified = localStorage.getItem(IP_AUTH_CACHE_KEY);
    const now = Date.now();
    
    if (lastVerified && now - parseInt(lastVerified) < CACHE_DURATION) {
      console.log("🚀 IP 验证仍有效 (24h内)，跳过网络请求");
      return { allowed: true, ip: 'cached' };
    }

    console.log("[AdminLogin] 开始 IP 验证...");
    
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
        console.error('Edge Function调用失败:', error);
        // 容错处理：如果API挂了，在管理端开发初期建议先返回true
        console.warn("IP验证API异常，临时放行");
        localStorage.setItem(IP_AUTH_CACHE_KEY, now.toString());
        return { 
          allowed: true, 
          ip: 'fallback',
          message: "网络准入校验失败，但已临时放行。" 
        };
      }
      
      if (!data?.allowed) {
        return { 
          allowed: false, 
          message: data?.message || "您的IP地址不在白名单内，无法访问管理后台。" 
        };
      }
      
      // 5. 验证通过，记录当前时间戳
      localStorage.setItem(IP_AUTH_CACHE_KEY, now.toString());
      return { allowed: true, ip: data.ip };
      
    } catch (err: any) {
      console.error('IP验证异常:', err);
      
      // 6. 容错处理：如果是因为网络问题导致的异常，临时放行
      if (err.name === 'AbortError') {
        console.warn("IP验证请求超时，临时放行");
      } else {
        console.warn("IP验证服务异常，临时放行");
      }
      
      localStorage.setItem(IP_AUTH_CACHE_KEY, now.toString());
      return { 
        allowed: true, 
        ip: 'error_fallback',
        message: "IP验证服务异常，已临时放行。" 
      };
    }
  };

  return { checkIP };
};