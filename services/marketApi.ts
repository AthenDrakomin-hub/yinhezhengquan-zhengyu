/**
 * 行情 API 服务模块
 * 
 * 数据策略：
 * - 所有行情数据通过 proxy-market Edge Function 代理
 * - 自动缓存，减少重复请求
 * - 统一错误处理和降级机制
 */

import { supabase } from '@/lib/supabase';

// ==================== 类型定义 ====================

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  amount: number;
  market: 'CN' | 'HK';
  timestamp: string;
}

export interface SimpleStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: 'CN' | 'HK';
  sparkline: number[];
}

export interface OrderBook {
  bids: Array<{ price: number; volume: number }>;
  asks: Array<{ price: number; volume: number }>;
}

export interface TradeTick {
  time: string;
  price: number;
  volume: number;
  direction: 'BUY' | 'SELL';
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  time: string;
  source: string;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface LimitUpStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  turnoverRate: number;
  firstLimitUpTime: string;
  lastLimitUpTime: string;
  openCount: number;
  industry: string;
}

export interface StockNews {
  id: string;
  title: string;
  content: string;
  time: string;
  source: string;
  url?: string;
  relatedStocks?: string[];
}

export interface StockNotice {
  id: string;
  title: string;
  date: string;
  type: string;
  codes: Array<{ symbol: string; name: string }>;
  url: string;
}

// ==================== 本地缓存 ====================

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheItem<any>>();

function getCached<T>(key: string, ttl: number): T | null {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < ttl) {
    return item.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// 缓存时间配置
const CACHE_TTL = {
  QUOTE: 10 * 1000,      // 行情 10秒
  BATCH: 10 * 1000,      // 批量行情 10秒
  ORDER_BOOK: 5 * 1000,  // 五档 5秒
  KLINE: 60 * 1000,      // K线 1分钟
  NEWS: 30 * 1000,       // 新闻 30秒
  LIMITUP: 30 * 1000,    // 涨停板 30秒
};

// ==================== 请求去重 ====================

const pendingRequests = new Map<string, Promise<any>>();

async function dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key);
  if (pending) return pending as Promise<T>;
  
  const promise = fetcher().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

