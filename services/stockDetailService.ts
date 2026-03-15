/**
 * 个股详情数据服务 - 统一代理模式
 * 
 * 数据策略：
 * - 所有行情数据通过 proxy-market Edge Function 代理
 * - 自动 Redis 缓存
 * - 失败时降级到模拟数据
 */

import { marketApi, StockQuote as ApiStockQuote } from './marketApi';
import { supabase } from '@/lib/supabase';

// ==================== 缓存管理 ====================

class StockDetailCache {
  private static readonly CACHE_PREFIX = 'stock_detail_';
  private static readonly QUOTE_TTL = 30 * 1000; // 30秒
  private static readonly ORDER_BOOK_TTL = 10 * 1000; // 10秒
  private static readonly KLINE_TTL = 5 * 60 * 1000; // 5分钟
  private static readonly COMPANY_TTL = 30 * 60 * 1000; // 30分钟
  
  private static memoryCache = new Map<string, { data: any; expiry: number }>();
  
  static set(key: string, data: any, ttl: number): void {
    const expiry = Date.now() + ttl;
    this.memoryCache.set(key, { data, expiry });
    
    // 同步到 localStorage（持久化）
    try {
      localStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify({ data, expiry }));
    } catch (e) {
      console.warn('缓存写入 localStorage 失败:', e);
    }
  }
  
  static get<T>(key: string): T | null {
    // 先检查内存缓存
    const memCached = this.memoryCache.get(key);
    if (memCached && Date.now() < memCached.expiry) {
      return memCached.data as T;
    }
    
    // 再检查 localStorage
    try {
      const item = localStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (item) {
        const parsed = JSON.parse(item);
        if (Date.now() < parsed.expiry) {
          // 回写内存缓存
          this.memoryCache.set(key, parsed);
          return parsed.data as T;
        } else {
          // 过期，删除
          localStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
        }
      }
    } catch (e) {
      console.warn('缓存读取失败:', e);
    }
    
    return null;
  }
  
  static delete(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (e) {
      // ignore
    }
  }
  
  static clear(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      // ignore
    }
  }
  
  // 清理过期缓存
  static cleanup(): void {
    const now = Date.now();
    
    // 清理内存缓存
    for (const [key, value] of this.memoryCache.entries()) {
      if (now >= value.expiry) {
        this.memoryCache.delete(key);
      }
    }
    
    // 清理 localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.CACHE_PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (now >= parsed.expiry) {
                keysToRemove.push(key);
              }
            } catch {
              keysToRemove.push(key);
            }
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      // ignore
    }
  }
}

// 定期清理过期缓存（每分钟）
if (typeof window !== 'undefined') {
  setInterval(() => StockDetailCache.cleanup(), 60 * 1000);
}

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
  turnoverRate?: number;
  market: 'CN' | 'HK';
  timestamp: string;
}

export interface OrderBookLevel {
  level: number;
  price: number;
  volume: number;
}

export interface OrderBook {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
}

export interface TradeTick {
  time: string;
  price: number;
  volume: number;
  direction: 'BUY' | 'SELL';
}

export interface KLineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
}

export interface MoneyFlow {
  mainNetInflow: number;
  retailNetInflow: number;
  superLargeNetInflow: number;
  largeNetInflow: number;
  mediumNetInflow: number;
  smallNetInflow: number;
  timestamp?: string;
}

export interface FinancialData {
  pe: number;
  pb: number;
  marketCap: string;
  totalShares: string;
  floatShares: string;
  dividendYield: string;
  roe: string;
  netProfitMargin: string;
  grossProfitMargin?: string;
  debtRatio?: string;
}

export interface CompanyInfo {
  symbol: string;
  name: string;
  industry: string;
  sector: string;
  listingDate: string;
  description: string;
  chairman: string;
  employees: string;
  website: string;
  mainBusiness: string;
}

