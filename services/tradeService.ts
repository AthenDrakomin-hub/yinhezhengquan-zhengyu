import { supabase } from '../lib/supabase';
import { TradeType } from '../types';
import { getRealtimeStock } from './marketService';

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
    metadata?: Record<string, any>;
  }) {
    const { 
      type, 
      symbol, 
      name, 
      price, 
      quantity, 
      marketType = 'A_SHARE', 
      leverage = 1,
      logoUrl,
      metadata = {}
    } = params;

    // 根据交易类型进行数据验证
    try {
      if (type === TradeType.IPO) {
        // 新股申购验证
        const { fetchSinaIPOBySymbol } = await import('./adapters/sinaIPOAdapter');
        const ipoData = await fetchSinaIPOBySymbol(symbol);
        
        if (ipoData) {
          // 验证发行价
          if (Math.abs(price - ipoData.issuePrice) > 0.01) {
            throw new Error(`新股申购价格 ${price} 与发行价 ${ipoData.issuePrice} 不符`);
          }
          
          // 验证申购状态
          if (ipoData.status !== 'ONGOING') {
            throw new Error(`新股 ${symbol} 当前状态为 ${ipoData.status}，不可申购`);
          }
        } else {
          console.warn('无法获取IPO数据，跳过验证');
        }
      } else if (type === TradeType.BLOCK) {
        // 大宗交易验证
        const { fetchQOSQuote } = await import('./adapters/qosAdapter');
        const blockTradeInfo = await fetchQOSQuote(symbol);
        
        if (blockTradeInfo) {
          // 验证最小交易数量
          if (quantity < blockTradeInfo.minBlockSize) {
            throw new Error(`大宗交易数量 ${quantity} 低于最小要求 ${blockTradeInfo.minBlockSize}`);
          }
          
          // 验证价格折扣（可选）
          const expectedPrice = blockTradeInfo.price * blockTradeInfo.blockDiscount;
          if (Math.abs(price - expectedPrice) / expectedPrice > 0.05) { // 允许5%误差
            console.warn(`大宗交易价格 ${price} 与预期折扣价 ${expectedPrice} 差异较大`);
          }
        } else {
          console.warn('无法获取大宗交易数据，跳过验证');
        }
      } else if (type === TradeType.LIMIT_UP) {
        // 涨停打板验证（假设为买入操作）
        const { getLimitUpData, isLimitUp } = await import('./limitUpService');
        const limitUpData = await getLimitUpData(symbol);
        
        // 验证是否处于涨停状态
        if (!isLimitUp(limitUpData)) {
          throw new Error(`股票 ${symbol} 未处于涨停状态，当前价格 ${limitUpData.currentPrice}`);
        }
        
        // 验证价格是否为涨停价（允许±0.01元误差）
        if (Math.abs(price - limitUpData.limitUpPrice) > 0.01) {
          throw new Error(`涨停打板买入价格 ${price} 与涨停价 ${limitUpData.limitUpPrice} 不符`);
        }
        
        // 可选：验证封单量是否足够
        if (limitUpData.buyOneVolume < quantity * 100) { // 假设每手100股
          console.warn(`封单量 ${limitUpData.buyOneVolume} 可能不足，当前委托量 ${quantity}`);
        }
      } else {
        // 普通买卖：验证价格合理性
        const realData = await getRealtimeStock(symbol, marketType === 'HK_SHARE' ? 'HK' : 'CN');
        if (realData.price && Math.abs(realData.price - price) / realData.price > 0.05) {
          console.warn('价格偏离过大，请刷新行情后再试');
        }
      }
    } catch (validationError) {
      console.error('交易验证失败:', validationError);
      // 不阻止交易，只记录警告
    }

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
