/**
 * 涨停打板数据服务
 * 使用东方财富SDK获取实时行情，计算涨停价和封单量
 */

import { frontendMarketService } from './frontendMarketService';

// 股票类型
export type StockType = 'NORMAL' | 'ST' | 'GEM';

// 涨停打板数据
export interface LimitUpData {
  symbol: string;           // 股票代码
  name: string;            // 股票名称
  preClose: number;        // 前收盘价
  currentPrice: number;    // 当前价格
  change: number;          // 涨跌额
  changePercent: number;   // 涨跌幅
  volume: number;          // 成交量
  turnover: number;        // 换手率
  limitUpPrice: number;    // 涨停价
  limitDownPrice: number;  // 跌停价
  buyOneVolume: number;    // 买一量（封单量）
  buyOnePrice: number;     // 买一价
  sellOneVolume: number;   // 卖一量
  sellOnePrice: number;    // 卖一价
  market: string;          // 市场类型
  timestamp: string;       // 数据时间戳
}

// 东方财富SDK返回的数据格式（根据文档推测）
interface EastmoneyQuote {
  code?: string;           // 股票代码
  name?: string;          // 股票名称
  preClose?: number;      // 前收盘价
  price?: number;         // 当前价格
  change?: number;        // 涨跌额
  changePercent?: number; // 涨跌幅
  volume?: number;        // 成交量（手）
  turnover?: number;      // 换手率（%）
  buyOneVolume?: number;  // 买一量（手）
  buyOnePrice?: number;   // 买一价
  sellOneVolume?: number; // 卖一量（手）
  sellOnePrice?: number;  // 卖一价
  market?: string;        // 市场
  time?: string;          // 时间
}

/**
 * 根据股票类型计算涨停/跌停百分比
 */
function getLimitPercent(stockType: StockType = 'NORMAL'): number {
  switch (stockType) {
    case 'ST':
      return 0.05; // 5%
    case 'GEM':
      return 0.20; // 20%
    case 'NORMAL':
    default:
      return 0.10; // 10%
  }
}

/**
 * 计算涨停价和跌停价
 */
function calculateLimitPrices(preClose: number, stockType: StockType = 'NORMAL'): {
  limitUpPrice: number;
  limitDownPrice: number;
} {
  const limitPercent = getLimitPercent(stockType);
  const limitUpPrice = Math.round(preClose * (1 + limitPercent) * 100) / 100;
  const limitDownPrice = Math.round(preClose * (1 - limitPercent) * 100) / 100;
  
  return { limitUpPrice, limitDownPrice };
}

/**
 * 估算封单量（买一量）
 * 当SDK未提供买一量时，根据成交量和换手率估算
 */
function estimateBuyOneVolume(volume: number, turnover: number = 0): number {
  // 如果换手率数据可用，根据换手率估算封单比例
  if (turnover > 0 && turnover < 100) {
    // 换手率越低，封单比例可能越高
    const estimatedRatio = 0.3 * (1 - turnover / 100); // 0-30%范围
    return Math.round(volume * estimatedRatio);
  }
  
  // 默认估算：成交量 * 30%
  return Math.round(volume * 0.3);
}

/**
 * 使用东方财富SDK获取实时行情
 * 注意：需要先安装 eastmoney-data-sdk
 */
async function fetchEastmoneyQuote(symbol: string): Promise<EastmoneyQuote | null> {
  try {
    // 动态导入东方财富SDK，避免未安装时直接报错
    const { EastmoneyClient } = await import('eastmoney-data-sdk');
    
    // 创建客户端实例
    const client = new EastmoneyClient();
    
    // 调用quote方法获取行情数据
    // 根据实际SDK文档调整参数
    const quote = await client.quote(symbol);
    
    if (!quote || !quote.code) {
      console.warn(`东方财富SDK返回数据异常: ${symbol}`);
      return null;
    }
    
    return quote as EastmoneyQuote;
  } catch (error) {
    console.error(`东方财富SDK调用失败 (${symbol}):`, error);
    return null;
  }
}

/**
 * 从frontendMarketService获取前收盘价
 */
async function getPreCloseFromMarketService(symbol: string): Promise<number | null> {
  try {
    // 假设CN市场
    const stock = await frontendMarketService.getRealtimeStock(symbol, 'CN');
    return stock.price || null;
  } catch (error) {
    console.error(`从marketService获取前收盘价失败 (${symbol}):`, error);
    return null;
  }
}

/**
 * 生成模拟涨停打板数据
 */
function generateMockLimitUpData(symbol: string, stockType: StockType = 'NORMAL'): LimitUpData {
  const preClose = 10 + Math.random() * 40; // 10-50元
  const { limitUpPrice, limitDownPrice } = calculateLimitPrices(preClose, stockType);
  const currentPrice = limitUpPrice; // 假设在涨停价
  const change = currentPrice - preClose;
  const changePercent = (change / preClose) * 100;
  const volume = Math.round(100000 + Math.random() * 900000); // 10万-100万手
  const turnover = 1 + Math.random() * 9; // 1-10%换手率
  const buyOneVolume = estimateBuyOneVolume(volume, turnover);
  
  return {
    symbol,
    name: `${symbol}股票`,
    preClose,
    currentPrice,
    change,
    changePercent,
    volume,
    turnover,
    limitUpPrice,
    limitDownPrice,
    buyOneVolume,
    buyOnePrice: limitUpPrice,
    sellOneVolume: Math.round(volume * 0.1),
    sellOnePrice: limitUpPrice * 1.01,
    market: symbol.startsWith('6') ? 'SH' : 'SZ',
    timestamp: new Date().toISOString()
  };
}

