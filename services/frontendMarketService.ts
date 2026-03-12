/**
 * 银河证券日斗投资单元 - 纯前端原生行情数据源对接方案
 * 完全前端实现，无需后端/Edge Functions/服务器接口封装
 * 直接对接免费、无CORS限制、无需API Key的公开行情接口
 * 覆盖A股、港股实时行情、批量查询、日K线数据
 */

import { Stock } from '../lib/types';
import { TradeType } from '../lib/types';

// ==================== 环境变量配置 ====================
// 是否使用真实行情数据（通过环境变量控制，默认使用模拟数据）
const useRealMarketData = import.meta.env.VITE_USE_REAL_MARKET_DATA === 'true';

// 是否启用模拟数据作为后备（始终启用）
const enableFallbackData = true;

// ==================== 股票名称映射表 ====================
const STOCK_NAMES: Record<string, Record<string, string>> = {
  CN: {
    // 主板蓝筹
    '600519': '贵州茅台',
    '000858': '五粮液',
    '601318': '中国平安',
    '000001': '平安银行',
    '600036': '招商银行',
    '601166': '兴业银行',
    '601398': '工商银行',
    '601288': '农业银行',
    '600000': '浦发银行',
    '600016': '民生银行',
    '601988': '中国银行',
    '601939': '建设银行',
    '600030': '中信证券',
    '601211': '国泰君安',
    '600837': '海通证券',
    '601688': '华泰证券',
    // 热门题材
    '300750': '宁德时代',
    '002594': '比亚迪',
    '000333': '美的集团',
    '002415': '海康威视',
    '601888': '中国中免',
    '600887': '伊利股份',
    '600276': '恒瑞医药',
    '600900': '长江电力',
    '000002': '万科A',
    '601012': '隆基绿能',
    '002352': '顺丰控股',
    '600309': '万华化学',
    '601899': '紫金矿业',
    '600585': '海螺水泥',
    '000063': '中兴通讯',
    '002714': '牧原股份',
    '300059': '东方财富',
    '600547': '山东黄金',
    '601225': '陕西煤业',
    '600019': '宝钢股份',
    '601668': '中国建筑',
    '600028': '中国石化',
    '601857': '中国石油',
    '600104': '上汽集团',
    '601390': '中国中铁',
    '601186': '中国铁建',
    '600150': '中国船舶',
    '601766': '中国中车',
    // 券商
    '601788': '光大证券',
    '600109': '国金证券',
    '000776': '广发证券',
    '002736': '国信证券',
    // 科技
    '002230': '科大讯飞',
    '002475': '立讯精密',
    '600588': '用友网络',
    '002032': '苏宁易购',
    // 医药
    '300760': '迈瑞医疗',
    '000538': '云南白药',
    '600196': '复星医药',
    '002007': '华兰生物',
    // 消费
    '000568': '泸州老窖',
    '002304': '洋河股份',
    '000895': '双汇发展',
    '603369': '今世缘',
    // 更多热门股（新增）
    '002371': '北方华创',
  },
  HK: {
    '00700': '腾讯控股',
    '09988': '阿里巴巴',
    '03690': '美团',
    '01810': '小米集团',
    '01024': '快手',
    '00941': '中国移动',
    '02318': '中国平安',
    '01299': '友邦保险',
    '00883': '中国海洋石油',
    '00388': '香港交易所',
    // 第2页港股
    '01109': '华润置地',
    '02313': '申洲国际',
    '00386': '中国石油化工',
    '00939': '建设银行',
    '00998': '中信银行',
    '02628': '中国人寿',
    '01398': '工商银行',
    '03988': '中国银行',
    '01288': '农业银行',
    '00960': '龙湖集团',
    // 第3页港股
    '02269': '药明生物',
    '00669': '中国电信',
    '02015': '理想汽车',
    '00285': '比亚迪电子',
    '00358': '江西铜业',
    '02382': '舜宇光学科技',
    '00688': '中国海外发展',
    '01088': '中国神华',
    '01378': '中国宏桥',
    '00522': 'ASMPT',
  }
};

// ==================== 数据源配置 ====================
interface DataSourceConfig {
  name: string;
  priority: number; // 优先级，数字越小优先级越高
  enabled: boolean;
}

