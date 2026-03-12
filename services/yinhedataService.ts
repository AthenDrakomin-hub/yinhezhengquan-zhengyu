/**
 * 银禾数据库数据服务
 * 通过 Supabase Edge Function 代理获取数据
 * 文档: https://yinhedata.com/interface/index.html
 * 
 * Edge Function: yinhe-data
 * 本地开发: http://localhost:54321/functions/v1/yinhe-data
 * 生产环境: https://<project>.supabase.co/functions/v1/yinhe-data
 */

import { supabase } from '../lib/supabase';
import { searchStocks as localSearchStocks, type StockInfo } from '../lib/stockList';

// Edge Function URL (从环境变量获取或使用 Supabase 函数 URL)
const getYinheFunctionUrl = () => {
  // 优先使用环境变量
  if (import.meta.env.VITE_YINHE_FUNCTION_URL) {
    return import.meta.env.VITE_YINHE_FUNCTION_URL;
  }
  // 使用 Supabase functions URL
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yinhe-data`;
};

// ==================== 类型定义 ====================

export interface YinheQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  high: number;
  low: number;
  open: number;
  preClose: number;
  market: string;
  timestamp: string;
}

export interface YinheLimitUpStock {
  symbol: string;
  name: string;
  market: string;
  stockType: string;
  currentPrice: number;
  preClose: number;
  limitUpPrice: number;
  limitDownPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  isLimitUp: boolean;
  timestamp: string;
}

export interface YinheIPOInfo {
  symbol: string;
  name: string;
  issuePrice: number;
  issueDate: string;
  subscriptionCode: string;
  status: string;
}

export interface YinheKline {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
}

export interface YinheMoneyFlow {
  symbol: string;
  name: string;
  mainNetInflow: number;
  retailNetInflow: number;
  superLargeInflow: number;
  largeInflow: number;
  mediumInflow: number;
  smallInflow: number;
  timestamp: string;
}

// ==================== 通用请求封装 ====================

/**
 * 调用银禾数据 Edge Function
 */
async function callYinheFunction<T>(
  endpoint: string,
  options: { params?: Record<string, string>; method?: string; body?: unknown } = {}
): Promise<T | null> {
  try {
    const url = new URL(`${getYinheFunctionUrl()}${endpoint}`);
    
    // 添加查询参数
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }

    // 获取当前会话 token
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // 添加授权头
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('银禾数据 API 错误:', errorData);
      return null;
    }

    const result = await response.json();
    return result.success ? result.data : result;
  } catch (error) {
    console.error('调用银禾数据 API 失败:', error);
    return null;
  }
}

// ==================== 银禾数据服务 ====================

export const yinhedataService = {
  /**
   * 检查服务状态
   */
  async checkStatus(): Promise<{ available: boolean; message: string }> {
    try {
      const response = await fetch(`${getYinheFunctionUrl()}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        return { 
          available: true, 
          message: `银禾数据服务正常 (API Key: ${data.apiKeyConfigured ? '已配置' : '未配置'})` 
        };
      }
      return { available: false, message: '服务响应异常' };
    } catch (error) {
      return { available: false, message: '银禾数据服务不可用' };
    }
  },

  /**
   * 获取股票行情
   */
  async getQuotes(symbols?: string[]): Promise<YinheQuote[]> {
    const data = await callYinheFunction<YinheQuote[]>('/api/quotes', {
      params: symbols ? { symbols: symbols.join(',') } : undefined,
    });
    return data || [];
  },

  /**
   * 获取单只股票行情
   */
  async getQuote(symbol: string): Promise<YinheQuote | null> {
    return await callYinheFunction<YinheQuote>(`/api/quote/${symbol}`);
  },

  /**
   * 获取涨停股票列表
   */
  async getLimitUpStocks(): Promise<YinheLimitUpStock[]> {
    const data = await callYinheFunction<YinheLimitUpStock[]>('/api/limit-up');
    return data || [];
  },

  /**
   * 获取跌停股票列表
   */
  async getLimitDownStocks(): Promise<unknown[]> {
    const data = await callYinheFunction<unknown[]>('/api/limit-down');
    return data || [];
  },

  /**
   * 获取新股申购列表
   */
  async getIPOList(): Promise<YinheIPOInfo[]> {
    const data = await callYinheFunction<YinheIPOInfo[]>('/api/ipo');
    return data || [];
  },

  /**
   * 获取K线数据
   */
  async getKline(
    symbol: string, 
    period: 'day' | 'week' | 'month' = 'day', 
    limit: number = 100
  ): Promise<{
    symbol: string;
    period: string;
    data: YinheKline[];
  }> {
    const data = await callYinheFunction<{
      symbol: string;
      period: string;
      data: YinheKline[];
    }>('/api/kline/:symbol'.replace(':symbol', symbol), {
      params: { period, limit: String(limit) },
    });
    return data || { symbol, period, data: [] };
  },

  /**
   * 获取资金流向
   */
  async getMoneyFlow(symbol: string): Promise<YinheMoneyFlow | null> {
    return await callYinheFunction<YinheMoneyFlow>(`/api/money-flow/${symbol}`);
  },

  /**
   * 获取龙虎榜数据
   */
  async getDragonTiger(date?: string): Promise<{ date: string; data: unknown[] }> {
    const data = await callYinheFunction<{ date: string; data: unknown[] }>('/api/dragon-tiger', {
      params: date ? { date } : undefined,
    });
    return data || { date: date || new Date().toISOString().split('T')[0], data: [] };
  },

  /**
   * 获取股票列表
   */
  async getStockList(market?: string): Promise<{
    total: number;
    data: Array<{
      symbol: string;
      name: string;
      market: string;
      type: string;
    }>;
  }> {
    const data = await callYinheFunction<{
      total: number;
      data: Array<{
        symbol: string;
        name: string;
        market: string;
        type: string;
      }>;
    }>('/api/stock-list', {
      params: market ? { market } : undefined,
    });
    return data || { total: 0, data: [] };
  },

  /**
   * 获取财务数据
   */
  async getFinancial(symbol: string): Promise<{
    symbol: string;
    name: string;
    pe: number | null;
    pb: number | null;
    roe: number | null;
    eps: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
  } | null> {
    return await callYinheFunction(`/api/financial/${symbol}`);
  },

  /**
   * 获取板块行情
   */
  async getSectors(): Promise<unknown[]> {
    const data = await callYinheFunction<unknown[]>('/api/sectors');
    return data || [];
  },

  /**
   * 获取概念板块
   */
  async getConcepts(): Promise<unknown[]> {
    const data = await callYinheFunction<unknown[]>('/api/concepts');
    return data || [];
  },

  /**
   * 搜索股票（本地搜索）
   * 支持按股票代码或名称搜索
   */
  async searchStocks(keyword: string): Promise<StockInfo[]> {
    // 使用本地股票列表搜索
    return localSearchStocks(keyword, 20);
  },
};

export default yinhedataService;
