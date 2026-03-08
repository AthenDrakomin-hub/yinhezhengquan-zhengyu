import { supabase } from '../lib/supabase';

export interface IPOItem {
  symbol: string;
  name: string;
  market: string;
  status: 'LISTED' | 'UPCOMING' | 'ONGOING';
  ipo_price: number | null;
  issue_date: string | null;
  listing_date: string | null;
  subscription_code: string;
  issue_volume: number | null;
  online_issue_volume: number | null;
  pe_ratio: number | null;
}

export const getIPOList = async (status?: 'LISTED' | 'UPCOMING' | 'ONGOING'): Promise<IPOItem[]> => {
  try {
    let query = supabase
      .from('ipos')
      .select('*')
      .order('listing_date', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      status: item.status,
      ipo_price: item.ipo_price,
      issue_date: item.issue_date,
      listing_date: item.listing_date,
      subscription_code: item.subscription_code || item.symbol,
      issue_volume: item.issue_volume,
      online_issue_volume: item.online_issue_volume,
      pe_ratio: item.pe_ratio
    }));
  } catch (error) {
    console.error('获取IPO列表失败:', error);
    return [];
  }
};

export const getIPOBySymbol = async (symbol: string): Promise<IPOItem | null> => {
  try {
    const { data, error } = await supabase
      .from('ipos')
      .select('*')
      .eq('symbol', symbol)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    return {
      symbol: data.symbol,
      name: data.name,
      market: data.market,
      status: data.status,
      ipo_price: data.ipo_price,
      issue_date: data.issue_date,
      listing_date: data.listing_date,
      subscription_code: data.subscription_code || data.symbol,
      issue_volume: data.issue_volume,
      online_issue_volume: data.online_issue_volume,
      pe_ratio: data.pe_ratio
    };
  } catch (error) {
    console.error(`获取IPO ${symbol} 失败:`, error);
    return null;
  }
};