// ==================== 股票名称映射 ====================
const STOCK_NAMES: Record<string, Record<string, string>> = {
  CN: {
    '600519': '贵州茅台',
    '000858': '五粮液',
    '601318': '中国平安',
    '000001': '平安银行',
    '300750': '宁德时代',
    '600036': '招商银行',
    '601166': '兴业银行',
    '600887': '伊利股份',
    '600276': '恒瑞医药',
    '600900': '长江电力',
    '601398': '工商银行',
    '601288': '农业银行',
    '600030': '中信证券',
    '601888': '中国中免',
    '002594': '比亚迪',
    '000333': '美的集团',
    '600000': '浦发银行',
    '000002': '万科A',
    '601012': '隆基绿能',
    '002415': '海康威视',
    '601988': '中国银行',
    '601211': '国泰君安',
    '600837': '海通证券',
  },
  HK: {
    '00700': '腾讯控股',
    '09988': '阿里巴巴-SW',
    '03690': '美团-W',
    '01810': '小米集团-W',
    '01024': '快手-W',
    '00941': '中国移动',
    '02318': '中国平安',
    '01299': '友邦保险',
    '00883': '中国海洋石油',
    '00388': '香港交易所',
    '01398': '工商银行',
    '03988': '中国银行',
    '00005': '汇丰控股',
    '01109': '华润置地',
    '01918': '融创中国',
  }
};

// ==================== 辅助函数 ====================

function getStockName(symbol: string, market: 'CN' | 'HK'): string {
  return STOCK_NAMES[market]?.[symbol] || `${market === 'HK' ? '港股' : '股票'} ${symbol}`;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateRandomPrice(basePrice: number): number {
  const changePercent = randomInRange(-0.05, 0.05);
  return basePrice * (1 + changePercent);
}

// ==================== 行情代理服务 ====================

async function fetchFromProxy(symbol: string, market: 'CN' | 'HK'): Promise<Partial<StockQuote> | null> {
  try {
    const quote = await marketApi.getStockQuote(symbol, market);
    if (!quote || !quote.price) return null;
    
    return {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      prevClose: quote.prevClose,
      volume: quote.volume,
      amount: quote.amount,
      market: quote.market,
      timestamp: quote.timestamp,
    };
  } catch (error) {
    console.warn('[行情代理] 获取失败:', error);
    return null;
  }
}

// ==================== 模拟数据生成 ====================

function generateMockQuote(symbol: string, market: 'CN' | 'HK'): StockQuote {
  const name = getStockName(symbol, market);
  
  // 根据股票代码生成合理的基准价格
  let basePrice = 50;
  if (symbol === '600519') basePrice = 1688; // 茅台
  else if (symbol === '000858') basePrice = 156; // 五粮液
  else if (symbol === '00700') basePrice = 380; // 腾讯
  else if (symbol === '09988') basePrice = 85; // 阿里
  else if (symbol === '03690') basePrice = 128; // 美团
  else if (symbol.startsWith('6') || symbol.startsWith('0')) basePrice = randomInRange(10, 100);
  else basePrice = randomInRange(5, 50);
  
  const price = generateRandomPrice(basePrice);
  const change = price - basePrice;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol,
    name,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    open: Math.round(basePrice * randomInRange(0.98, 1.02) * 100) / 100,
    high: Math.round(basePrice * randomInRange(1.01, 1.05) * 100) / 100,
    low: Math.round(basePrice * randomInRange(0.95, 0.99) * 100) / 100,
    prevClose: Math.round(basePrice * 100) / 100,
    volume: Math.floor(randomInRange(1000000, 50000000)),
    amount: Math.floor(randomInRange(100000000, 5000000000)),
    market,
    timestamp: new Date().toISOString(),
  };
}

function generateMockOrderBook(price: number): OrderBook {
  const asks: OrderBookLevel[] = [];
  const bids: OrderBookLevel[] = [];
  
  for (let i = 0; i < 5; i++) {
    asks.push({
      level: 5 - i,
      price: Math.round((price + (5 - i) * 0.01) * 100) / 100,
      volume: Math.floor(randomInRange(1000, 50000)),
    });
    bids.push({
      level: i + 1,
      price: Math.round((price - (i + 1) * 0.01) * 100) / 100,
      volume: Math.floor(randomInRange(1000, 50000)),
    });
  }
  
  return { asks, bids };
}

function generateMockTradeTicks(price: number): TradeTick[] {
  const ticks: TradeTick[] = [];
  const now = new Date();
  
  for (let i = 0; i < 30; i++) {
    const time = new Date(now.getTime() - i * 3000);
    const tickPrice = price * randomInRange(0.99, 1.01);
    ticks.push({
      time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: Math.round(tickPrice * 100) / 100,
      volume: Math.floor(randomInRange(100, 2000)),
      direction: Math.random() > 0.5 ? 'BUY' : 'SELL',
    });
  }
  
  return ticks;
}

