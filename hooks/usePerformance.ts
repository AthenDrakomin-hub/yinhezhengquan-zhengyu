import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * 分页查询Hook
 */
export function usePagination<T>(
  tableName: string,
  options: {
    pageSize?: number;
    orderBy?: string;
    ascending?: boolean;
    filters?: Record<string, any>;
  } = {}
) {
  const { pageSize = 20, orderBy = 'created_at', ascending = false, filters = {} } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (page: number) => {
    setLoading(true);
    try {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .order(orderBy, { ascending })
        .range((page - 1) * pageSize, page * pageSize - 1);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });

      const { data: result, error, count } = await query;

      if (error) throw error;

      setData(result || []);
      setTotalCount(count || 0);
      setHasMore(page * pageSize < (count || 0));
      setCurrentPage(page);
    } catch (error) {
      console.error('分页查询失败:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tableName, pageSize, orderBy, ascending, JSON.stringify(filters)]);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  return {
    data,
    loading,
    currentPage,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    hasMore,
    nextPage: () => hasMore && loadPage(currentPage + 1),
    prevPage: () => currentPage > 1 && loadPage(currentPage - 1),
    goToPage: loadPage,
    refresh: () => loadPage(currentPage)
  };
}

/**
 * 性能监控服务
 */
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  record(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const samples = this.metrics.get(name)!;
    samples.push(duration);
    if (samples.length > 100) samples.shift();
    if (duration > 3000) console.warn(`性能警告: ${name} 耗时 ${duration}ms`);
  }

  getStats(name: string) {
    const samples = this.metrics.get(name);
    if (!samples?.length) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    return {
      avg: Math.round(samples.reduce((a, b) => a + b) / samples.length),
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)])
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function withPerformanceMonitor<T extends (...args: any[]) => Promise<any>>(name: string, fn: T): T {
  return (async (...args: any[]) => {
    const start = performance.now();
    try {
      return await fn(...args);
    } finally {
      performanceMonitor.record(name, performance.now() - start);
    }
  }) as T;
}
