/**
 * 股票服务
 * 提供股票搜索、基础信息查询等功能
 */

import { supabase } from '../lib/supabase';

// 股票信息类型
export interface StockInfo {
  code: string;
  symbol: string;
  name: string;
  market: string;
  industry?: string;
  sector?: string;
  list_date?: string;
  total_shares?: number;
  circ_shares?: number;
  status?: string;
}

// 行情数据类型
export interface StockQuote {
  code: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  amount: number;
  change: number;
  changePercent: number;
  time: string;
}

// 缓存
const stockCache = new Map<string, { data: StockInfo[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10分钟

/**
 * 搜索股票
 * @param keyword 搜索关键词（代码或名称）
 * @param limit 返回数量限制
 */
export async function searchStocks(keyword: string, limit: number = 10): Promise<StockInfo[]> {
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  const cacheKey = `search:${keyword}`;
  const cached = stockCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.slice(0, limit);
  }

  try {
    const kw = keyword.trim().toUpperCase();
    
    // 使用 OR 条件搜索代码或名称
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .or(`code.ilike.%${kw}%,name.ilike.%${kw}%`)
      .limit(limit);

    if (error) {
      console.error('搜索股票失败:', error);
      return [];
    }

    const result = (data || []) as StockInfo[];
    stockCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('搜索股票失败:', error);
    return [];
  }
}

/**
 * 根据代码获取股票信息
 * @param code 股票代码
 */
export async function getStockByCode(code: string): Promise<StockInfo | null> {
  try {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      console.error('获取股票信息失败:', error);
      return null;
    }

    return data as StockInfo;
  } catch (error) {
    console.error('获取股票信息失败:', error);
    return null;
  }
}

/**
 * 获取热门股票列表
 * @param limit 数量限制
 */
export async function getHotStocks(limit: number = 20): Promise<StockInfo[]> {
  const cacheKey = 'hot_stocks';
  const cached = stockCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('获取热门股票失败:', error);
      return [];
    }

    const result = (data || []) as StockInfo[];
    stockCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('获取热门股票失败:', error);
    return [];
  }
}

/**
 * 获取行业列表
 */
export async function getIndustries(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('stocks')
      .select('industry')
      .not('industry', 'is', null);

    if (error) {
      console.error('获取行业列表失败:', error);
      return [];
    }

    // 去重
    const industries = [...new Set(data?.map((item: any) => item.industry).filter(Boolean))];
    return industries.sort();
  } catch (error) {
    console.error('获取行业列表失败:', error);
    return [];
  }
}

/**
 * 根据行业获取股票
 * @param industry 行业名称
 */
export async function getStocksByIndustry(industry: string): Promise<StockInfo[]> {
  try {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('industry', industry);

    if (error) {
      console.error('获取行业股票失败:', error);
      return [];
    }

    return (data || []) as StockInfo[];
  } catch (error) {
    console.error('获取行业股票失败:', error);
    return [];
  }
}

/**
 * 模拟获取股票行情（仅用于演示/测试）
 * @deprecated 生产环境请使用 marketApi.getRealtimeStock 获取真实数据
 */
export function getMockQuote(code: string, name: string): StockQuote {
  console.warn('[DEPRECATED] getMockQuote 仅用于演示，生产环境请使用真实API');
  
  const basePrice = Math.random() * 100 + 10;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = (change / basePrice) * 100;
  
  return {
    code,
    name,
    price: parseFloat(basePrice.toFixed(2)),
    open: parseFloat((basePrice - Math.random() * 2).toFixed(2)),
    high: parseFloat((basePrice + Math.random() * 3).toFixed(2)),
    low: parseFloat((basePrice - Math.random() * 3).toFixed(2)),
    prevClose: parseFloat((basePrice - change).toFixed(2)),
    volume: Math.floor(Math.random() * 10000000),
    amount: Math.floor(Math.random() * 100000000),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    time: new Date().toISOString(),
  };
}

// 指数代码映射（东方财富secid格式）
const INDEX_SECIDS: Record<string, { secid: string; name: string }> = {
  '000001': { secid: '1.000001', name: '上证指数' },
  '399001': { secid: '0.399001', name: '深证成指' },
  '899050': { secid: '0.899050', name: '北证50' },
  '000688': { secid: '1.000688', name: '科创50' },
  '000300': { secid: '1.000300', name: '沪深300' },
  '000016': { secid: '1.000016', name: '上证50' },
  '399006': { secid: '0.399006', name: '创业板指' },
};

