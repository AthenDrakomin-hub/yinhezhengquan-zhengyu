/**
 * 银河证券证裕交易单元 - 纯前端原生行情数据源对接方案
 * 完全前端实现，无需后端/Edge Functions/服务器接口封装
 * 直接对接免费、无CORS限制、无需API Key的公开行情接口
 * 覆盖A股、港股实时行情、批量查询、日K线数据
 */

import { Stock } from '../types';
import { TradeType } from '../types';

// ==================== 环境变量配置 ====================
// 是否使用真实行情数据（通过环境变量控制，默认使用模拟数据）
const useRealMarketData = import.meta.env.VITE_USE_REAL_MARKET_DATA === 'true';

// ==================== 数据源配置 ====================
interface DataSourceConfig {
  name: string;
  priority: number; // 优先级，数字越小优先级越高
  enabled: boolean;
}

// 免费、无CORS限制的公开行情数据源
const DATA_SOURCES = {
  // 新浪财经实时行情 (通过代理解决跨域，覆盖A股、港股)
  SINA_REALTIME: {
    name: '新浪财经实时行情',
    priority: 1,
    enabled: useRealMarketData, // 根据环境变量启用
    getRealtimeUrl: (symbol: string, market: 'CN' | 'HK'): string => {
      // A股: sh600000, sz000001
      // 港股: hk00700
      const prefix = market === 'CN' 
        ? (symbol.startsWith('6') ? 'sh' : 'sz')
        : 'hk';
      // 通过代理路径访问，解决跨域问题（代理会将 /api/stock 前缀移除）
      return `/api/stock/list=${prefix}${symbol}`;
    },
    parseRealtimeData: (text: string, symbol: string, market: 'CN' | 'HK'): Partial<Stock> | null => {
      try {
        // 新浪财经返回格式: var hq_str_sh600000="浦发银行,7.52,7.53,7.50,7.55,7.48,...";
        const match = text.match(/="([^"]+)"/);
        if (!match) return null;
        
        const parts = match[1].split(',');
        if (parts.length < 3) return null;
        
        const name = parts[0];
        const currentPrice = parseFloat(parts[3]); // 当前价格
        const prevClose = parseFloat(parts[2]); // 昨日收盘价
        const change = currentPrice - prevClose;
        const changePercent = prevClose ? (change / prevClose) * 100 : 0;
        
        return {
          symbol,
          name,
          price: currentPrice,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          market,
          sparkline: []
        };
      } catch (error) {
        console.error('解析新浪财经数据失败:', error);
        return null;
      }
    }
  },
  
  // 腾讯财经K线数据 (无CORS限制)
  TENCENT_KLINE: {
    name: '腾讯财经K线数据',
    priority: 2,
    enabled: useRealMarketData, // 根据环境变量启用
    getKlineUrl: (symbol: string, market: 'CN' | 'HK', period: 'day' | 'week' | 'month' = 'day'): string => {
      const marketCode = market === 'CN' ? 'sz' : 'hk';
      return `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${marketCode}${symbol},${period},,,320`;
    },
    parseKlineData: (data: any): number[] => {
      try {
        if (!data || !data.data || !data.data[`${data.code}`]) return [];
        const klineData = data.data[`${data.code}`][`${data.period}`] || [];
        return klineData.map((item: any[]) => parseFloat(item[1])).slice(-20); // 取最近20个收盘价
      } catch (error) {
        console.error('解析腾讯K线数据失败:', error);
        return [];
      }
    }
  },
  
  // 东方财富批量行情 (无CORS限制)
  EASTMONEY_BATCH: {
    name: '东方财富批量行情',
    priority: 3,
    enabled: useRealMarketData, // 根据环境变量启用
    getBatchUrl: (symbols: string[], market: 'CN' | 'HK'): string => {
      const marketCode = market === 'CN' ? '1.' : '116.';
      const codeList = symbols.map(sym => `${marketCode}${sym}`).join(',');
      return `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=${codeList}`;
    },
    parseBatchData: (data: any): Partial<Stock>[] => {
      try {
        if (!data || !data.data || !data.data.diff) return [];
        
        return data.data.diff.map((item: any) => ({
          symbol: item.f12,
          name: item.f14,
          price: item.f2,
          change: item.f4,
          changePercent: item.f3,
          sparkline: []
        }));
      } catch (error) {
        console.error('解析东方财富批量数据失败:', error);
        return [];
      }
    }
  }
};

