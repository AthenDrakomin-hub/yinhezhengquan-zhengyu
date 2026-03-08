/**
 * QOS 大宗交易数据适配器
 * 从 Supabase 数据库获取大宗交易产品数据
 */

import { supabase } from '../../lib/supabase';

export interface QOSQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: string;
  minBlockSize: number;
  blockDiscount: number;
  lastUpdated: string;
}

/**
 * 获取单个大宗交易产品行情
 */
export async function fetchQOSQuote(symbol: string): Promise<QOSQuote | null> {
  try {
    const { data, error } = await supabase
      .from('block_trade_products')
      .select('*')
      .eq('symbol', symbol)
      .eq('status', 'ACTIVE')
      .single();

    if (error || !data) {
      console.warn(`QOS数据不存在: ${symbol}`, error);
      return null;
    }

    return {
      symbol: data.symbol,
      name: data.name,
      price: Number(data.current_price),
      change: Number(data.change || 0),
      changePercent: Number(data.change_percent || 0),
      market: data.market,
      minBlockSize: data.min_block_size,
      blockDiscount: Number(data.block_discount),
      lastUpdated: data.update_time || new Date().toISOString()
    };
  } catch (error) {
    console.error('获取QOS数据失败:', error);
    return null;
  }
}

/**
 * 获取所有大宗交易产品列表
 */
export async function fetchQOSQuoteList(): Promise<QOSQuote[]> {
  try {
    const { data, error } = await supabase
      .from('block_trade_products')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('symbol');

    if (error || !data) {
      console.error('获取QOS产品列表失败:', error);
      return [];
    }

    return data.map(item => ({
      symbol: item.symbol,
      name: item.name,
      price: Number(item.current_price),
      change: Number(item.change || 0),
      changePercent: Number(item.change_percent || 0),
      market: item.market,
      minBlockSize: item.min_block_size,
      blockDiscount: Number(item.block_discount),
      lastUpdated: item.update_time || new Date().toISOString()
    }));
  } catch (error) {
    console.error('获取QOS产品列表失败:', error);
    return [];
  }
}
