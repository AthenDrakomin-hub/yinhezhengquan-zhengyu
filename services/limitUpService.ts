/**
 * 涨停板数据服务
 * 从 Supabase 数据库获取涨停板数据
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
 * 获取单只股票的涨停板数据
 */
export async function getLimitUpData(symbol: string): Promise<LimitUpData> {
  try {
    const { data, error } = await supabase
      .from('limit_up_stocks')
      .select('*')
      .eq('symbol', symbol)
      .eq('status', 'ACTIVE')
      .order('update_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`涨停板数据不存在: ${symbol}`);
    }

    return {
      symbol: data.symbol,
      name: data.name,
      market: data.market,
      stockType: data.stock_type || 'NORMAL',
      currentPrice: Number(data.current_price),
      preClose: Number(data.pre_close),
      limitUpPrice: Number(data.limit_up_price),
      limitDownPrice: Number(data.limit_down_price),
      change: Number(data.change),
      changePercent: Number(data.change_percent),
      volume: Number(data.volume || 0),
      turnover: Number(data.turnover || 0),
      buyOneVolume: Number(data.buy_one_volume || 0),
      buyOnePrice: Number(data.buy_one_price || 0),
      isLimitUp: data.is_limit_up || false,
      timestamp: data.update_time || new Date().toISOString()
    };
  } catch (error) {
    console.error('获取涨停板数据失败:', error);
    throw error;
  }
}

/**
 * 获取所有涨停股票列表
 */
export async function getLimitUpList(): Promise<LimitUpData[]> {
  try {
    const { data, error } = await supabase
      .from('limit_up_stocks')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('is_limit_up', true)
      .order('change_percent', { ascending: false });

    if (error || !data) {
      console.error('获取涨停板列表失败:', error);
      return [];
    }

    return data.map(item => ({
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      stockType: item.stock_type || 'NORMAL',
      currentPrice: Number(item.current_price),
      preClose: Number(item.pre_close),
      limitUpPrice: Number(item.limit_up_price),
      limitDownPrice: Number(item.limit_down_price),
      change: Number(item.change),
      changePercent: Number(item.change_percent),
      volume: Number(item.volume || 0),
      turnover: Number(item.turnover || 0),
      buyOneVolume: Number(item.buy_one_volume || 0),
      buyOnePrice: Number(item.buy_one_price || 0),
      isLimitUp: item.is_limit_up || false,
      timestamp: item.update_time || new Date().toISOString()
    }));
  } catch (error) {
    console.error('获取涨停板列表失败:', error);
    return [];
  }
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
