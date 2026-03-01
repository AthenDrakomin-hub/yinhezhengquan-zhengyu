import { supabase } from '../lib/supabase';
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 会话监控服务
 */
class SessionMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 1分钟检查一次
  private readonly WARNING_THRESHOLD = 300000; // 5分钟前警告
  private onExpireCallback: (() => void) | null = null;
  private onWarningCallback: ((remaining: number) => void) | null = null;

  start() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkSession();
    }, this.CHECK_INTERVAL);

    // 立即检查一次
    this.checkSession();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      // 如果没有session但也没有错误，说明用户未登录，不需要处理
      if (!session && !error) {
        return;
      }

      if (error) {
        console.error('获取会话失败:', error);
        return;
      }

      // 检查过期时间
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        this.handleExpired();
      } else if (remaining <= this.WARNING_THRESHOLD) {
        this.handleWarning(remaining);
      }
    } catch (error) {
      console.error('会话检查失败:', error);
    }
  }

  private handleExpired() {
    console.log('会话已过期，自动登出');
    this.stop();
    if (this.onExpireCallback) {
      this.onExpireCallback();
    }
  }

  private handleWarning(remaining: number) {
    console.log(`会话即将过期，剩余 ${Math.floor(remaining / 1000)} 秒`);
    if (this.onWarningCallback) {
      this.onWarningCallback(remaining);
    }
  }

  onExpire(callback: () => void) {
    this.onExpireCallback = callback;
  }

  onWarning(callback: (remaining: number) => void) {
    this.onWarningCallback = callback;
  }

  /**
   * 刷新会话
   */
  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      console.log('会话已刷新');
      return data.session;
    } catch (error) {
      console.error('刷新会话失败:', error);
      throw error;
    }
  }
}

export const sessionMonitor = new SessionMonitor();

/**
 * 会话监控Hook
 */
export function useSessionMonitor() {
  const navigate = useNavigate();

  useEffect(() => {
    // 会话过期处理
    sessionMonitor.onExpire(() => {
      alert('登录已过期，请重新登录');
      supabase.auth.signOut();
      navigate('/login', { replace: true });
    });

    // 会话即将过期警告
    sessionMonitor.onWarning((remaining) => {
      const minutes = Math.floor(remaining / 60000);
      if (minutes <= 1) {
        const shouldRefresh = confirm(`登录即将过期（剩余${minutes}分钟），是否继续？`);
        if (shouldRefresh) {
          sessionMonitor.refreshSession().catch(() => {
            alert('刷新会话失败，请重新登录');
            navigate('/login', { replace: true });
          });
        }
      }
    });

    sessionMonitor.start();

    return () => {
      sessionMonitor.stop();
    };
  }, [navigate]);
}

/**
 * 自动重试Hook
 */
export function useAutoRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onError?: (error: any, retryCount: number) => void;
  } = {}
) {
  const { maxRetries = 3, retryDelay = 1000, onError } = options;

  const executeWithRetry = useCallback(async (): Promise<T> => {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (onError) {
          onError(error, i + 1);
        }

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }

    throw lastError;
  }, [fn, maxRetries, retryDelay, onError]);

  return executeWithRetry;
}
