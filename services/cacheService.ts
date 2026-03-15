/**
 * 统一缓存管理服务
 * 
 * 缓存架构：
 * ┌─────────────────────────────────────────────────────────┐
 * │  前端 (Browser)                                        │
 * │  ├── 内存缓存 (Map) - 秒级TTL，会话级                   │
 * │  └── localStorage - 持久化配置                          │
 * ├─────────────────────────────────────────────────────────┤
 * │  后端 (Edge Functions)                                 │
 * │  └── Upstash Redis - 持久化缓存，跨会话共享              │
 * ├─────────────────────────────────────────────────────────┤
 * │  数据库 (Supabase)                                     │
 * │  ├── hot_news, community_posts... - 热点数据           │
 * │  └── market_data_cache - 行情缓存                       │
 * └─────────────────────────────────────────────────────────┘
 * 
 * Upstash Redis 免费额度：
 * - 请求：10,000 次/天
 * - 存储：256MB
 * - 建议：控制每日请求 < 5000 次，存储 < 50MB
 */

// ==================== 缓存配置 ====================

export const CACHE_CONFIG = {
  // 前端内存缓存 TTL（毫秒）
  MEMORY_TTL: {
    QUOTE: 5 * 1000,           // 行情：5秒
    KLINE: 30 * 1000,          // K线：30秒
    NEWS: 60 * 1000,           // 新闻：1分钟
    HOTSPOT: 60 * 1000,        // 热点：1分钟
    STOCK_INFO: 5 * 60 * 1000, // 股票信息：5分钟
    USER_DATA: 30 * 1000,      // 用户数据：30秒
  },
  
  // 后端 Redis 缓存 TTL（秒）- 参考 supabase/functions/_shared/cache.ts
  REDIS_TTL: {
    QUOTE: 30,           // 行情：30秒
    BATCH: 30,           // 批量行情：30秒
    KLINE: 300,          // K线：5分钟
    TICKS: 5,            // 成交明细：5秒
    ORDER_BOOK: 5,       // 五档盘口：5秒
    NEWS: 300,           // 新闻：5分钟
    IPO: 3600,           // IPO数据：1小时
    STOCK: 86400,        // 股票信息：24小时
    TRADE_RULES: 600,    // 交易规则：10分钟
    USER_PROFILE: 300,   // 用户档案：5分钟
  },
  
  // 数据库缓存 TTL（秒）
  DB_TTL: {
    QUOTE: 30,           // 行情：30秒
    KLINE: 300,          // K线：5分钟
    NEWS: 3600,          // 新闻：1小时
    STOCK_INFO: 86400,   // 股票信息：1天
  },
  
  // 大小限制
  SIZE_LIMITS: {
    MEMORY_CACHE_MAX_ITEMS: 1000,    // 内存缓存最大条目数
    REDIS_MAX_SIZE: 50 * 1024 * 1024,     // Redis 最大 50MB（留余量）
    DB_CACHE_MAX_SIZE: 50 * 1024 * 1024,  // 数据库缓存最大 50MB
  },
};

// ==================== 内存缓存管理（前端）====================

class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = CACHE_CONFIG.SIZE_LIMITS.MEMORY_CACHE_MAX_ITEMS;

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  set<T>(key: string, data: T, ttl: number): void {
    // LRU 淘汰策略
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  delete(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const memoryCache = new MemoryCache();

// ==================== 数据库缓存管理 ====================

import { supabase } from '../lib/supabase';

export const dbCache = {
  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from('market_data_cache')
        .select('data')
        .eq('symbol', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) return null;
      return data.data as T;
    } catch {
      return null;
    }
  },

  /**
   * 设置缓存数据
   */
  async set(key: string, data: any, ttlSeconds: number): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      
      const { error } = await supabase
        .from('market_data_cache')
        .upsert({
          symbol: key,
          data,
          cached_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      return !error;
    } catch {
      return false;
    }
  },

  /**
   * 清理过期缓存
   */
  async cleanExpired(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('market_data_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('symbol');

      return data?.length || 0;
    } catch {
      return 0;
    }
  },

  /**
   * 获取缓存统计
   */
  async stats(): Promise<{ count: number; oldestCache: string | null }> {
    try {
      const { count } = await supabase
        .from('market_data_cache')
        .select('*', { count: 'exact', head: true });

      const { data: oldest } = await supabase
        .from('market_data_cache')
        .select('cached_at')
        .order('cached_at', { ascending: true })
        .limit(1)
        .single();

      return {
        count: count || 0,
        oldestCache: oldest?.cached_at || null,
      };
    } catch {
      return { count: 0, oldestCache: null };
    }
  },

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('market_data_cache')
        .delete()
        .neq('symbol', '__never_match__');

      return !error;
    } catch {
      return false;
    }
  },
};

// ==================== 热点数据清理 ====================

/**
 * 清理7天前的热点数据
 * 由 crawler 自动执行，也可手动调用
 */
export async function cleanupHotspotData(): Promise<{
  hot_news: number;
  community_posts: number;
  today_hotspot: number;
  financial_calendar: number;
}> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const results = { hot_news: 0, community_posts: 0, today_hotspot: 0, financial_calendar: 0 };

  for (const table of Object.keys(results) as (keyof typeof results)[]) {
    try {
      const { data } = await supabase
        .from(table)
        .delete()
        .lt('crawl_time', cutoff.toISOString())
        .select('id');
      results[table] = data?.length || 0;
    } catch {
      // ignore
    }
  }

  return results;
}

// ==================== 清理定时任务 ====================

/**
 * 执行缓存清理
 */
export async function runCacheCleanup(): Promise<{
  success: boolean;
  memoryCleared: number;
  dbCleared: number;
}> {
  // 清理内存缓存
  memoryCache.clear();
  
  // 清理数据库缓存
  const dbCleared = await dbCache.cleanExpired();

  return {
    success: true,
    memoryCleared: CACHE_CONFIG.SIZE_LIMITS.MEMORY_CACHE_MAX_ITEMS,
    dbCleared,
  };
}

export default {
  memory: memoryCache,
  db: dbCache,
  config: CACHE_CONFIG,
  runCleanup: runCacheCleanup,
  cleanupHotspot: cleanupHotspotData,
};
