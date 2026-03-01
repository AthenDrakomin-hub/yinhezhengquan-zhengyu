/**
 * 存储清理工具
 * 用于清理过期的Supabase认证token和本地存储数据
 */

/**
 * 清理过期的Supabase认证token
 */
export const cleanExpiredAuthTokens = (): void => {
  try {
    const supabaseAuthKeys = ['supabase.auth.token', 'sb-*', 'supabase.auth.*'];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const isSupabaseAuthKey = supabaseAuthKeys.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(key);
        }
        return key === pattern;
      });

      if (isSupabaseAuthKey) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const data = JSON.parse(item);
            if (data.expires_at && data.expires_at < Date.now() / 1000) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;

      if (key.startsWith('supabase.auth.') || key.startsWith('sb-')) {
        try {
          const item = sessionStorage.getItem(key);
          if (item) {
            const data = JSON.parse(item);
            if (data.expires_at && data.expires_at < Date.now() / 1000) {
              sessionStorage.removeItem(key);
            }
          }
        } catch {
          sessionStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error('存储清理失败:', error);
  }
};

/**
 * 清理所有Supabase认证数据
 */
export const cleanAllAuthData = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('supabase.auth.') || key.startsWith('sb-'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('supabase.auth.') || key.startsWith('sb-'))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('清理认证数据失败:', error);
  }
};

/**
 * 应用启动时调用，清理过期数据
 */
export const initializeStorageCleanup = (): void => {
  if (typeof window === 'undefined') return;
  cleanExpiredAuthTokens();
};

export default {
  cleanExpiredAuthTokens,
  cleanAllAuthData,
  initializeStorageCleanup
};