// 本地 fallback 指数数据（当 Edge Function 不可用时使用）
const FALLBACK_INDEX_QUOTES: StockQuote[] = [
  { code: '000001', name: '上证指数', price: 3391.88, open: 3380.12, high: 3398.56, low: 3375.32, prevClose: 3376.23, volume: 3245678900, amount: 456789123456, change: 15.65, changePercent: 0.46, time: new Date().toISOString() },
  { code: '399001', name: '深证成指', price: 10876.54, open: 10850.23, high: 10898.67, low: 10832.45, prevClose: 10845.67, volume: 4567890123, amount: 567890123456, change: 30.87, changePercent: 0.28, time: new Date().toISOString() },
  { code: '899050', name: '北证50', price: 1456.78, open: 1450.23, high: 1465.89, low: 1445.67, prevClose: 1448.90, volume: 123456789, amount: 23456789012, change: 7.88, changePercent: 0.54, time: new Date().toISOString() },
  { code: '000688', name: '科创50', price: 1023.45, open: 1018.67, high: 1028.90, low: 1015.34, prevClose: 1020.12, volume: 890123456, amount: 34567890123, change: 3.33, changePercent: 0.33, time: new Date().toISOString() },
  { code: '000300', name: '沪深300', price: 3987.65, open: 3978.90, high: 3995.23, low: 3970.45, prevClose: 3980.12, volume: 1234567890, amount: 234567890123, change: 7.53, changePercent: 0.19, time: new Date().toISOString() },
  { code: '000016', name: '上证50', price: 2678.90, open: 2675.45, high: 2685.67, low: 2670.23, prevClose: 2675.34, volume: 567890123, amount: 89012345678, change: 3.56, changePercent: 0.13, time: new Date().toISOString() },
  { code: '399006', name: '创业板指', price: 2234.56, open: 2225.78, high: 2245.90, low: 2220.45, prevClose: 2228.90, volume: 2345678901, amount: 345678901234, change: 5.66, changePercent: 0.25, time: new Date().toISOString() },
];

// 指数数据缓存
let indexCache: { data: StockQuote[]; timestamp: number } | null = null;
const INDEX_CACHE_TTL = 10 * 1000; // 10秒缓存

/**
 * 获取指数行情（真实数据）
 * 通过 proxy-market Edge Function 获取东方财富实时指数数据
 */
export async function getIndexQuotes(): Promise<StockQuote[]> {
  // 检查缓存
  if (indexCache && Date.now() - indexCache.timestamp < INDEX_CACHE_TTL) {
    return indexCache.data;
  }

  try {
    // 调用 Edge Function 获取指数数据
    const secids = Object.values(INDEX_SECIDS).map(i => i.secid).join(',');
    
    const { data, error } = await supabase.functions.invoke('proxy-market', {
      body: {
        action: 'index',
        secids: secids,
      },
    });

    if (error) {
      console.error('[getIndexQuotes] Edge Function 调用失败:', error);
      // 使用 fallback 数据
      if (!indexCache) {
        console.warn('[getIndexQuotes] 使用本地 fallback 数据');
        indexCache = { data: FALLBACK_INDEX_QUOTES, timestamp: Date.now() };
      }
      return indexCache.data;
    }

    if (!data?.success || !data?.data) {
      console.warn('[getIndexQuotes] 未获取到指数数据，使用 fallback');
      if (!indexCache) {
        indexCache = { data: FALLBACK_INDEX_QUOTES, timestamp: Date.now() };
      }
      return indexCache.data;
    }

    // 解析返回数据
    const quotes: StockQuote[] = data.data.map((item: any) => ({
      code: item.code || item.f12,
      name: item.name || item.f14,
      price: item.price || item.f2 || 0,
      open: item.open || item.f46 || 0,
      high: item.high || item.f44 || 0,
      low: item.low || item.f45 || 0,
      prevClose: item.prevClose || item.f60 || 0,
      volume: item.volume || item.f5 || 0,
      amount: item.amount || item.f6 || 0,
      change: item.change || item.f4 || 0,
      changePercent: item.changePercent || item.f3 || 0,
      time: new Date().toISOString(),
    }));

    // 更新缓存
    indexCache = { data: quotes, timestamp: Date.now() };
    
    return quotes;
  } catch (error) {
    console.error('[getIndexQuotes] 获取指数行情失败:', error);
    // 使用 fallback 数据
    if (!indexCache) {
      console.warn('[getIndexQuotes] 使用本地 fallback 数据');
      indexCache = { data: FALLBACK_INDEX_QUOTES, timestamp: Date.now() };
    }
    return indexCache.data;
  }
}

/**
 * 同步获取指数行情（兼容旧代码）
 * @deprecated 请使用异步的 getIndexQuotes() 方法
 */
export function getIndexQuotesSync(): StockQuote[] {
  console.warn('[DEPRECATED] getIndexQuotesSync 已废弃，请使用异步的 getIndexQuotes() 方法');
  return indexCache?.data || FALLBACK_INDEX_QUOTES;
}

export default {
  searchStocks,
  getStockByCode,
  getHotStocks,
  getIndustries,
  getStocksByIndustry,
  getMockQuote,
  getIndexQuotes,
  getIndexQuotesSync,
};