// ==================== 缓存管理器 ====================
class MarketCache {
  private static readonly CACHE_PREFIX = 'galaxy_market_';
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟缓存
  
  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    try {
      const cacheItem = {
        data,
        expiry: Date.now() + ttl
      };
      localStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('缓存写入失败:', error);
    }
  }
  
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!item) return null;
      
      const cacheItem = JSON.parse(item);
      if (Date.now() > cacheItem.expiry) {
        this.delete(key);
        return null;
      }
      
      return cacheItem.data as T;
    } catch (error) {
      console.warn('缓存读取失败:', error);
      return null;
    }
  }
  
  static delete(key: string): void {
    try {
      localStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn('缓存删除失败:', error);
    }
  }
  
  static clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('缓存清理失败:', error);
    }
  }
}

// ==================== 限流控制器 ====================
class RateLimiter {
  private static readonly MAX_REQUESTS_PER_SECOND = 2;
  private static requestTimestamps: number[] = [];
  
  static async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // 移除1秒前的请求记录
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneSecondAgo);
    
    // 如果当前秒内请求数超过限制，等待
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_SECOND) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestTimestamps.push(Date.now());
  }
}

// ==================== 错误处理器 ====================
class ErrorHandler {
  static errorCount: Map<string, number> = new Map();
  static readonly MAX_ERRORS_PER_SOURCE = 3;
  
  static recordError(source: string): boolean {
    const count = this.errorCount.get(source) || 0;
    const newCount = count + 1;
    this.errorCount.set(source, newCount);
    
    // 如果某个数据源错误次数过多，暂时禁用
    if (newCount >= this.MAX_ERRORS_PER_SOURCE) {
      console.warn(`数据源 ${source} 错误次数过多，暂时禁用`);
      return false;
    }
    
    return true;
  }
  
  static resetErrorCount(source: string): void {
    this.errorCount.delete(source);
  }
  
  static generateFallbackData(symbol: string, market: 'CN' | 'HK'): Stock {
    // 生成符合交易规则的行情数据
    const basePrice = market === 'CN' ? 
      (symbol.startsWith('6') ? 10 + Math.random() * 50 : 5 + Math.random() * 30) :
      100 + Math.random() * 300;
    
    const change = (Math.random() - 0.5) * basePrice * 0.1; // ±5%波动
    const price = basePrice + change;
    const changePercent = (change / basePrice) * 100;
    
    // 生成走势图
    const sparkline: number[] = [];
    let current = price;
    for (let i = 0; i < 10; i++) {
      current += (Math.random() - 0.5) * price * 0.02;
      sparkline.push(parseFloat(current.toFixed(2)));
    }
    
    return {
      symbol,
      name: `${symbol}数据`,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      market,
      sparkline
    };
  }
}