function generateMockKLineData(basePrice: number): KLineData[] {
  const data: KLineData[] = [];
  const today = new Date();
  let price = basePrice;
  
  for (let i = 60; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const change = randomInRange(-0.03, 0.03);
    price = price * (1 + change);
    
    const open = price * randomInRange(0.98, 1.02);
    const close = price;
    const high = Math.max(open, close) * randomInRange(1, 1.02);
    const low = Math.min(open, close) * randomInRange(0.98, 1);
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(randomInRange(1000000, 20000000)),
      amount: Math.floor(randomInRange(10000000, 100000000)),
    });
  }
  
  return data;
}

function generateMockMoneyFlow(): MoneyFlow {
  const mainNetInflow = randomInRange(-100000000, 100000000);
  const retailNetInflow = -mainNetInflow * randomInRange(0.3, 0.7);
  
  return {
    mainNetInflow: Math.round(mainNetInflow),
    retailNetInflow: Math.round(retailNetInflow),
    superLargeNetInflow: Math.round(mainNetInflow * randomInRange(0.3, 0.5)),
    largeNetInflow: Math.round(mainNetInflow * randomInRange(0.2, 0.4)),
    mediumNetInflow: Math.round(randomInRange(-20000000, 20000000)),
    smallNetInflow: Math.round(randomInRange(-30000000, 30000000)),
    timestamp: new Date().toISOString(),
  };
}

function generateMockFinancialData(): FinancialData {
  return {
    pe: Math.round(randomInRange(10, 50) * 10) / 10,
    pb: Math.round(randomInRange(1, 5) * 100) / 100,
    marketCap: `${Math.floor(randomInRange(100, 5000))}亿`,
    totalShares: `${Math.floor(randomInRange(10, 100))}亿股`,
    floatShares: `${Math.floor(randomInRange(5, 50))}亿股`,
    dividendYield: `${Math.round(randomInRange(0.5, 5) * 10) / 10}%`,
    roe: `${Math.round(randomInRange(5, 20) * 10) / 10}%`,
    netProfitMargin: `${Math.round(randomInRange(5, 25) * 10) / 10}%`,
    grossProfitMargin: `${Math.round(randomInRange(20, 50) * 10) / 10}%`,
    debtRatio: `${Math.round(randomInRange(20, 60) * 10) / 10}%`,
  };
}

function generateMockCompanyInfo(symbol: string, market: 'CN' | 'HK'): CompanyInfo {
  const name = getStockName(symbol, market);
  
  const industries = ['金融', '科技', '消费', '医药', '能源', '地产', '制造', '互联网'];
  const sectors = ['主板', '创业板', '科创板', '港股主板'];
  
  return {
    symbol,
    name,
    industry: industries[Math.floor(Math.random() * industries.length)],
    sector: market === 'HK' ? '港股主板' : sectors[Math.floor(Math.random() * sectors.length)],
    listingDate: `20${Math.floor(randomInRange(10, 23))}-${String(Math.floor(randomInRange(1, 12))).padStart(2, '0')}-${String(Math.floor(randomInRange(1, 28))).padStart(2, '0')}`,
    description: `${name}是一家专注于主营业务的公司，在行业内具有较强的竞争优势。公司致力于为股东创造长期价值，持续推动业务创新和可持续发展。`,
    chairman: '张三',
    employees: `${Math.floor(randomInRange(1000, 50000))}人`,
    website: 'www.example.com',
    mainBusiness: '主营业务涵盖多个领域，包括产品研发、生产销售及服务等。',
  };
}

// ==================== 数据获取方法 ====================

/**
 * 获取股票实时行情
 * 策略：缓存 → 东方财富API → 模拟数据
 */
export async function getStockQuote(symbol: string, market: 'CN' | 'HK'): Promise<StockQuote | null> {
  // 1. 先检查缓存
  const cacheKey = `quote_${market}_${symbol}`;
  const cached = StockDetailCache.get<StockQuote>(cacheKey);
  if (cached) {
    console.log(`[缓存] 使用缓存行情: ${symbol}`);
    return cached;
  }
  
  try {
    // 2. 通过代理获取真实数据
    const realData = await fetchFromProxy(symbol, market);
    
    if (realData && realData.price) {
      console.log(`[东方财富] 获取行情成功: ${symbol}`);
      const quote: StockQuote = {
        symbol: realData.symbol || symbol,
        name: realData.name || getStockName(symbol, market),
        price: realData.price,
        change: realData.change || 0,
        changePercent: realData.changePercent || 0,
        open: realData.open || realData.price,
        high: realData.high || realData.price,
        low: realData.low || realData.price,
        prevClose: realData.prevClose || realData.price,
        volume: realData.volume || 0,
        amount: realData.amount || 0,
        market,
        timestamp: new Date().toISOString(),
      };
      
      // 存入缓存
      StockDetailCache.set(cacheKey, quote, StockDetailCache['QUOTE_TTL']);
      return quote;
    }
  } catch (error) {
    console.warn('[行情获取] 东方财富API失败，使用模拟数据:', error);
  }
  
  // 3. 使用模拟数据
  console.log(`[模拟数据] 生成行情: ${symbol}`);
  const mockQuote = generateMockQuote(symbol, market);
  
  // 模拟数据也缓存（较短时间）
  StockDetailCache.set(cacheKey, mockQuote, 10 * 1000);
  return mockQuote;
}

