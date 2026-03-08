/**
 * P2优化功能服务
 * 提供数据缓存、批量操作、智能推荐、性能监控等功能
 */

import { supabase } from '@/lib/supabase';

// ==================== 数据缓存服务 ====================

export interface CacheOptions {
  ttl?: number; // 缓存时间（秒）
  forceRefresh?: boolean;
}

export const cacheService = {
  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<T | null> {
    const { data, error } = await supabase
      .from('market_data_cache')
      .select('data')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    return data.data as T;
  },

  /**
   * 设置缓存数据
   */
  async set(key: string, value: any, ttl: number = 600): Promise<void> {
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    await supabase.from('market_data_cache').upsert({
      cache_key: key,
      symbol: key.split(':')[0] || 'UNKNOWN',
      market: key.split(':')[1] || 'CN',
      data: value,
      expires_at: expiresAt.toISOString(),
    });
  },

  /**
   * 清除缓存
   */
  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      await supabase.from('market_data_cache').delete().like('cache_key', `${pattern}%`);
    } else {
      await supabase.rpc('cleanup_expired_cache');
    }
  },
};

// ==================== 批量操作服务 ====================

export interface BatchOrder {
  symbol: string;
  trade_type: string;
  direction: 'BUY' | 'SELL';
  quantity: number;
  price: number;
}

export const batchService = {
  /**
   * 创建批量订单
   */
  async createBatchOrders(
    userId: string,
    batchType: 'IPO_BATCH' | 'CANCEL_BATCH' | 'GRID_BATCH',
    orders: BatchOrder[]
  ) {
    const { data, error } = await supabase
      .from('batch_trade_orders')
      .insert({
        user_id: userId,
        batch_type: batchType,
        orders,
        total_count: orders.length,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 执行批量订单
   */
  async processBatchOrders(batchId: string, userId: string) {
    const { data, error } = await supabase.rpc('process_batch_orders', {
      p_batch_id: batchId,
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  },

  /**
   * 查询批量订单状态
   */
  async getBatchOrderStatus(batchId: string) {
    const { data, error } = await supabase
      .from('batch_trade_orders')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) throw error;
    return data;
  },
};

// ==================== 智能推荐服务 ====================

export const recommendationService = {
  /**
   * 获取用户推荐
   */
  async getRecommendations(userId: string) {
    const { data, error } = await supabase.rpc('generate_recommendations', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data?.recommendations || [];
  },

  /**
   * 记录用户行为（用于改进推荐）
   */
  async logUserBehavior(
    userId: string,
    actionType: string,
    actionTarget?: string,
    metadata?: any
  ) {
    await supabase.from('user_behavior_logs').insert({
      user_id: userId,
      action_type: actionType,
      action_target: actionTarget,
      metadata,
    });
  },
};

// ==================== 性能监控服务 ====================

export const performanceService = {
  /**
   * 记录性能指标
   */
  async recordMetric(
    metricType: string,
    metricName: string,
    value: number,
    metadata?: any
  ) {
    await supabase.rpc('record_performance_metric', {
      p_metric_type: metricType,
      p_metric_name: metricName,
      p_value: value,
      p_metadata: metadata || {},
    });
  },

  /**
   * 获取性能统计
   */
  async getMetrics(metricType: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 3600 * 1000);
    
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('metric_type', metricType)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
};

// ==================== 交易热度服务 ====================

export const hotStocksService = {
  /**
   * 获取热门股票
   */
  async getHotStocks(limit: number = 20) {
    const { data, error } = await supabase
      .from('trading_hotness')
      .select('*')
      .order('trade_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },
};

// ==================== 装饰器：自动缓存 ====================

export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = 600
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = keyGenerator(...args);
    
    // 尝试从缓存获取
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    // 执行原函数
    const result = await fn(...args);

    // 存入缓存
    await cacheService.set(cacheKey, result, ttl);

    return result;
  }) as T;
}
