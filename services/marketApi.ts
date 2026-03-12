/**
 * 统一行情 API 服务模块
 * 所有行情数据请求都通过 proxy-market Edge Function 代理
 * 
 * 支持的 action:
 * - batch: 批量行情
 * - realtime: 单只股票行情
 * - quote: 完整个股详情（含开高低收等）
 * - orderbook: 五档盘口
 * - kline: K线数据
 * - news: 财经快讯
 * - limitup: 涨停板
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
  openCount: number; // 开板次数
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

interface ProxyResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  cached?: boolean;
}

async function callProxy<T>(action: string, params: Record<string, any>): Promise<ProxyResponse<T>> {
  const { data, error } = await supabase.functions.invoke('proxy-market', {
    body: { action, ...params }
  });
  
  if (error) {
    console.error(`[marketApi] ${action} 调用失败:`, error);
    throw error;
  }
  
  return data as ProxyResponse<T>;
}

// ==================== 核心 API ====================

export const marketApi = {
  /**
   * 批量获取股票行情（简洁版）
   */
  async getBatchStocks(symbols: string[], market: 'CN' | 'HK'): Promise<SimpleStock[]> {
    if (symbols.length === 0) return [];
    
    const cacheKey = `batch:${market}:${symbols.sort().join(',')}`;
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<SimpleStock[]>('batch', { symbols, market });
      return result.success ? result.data : [];
    });
  },
  
  /**
   * 获取单只股票实时行情（简洁版）
   */
  async getRealtimeStock(symbol: string, market: 'CN' | 'HK'): Promise<SimpleStock | null> {
    const cacheKey = `realtime:${market}:${symbol}`;
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<SimpleStock>('realtime', { symbols: [symbol], market });
      return result.success ? result.data : null;
    });
  },
  
  /**
   * 获取完整个股行情（含开高低收成交量等）
   */
  async getStockQuote(symbol: string, market: 'CN' | 'HK'): Promise<StockQuote | null> {
    const cacheKey = `quote:${market}:${symbol}`;
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<StockQuote>('quote', { symbols: [symbol], market });
      return result.success ? result.data : null;
    });
  },
  
  /**
   * 获取五档盘口
   */
  async getOrderBook(symbol: string, market: 'CN' | 'HK'): Promise<OrderBook | null> {
    const cacheKey = `orderbook:${market}:${symbol}`;
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<OrderBook>('orderbook', { symbols: [symbol], market });
      return result.success ? result.data : null;
    });
  },
  
  /**
   * 获取K线数据
   */
  async getKline(symbol: string, market: 'CN' | 'HK', days: number = 30): Promise<number[]> {
    const cacheKey = `kline:${market}:${symbol}:${days}`;
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<number[]>('kline', { symbols: [symbol], market, days });
      return result.success ? result.data : [];
    });
  },
  
  /**
   * 获取财经快讯
   */
  async getNews(pageSize: number = 20): Promise<NewsItem[]> {
    const cacheKey = `news:${pageSize}`;
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<NewsItem[]>('news', { pageSize });
      return result.success ? result.data : [];
    });
  },
  
  /**
   * 获取涨停板股票
   */
  async getLimitUpStocks(): Promise<LimitUpStock[]> {
    const cacheKey = 'limitup:all';
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<LimitUpStock[]>('limitup', {});
      return result.success ? result.data : [];
    });
  },
  
  /**
   * 获取个股相关新闻
   */
  async getStockNews(symbol: string, pageSize: number = 10): Promise<StockNews[]> {
    const cacheKey = `stock_news:${symbol}:${pageSize}`;
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<StockNews[]>('stock_news', { symbols: [symbol], pageSize });
      return result.success ? result.data : [];
    });
  },
  
  /**
   * 获取个股公告
   */
  async getStockNotice(symbol: string, pageSize: number = 10): Promise<StockNotice[]> {
    const cacheKey = `stock_notice:${symbol}:${pageSize}`;
    
    return dedupe(cacheKey, async () => {
      const result = await callProxy<StockNotice[]>('stock_notice', { symbols: [symbol], pageSize });
      return result.success ? result.data : [];
    });
  },
  
  /**
   * 获取港股行情（支持买卖盘）
   */
  async getHKQuote(symbol: string): Promise<StockQuote | null> {
    return this.getStockQuote(symbol, 'HK');
  },
  
  /**
   * 获取成交明细（通过 proxy-market）
   */
  async getTradeTicks(symbol: string, market: 'CN' | 'HK'): Promise<TradeTick[]> {
    try {
      const result = await callProxy<TradeTick[]>('ticks', { symbols: [symbol], market });
      return result.success ? result.data : [];
    } catch (err) {
      console.warn('[marketApi] 获取成交明细失败:', err);
      return [];
    }
  },
  
  /**
   * 健康检查
   */
  async checkHealth(): Promise<boolean> {
    try {
      const result = await callProxy<SimpleStock>('realtime', { symbols: ['600519'], market: 'CN' });
      return result.success;
    } catch {
      return false;
    }
  },
};