// 免费、无CORS限制的公开行情数据源
const DATA_SOURCES = {
  // 东方财富实时行情 (无CORS限制，推荐首选)
  // 使用批量接口获取单只股票，因为单只接口不稳定
  EASTMONEY_REALTIME: {
    name: '东方财富实时行情',
    priority: 1,
    enabled: useRealMarketData,
    getRealtimeUrl: (symbol: string, market: 'CN' | 'HK'): string => {
      // 清理股票代码：移除 SH/SZ/HK 等前缀
      const cleanSymbol = symbol.replace(/^(SH|SZ|sh|sz|HK|hk)/, '');
      
      // 东方财富市场代码规则：
      // 1 = 沪市A股 (600/601/603/605/688科创板等)
      // 0 = 深市A股 (000/001/002/003/300创业板/301等)
      // 116 = 港股
      let marketCode = '1'; // 默认沪市
      
      if (market === 'HK') {
        marketCode = '116';
      } else {
        // 根据股票代码前缀判断市场
        const prefix = cleanSymbol.substring(0, 2);
        const prefix3 = cleanSymbol.substring(0, 3);
        
        // 深市：000/001/002/003/300/301
        if (['00', '30'].includes(prefix)) {
          marketCode = '0';
        }
        // 沪市：600/601/603/605/688/689
        else if (['60', '68'].includes(prefix)) {
          marketCode = '1';
        }
        // 北交所：8开头或4开头，也用0
        else if (cleanSymbol.startsWith('8') || cleanSymbol.startsWith('4')) {
          marketCode = '0';
        }
      }
      
      // 使用批量接口（ulist.np）获取单只股票，更稳定
      return `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=${marketCode}.${cleanSymbol}`;
    },
    parseRealtimeData: (data: any, symbol: string, market: 'CN' | 'HK'): Partial<Stock> | null => {
      try {
        // 批量接口返回格式: { data: { diff: [...] } }
        if (!data) {
          console.warn('东方财富返回数据为空');
          return null;
        }
        if (!data.data) {
          console.warn('东方财富返回数据缺少 data 字段:', JSON.stringify(data).substring(0, 200));
          return null;
        }
        if (!data.data.diff || data.data.diff.length === 0) {
          console.warn(`东方财富 diff 为空，股票代码可能不存在: symbol=${symbol}`);
          return null;
        }
        const item = data.data.diff[0];
        return {
          symbol: item.f12 || symbol,
          name: item.f14 || symbol,
          price: item.f2 || 0,
          change: item.f4 || 0,
          changePercent: item.f3 || 0,
          market,
          sparkline: []
        };
      } catch (error) {
        console.error('解析东方财富数据失败:', error);
        return null;
      }
    }
  },

  // 东方财富批量行情 (无CORS限制)
  EASTMONEY_BATCH: {
    name: '东方财富批量行情',
    priority: 2,
    enabled: useRealMarketData,
    getBatchUrl: (symbols: string[], market: 'CN' | 'HK'): string => {
      const codeList = symbols.map(sym => {
        // 清理股票代码：移除 SH/SZ/HK 等前缀
        const cleanSymbol = sym.replace(/^(SH|SZ|sh|sz|HK|hk)/, '');
        
        // 东方财富市场代码规则（与 getRealtimeUrl 保持一致）
        if (market === 'HK') {
          return `116.${cleanSymbol}`;
        }
        
        const prefix = cleanSymbol.substring(0, 2);
        
        // 深市：00/30 开头，或北交所 8/4 开头
        if (['00', '30'].includes(prefix) || cleanSymbol.startsWith('8') || cleanSymbol.startsWith('4')) {
          return `0.${cleanSymbol}`;
        }
        // 沪市：60/68 开头
        return `1.${cleanSymbol}`;
      }).join(',');
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
  },

  // 新浪财经实时行情 (有CORS限制，作为备选)
  SINA_REALTIME: {
    name: '新浪财经实时行情',
    priority: 3,
    enabled: false, // 禁用，因为有 CORS 限制
    getRealtimeUrl: (symbol: string, market: 'CN' | 'HK'): string => {
      const prefix = market === 'CN' 
        ? (symbol.startsWith('6') ? 'sh' : 'sz')
        : 'hk';
      return `https://hq.sinajs.cn/list=${prefix}${symbol}`;
    },
    parseRealtimeData: (text: string, symbol: string, market: 'CN' | 'HK'): Partial<Stock> | null => {
      try {
        // 新浪财经返回格式: var hq_str_sh600000="浦发银行,7.52,7.53,7.50,7.55,7.48,...";
        // 注意：新浪财经返回GBK编码，前端UTF-8解码会导致中文乱码
        // 解决方案：优先使用本地映射表的名称
        const match = text.match(/="([^"]+)"/);
        if (!match) return null;
        
        const parts = match[1].split(',');
        if (parts.length < 3) return null;
        
        // 优先使用本地映射表的名称，避免GBK编码问题
        const localName = STOCK_NAMES[market]?.[symbol];
        // 如果本地没有，尝试从API解析（可能会有乱码）
        const apiName = parts[0];
        // 判断是否为乱码（包含非ASCII字符但不是正常中文）
        const isGarbled = apiName && /[\u0000-\u001F\u007F-\u00FF]/.test(apiName);
        const name = localName || (isGarbled ? symbol : apiName) || symbol;
        
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
    priority: 4,
    enabled: useRealMarketData,
    getKlineUrl: (symbol: string, market: 'CN' | 'HK', period: 'day' | 'week' | 'month' = 'day'): string => {
      // 清理股票代码
      const cleanSymbol = symbol.replace(/^(SH|SZ|sh|sz|HK|hk)/, '');
      
      // 腾讯财经市场代码：sh=沪市, sz=深市, hk=港股
      let marketCode = 'sh'; // 默认沪市
      
      if (market === 'HK') {
        marketCode = 'hk';
      } else {
        const prefix = cleanSymbol.substring(0, 2);
        // 深市：00/30 开头
        if (['00', '30'].includes(prefix)) {
          marketCode = 'sz';
        }
        // 沪市：60/68 开头
        else if (['60', '68'].includes(prefix)) {
          marketCode = 'sh';
        }
        // 北交所或其他
        else if (cleanSymbol.startsWith('8') || cleanSymbol.startsWith('4')) {
          marketCode = 'bj'; // 北交所
        }
      }
      
      return `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${marketCode}${cleanSymbol},${period},,,320`;
    },
    parseKlineData: (data: any): number[] => {
      try {
        if (!data || !data.data || !data.data[`${data.code}`]) return [];
        const klineData = data.data[`${data.code}`][`${data.period}`] || [];
        return klineData.map((item: any[]) => parseFloat(item[1])).slice(-20);
      } catch (error) {
        console.error('解析腾讯K线数据失败:', error);
        return [];
      }
    }
  },

  // 腾讯财经五档盘口数据 (无CORS限制，返回GBK编码)
  TENCENT_ORDERBOOK: {
    name: '腾讯财经五档盘口',
    priority: 4, // 优先级高于东方财富
    enabled: useRealMarketData,
    // 五档数据API - 返回GBK编码的字符串
    // 数据格式: v_sh600519="1~股票名~代码~当前价~昨收~今开~...~买一价~买一量~买二价~买二量~...~卖一价~卖一量~..."
    // 位置索引: 9=买一价, 10=买一量, 11=买二价, 12=买二量, ...
    //          19=卖一价, 20=卖一量, 21=卖二价, 22=卖二量, ...
    getOrderBookUrl: (symbol: string, market: 'CN' | 'HK'): string => {
      const cleanSymbol = symbol.replace(/^(SH|SZ|sh|sz|HK|hk)/, '');
      
      // 腾讯财经市场代码：sh=沪市, sz=深市, hk=港股
      let prefix = 'sh'; // 默认沪市
      if (market === 'HK') {
        prefix = 'hk';
      } else {
        const codePrefix = cleanSymbol.substring(0, 2);
        if (['00', '30'].includes(codePrefix) || cleanSymbol.startsWith('8') || cleanSymbol.startsWith('4')) {
          prefix = 'sz';
        }
      }
      
      return `https://web.sqt.gtimg.cn/q=${prefix}${cleanSymbol}`;
    },
    parseOrderBookData: async (response: Response): Promise<{ asks: { price: number; volume: number }[]; bids: { price: number; volume: number }[] } | null> => {
      try {
        // 腾讯财经返回GBK编码的数据，需要使用TextDecoder解码
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('gbk');
        const text = decoder.decode(buffer);
        
        // 提取引号内的数据
        const start = text.indexOf('"');
        const end = text.lastIndexOf('"');
        if (start === -1 || end === -1) return null;
        
        const content = text.substring(start + 1, end);
        const parts = content.split('~');
        
        if (parts.length < 29) return null;
        
        // 解析五档买盘
        const bids = [
          { price: parseFloat(parts[9]) || 0, volume: parseInt(parts[10]) || 0 },
          { price: parseFloat(parts[11]) || 0, volume: parseInt(parts[12]) || 0 },
          { price: parseFloat(parts[13]) || 0, volume: parseInt(parts[14]) || 0 },
          { price: parseFloat(parts[15]) || 0, volume: parseInt(parts[16]) || 0 },
          { price: parseFloat(parts[17]) || 0, volume: parseInt(parts[18]) || 0 },
        ].filter(item => item.price > 0);
        
        // 解析五档卖盘
        const asks = [
          { price: parseFloat(parts[19]) || 0, volume: parseInt(parts[20]) || 0 },
          { price: parseFloat(parts[21]) || 0, volume: parseInt(parts[22]) || 0 },
          { price: parseFloat(parts[23]) || 0, volume: parseInt(parts[24]) || 0 },
          { price: parseFloat(parts[25]) || 0, volume: parseInt(parts[26]) || 0 },
          { price: parseFloat(parts[27]) || 0, volume: parseInt(parts[28]) || 0 },
        ].filter(item => item.price > 0);
        
        if (bids.length === 0 && asks.length === 0) return null;
        
        return { bids, asks };
      } catch (error) {
        console.error('解析腾讯财经五档数据失败:', error);
        return null;
      }
    }
  },

  // 东方财富五档盘口数据 (无CORS限制)
  EASTMONEY_ORDERBOOK: {
    name: '东方财富五档盘口',
    priority: 5,
    enabled: useRealMarketData,
    // 五档数据API - 返回买卖各5档价格和量
    // 字段映射：f19/f20=买一价/量, f17/f18=买二, f15/f16=买三, f13/f14=买四, f11/f12=买五
    //          f31/f32=卖一价/量, f33/f34=卖二, f35/f36=卖三, f37/f38=卖四, f39/f40=卖五
    getOrderBookUrl: (symbol: string, market: 'CN' | 'HK'): string => {
      const cleanSymbol = symbol.replace(/^(SH|SZ|sh|sz|HK|hk)/, '');
      
      // 市场代码
      let marketCode = '1';
      if (market === 'HK') {
        marketCode = '116';
      } else {
        const prefix = cleanSymbol.substring(0, 2);
        if (['00', '30'].includes(prefix) || cleanSymbol.startsWith('8') || cleanSymbol.startsWith('4')) {
          marketCode = '0';
        }
      }
      
      // 请求五档数据字段
      const fields = 'f11,f12,f13,f14,f15,f16,f17,f18,f19,f20,f31,f32,f33,f34,f35,f36,f37,f38,f39,f40';
      return `https://push2.eastmoney.com/api/qt/stock/get?secid=${marketCode}.${cleanSymbol}&fields=${fields}`;
    },
    parseOrderBookData: (data: any): { asks: { price: number; volume: number }[]; bids: { price: number; volume: number }[] } | null => {
      try {
        if (!data || !data.data) return null;
        const d = data.data;
        
        // 买盘（价格需要除以100）
        const bids = [
          { price: (d.f19 || 0) / 100, volume: d.f20 || 0 },
          { price: (d.f17 || 0) / 100, volume: d.f18 || 0 },
          { price: (d.f15 || 0) / 100, volume: d.f16 || 0 },
          { price: (d.f13 || 0) / 100, volume: d.f14 || 0 },
          { price: (d.f11 || 0) / 100, volume: d.f12 || 0 },
        ].filter(item => item.price > 0);
        
        // 卖盘（价格需要除以100）
        const asks = [
          { price: (d.f31 || 0) / 100, volume: d.f32 || 0 },
          { price: (d.f33 || 0) / 100, volume: d.f34 || 0 },
          { price: (d.f35 || 0) / 100, volume: d.f36 || 0 },
          { price: (d.f37 || 0) / 100, volume: d.f38 || 0 },
          { price: (d.f39 || 0) / 100, volume: d.f40 || 0 },
        ].filter(item => item.price > 0);
        
        if (bids.length === 0 && asks.length === 0) return null;
        
        return { bids, asks };
      } catch (error) {
        console.error('解析东方财富五档数据失败:', error);
        return null;
      }
    }
  },

  // 东方财富成交明细 (无CORS限制)
  EASTMONEY_TICKS: {
    name: '东方财富成交明细',
    priority: 6,
    enabled: useRealMarketData,
    getTicksUrl: (symbol: string, market: 'CN' | 'HK'): string => {
      const cleanSymbol = symbol.replace(/^(SH|SZ|sh|sz|HK|hk)/, '');
      
      let marketCode = '1';
      if (market === 'HK') {
        marketCode = '116';
      } else {
        const prefix = cleanSymbol.substring(0, 2);
        if (['00', '30'].includes(prefix) || cleanSymbol.startsWith('8') || cleanSymbol.startsWith('4')) {
          marketCode = '0';
        }
      }
      
      // 获取最近成交记录
      return `https://push2.eastmoney.com/api/qt/stock/ticks?secid=${marketCode}.${cleanSymbol}&fields=f1,f2,f3,f4,f5,f6,f7&pos=-11`;
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
    // 获取股票名称
    const stockName = STOCK_NAMES[market]?.[symbol] || `股票${symbol}`;
    
    // 根据股票代码生成合理的价格范围
    let basePrice: number;
    if (market === 'CN') {
      // A股根据代码特征设定不同价格区间
      if (symbol === '600519') basePrice = 1600 + Math.random() * 200; // 茅台
      else if (symbol === '300750') basePrice = 180 + Math.random() * 40; // 宁德时代
      else if (symbol.startsWith('6')) basePrice = 30 + Math.random() * 50;
      else if (symbol.startsWith('000') || symbol.startsWith('002')) basePrice = 15 + Math.random() * 30;
      else basePrice = 20 + Math.random() * 40;
    } else {
      // 港股
      if (symbol === '00700') basePrice = 300 + Math.random() * 50; // 腾讯
      else if (symbol === '09988') basePrice = 80 + Math.random() * 20; // 阿里
      else basePrice = 50 + Math.random() * 100;
    }
    
    const change = (Math.random() - 0.5) * basePrice * 0.06; // ±3%波动
    const price = basePrice + change;
    const changePercent = (change / basePrice) * 100;
    
    // 生成走势图
    const sparkline: number[] = [];
    let current = price;
    for (let i = 0; i < 10; i++) {
      current += (Math.random() - 0.5) * price * 0.015;
      sparkline.push(parseFloat(current.toFixed(2)));
    }
    
    return {
      symbol,
      name: stockName,
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
    
    // 2. 如果没有启用真实数据源，直接返回模拟数据
    if (!useRealMarketData && enableFallbackData) {
      console.log('getRealtimeStock: 真实数据源未启用，使用模拟数据');
      const fallbackData = ErrorHandler.generateFallbackData(symbol, market);
      MarketCache.set(cacheKey, fallbackData, 60 * 1000);
      return fallbackData;
    }
    
    // 3. 限流控制
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
        
        if (sourceKey === 'EASTMONEY_REALTIME') {
          // 东方财富实时行情 - 无 CORS 限制
          const url = DATA_SOURCES.EASTMONEY_REALTIME.getRealtimeUrl(symbol, market);
          console.log(`尝试数据源 ${source.name}: URL=${url}`);
          
          const response = await fetch(url);
          console.log(`数据源 ${source.name} 响应状态: ${response.status}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const json = await response.json();
          stockData = DATA_SOURCES.EASTMONEY_REALTIME.parseRealtimeData(json, symbol, market);
          
          if (stockData) {
            console.log(`数据源 ${source.name} 解析成功:`, stockData);
            // 获取K线数据生成走势图
            const klineUrl = DATA_SOURCES.TENCENT_KLINE.getKlineUrl(symbol, market, 'day');
            const klineResponse = await fetch(klineUrl);
            if (klineResponse.ok) {
              const klineData = await klineResponse.json();
              stockData.sparkline = DATA_SOURCES.TENCENT_KLINE.parseKlineData(klineData);
            }
          }
        } else if (sourceKey === 'SINA_REALTIME') {
          // 新浪财经实时行情
          const url = DATA_SOURCES.SINA_REALTIME.getRealtimeUrl(symbol, market);
          console.log(`尝试数据源 ${source.name}: URL=${url}`);
          
          const response = await fetch(url, {
            headers: {
              'Referer': 'https://finance.sina.com.cn',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          console.log(`数据源 ${source.name} 响应状态: ${response.status}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const text = await response.text();
          stockData = DATA_SOURCES.SINA_REALTIME.parseRealtimeData(text, symbol, market);
          
          if (stockData) {
            const klineUrl = DATA_SOURCES.TENCENT_KLINE.getKlineUrl(symbol, market, 'day');
            const klineResponse = await fetch(klineUrl);
            if (klineResponse.ok) {
              const klineData = await klineResponse.json();
              stockData.sparkline = DATA_SOURCES.TENCENT_KLINE.parseKlineData(klineData);
            }
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
    
    // 2. 如果没有启用真实数据源，直接返回模拟数据
    if (!useRealMarketData && enableFallbackData) {
      console.log('getBatchStocks: 真实数据源未启用，使用模拟数据');
      const fallbackStocks = symbols.map(symbol => 
        ErrorHandler.generateFallbackData(symbol, market)
      );
      MarketCache.set(cacheKey, fallbackStocks, 60 * 1000);
      return fallbackStocks;
    }
    
    // 3. 限流控制
    await RateLimiter.waitIfNeeded();
    
    // 4. 优先使用东方财富批量接口
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
  },

  /**
   * 获取五档盘口数据
   */
  async getOrderBook(symbol: string, market: 'CN' | 'HK'): Promise<{ asks: { price: number; volume: number }[]; bids: { price: number; volume: number }[] } | null> {
    // 检查缓存
    const cacheKey = `orderbook_${market}_${symbol}`;
    const cached = MarketCache.get<{ asks: { price: number; volume: number }[]; bids: { price: number; volume: number }[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    // 优先使用腾讯财经API（有真实的五档数据）
    try {
      const tencentUrl = DATA_SOURCES.TENCENT_ORDERBOOK.getOrderBookUrl(symbol, market);
      const tencentResponse = await fetch(tencentUrl);
      
      if (tencentResponse.ok) {
        const orderBook = await DATA_SOURCES.TENCENT_ORDERBOOK.parseOrderBookData(tencentResponse);
        
        if (orderBook && orderBook.bids.length > 0) {
          MarketCache.set(cacheKey, orderBook, 5 * 1000); // 五档数据缓存5秒
          console.log(`[真实数据-腾讯] 获取五档成功: ${symbol}`);
          return orderBook;
        }
      }
    } catch (error) {
      console.warn('[五档数据] 腾讯财经API失败，尝试东方财富:', error);
    }

    // 降级到东方财富API
    try {
      const url = DATA_SOURCES.EASTMONEY_ORDERBOOK.getOrderBookUrl(symbol, market);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const json = await response.json();
      const orderBook = DATA_SOURCES.EASTMONEY_ORDERBOOK.parseOrderBookData(json);
      
      if (orderBook && orderBook.bids.length > 0) {
        MarketCache.set(cacheKey, orderBook, 5 * 1000); // 五档数据缓存5秒
        console.log(`[真实数据-东财] 获取五档成功: ${symbol}`);
        return orderBook;
      }
    } catch (error) {
      console.error('[五档数据] 东方财富API也失败:', error);
    }
    
    return null;
  },

  /**
   * 获取成交明细数据
   */
  async getTradeTicks(symbol: string, market: 'CN' | 'HK'): Promise<{ time: string; price: number; volume: number; direction: 'BUY' | 'SELL' }[]> {
    // 检查缓存
    const cacheKey = `ticks_${market}_${symbol}`;
    const cached = MarketCache.get<{ time: string; price: number; volume: number; direction: 'BUY' | 'SELL' }[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = DATA_SOURCES.EASTMONEY_TICKS.getTicksUrl(symbol, market);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const json = await response.json();
      
      if (json && json.data && json.data.ticks) {
        const ticks = json.data.ticks.map((tick: any[]) => ({
          time: tick[0] || '',
          price: parseFloat(tick[1]) || 0,
          volume: parseInt(tick[2]) || 0,
          direction: tick[3] === '1' ? 'BUY' as const : 'SELL' as const
        }));
        
        MarketCache.set(cacheKey, ticks, 5 * 1000); // 成交明细缓存5秒
        return ticks;
      }
    } catch (error) {
      console.error('获取成交明细失败:', error);
    }
    
    return [];
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