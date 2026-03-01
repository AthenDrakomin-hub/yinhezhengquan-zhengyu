import { supabase } from '../lib/supabase';

export interface LimitUpStock {
  id: string;
  symbol: string;
  name: string;
  market: 'SH' | 'SZ';
  stock_type: 'NORMAL' | 'ST' | 'GEM';
  pre_close: number;
  current_price: number;
  limit_up_price: number;
  limit_down_price: number;
  change: number;
  change_percent: number;
  volume: number;
  turnover: number;
  buy_one_volume: number;
  buy_one_price: number;
  is_limit_up: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  update_time: string;
  created_at: string;
}

export const getLimitUpStocks = async (isLimitUp?: boolean): Promise<LimitUpStock[]> => {
  try {
    let query = supabase
      .from('limit_up_stocks')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('update_time', { ascending: false });
    
    if (isLimitUp !== undefined) {
      query = query.eq('is_limit_up', isLimitUp);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('获取涨停股票失败:', error);
    return [];
  }
};

export const getLimitUpStockBySymbol = async (symbol: string): Promise<LimitUpStock | null> => {
  try {
    const { data, error } = await supabase
      .from('limit_up_stocks')
      .select('*')
      .eq('symbol', symbol)
      .eq('status', 'ACTIVE')
      .order('update_time', { ascending: false })
      .limit(1)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`获取股票 ${symbol} 失败:`, error);
    return null;
  }
};