// ==================== 缓存管理（管理端使用）====================

export const cacheAdmin = {
  /**
   * 清除特定股票的所有缓存
   */
  async clearStockCache(symbol: string, market: 'CN' | 'HK' = 'CN'): Promise<{ success: boolean; deleted: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('clear-cache', {
        body: { symbol, market }
      });
      
      if (error) throw error;
      return { success: true, deleted: data.deleted };
    } catch (err) {
      console.error('[cacheAdmin] 清除股票缓存失败:', err);
      return { success: false, deleted: 0 };
    }
  },
  
  /**
   * 清除特定缓存键
   */
  async clearKeys(keys: string[]): Promise<{ success: boolean; deleted: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('clear-cache', {
        body: { keys }
      });
      
      if (error) throw error;
      return { success: true, deleted: data.deleted };
    } catch (err) {
      console.error('[cacheAdmin] 清除缓存键失败:', err);
      return { success: false, deleted: 0 };
    }
  },
  
  /**
   * 按模式清除缓存
   * 支持的模式: all, quote, batch, realtime, orderbook, kline, news, stock_news, stock_notice, limitup
   */
  async clearPattern(pattern: string): Promise<{ success: boolean; deleted: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('clear-cache', {
        body: { pattern }
      });
      
      if (error) throw error;
      return { success: true, deleted: data.deleted };
    } catch (err) {
      console.error('[cacheAdmin] 清除模式缓存失败:', err);
      return { success: false, deleted: 0 };
    }
  },
  
  /**
   * 清除所有缓存（谨慎使用）
   */
  async clearAll(): Promise<{ success: boolean }> {
    try {
      const { data, error } = await supabase.functions.invoke('clear-cache', {
        body: { pattern: 'all' }
      });
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[cacheAdmin] 清除所有缓存失败:', err);
      return { success: false };
    }
  },
};

// ==================== 兼容旧 API 的适配器 ====================

export const marketServiceAdapter = {
  /**
   * 兼容旧的 getMarketData 接口
   */
  async getMarketData(marketType: string, stockCodes: string[]): Promise<any[]> {
    const market = marketType === 'HK' ? 'HK' : 'CN';
    const stocks = await marketApi.getBatchStocks(stockCodes, market);
    
    return stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price.toFixed(2),
      change: stock.change.toFixed(2),
      changePercent: stock.changePercent.toFixed(2),
      sparkline: stock.sparkline,
    }));
  },
  
  /**
   * 兼容旧的行情获取接口
   */
  async getQuote(symbol: string, market: 'CN' | 'HK'): Promise<StockQuote | null> {
    return marketApi.getStockQuote(symbol, market);
  },
};

// 默认导出
export default marketApi;
