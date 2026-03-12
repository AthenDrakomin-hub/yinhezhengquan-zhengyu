/**
 * 涨停板数据服务
 * 通过 Supabase Edge Function (QVeris API) 获取实时涨停数据
 */

import { supabase } from '../lib/supabase';

export interface LimitUpData {
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
  buyOneVolume: number;
  buyOnePrice: number;
  isLimitUp: boolean;
  timestamp: string;
}

/**
 * 股票类型枚举
 */
enum StockType {
  NORMAL = 'NORMAL',  // 普通股票（主板）
  ST = 'ST',          // ST股票（5%涨跌幅）
  GEM = 'GEM',        // 创业板（20%涨跌幅）
  STAR = 'STAR',      // 科创板（20%涨跌幅）
}

/**
 * 获取默认股票列表（热门股票）
 */
function getDefaultStockList(): string[] {
  return [
    '600519', // 贵州茅台
    '000001', // 平安银行
    '600000', // 浦发银行
    '000002', // 万科A
    '600036', // 招商银行
    '601318', // 中国平安
    '000333', // 美的集团
    '600276', // 恒瑞医药
    '002594', // 比亚迪
    '600887', // 伊利股份
    '601888', // 中国中免
    '002415', // 海康威视
    '600309', // 万华化学
    '601012', // 隆基绿能
    '300750', // 宁德时代
  ];
}

/**
 * 获取单只股票的涨停板数据
 */
export async function getLimitUpData(symbol: string): Promise<LimitUpData> {
  try {
    const list = await getLimitUpList([symbol]);
    
    if (list.length === 0) {
      throw new Error(`未找到 ${symbol} 的涨停数据`);
    }
    
    return list[0];
  } catch (error) {
    console.error('获取涨停板数据失败:', error);
    throw error;
  }
}

/**
 * 获取所有涨停股票列表
 * 通过 Supabase Edge Function 调用 QVeris API 获取实时数据
 *
 * @param symbols - 可选，指定要查询的股票列表。如果不提供，使用默认列表
 * @returns 涨停股票列表
 */
export async function getLimitUpList(symbols?: string[]): Promise<LimitUpData[]> {
  const stockList = symbols || getDefaultStockList();

  try {
    // 调用 Edge Function 获取涨停数据
    const { data, error } = await supabase.functions.invoke('get-limit-up', {
      body: { symbols: stockList }
    });

    if (error) {
      throw error;
    }

    if (data && data.success && data.data) {
      return data.data;
    }

    return [];
    
  } catch (error) {
    return [];
  }
}

/**
 * 扫描指定股票列表，返回所有股票的涨停状态
 */
export async function scanStocksForLimitUp(symbols: string[]): Promise<LimitUpData[]> {
  return getLimitUpList(symbols);
}

/**
 * 计算涨停价（根据股票类型）
 */
export function calculateLimitUpPrice(preClose: number, stockType: string = 'NORMAL'): number {
  let limitPercent = 0.10; // 默认10%

  switch (stockType) {
    case 'ST':
      limitPercent = 0.05; // ST股票5%
      break;
    case 'GEM':
      limitPercent = 0.20; // 创业板20%
      break;
    case 'STAR':
      limitPercent = 0.20; // 科创板20%
      break;
    default:
      limitPercent = 0.10; // 普通股票10%
  }

  return Number((preClose * (1 + limitPercent)).toFixed(2));
}

/**
 * 计算跌停价（根据股票类型）
 */
export function calculateLimitDownPrice(preClose: number, stockType: string = 'NORMAL'): number {
  let limitPercent = 0.10; // 默认10%

  switch (stockType) {
    case 'ST':
      limitPercent = 0.05; // ST股票5%
      break;
    case 'GEM':
      limitPercent = 0.20; // 创业板20%
      break;
    case 'STAR':
      limitPercent = 0.20; // 科创板20%
      break;
    default:
      limitPercent = 0.10; // 普通股票10%
  }

  return Number((preClose * (1 - limitPercent)).toFixed(2));
}
