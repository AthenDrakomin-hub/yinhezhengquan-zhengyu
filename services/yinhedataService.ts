/**
 * 银禾数据库数据服务
 * 通过 Python 后端代理服务获取数据
 * 文档: https://yinhedata.com/interface/index.html
 */

import { supabase } from '../lib/supabase';

// 银禾数据代理服务地址
const YINHE_API_URL = import.meta.env.VITE_YINHE_API_URL || 'http://localhost:8080';

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

// ==================== 银禾数据服务 ====================

export const yinhedataService = {
  /**
   * 检查服务状态
   */
  async checkStatus(): Promise<{ available: boolean; message: string }> {
    try {
      const response = await fetch(`${YINHE_API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        return { available: true, message: '银禾数据服务正常' };
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
    try {
      const url = symbols 
        ? `${YINHE_API_URL}/api/quotes?symbols=${symbols.join(',')}`
        : `${YINHE_API_URL}/api/quotes`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取行情失败:', error);
    }
    return [];
  },

  /**
   * 获取单只股票行情
   */
  async getQuote(symbol: string): Promise<YinheQuote | null> {
    try {
      const response = await fetch(`${YINHE_API_URL}/api/quote/${symbol}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`获取 ${symbol} 行情失败:`, error);
    }
    return null;
  },

  /**
   * 获取涨停股票列表
   */
  async getLimitUpStocks(): Promise<YinheLimitUpStock[]> {
    try {
      const response = await fetch(`${YINHE_API_URL}/api/limit-up`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取涨停数据失败:', error);
    }
    return [];
  },

  /**
   * 获取新股申购列表
   */
  async getIPOList(): Promise<YinheIPOInfo[]> {
    try {
      const response = await fetch(`${YINHE_API_URL}/api/ipo`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取IPO数据失败:', error);
    }
    return [];
  },

  /**
   * 获取K线数据
   */
  async getKline(symbol: string, period: string = 'day', limit: number = 100): Promise<{
    symbol: string;
    period: string;
    data: YinheKline[];
  }> {
    try {
      const response = await fetch(
        `${YINHE_API_URL}/api/kline/${symbol}?period=${period}&limit=${limit}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取K线数据失败:', error);
    }
    return { symbol, period, data: [] };
  },

  /**
   * 获取资金流向
   */
  async getMoneyFlow(symbol: string): Promise<YinheMoneyFlow | null> {
    try {
      const response = await fetch(`${YINHE_API_URL}/api/money-flow/${symbol}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取资金流向失败:', error);
    }
    return null;
  },

  /**
   * 获取龙虎榜数据
   */
  async getDragonTiger(date?: string): Promise<any> {
    try {
      const url = date 
        ? `${YINHE_API_URL}/api/dragon-tiger?date=${date}`
        : `${YINHE_API_URL}/api/dragon-tiger`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取龙虎榜数据失败:', error);
    }
    return { date: date || new Date().toISOString().split('T')[0], data: [] };
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
    try {
      const url = market 
        ? `${YINHE_API_URL}/api/stock-list?market=${market}`
        : `${YINHE_API_URL}/api/stock-list`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取股票列表失败:', error);
    }
    return { total: 0, data: [] };
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
    try {
      const response = await fetch(`${YINHE_API_URL}/api/financial/${symbol}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取财务数据失败:', error);
    }
    return null;
  }
};

export default yinhedataService;
