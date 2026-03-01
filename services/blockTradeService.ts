import { supabase } from '../lib/supabase';

export interface BlockTradeProduct {
  id: string;
  symbol: string;
  name: string;
  product_type: 'COMMODITY' | 'STOCK' | 'INDEX';
  market: string;
  current_price: number;
  change: number;
  change_percent: number;
  volume: number;
  min_block_size: number;
  block_discount: number;
  status: 'ACTIVE' | 'INACTIVE';
  update_time: string;
  created_at: string;
}

export const getBlockTradeProducts = async (status?: 'ACTIVE' | 'INACTIVE'): Promise<BlockTradeProduct[]> => {
  try {
    let query = supabase
      .from('block_trade_products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('获取大宗交易产品失败:', error);
    return [];
  }
};

export const getBlockTradeProductBySymbol = async (symbol: string): Promise<BlockTradeProduct | null> => {
  try {
    const { data, error } = await supabase
      .from('block_trade_products')
      .select('*')
      .eq('symbol', symbol)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`获取产品 ${symbol} 失败:`, error);
    return null;
  }
};