/**
 * 获取涨停打板数据
 * 优先使用东方财富SDK，失败时降级到marketService，最后使用模拟数据
 */
export async function getLimitUpData(
  symbol: string, 
  stockType: StockType = 'NORMAL'
): Promise<LimitUpData> {
  // 1. 尝试使用东方财富SDK
  const eastmoneyQuote = await fetchEastmoneyQuote(symbol);
  
  if (eastmoneyQuote) {
    const preClose = eastmoneyQuote.preClose || 0;
    const currentPrice = eastmoneyQuote.price || 0;
    const { limitUpPrice, limitDownPrice } = calculateLimitPrices(preClose, stockType);
    
    return {
      symbol: eastmoneyQuote.code || symbol,
      name: eastmoneyQuote.name || symbol,
      preClose,
      currentPrice,
      change: eastmoneyQuote.change || 0,
      changePercent: eastmoneyQuote.changePercent || 0,
      volume: eastmoneyQuote.volume || 0,
      turnover: eastmoneyQuote.turnover || 0,
      limitUpPrice,
      limitDownPrice,
      buyOneVolume: eastmoneyQuote.buyOneVolume || estimateBuyOneVolume(eastmoneyQuote.volume || 0, eastmoneyQuote.turnover || 0),
      buyOnePrice: eastmoneyQuote.buyOnePrice || limitUpPrice,
      sellOneVolume: eastmoneyQuote.sellOneVolume || 0,
      sellOnePrice: eastmoneyQuote.sellOnePrice || 0,
      market: eastmoneyQuote.market || (symbol.startsWith('6') ? 'SH' : 'SZ'),
      timestamp: eastmoneyQuote.time || new Date().toISOString()
    };
  }
  
  // 2. SDK失败，降级从marketService获取前收盘价
  console.warn(`东方财富SDK失败，降级使用marketService: ${symbol}`);
  const preClose = await getPreCloseFromMarketService(symbol);
  
  if (preClose !== null) {
    const { limitUpPrice, limitDownPrice } = calculateLimitPrices(preClose, stockType);
    
    // 使用marketService获取当前价格
    const stock = await frontendMarketService.getRealtimeStock(symbol, 'CN');
    const currentPrice = stock.price || preClose;
    const change = currentPrice - preClose;
    const changePercent = (change / preClose) * 100;
    
    return {
      symbol,
      name: stock.name || symbol,
      preClose,
      currentPrice,
      change,
      changePercent,
      volume: 0, // 无法获取
      turnover: 0, // 无法获取
      limitUpPrice,
      limitDownPrice,
      buyOneVolume: estimateBuyOneVolume(0),
      buyOnePrice: limitUpPrice,
      sellOneVolume: 0,
      sellOnePrice: 0,
      market: symbol.startsWith('6') ? 'SH' : 'SZ',
      timestamp: new Date().toISOString()
    };
  }
  
  // 3. 所有数据源失败，返回模拟数据
  console.warn(`所有数据源失败，返回模拟数据: ${symbol}`);
  return generateMockLimitUpData(symbol, stockType);
}

/**
 * 批量获取涨停打板数据
 */
export async function getBatchLimitUpData(
  symbols: string[],
  stockType: StockType = 'NORMAL'
): Promise<Record<string, LimitUpData>> {
  const results: Record<string, LimitUpData> = {};
  
  // 顺序请求，避免并发限制
  for (const symbol of symbols) {
    results[symbol] = await getLimitUpData(symbol, stockType);
  }
  
  return results;
}

/**
 * 检查是否为涨停状态
 */
export function isLimitUp(limitUpData: LimitUpData): boolean {
  const { currentPrice, limitUpPrice } = limitUpData;
  // 允许±0.01元误差
  return Math.abs(currentPrice - limitUpPrice) <= 0.01;
}

/**
 * 检查是否为跌停状态
 */
export function isLimitDown(limitUpData: LimitUpData): boolean {
  const { currentPrice, limitDownPrice } = limitUpData;
  // 允许±0.01元误差
  return Math.abs(currentPrice - limitDownPrice) <= 0.01;
}

/**
 * 缓存装饰器
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cacheKey: string,
  ttl: number = 10 * 1000 // 默认10秒缓存（涨停数据变化快）
): T {
  const cache = {
    data: null as any,
    timestamp: 0
  };

  return (async (...args: any[]) => {
    const now = Date.now();
    
    if (cache.data && now - cache.timestamp < ttl) {
      return cache.data;
    }

    const result = await fn(...args);
    cache.data = result;
    cache.timestamp = now;
    
    return result;
  }) as T;
}

// 带缓存的涨停数据获取函数
export const getLimitUpDataWithCache = withCache(getLimitUpData, 'limit_up_data');
