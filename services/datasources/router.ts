/**
 * 数据源路由器（轻量化免费方案）
 * 
 * 主数据源：东方财富（通过 proxy-market Edge Function）
 * 备用源：新浪财经（仅指数行情）
 * 
 * 特点：轻量、免费、无需额外配置
 */

import { supabase } from '@/lib/supabase';
import type {
  Market,
  UnifiedQuote,
  UnifiedKline,
  UnifiedOrderBook,
  UnifiedTick,
  UnifiedNews,
} from './types';

// ==================== 缓存配置 ====================

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheItem<any>>();

const CACHE_TTL = {
  QUOTE: 10 * 1000,      // 行情 10秒
  BATCH: 10 * 1000,      // 批量行情 10秒
  ORDER_BOOK: 5 * 1000,  // 五档 5秒
  KLINE: 60 * 1000,      // K线 1分钟
  NEWS: 30 * 1000,       // 新闻 30秒
  TICKS: 5 * 1000,       // 成交明细 5秒
};

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL.QUOTE) {
    return item.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T, ttl?: number): void {
  cache.set(key, { data, timestamp: Date.now() });
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

// ==================== 数据源路由器 ====================

class DataSourceRouter {
  /**
   * 调用 proxy-market Edge Function
   */
  private async callProxyMarket<T>(params: Record<string, any>): Promise<T> {
    const { data, error } = await supabase.functions.invoke('proxy-market', {
      body: params,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * 获取行情
   */
  async getQuote(symbol: string, market: Market): Promise<UnifiedQuote | null> {
    const quotes = await this.getBatchQuotes([symbol], market);
    return quotes[0] || null;
  }

  /**
   * 批量获取行情
   */
  async getBatchQuotes(symbols: string[], market: Market): Promise<UnifiedQuote[]> {
    if (symbols.length === 0) return [];

    const cacheKey = `quotes:${market}:${symbols.sort().join(',')}`;
    const cached = getCached<UnifiedQuote[]>(cacheKey);
    if (cached) return cached;

    return dedupe(cacheKey, async () => {
      try {
        const data = await this.callProxyMarket<{ data?: any[]; success?: boolean } | any[]>({
          action: 'batch',
          symbols,
          market,
        });

        const rawData = Array.isArray(data) ? data : (data?.data || []);
        const quotes = rawData.map((item: any) => ({
          symbol: item.symbol || item.code || item.f12,
          name: item.name || item.f14,
          market,
          price: item.price || item.f2 || 0,
          open: item.open || item.f17 || 0,
          high: item.high || item.f15 || 0,
          low: item.low || item.f16 || 0,
          prevClose: item.prevClose || item.f18 || 0,
          volume: item.volume || item.f5 || 0,
          amount: item.amount || item.f6 || 0,
          change: item.change || item.f4 || 0,
          changePercent: item.changePercent || item.f3 || 0,
          timestamp: new Date().toISOString(),
          source: 'EASTMONEY' as const,
        }));

        setCache(cacheKey, quotes);
        return quotes;
      } catch (error) {
        console.warn('[DataSourceRouter] 行情获取失败:', error);
        return [];
      }
    });
  }

  /**
   * 获取K线
   */
  async getKline(
    symbol: string,
    market: Market,
    days: number = 30
  ): Promise<UnifiedKline[]> {
    const cacheKey = `kline:${market}:${symbol}:${days}`;
    const cached = getCached<UnifiedKline[]>(cacheKey);
    if (cached) return cached;

    return dedupe(cacheKey, async () => {
      try {
        const data = await this.callProxyMarket<{ klines?: any[]; data?: any[] }>({
          action: 'kline',
          symbols: [symbol],
          market,
          days,
        });

        const rawKlines = data?.klines || data?.data || [];
        const klines = rawKlines.map((item: any, index: number) => ({
          time: item.time || item.date || '',
          open: item.open || 0,
          high: item.high || 0,
          low: item.low || 0,
          close: item.close || item.price || 0,
          volume: item.volume || 0,
          amount: item.amount || 0,
        }));

        setCache(cacheKey, klines);
        return klines;
      } catch (error) {
        console.warn('[DataSourceRouter] K线获取失败:', error);
        return [];
      }
    });
  }

  /**
   * 获取五档
   */
  async getOrderBook(symbol: string, market: Market): Promise<UnifiedOrderBook | null> {
    const cacheKey = `orderbook:${market}:${symbol}`;
    const cached = getCached<UnifiedOrderBook>(cacheKey);
    if (cached) return cached;

    return dedupe(cacheKey, async () => {
      try {
        const data = await this.callProxyMarket<{ bids: any[]; asks: any[] }>({
          action: 'orderbook',
          symbols: [symbol],
          market,
        });

        const orderBook: UnifiedOrderBook = {
          bids: (data?.bids || []).map((b: any) => ({
            price: b.price || b.bidPrice || 0,
            volume: b.volume || b.bidVolume || 0,
          })),
          asks: (data?.asks || []).map((a: any) => ({
            price: a.price || a.askPrice || 0,
            volume: a.volume || a.askVolume || 0,
          })),
          timestamp: new Date().toISOString(),
          source: 'EASTMONEY',
        };

        setCache(cacheKey, orderBook);
        return orderBook;
      } catch (error) {
        console.warn('[DataSourceRouter] 五档获取失败:', error);
        return null;
      }
    });
  }

  /**
   * 获取成交明细
   */
  async getTicks(symbol: string, market: Market, count: number = 100): Promise<UnifiedTick[]> {
    const cacheKey = `ticks:${market}:${symbol}`;
    const cached = getCached<UnifiedTick[]>(cacheKey);
    if (cached) return cached;

    return dedupe(cacheKey, async () => {
      try {
        const data = await this.callProxyMarket<{ ticks?: any[]; data?: any[] }>({
          action: 'ticks',
          symbols: [symbol],
          market,
          limit: count,
        });

        const rawTicks = data?.ticks || data?.data || [];
        const ticks = rawTicks.map((t: any) => ({
          time: t.time || t.tradeTime || '',
          price: t.price || t.tradePrice || 0,
          volume: t.volume || t.tradeVolume || 0,
          direction: t.direction || t.tradeDirection || 'NEUTRAL',
        }));

        setCache(cacheKey, ticks);
        return ticks;
      } catch (error) {
        console.warn('[DataSourceRouter] 成交明细获取失败:', error);
        return [];
      }
    });
  }

  /**
   * 获取新闻
   */
  async getNews(options: { symbol?: string; pageSize?: number }): Promise<UnifiedNews[]> {
    const cacheKey = `news:${options.symbol || 'all'}:${options.pageSize || 20}`;
    const cached = getCached<UnifiedNews[]>(cacheKey);
    if (cached) return cached;

    return dedupe(cacheKey, async () => {
      try {
        const action = options.symbol ? 'stock_news' : 'news';
        const data = await this.callProxyMarket<{ news?: any[]; data?: any[] }>({
          action,
          symbols: options.symbol ? [options.symbol] : undefined,
          pageSize: options.pageSize || 20,
        });

        const rawNews = data?.news || data?.data || [];
        const news = rawNews.map((n: any) => ({
          id: n.id || String(Math.random()),
          title: n.title || '',
          content: n.content || '',
          time: n.time || n.showtime || '',
          source: n.source || '东方财富',
          category: n.category || '',
          sentiment: this.analyzeSentiment(n.title || ''),
          url: n.url || '',
          dataSource: 'EASTMONEY' as const,
        }));

        setCache(cacheKey, news);
        return news;
      } catch (error) {
        console.warn('[DataSourceRouter] 新闻获取失败:', error);
        return [];
      }
    });
  }

  /**
   * 简单情感分析
   */
  private analyzeSentiment(title: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['利好', '增长', '盈利', '上涨', '突破', '创新高', '增持'];
    const negativeWords = ['利空', '下跌', '亏损', '下滑', '风险', '减持', '处罚'];

    for (const word of positiveWords) {
      if (title.includes(word)) return 'positive';
    }
    for (const word of negativeWords) {
      if (title.includes(word)) return 'negative';
    }
    return 'neutral';
  }
}

// 导出单例
export const dataSourceRouter = new DataSourceRouter();
export { DataSourceRouter };