/**
 * 获取五档行情
 */
export async function getOrderBook(symbol: string): Promise<OrderBook | null> {
  // 检查缓存
  const cacheKey = `orderbook_${symbol}`;
  const cached = StockDetailCache.get<OrderBook>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 判断市场
  const market: 'CN' | 'HK' = symbol.length === 5 ? 'HK' : 'CN';
  
  try {
    // 使用代理获取真实五档数据
    const orderBookData = await marketApi.getOrderBook(symbol, market);
    
    if (orderBookData && orderBookData.bids.length > 0) {
      const orderBook: OrderBook = {
        asks: orderBookData.asks.map((item: any, index: number) => ({
          level: 5 - index,
          price: item.price,
          volume: item.volume,
        })),
        bids: orderBookData.bids.map((item: any, index: number) => ({
          level: index + 1,
          price: item.price,
          volume: item.volume,
        })),
      };
      
      StockDetailCache.set(cacheKey, orderBook, StockDetailCache['ORDER_BOOK_TTL']);
      console.log(`[真实数据] 获取五档成功: ${symbol}`);
      return orderBook;
    }
  } catch (error) {
    console.warn('[五档数据] 东方财富API失败，使用模拟数据:', error);
  }
  
  // 获取当前价格作为基础
  const quote = await getStockQuote(symbol, market);
  const price = quote?.price || 50;
  
  console.log(`[模拟数据] 生成五档: ${symbol}`);
  const orderBook = generateMockOrderBook(price);
  
  // 缓存
  StockDetailCache.set(cacheKey, orderBook, StockDetailCache['ORDER_BOOK_TTL']);
  return orderBook;
}

/**
 * 获取成交明细
 */
