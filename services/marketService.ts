import { supabase } from '../lib/supabase';

// Re-export functions from other services for backward compatibility
export { getGalaxyNews, getStockF10Analysis, getSmartCustomerSupport } from './geminiService';
export { frontendMarketService } from './frontendMarketService';

// Re-export getRealtimeStock as a standalone function
const { getRealtimeStock } = frontendMarketService;
export { getRealtimeStock };

// Re-export validateTradeRisk with default risk level for backward compatibility
import { validateTradeRisk as originalValidateTradeRisk } from './geminiService';
export const validateTradeRisk = (stockName: string, amount: number, userRiskLevel: string = 'C3') => {
  return originalValidateTradeRisk(stockName, amount, userRiskLevel);
};

// Default stock symbols for market list
const DEFAULT_STOCK_SYMBOLS = {
  CN: ['600519', '000858', '601318', '000001', '300750', '600036', '601166', '600887', '600276', '600900'],
  HK: ['00700', '09988', '03690', '01810', '01024', '00941', '02318', '01299', '00883', '00388']
};

/**
 * 获取市场股票列表
 * @param market 市场类型: 'CN' (A股) 或 'HK' (港股)
 */
export const getMarketList = async (market: 'CN' | 'HK' = 'CN') => {
  try {
    const symbols = DEFAULT_STOCK_SYMBOLS[market];
    return await frontendMarketService.getBatchStocks(symbols, market);
  } catch (error) {
    console.error('获取市场列表失败:', error);
    // 返回空数组而不是抛出错误，避免前端崩溃
    return [];
  }
};

export const integrationService = {
  /**
   * 获取所有 API Key (仅管理员)
   */
  async getApiKeys() {
    const { data, error } = await supabase
      .from('api_access_keys')
      .select('*, profiles(username)');

    if (error) throw error;
    
    // 适配前端展示
    return data.map(item => ({
      ...item,
      username: item.profiles?.username || '系统/外部客户端'
    }));
  },

  /**
   * 生成/更新 API Key (仅管理员)
   */
  async manageApiKey(userId: string, action: 'generate' | 'disable') {
    const { data, error } = await supabase.functions.invoke('admin-manage-api-key', {
      body: { target_user_id: userId, action }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 一键校验接入有效性 (API Key + 规则)
   */
  async validateIntegration(userId: string) {
    const { data, error } = await supabase.functions.invoke('admin-validate-integration', {
      body: { target_user_id: userId }
    });

    if (error) throw error;
    return data;
  }
};