// ==================== Edge Function 调用 ====================

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-market`;

async function callEdgeFunction<T>(params: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('proxy-market', {
    body: params,
  });

  if (error) {
    console.error('[marketApi] Edge Function 调用失败:', error);
    throw error;
  }

  if (!data?.success) {
    throw new Error(data?.error || '获取数据失败');
  }

  return data.data;
}

// ==================== 核心 API ====================

export const marketApi = {
  /**
   * 批量获取股票行情
   */
  async getBatchStocks(symbols: string[], market: 'CN' | 'HK'): Promise<SimpleStock[]> {
    if (symbols.length === 0) return [];
    
    const cacheKey = `batch:${market}:${symbols.sort().join(',')}`;
    const cached = getCached<SimpleStock[]>(cacheKey, CACHE_TTL.BATCH);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const stocks = await callEdgeFunction<SimpleStock[]>({
          action: 'batch',
          symbols,
          market,
        });
        setCache(cacheKey, stocks);
        return stocks;
      } catch (error) {
        console.warn('[marketApi] 批量行情获取失败，返回空数组');
        return [];
      }
    });
  },
  
  /**
   * 获取单只股票实时行情
   */
  async getRealtimeStock(symbol: string, market: 'CN' | 'HK'): Promise<SimpleStock | null> {
    const results = await this.getBatchStocks([symbol], market);
    return results[0] || null;
  },
  
  /**
   * 获取完整个股行情
   */
  async getStockQuote(symbol: string, market: 'CN' | 'HK'): Promise<StockQuote | null> {
    const cacheKey = `quote:${market}:${symbol}`;
    const cached = getCached<StockQuote>(cacheKey, CACHE_TTL.QUOTE);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const quote = await callEdgeFunction<StockQuote>({
          action: 'quote',
          code: symbol,
          market,
        });
        setCache(cacheKey, quote);
        return quote;
      } catch (error) {
        console.warn('[marketApi] 个股行情获取失败');
        return null;
      }
    });
  },
  
  /**
   * 获取五档盘口
   */
  async getOrderBook(symbol: string, market: 'CN' | 'HK'): Promise<OrderBook | null> {
    const cacheKey = `orderbook:${market}:${symbol}`;
    const cached = getCached<OrderBook>(cacheKey, CACHE_TTL.ORDER_BOOK);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const orderBook = await callEdgeFunction<OrderBook>({
          action: 'orderbook',
          code: symbol,
          market,
        });
        setCache(cacheKey, orderBook);
        return orderBook;
      } catch (error) {
        console.warn('[marketApi] 五档盘口获取失败');
        return null;
      }
    });
  },
  
  /**
   * 获取K线数据
   */
  async getKline(symbol: string, market: 'CN' | 'HK', days: number = 30): Promise<number[]> {
    const cacheKey = `kline:${market}:${symbol}:${days}`;
    const cached = getCached<number[]>(cacheKey, CACHE_TTL.KLINE);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const kline = await callEdgeFunction<any[]>({
          action: 'kline',
          code: symbol,
          market,
          days,
        });
        // 提取收盘价作为 sparkline
        const closes = kline?.map((k: any) => k.close || k[4] || 0) || [];
        setCache(cacheKey, closes);
        return closes;
      } catch (error) {
        console.warn('[marketApi] K线数据获取失败');
        return [];
      }
    });
  },
  
  /**
   * 获取成交明细
   */
  async getTradeTicks(symbol: string, market: 'CN' | 'HK'): Promise<TradeTick[]> {
    const cacheKey = `ticks:${market}:${symbol}`;
    const cached = getCached<TradeTick[]>(cacheKey, CACHE_TTL.ORDER_BOOK);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const ticks = await callEdgeFunction<TradeTick[]>({
          action: 'ticks',
          code: symbol,
          market,
        });
        setCache(cacheKey, ticks);
        return ticks || [];
      } catch (error) {
        console.warn('[marketApi] 成交明细获取失败');
        return [];
      }
    });
  },
  
  /**
   * 获取财经快讯
   */
  async getNews(pageSize: number = 20): Promise<NewsItem[]> {
    const cacheKey = `news:${pageSize}`;
    const cached = getCached<NewsItem[]>(cacheKey, CACHE_TTL.NEWS);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const news = await callEdgeFunction<NewsItem[]>({
          action: 'news',
          pageSize,
        });
        setCache(cacheKey, news);
        return news || [];
      } catch (error) {
        console.warn('[marketApi] 财经快讯获取失败');
        return [];
      }
    });
  },
  
  /**
   * 获取涨停板股票
   */
  async getLimitUpStocks(): Promise<LimitUpStock[]> {
    const cacheKey = 'limitup';
    const cached = getCached<LimitUpStock[]>(cacheKey, CACHE_TTL.LIMITUP);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const stocks = await callEdgeFunction<LimitUpStock[]>({
          action: 'limitup',
        });
        setCache(cacheKey, stocks);
        return stocks || [];
      } catch (error) {
        console.warn('[marketApi] 涨停板数据获取失败');
        return [];
      }
    });
  },
  
  /**
   * 获取个股相关新闻
   */
  async getStockNews(symbol: string, pageSize: number = 10): Promise<StockNews[]> {
    const cacheKey = `stock_news:${symbol}:${pageSize}`;
    const cached = getCached<StockNews[]>(cacheKey, CACHE_TTL.NEWS);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const news = await callEdgeFunction<StockNews[]>({
          action: 'stock_news',
          code: symbol,
          pageSize,
        });
        setCache(cacheKey, news);
        return news || [];
      } catch (error) {
        console.warn('[marketApi] 个股新闻获取失败');
        return [];
      }
    });
  },
  
  /**
   * 获取个股公告
   */
  async getStockNotice(symbol: string, pageSize: number = 10): Promise<StockNotice[]> {
    const cacheKey = `stock_notice:${symbol}:${pageSize}`;
    const cached = getCached<StockNotice[]>(cacheKey, CACHE_TTL.NEWS);
    if (cached) return cached;
    
    return dedupe(cacheKey, async () => {
      try {
        const notices = await callEdgeFunction<StockNotice[]>({
          action: 'stock_notice',
          code: symbol,
          pageSize,
        });
        setCache(cacheKey, notices);
        return notices || [];
      } catch (error) {
        console.warn('[marketApi] 个股公告获取失败');
        return [];
      }
    });
  },
  
  /**
   * 获取港股行情
   */
  async getHKQuote(symbol: string): Promise<StockQuote | null> {
    return this.getStockQuote(symbol, 'HK');
  },
  
  /**
   * 健康检查
   */
  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.getBatchStocks(['600519'], 'CN');
      return result.length > 0;
    } catch {
      return false;
    }
  },
};

// ==================== 缓存管理 ====================

export const cacheAdmin = {
  async clearStockCache(symbol: string, market: 'CN' | 'HK' = 'CN'): Promise<{ success: boolean; deleted: number }> {
    let deleted = 0;
    for (const key of cache.keys()) {
      if (key.includes(symbol) && key.includes(market)) {
        cache.delete(key);
        deleted++;
      }
    }
    return { success: true, deleted };
  },
  
  async clearKeys(keys: string[]): Promise<{ success: boolean; deleted: number }> {
    let deleted = 0;
    for (const key of keys) {
      if (cache.delete(key)) deleted++;
    }
    return { success: true, deleted };
  },
  
  async clearPattern(pattern: string): Promise<{ success: boolean; deleted: number }> {
    let deleted = 0;
    for (const key of cache.keys()) {
      if (pattern === 'all' || key.includes(pattern)) {
        cache.delete(key);
        deleted++;
      }
    }
    return { success: true, deleted };
  },
  
  async clearAll(): Promise<{ success: boolean }> {
    cache.clear();
    return { success: true };
  },
};

export default marketApi;
