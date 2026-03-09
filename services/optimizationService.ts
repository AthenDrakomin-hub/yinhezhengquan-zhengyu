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
   * 获取用户推荐 - 从 user_recommendations 表查询
   */
  async getRecommendations(userId: string) {
    try {
      // 直接从 user_recommendations 表查询
      const { data, error } = await supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('score', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('获取推荐失败:', error.message);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(item => ({
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        reason: item.reason || '基于您的交易偏好推荐',
        score: item.score || 0.5,
        recommendation_type: item.recommendation_type,
      }));
    } catch (error) {
      console.error('获取推荐失败:', error);
      return [];
    }
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
    try {
      // 尝试记录到 user_behavior_logs 表，如果不存在则忽略
      const { error } = await supabase.from('user_behavior_logs').insert({
        user_id: userId,
        action_type: actionType,
        action_target: actionTarget,
        metadata,
      });
      
      if (error) {
        // 表不存在时静默失败
        console.warn('记录用户行为失败:', error.message);
      }
    } catch (error) {
      // 静默处理
    }
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
   * 获取热门股票 - 从 trades 表聚合计算
   */
  async getHotStocks(limit: number = 20) {
    try {
      // 由于 trading_hotness 表不存在，从 trades 表聚合计算
      // 获取最近24小时的交易数据
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('trades')
        .select('symbol, name, stock_code, stock_name, price, quantity, user_id')
        .gte('created_at', yesterday);

      if (error) {
        console.warn('获取交易数据失败:', error.message);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // 定义交易数据类型
      interface TradeData {
        symbol?: string;
        name?: string;
        stock_code?: string;
        stock_name?: string;
        price?: number;
        quantity?: number;
        user_id?: string;
      }

      // 聚合计算交易热度
      const hotnessMap = new Map<string, {
        symbol: string;
        name: string;
        trade_count: number;
        total_volume: number;
        unique_traders: Set<string>;
        total_amount: number;
      }>();

      for (const trade of data as TradeData[]) {
        const symbol = trade.symbol || trade.stock_code || '';
        if (!symbol) continue;

        const existing = hotnessMap.get(symbol);
        if (existing) {
          existing.trade_count += 1;
          existing.total_volume += trade.quantity || 0;
          existing.total_amount += (trade.price || 0) * (trade.quantity || 0);
          if (trade.user_id) existing.unique_traders.add(trade.user_id);
        } else {
          hotnessMap.set(symbol, {
            symbol,
            name: trade.name || trade.stock_name || symbol,
            trade_count: 1,
            total_volume: trade.quantity || 0,
            unique_traders: trade.user_id ? new Set([trade.user_id]) : new Set(),
            total_amount: (trade.price || 0) * (trade.quantity || 0),
          });
        }
      }

      // 转换为数组并排序
      const result = Array.from(hotnessMap.values())
        .map(item => ({
          symbol: item.symbol,
          name: item.name,
          trade_count: item.trade_count,
          total_volume: item.total_volume,
          unique_traders: item.unique_traders.size,
          avg_price: item.total_volume > 0 ? item.total_amount / item.total_volume : 0,
        }))
        .sort((a, b) => b.trade_count - a.trade_count)
        .slice(0, limit);

      return result;
    } catch (error) {
      console.error('计算热门股票失败:', error);
      return [];
    }
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
