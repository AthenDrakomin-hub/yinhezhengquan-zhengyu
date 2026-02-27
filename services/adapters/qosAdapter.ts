/**
 * QOS大宗商品数据适配器
 * 从QOS API获取大宗商品行情数据，用于大宗交易
 */

// QOS API返回的数据格式（根据文档推测）
interface QOSQuoteResponse {
  code?: string;           // 产品代码
  name?: string;          // 产品名称
  price?: number;         // 当前价格
  change?: number;        // 涨跌额
  changePercent?: number; // 涨跌幅
  volume?: number;        // 成交量
  high?: number;          // 最高价
  low?: number;           // 最低价
  open?: number;          // 开盘价
  prevClose?: number;     // 前收盘价
  timestamp?: string;     // 时间戳
}

// 大宗交易信息
export interface BlockTradeInfo {
  symbol: string;         // 产品代码
  name: string;          // 产品名称
  price: number;         // 当前价格
  change: number;        // 涨跌额
  changePercent: number; // 涨跌幅
  volume: number;        // 成交量
  minBlockSize: number;  // 最小大宗交易数量
  blockDiscount: number; // 大宗交易折扣率（如0.9表示9折）
  market: string;        // 市场类型
  lastUpdated: string;   // 最后更新时间
}

// 限流器（复用现有RateLimiter或创建简化版）
class QOSRateLimiter {
  private static readonly MAX_REQUESTS_PER_MINUTE = 5;
  private static requestTimestamps: number[] = [];
  
  static async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // 移除1分钟前的请求记录
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    // 如果当前分钟内请求数超过限制，等待
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 60 * 1000 - (now - oldestRequest);
      if (waitTime > 0) {
        console.log(`QOS API限流：等待${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestTimestamps.push(Date.now());
  }
}

/**
 * 检查产品是否在允许的QOS产品列表中
 */
function isSymbolAllowed(symbol: string): boolean {
  try {
    const products = import.meta.env.VITE_QOS_PRODUCTS;
    if (!products) {
      console.warn('VITE_QOS_PRODUCTS环境变量未配置');
      return false;
    }
    
    const allowedProducts = products.split(',').map(p => p.trim());
    return allowedProducts.includes(symbol);
  } catch (error) {
    console.error('检查QOS产品权限失败:', error);
    return false;
  }
}

/**
 * 获取QOS API密钥
 */
function getQOSApiKey(): string {
  const key = import.meta.env.VITE_QOS_KEY;
  if (!key) {
    console.warn('VITE_QOS_KEY环境变量未配置');
    return '';
  }
  return key;
}

/**
 * 从QOS API获取大宗商品行情
 * @param symbol 产品代码，如XAUUSD、XAGUSD、600519
 * @returns BlockTradeInfo对象，失败返回null
 */
export async function fetchQOSQuote(symbol: string): Promise<BlockTradeInfo | null> {
  try {
    // 1. 检查产品是否在允许列表中
    if (!isSymbolAllowed(symbol)) {
      console.warn(`产品 ${symbol} 不在VITE_QOS_PRODUCTS允许列表中，触发降级`);
      return null;
    }
    
    // 2. 限流控制
    await QOSRateLimiter.waitIfNeeded();
    
    // 3. 获取API密钥
    const apiKey = getQOSApiKey();
    if (!apiKey) {
      console.warn('QOS API密钥未配置，触发降级');
      return null;
    }
    
    // 4. 调用QOS API
    // 根据实际API文档调整URL和参数
    const apiUrl = `https://api.qos.hk/quote?code=${encodeURIComponent(symbol)}&key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': '银河证券-证裕交易单元/1.0'
      },
      timeout: 10000 // 10秒超时
    } as RequestInit & { timeout?: number });

    if (!response.ok) {
      console.warn(`QOS API请求失败: HTTP ${response.status}`);
      return null;
    }

    const data: QOSQuoteResponse = await response.json();
    
    // 5. 验证返回数据
    if (!data || !data.code || data.price === undefined) {
      console.warn('QOS API返回数据格式异常');
      return null;
    }
    
    // 6. 构建大宗交易信息
    const blockTradeInfo: BlockTradeInfo = {
      symbol: data.code,
      name: data.name || symbol,
      price: data.price || 0,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      volume: data.volume || 0,
      minBlockSize: calculateMinBlockSize(symbol, data.price || 0),
      blockDiscount: calculateBlockDiscount(symbol),
      market: getMarketType(symbol),
      lastUpdated: data.timestamp || new Date().toISOString()
    };
    
    console.log(`从QOS API获取到 ${symbol} 行情数据`);
    return blockTradeInfo;
  } catch (error) {
    console.error(`获取QOS行情数据失败 (${symbol}):`, error);
    return null;
  }
}

/**
 * 计算最小大宗交易数量
 * 根据产品类型和价格动态计算
 */
function calculateMinBlockSize(symbol: string, price: number): number {
  // 默认规则：大宗交易通常有最小交易额要求
  // 贵金属：最小交易额约10万美元
  // 股票：最小交易额约100万人民币
  // 可根据实际业务需求调整
  
  if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
    // 贵金属：最小交易额10万美元
    const minAmountUSD = 100000;
    return Math.ceil(minAmountUSD / price);
  } else if (/^\d{6}$/.test(symbol)) {
    // A股：最小交易额100万人民币
    const minAmountCNY = 1000000;
    return Math.ceil(minAmountCNY / price);
  } else {
    // 其他产品：默认最小交易额5万美元
    const minAmountUSD = 50000;
    return Math.ceil(minAmountUSD / price);
  }
}

/**
 * 计算大宗交易折扣率
 * 根据产品类型和市场情况动态计算
 */
function calculateBlockDiscount(symbol: string): number {
  // 默认折扣率：大宗交易通常有折扣
  // 贵金属：通常无折扣或很小折扣
  // 股票：通常有5-10%折扣
  // 可根据实际业务需求调整
  
  if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
    // 贵金属：流动性好，折扣小
    return 0.99; // 99折
  } else if (/^\d{6}$/.test(symbol)) {
    // A股：通常有较大折扣
    return 0.90; // 9折
  } else {
    // 其他产品：默认折扣
    return 0.95; // 95折
  }
}

/**
 * 根据产品代码判断市场类型
 */
function getMarketType(symbol: string): string {
  if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
    return 'COMMODITY';
  } else if (/^\d{6}$/.test(symbol)) {
    // A股代码
    if (symbol.startsWith('6')) {
      return 'SH'; // 沪市
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
      return 'SZ'; // 深市
    } else if (symbol.startsWith('8')) {
      return 'BJ'; // 北交所
    }
  }
  return 'OTHER';
}

/**
 * 批量获取QOS行情数据
 */
export async function fetchQOSQuotes(symbols: string[]): Promise<Record<string, BlockTradeInfo | null>> {
  const results: Record<string, BlockTradeInfo | null> = {};
  
  // 顺序请求，避免同时触发限流
  for (const symbol of symbols) {
    results[symbol] = await fetchQOSQuote(symbol);
  }
  
  return results;
}

/**
 * 缓存装饰器
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cacheKey: string,
  ttl: number = 30 * 1000 // 默认30秒缓存
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

// 带缓存的QOS行情获取函数
export const fetchQOSQuoteWithCache = withCache(fetchQOSQuote, 'qos_quote');
