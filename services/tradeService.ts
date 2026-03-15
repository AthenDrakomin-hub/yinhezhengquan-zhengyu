import { supabase } from '../lib/supabase';
import { TradeType } from '../lib/types';
import { getRealtimeStock } from './marketService';
import { marketApi } from './marketApi';
import { logger } from '@/utils/logger';

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
      logger.error('获取交易历史失败:', error);
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
      logger.error('获取持仓失败:', error);
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

    // 先检查用户是否登录
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logger.error('用户未登录，无法执行交易');
      return { success: false, error: '请先登录后再进行交易', code: 401 };
    }
    
    logger.info('执行交易:', { userId, type, symbol, price, quantity, sessionUser: session.user.id });

    // 生成幂等性标识（如果客户端未提供）
    const transactionId = requestId || `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 将 TradeType 枚举转换为 Edge Function 期望的英文类型
    const tradeTypeMap: Record<TradeType, string> = {
      [TradeType.BUY]: 'BUY',
      [TradeType.SELL]: 'SELL',
      [TradeType.IPO]: 'IPO',
      [TradeType.BLOCK]: 'BLOCK_TRADE',
      [TradeType.LIMIT_UP]: 'LIMIT_UP'
    };
    const normalizedTradeType = tradeTypeMap[type] || type;

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
          logger.warn('无法获取IPO数据，跳过验证');
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
            logger.warn(`大宗交易价格 ${price} 与预期折扣价 ${expectedPrice} 差异较大`);
          }
        } else {
          logger.warn('无法获取大宗交易数据，跳过验证');
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
          logger.warn('无法获取涨停数据，跳过验证');
        }
      } else {
        // 普通买卖：验证价格合理性
        const realData = await getRealtimeStock(symbol, marketType === 'HK_SHARE' ? 'HK' : 'CN');
        if (realData?.price && Math.abs(realData.price - price) / realData.price > 0.05) {
          logger.warn('价格偏离过大，请刷新行情后再试');
        }
      }
    } catch (validationError) {
      logger.error('交易验证失败:', validationError);
      // 不阻止交易，只记录警告
    }

    // 根据交易类型选择不同的 Edge Function
    const getEdgeFunctionName = (tradeType: string, market: string): string => {
      switch (tradeType) {
        case 'BUY':
        case 'SELL':
          // 根据市场类型选择 A股 或 港股 交易函数
          if (market === 'HK_SHARE' || market === '港股' || market === 'HK') {
            return 'create-hk-order';
          }
          return 'create-a-share-order';
        case 'IPO':
          return 'create-ipo-order';
        case 'BLOCK_TRADE':
          return 'create-block-trade-order';
        case 'LIMIT_UP':
          return 'create-limit-up-order';
        default:
          // 默认使用 A股交易
          return 'create-a-share-order';
      }
    };

    const edgeFunctionName = getEdgeFunctionName(normalizedTradeType, marketType);
    logger.info(`调用 Edge Function: ${edgeFunctionName}`, { tradeType: normalizedTradeType, marketType });

    // 构建请求体（不同类型的交易参数略有不同）
    const requestBody: Record<string, any> = {
      stock_code: symbol,
      stock_name: name,
      price,
      quantity,
      leverage,
      transaction_id: transactionId,
      metadata: {
        ...metadata,
        request_id: requestId,
        client_timestamp: Date.now()
      }
    };

    // 根据交易类型添加特定参数
    if (normalizedTradeType === 'BUY' || normalizedTradeType === 'SELL') {
      requestBody.trade_type = normalizedTradeType;
      requestBody.market_type = marketType === 'HK_SHARE' ? '港股' : 'A股';
    } else if (normalizedTradeType === 'IPO') {
      requestBody.market_type = marketType === 'HK_SHARE' ? '港股' : 'A股';
    } else if (normalizedTradeType === 'BLOCK_TRADE') {
      // 大宗交易需要从原始type参数获取买卖方向
      requestBody.trade_type = type === TradeType.SELL ? 'SELL' : 'BUY';
      requestBody.market_type = marketType === 'HK_SHARE' ? '港股' : 'A股';
    }
    // LIMIT_UP 不需要额外参数，默认A股

    const { data, error } = await supabase.functions.invoke(edgeFunctionName, {
      body: requestBody
    });

    if (error) {
      logger.error('交易失败:', error);
      // 返回详细错误信息
      if (data && data.error) {
        return { success: false, error: data.error, code: data.code };
      }
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
  async getTransactions(userId?: string, limit = 20, page = 1): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('trades')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      // RLS 权限问题或列不存在时返回空数据
      if (error.code === '42501' || error.code === '42703' || error.code === 'PGRST205') {
        console.warn('获取交易记录:', error.message || error.code);
        return { data: [], total: 0 };
      }
      throw error;
    }
    
    // 计算交易金额（如果数据库中没有amount字段）
    return {
      data: (data || []).map(item => ({
        ...item,
        amount: item.amount || (Number(item.price) * Number(item.quantity))
      })),
      total: count || 0
    };
  },

  /**
   * 获取行情数据（前端直连东方财富 API）
   */
  async getMarketData(marketType: string, stockCodes: string[]) {
    return await marketApi.getBatchStocks(stockCodes, marketType === 'HK' ? 'HK' : 'CN');
  },

  /**
   * 审批通过交易订单
   * @param tradeId 交易订单ID
   * @param remark 审批备注（可选）
   */
  async approveTrade(tradeId: string, remark?: string) {
    const { data, error } = await supabase.functions.invoke('approve-trade-order', {
      body: {
        trade_id: tradeId,
        action: 'APPROVED',
        remark: remark || '审批通过'
      }
    });

    if (error) {
      logger.error('审批交易失败:', error);
      throw new Error(error.message || '审批失败');
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    return data;
  },

  /**
   * 拒绝交易订单
   * @param tradeId 交易订单ID
   * @param remark 审批备注（可选）
   */
  async rejectTrade(tradeId: string, remark?: string) {
    const { data, error } = await supabase.functions.invoke('approve-trade-order', {
      body: {
        trade_id: tradeId,
        action: 'REJECTED',
        remark: remark || '审批拒绝'
      }
    });

    if (error) {
      logger.error('拒绝交易失败:', error);
      throw new Error(error.message || '拒绝失败');
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    return data;
  },

  /**
   * 获取待审批的交易订单列表
   */
  async getPendingApprovals() {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('need_approval', true)
      .eq('approval_status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      // RLS 权限问题或列不存在时返回空数组
      if (error.code === '42501' || error.code === '42703' || error.code === 'PGRST205') {
        console.warn('获取待审批订单:', error.message || error.code);
        return [];
      }
      logger.error('获取待审批订单失败:', error);
      throw error;
    }

    // 计算交易金额（如果数据库中没有amount字段）
    return data.map(item => ({
      ...item,
      amount: item.amount || (Number(item.price) * Number(item.quantity))
    }));
  },

  /**
   * 获取所有需要审批的交易订单（包括已审批的）
   * @param limit 限制数量，默认50
   */
  async getApprovalHistory(limit: number = 50) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('need_approval', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // RLS 权限问题或列不存在时返回空数组
      if (error.code === '42501' || error.code === '42703' || error.code === 'PGRST205') {
        console.warn('获取审批历史:', error.message || error.code);
        return [];
      }
      logger.error('获取审批历史失败:', error);
      throw error;
    }

    // 计算交易金额（如果数据库中没有amount字段）
    return data.map(item => ({
      ...item,
      amount: item.amount || (Number(item.price) * Number(item.quantity))
    }));
  },

  /**
   * 审批交易订单
   * @param orderId 订单ID
   * @param action 'approved' 或 'rejected'
   * @param remark 审批备注（可选）
   */
  async approveTradeOrder(
    orderId: string,
    action: 'approved' | 'rejected',
    remark?: string
  ) {
    // Edge Function 期望的 action 是 'APPROVED' 或 'REJECTED'
    const normalizedAction = action.toUpperCase() === 'APPROVED' ? 'APPROVED' : 
                             action.toUpperCase() === 'REJECTED' ? 'REJECTED' : action.toUpperCase();
    
    const { data, error } = await supabase.functions.invoke('approve-trade-order', {
      body: { trade_id: orderId, action: normalizedAction, remark }
    });

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * 取消（撤销）交易订单
   * @param orderId 订单ID
   */
  async cancelTradeOrder(orderId: string) {
    const { data, error } = await supabase.functions.invoke('cancel-trade-order', {
      body: { trade_id: orderId }
    });

    if (error) throw new Error(error.message);
    return data;
  }
};
