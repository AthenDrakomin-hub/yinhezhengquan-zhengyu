import { supabase } from '../lib/supabase';
import { TradeType } from '../types';

export const tradeService = {
  /**
   * 执行交易 (买入/卖出)
   * 调用 Edge Function 处理复杂的交易逻辑 (原子性保证)
   */
  async executeTrade(params: {
    userId: string;
    type: TradeType;
    symbol: string;
    name: string;
    price: number;
    quantity: number;
    marketType?: string;
    leverage?: number;
    logoUrl?: string;
  }) {
    const { 
      type, 
      symbol, 
      name, 
      price, 
      quantity, 
      marketType = 'A_SHARE', 
      leverage = 1,
      logoUrl 
    } = params;

    const { data, error } = await supabase.functions.invoke('create-trade-order', {
      body: {
        market_type: marketType,
        trade_type: type,
        stock_code: symbol,
        stock_name: name,
        price,
        quantity,
        leverage,
        logo_url: logoUrl
      }
    });

    if (error) {
      console.error('交易失败:', error);
      // 如果是业务逻辑错误 (code >= 1000)，我们返回 data
      if (data && data.error) return data;
      throw new Error(error.message || '交易执行失败');
    }

    return data;
  },

  /**
   * 获取用户持仓
   */
  async getHoldings(userId: string) {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    
    // 映射字段以适配前端
    return data.map(item => ({
      ...item,
      averagePrice: parseFloat(item.average_price),
      marketValue: parseFloat(item.market_value),
      availableQuantity: item.available_quantity,
      logoUrl: item.logo_url
    }));
  },

  /**
   * 获取交易记录
   */
  async getTransactions(userId?: string, limit = 20) {
    let query = supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  /**
   * 获取行情数据
   */
  async getMarketData(marketType: string, stockCodes: string[]) {
    const { data, error } = await supabase.functions.invoke('get-market-data', {
      body: { market_type: marketType, stock_codes: stockCodes }
    });

    if (error) throw error;
    return data;
  }
};
