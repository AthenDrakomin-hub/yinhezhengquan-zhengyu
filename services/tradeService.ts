import { supabase } from '../lib/supabase';
import { TradeType } from '../types';
import { getRealtimeStock } from './marketService';

// 交易服务缓存
const tradeCache = new Map<string, any>();
const CACHE_TTL = 300000; // 5分钟

// 清理过期缓存
function cleanupTradeCache() {
  const now = Date.now();
  for (const [key, value] of tradeCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      tradeCache.delete(key);
    }
  }
}

// 定期清理缓存
setInterval(cleanupTradeCache, 60000);

export const tradeService = {
  /**
   * 获取用户交易历史（带缓存优化）
   */
  async getTradeHistory(userId: string, limit: number = 50) {
    const cacheKey = `trade_history_${userId}_${limit}`;
    const cached = tradeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        stock_info:stock_code (
          name,
          logo_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取交易历史失败:', error);
      throw error;
    }

    // 缓存结果
    tradeCache.set(cacheKey, {
      data: data || [],
      timestamp: Date.now()
    });

    return data || [];
  },

  /**
   * 获取用户持仓（带缓存优化）
   */
  async getUserPositions(userId: string) {
    const cacheKey = `positions_${userId}`;
    const cached = tradeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('positions')
      .select(`
        *,
        stock_info:stock_code (
          name,
          logo_url,
          current_price
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取持仓失败:', error);
      throw error;
    }

    // 缓存结果
    tradeCache.set(cacheKey, {
      data: data || [],
      timestamp: Date.now()
    });

    return data || [];
  },
  /**
   * 执行交易 (买入/卖出) - 增强版（包含幂等性检查）
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
    // 新增幂等性字段
    requestId?: string; // 客户端生成的唯一请求ID
  }) {
    const { 
      userId,
      type, 
      symbol, 
      name, 
      price, 
      quantity, 
      marketType = 'A_SHARE', 
      leverage = 1,
      logoUrl,
      metadata = {},
      requestId // 用于幂等性检查
    } = params;

    // 生成幂等性标识（如果客户端未提供）
    const transactionId = requestId || `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
        // 涨停打板验证
        const { getLimitUpStockBySymbol } = await import('./limitUpStockService');
        const limitUpData = await getLimitUpStockBySymbol(symbol);
        
        if (limitUpData) {
          // 验证是否处于涨停状态
          if (!limitUpData.is_limit_up) {
            throw new Error(`股票 ${symbol} 未处于涨停状态，当前价格 ${limitUpData.current_price}`);
          }
          
          // 验证价格是否为涨停价
          if (Math.abs(price - limitUpData.limit_up_price) > 0.01) {
            throw new Error(`涨停打板买入价格 ${price} 与涨停价 ${limitUpData.limit_up_price} 不符`);
          }
        } else {
          console.warn('无法获取涨停数据，跳过验证');
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
        logo_url: logoUrl,
        transaction_id: transactionId, // 添加幂等性标识
        metadata: {
          ...metadata,
          request_id: requestId,
          client_timestamp: Date.now()
        }
      }
    });

    if (error) {
      console.error('交易失败:', error);
      if (data && data.error) return data;
      throw new Error(error.message || '交易执行失败');
    }

    return {
      ...data,
      transactionId, // 返回交易ID供客户端跟踪
      requestId: requestId || transactionId
    };
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
    
    // 计算交易金额（如果数据库中没有amount字段）
    return data.map(item => ({
      ...item,
      amount: item.amount || (Number(item.price) * Number(item.quantity))
    }));
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