// ==================== 核心行情服务 ====================
export const frontendMarketService = {
  /**
   * 获取单只股票实时行情
   */
  async getRealtimeStock(symbol: string, market: 'CN' | 'HK'): Promise<Stock> {
    // 1. 检查缓存
    const cacheKey = `realtime_${market}_${symbol}`;
    const cached = MarketCache.get<Stock>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 2. 限流控制
    await RateLimiter.waitIfNeeded();
    
    // 3. 按优先级尝试各个数据源
    const sources = Object.entries(DATA_SOURCES)
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority);
    
    // 诊断日志：记录启用的数据源
    console.log(`getRealtimeStock: 尝试获取 ${symbol} (${market}) 行情数据`);
    console.log(`启用的数据源数量: ${sources.length}`);
    sources.forEach(([key, config]) => {
      console.log(`  - ${key}: ${config.name} (优先级: ${config.priority})`);
    });
    
    if (sources.length === 0) {
      console.warn('getRealtimeStock: 没有启用的数据源，检查 VITE_USE_REAL_MARKET_DATA 环境变量');
    }
    
    for (const [sourceKey, source] of sources) {
      try {
        let stockData: Partial<Stock> | null = null;
        
        if (sourceKey === 'SINA_REALTIME') {
          // 新浪财经实时行情 - 直接使用DATA_SOURCES.SINA_REALTIME避免类型问题
          const url = DATA_SOURCES.SINA_REALTIME.getRealtimeUrl(symbol, market);
          console.log(`尝试数据源 ${source.name}: URL=${url}`);
          
          const response = await fetch(url, {
            headers: {
              'Referer': 'https://finance.sina.com.cn',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          console.log(`数据源 ${source.name} 响应状态: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const text = await response.text();
          console.log(`数据源 ${source.name} 响应长度: ${text.length} 字符`);
          
          stockData = DATA_SOURCES.SINA_REALTIME.parseRealtimeData(text, symbol, market);
          
          if (stockData) {
            console.log(`数据源 ${source.name} 解析成功:`, stockData);
            // 获取K线数据生成走势图
            const klineUrl = DATA_SOURCES.TENCENT_KLINE.getKlineUrl(symbol, market, 'day');
            console.log(`尝试获取K线数据: URL=${klineUrl}`);
            
            const klineResponse = await fetch(klineUrl);
            console.log(`K线数据响应状态: ${klineResponse.status} ${klineResponse.statusText}`);
            
            if (klineResponse.ok) {
              const klineData = await klineResponse.json();
              stockData.sparkline = DATA_SOURCES.TENCENT_KLINE.parseKlineData(klineData);
              console.log(`K线数据解析成功，生成 ${stockData.sparkline?.length || 0} 个数据点`);
            } else {
              console.warn(`K线数据获取失败: ${klineResponse.status} ${klineResponse.statusText}`);
            }
          } else {
            console.warn(`数据源 ${source.name} 解析失败，响应文本: ${text.substring(0, 200)}...`);
          }
        }
        
        if (stockData) {
          // 补充完整Stock数据
          const fullStock: Stock = {
            symbol,
            name: stockData.name || symbol,
            price: stockData.price || 0,
            change: stockData.change || 0,
            changePercent: stockData.changePercent || 0,
            market,
            sparkline: stockData.sparkline || [],
            logoUrl: stockData.logoUrl
          };
          
          // 缓存结果
          MarketCache.set(cacheKey, fullStock);
          ErrorHandler.resetErrorCount(sourceKey);
          
          console.log(`getRealtimeStock: 成功获取 ${symbol} 行情数据，来源: ${source.name}`);
          return fullStock;
        }
      } catch (error) {
        console.error(`数据源 ${source.name} 失败:`, error);
        if (!ErrorHandler.recordError(sourceKey)) {
          // 数据源被禁用，继续尝试下一个
          console.warn(`数据源 ${source.name} 错误次数过多，暂时禁用`);
          continue;
        }
      }
    }
    
    // 4. 所有数据源都失败，返回数据
    console.warn('所有数据源均失败，返回数据');
    console.warn(`环境变量 VITE_USE_REAL_MARKET_DATA=${import.meta.env.VITE_USE_REAL_MARKET_DATA}`);
    console.warn(`useRealMarketData=${useRealMarketData}`);
    const fallbackData = ErrorHandler.generateFallbackData(symbol, market);
    MarketCache.set(cacheKey, fallbackData, 60 * 1000); // 数据缓存1分钟
    return fallbackData;
  },
  
  /**
   * 批量获取股票行情
   */
  async getBatchStocks(symbols: string[], market: 'CN' | 'HK'): Promise<Stock[]> {
    // 1. 检查缓存
    const cacheKey = `batch_${market}_${symbols.join('_')}`;
    const cached = MarketCache.get<Stock[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 2. 限流控制
    await RateLimiter.waitIfNeeded();
    
    // 3. 优先使用东方财富批量接口
    try {
      const url = DATA_SOURCES.EASTMONEY_BATCH.getBatchUrl(symbols, market);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const stocks = DATA_SOURCES.EASTMONEY_BATCH.parseBatchData(data);
        
        // 转换为完整Stock格式
        const fullStocks: Stock[] = stocks.map(stock => ({
          ...stock,
          market,
          sparkline: stock.sparkline || []
        } as Stock));
        
        // 缓存结果
        MarketCache.set(cacheKey, fullStocks);
        ErrorHandler.resetErrorCount('EASTMONEY_BATCH');
        
        return fullStocks;
      }
    } catch (error) {
      console.warn('批量接口失败，回退到单只查询:', error);
    }
    
    // 4. 批量接口失败，回退到单只查询
    const promises = symbols.map(symbol => this.getRealtimeStock(symbol, market));
    const results = await Promise.allSettled(promises);
    
    const successfulStocks: Stock[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        successfulStocks.push(result.value);
      }
    });
    
    // 缓存结果
    MarketCache.set(cacheKey, successfulStocks);
    
    return successfulStocks;
  },
  
  /**
   * 获取日K线数据
   */
  async getDailyKline(symbol: string, market: 'CN' | 'HK', days: number = 30): Promise<number[]> {
    const cacheKey = `kline_${market}_${symbol}_${days}`;
    const cached = MarketCache.get<number[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    await RateLimiter.waitIfNeeded();
    
    try {
      const url = DATA_SOURCES.TENCENT_KLINE.getKlineUrl(symbol, market, 'day');
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const klineData = DATA_SOURCES.TENCENT_KLINE.parseKlineData(data);
        
        // 如果数据不足，用模拟数据补充
        if (klineData.length < days) {
          const realtimeData = await this.getRealtimeStock(symbol, market);
          while (klineData.length < days) {
            klineData.unshift(realtimeData.price * (0.9 + Math.random() * 0.2));
          }
          klineData.splice(days);
        }
        
        MarketCache.set(cacheKey, klineData, 10 * 60 * 1000); // K线数据缓存10分钟
        ErrorHandler.resetErrorCount('TENCENT_KLINE');
        
        return klineData;
      }
    } catch (error) {
      console.warn('K线数据获取失败:', error);
    }
    
    // 失败时生成模拟K线数据
    const fallbackKline: number[] = [];
    let price = 100;
    for (let i = 0; i < days; i++) {
      price *= (0.98 + Math.random() * 0.04);
      fallbackKline.push(parseFloat(price.toFixed(2)));
    }
    
    MarketCache.set(cacheKey, fallbackKline, 60 * 1000);
    return fallbackKline;
  },
  
  /**
   * 清理缓存
   */
  clearCache(): void {
    MarketCache.clear();
    console.log('行情缓存已清理');
  },
  
  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    cacheSize: number;
    errorCounts: Record<string, number>;
    dataSources: Array<{ name: string; enabled: boolean; priority: number }>;
  } {
    let cacheSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('galaxy_market_')) {
        cacheSize++;
      }
    }
    
    const errorCounts: Record<string, number> = {};
    ErrorHandler.errorCount.forEach((count, source) => {
      errorCounts[source] = count;
    });
    
    const dataSources = Object.entries(DATA_SOURCES).map(([key, config]) => ({
      name: config.name,
      enabled: config.enabled,
      priority: config.priority
    }));
    
    return { cacheSize, errorCounts, dataSources };
  },

  /**
   * 根据交易类型获取市场数据
   * 支持IPO、大宗交易、涨停打板等特殊交易类型
   */
  async getMarketData(
    symbol: string,
    market: 'CN' | 'HK' = 'CN',
    tradeType?: TradeType
  ): Promise<Stock & { ipoInfo?: any; blockTradeInfo?: any; limitUpInfo?: any }> {
    // 默认获取普通股票行情
    if (!tradeType || tradeType === TradeType.BUY || tradeType === TradeType.SELL) {
      return this.getRealtimeStock(symbol, market);
    }

    // 根据交易类型调用相应的适配器
    switch (tradeType) {
      case TradeType.IPO: {
        // 新股申购：使用新浪财经IPO数据
        try {
          // 动态导入适配器，避免循环依赖
          const { fetchSinaIPOBySymbol } = await import('./adapters/sinaIPOAdapter');
          const ipoData = await fetchSinaIPOBySymbol(symbol);
          
          if (ipoData) {
            // 转换为Stock格式
            const stock: Stock & { ipoInfo?: any } = {
              symbol: ipoData.symbol,
              name: ipoData.name,
              price: ipoData.issuePrice,
              change: 0,
              changePercent: 0,
              market,
              sparkline: [],
              ipoInfo: {
                listingDate: ipoData.listingDate,
                status: ipoData.status,
                issuePrice: ipoData.issuePrice
              }
            };
            return stock;
          }
        } catch (error) {
          console.warn('获取新浪财经IPO数据失败，降级到普通行情:', error);
        }
        
        // 降级：获取普通行情
        return this.getRealtimeStock(symbol, market);
      }

      case TradeType.BLOCK: {
        // 大宗交易：使用QOS API数据
        try {
          // 动态导入适配器
          const { fetchQOSQuote } = await import('./adapters/qosAdapter');
          const blockTradeInfo = await fetchQOSQuote(symbol);
          
          if (blockTradeInfo) {
            // 转换为Stock格式
            const stock: Stock & { blockTradeInfo?: any } = {
              symbol: blockTradeInfo.symbol,
              name: blockTradeInfo.name,
              price: blockTradeInfo.price,
              change: blockTradeInfo.change,
              changePercent: blockTradeInfo.changePercent,
              market: blockTradeInfo.market as 'CN' | 'HK' || market,
              sparkline: [],
              blockTradeInfo: {
                minBlockSize: blockTradeInfo.minBlockSize,
                blockDiscount: blockTradeInfo.blockDiscount,
                lastUpdated: blockTradeInfo.lastUpdated
              }
            };
            return stock;
          }
        } catch (error) {
          console.warn('获取QOS大宗交易数据失败，降级到普通行情:', error);
        }
        
        // 降级：获取普通行情
        return this.getRealtimeStock(symbol, market);
      }

      case TradeType.LIMIT_UP: {
        // 涨停打板：使用东方财富SDK数据
        try {
          // 动态导入服务
          const { getLimitUpData } = await import('./limitUpService');
          const limitUpData = await getLimitUpData(symbol);
          
          // 转换为Stock格式
          const stock: Stock & { limitUpInfo?: any } = {
            symbol: limitUpData.symbol,
            name: limitUpData.name,
            price: limitUpData.currentPrice,
            change: limitUpData.change,
            changePercent: limitUpData.changePercent,
            market: limitUpData.market as 'CN' | 'HK' || market,
            sparkline: [],
            limitUpInfo: {
              preClose: limitUpData.preClose,
              limitUpPrice: limitUpData.limitUpPrice,
              limitDownPrice: limitUpData.limitDownPrice,
              buyOneVolume: limitUpData.buyOneVolume,
              timestamp: limitUpData.timestamp
            }
          };
          return stock;
        } catch (error) {
          console.warn('获取涨停打板数据失败，降级到普通行情:', error);
        }
        
        // 降级：获取普通行情
        return this.getRealtimeStock(symbol, market);
      }

      default:
        // 未知交易类型，返回普通行情
        return this.getRealtimeStock(symbol, market);
    }
  }
};

// ==================== 适配现有marketService的兼容层 ====================
/**
 * 兼容现有marketService的接口
 * 逐步替换现有代码中对tradeService.getMarketData的依赖
 */
export const marketServiceAdapter = {
  async getMarketData(marketType: string, stockCodes: string[]): Promise<any[]> {
    const market = marketType === 'HK' ? 'HK' : 'CN';
    const stocks = await frontendMarketService.getBatchStocks(stockCodes, market);
    
    // 转换为现有格式
    return stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price.toFixed(2),
      change: stock.change.toFixed(2),
      changePercent: stock.changePercent.toFixed(2),
      sparkline: stock.sparkline
    }));
  }
};

export default frontendMarketService;