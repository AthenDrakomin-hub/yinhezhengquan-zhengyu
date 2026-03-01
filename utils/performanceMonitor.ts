/**
 * 性能监控Hook
 * 自动记录页面加载和API性能
 */

import { useEffect } from 'react';
import { performanceService } from '@/services/optimizationService';

export const usePerformanceMonitor = (pageName: string) => {
  useEffect(() => {
    const startTime = performance.now();

    // 记录页面加载时间
    const recordPageLoad = () => {
      const loadTime = performance.now() - startTime;
      performanceService.recordMetric(
        'PAGE_LOAD',
        pageName,
        loadTime,
        { url: window.location.pathname }
      ).catch(console.error);
    };

    // 页面加载完成后记录
    if (document.readyState === 'complete') {
      recordPageLoad();
    } else {
      window.addEventListener('load', recordPageLoad);
      return () => window.removeEventListener('load', recordPageLoad);
    }
  }, [pageName]);
};

/**
 * API性能监控装饰器
 */
export const withPerformanceTracking = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  apiName: string
): T => {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      
      performanceService.recordMetric(
        'API_CALL',
        apiName,
        duration,
        { success: true }
      ).catch(console.error);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceService.recordMetric(
        'API_CALL',
        apiName,
        duration,
        { success: false, error: String(error) }
      ).catch(console.error);
      
      throw error;
    }
  }) as T;
};