export async function getTradeTicks(symbol: string): Promise<TradeTick[]> {
  // 检查缓存
  const cacheKey = `ticks_${symbol}`;
  const cached = StockDetailCache.get<TradeTick[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 判断市场
  const market: 'CN' | 'HK' = symbol.length === 5 ? 'HK' : 'CN';
  
  try {
    // 使用静态导入的 marketApi 获取真实成交明细
    const ticksData = await marketApi.getTradeTicks(symbol, market);
    
    if (ticksData && ticksData.length > 0) {
      StockDetailCache.set(cacheKey, ticksData, 5 * 1000);
      console.log(`[真实数据] 获取成交明细成功: ${symbol}`);
      return ticksData;
    }
  } catch (error) {
    console.warn('[成交明细] 东方财富API失败，使用模拟数据:', error);
  }
  
  // 获取当前价格作为基础
  const quote = await getStockQuote(symbol, market);
  const price = quote?.price || 50;
  
  console.log(`[模拟数据] 生成成交明细: ${symbol}`);
  return generateMockTradeTicks(price);
}

/**
 * 获取K线数据
 */
export async function getKLineData(
  symbol: string, 
  period: 'day' | 'week' | 'month' | '1m' | '5m' | '15m' | '30m' | '60m' = 'day',
  limit: number = 100
): Promise<KLineData[]> {
  // 检查缓存
  const cacheKey = `kline_${symbol}_${period}_${limit}`;
  const cached = StockDetailCache.get<KLineData[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 判断市场
  const market: 'CN' | 'HK' = symbol.length === 5 ? 'HK' : 'CN';
  
  try {
    // 使用东方财富K线API
    const klineData = await fetchEastmoneyKLine(symbol, market, period, limit);
    if (klineData && klineData.length > 0) {
      StockDetailCache.set(cacheKey, klineData, StockDetailCache['KLINE_TTL']);
      console.log(`[真实数据] 获取K线成功: ${symbol} ${period}`);
      return klineData;
    }
  } catch (error) {
    console.warn('[K线数据] 东方财富API失败，使用模拟数据:', error);
  }
  
  // 获取当前价格作为基础
  const quote = await getStockQuote(symbol, market);
  const price = quote?.price || 50;
  
  console.log(`[模拟数据] 生成K线: ${symbol} ${period}`);
  const klineData = generateMockKLineData(price);
  
  // 缓存
  StockDetailCache.set(cacheKey, klineData, StockDetailCache['KLINE_TTL']);
  return klineData;
}

/**
 * K线数据获取 - 通过代理
 */
async function fetchKlineFromProxy(
  symbol: string, 
  market: 'CN' | 'HK', 
  period: 'day' | 'week' | 'month' | '1m' | '5m' | '15m' | '30m' | '60m',
  limit: number
): Promise<KLineData[]> {
  try {
    // 日 K 使用代理获取价格数组，然后构造 K 线数据
    if (period === 'day') {
      const prices = await marketApi.getKline(symbol, market, limit);
      if (prices.length > 0) {
        // 返回简化的 K 线数据（只有收盘价）
        return prices.map((close, index) => ({
          time: `Day-${index + 1}`,
          open: close,
          close,
          high: close,
          low: close,
          volume: 0,
          amount: 0,
        }));
      }
    }
    
    // 其他周期暂时使用模拟数据
    return [];
  } catch (error) {
    console.warn('[K线代理] 获取失败:', error);
    return [];
  }
}

// 保留原函数名作为别名
const fetchEastmoneyKLine = fetchKlineFromProxy;

/**
 * 获取资金流向
 */
export async function getMoneyFlow(symbol: string): Promise<MoneyFlow | null> {
  // 检查缓存
  const cacheKey = `moneyflow_${symbol}`;
  const cached = StockDetailCache.get<MoneyFlow>(cacheKey);
  if (cached) {
    return cached;
  }
  
  console.log(`[模拟数据] 生成资金流向: ${symbol}`);
  const moneyFlow = generateMockMoneyFlow();
  
  // 缓存（资金流向1分钟）
  StockDetailCache.set(cacheKey, moneyFlow, 60 * 1000);
  return moneyFlow;
}

/**
 * 获取财务数据
 */
export async function getFinancialData(symbol: string, name: string): Promise<FinancialData | null> {
  // 检查缓存
  const cacheKey = `financial_${symbol}`;
  const cached = StockDetailCache.get<FinancialData>(cacheKey);
  if (cached) {
    return cached;
  }
  
  console.log(`[模拟数据] 生成财务数据: ${symbol}`);
  const financialData = generateMockFinancialData();
  
  // 缓存（财务数据30分钟）
  StockDetailCache.set(cacheKey, financialData, StockDetailCache['COMPANY_TTL']);
  return financialData;
}

/**
 * 获取公司资料
 */
export async function getCompanyInfo(symbol: string, name: string): Promise<CompanyInfo | null> {
  // 检查缓存
  const cacheKey = `company_${symbol}`;
  const cached = StockDetailCache.get<CompanyInfo>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 判断市场
  const market: 'CN' | 'HK' = symbol.length === 5 && /^[0-9]+$/.test(symbol) ? 'HK' : 'CN';
  console.log(`[模拟数据] 生成公司资料: ${symbol}`);
  const companyInfo = generateMockCompanyInfo(symbol, market);
  
  // 缓存
  StockDetailCache.set(cacheKey, companyInfo, StockDetailCache['COMPANY_TTL']);
  return companyInfo;
}

/**
 * 批量获取股票行情
 */
export async function getBatchQuotes(symbols: string[], market: 'CN' | 'HK'): Promise<StockQuote[]> {
  const quotes: StockQuote[] = [];
  
  for (const symbol of symbols) {
    const quote = await getStockQuote(symbol, market);
    if (quote) {
      quotes.push(quote);
    }
  }
  
  return quotes;
}

export default {
  getStockQuote,
  getOrderBook,
  getTradeTicks,
  getKLineData,
  getMoneyFlow,
  getFinancialData,
  getCompanyInfo,
  getBatchQuotes,
  // 缓存管理
  clearCache: () => StockDetailCache.clear(),
  clearQuoteCache: (symbol: string, market: 'CN' | 'HK') => StockDetailCache.delete(`quote_${market}_${symbol}`),
};
