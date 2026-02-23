import { supabase } from '../lib/supabase';

// Mock implementations for Gemini API functions (since geminiService.ts is removed)
export const getGalaxyNews = async () => {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return [
    { title: "银河证券：沪指窄幅震荡，白酒板块集体走强", category: "沪深", sentiment: "positive", time: timeStr },
    { title: "银河港股通：科技股午后走低，美团跌超2%", category: "港股", sentiment: "negative", time: timeStr },
    { title: "新能源汽车出口数据创历史新高 - 银河投研", category: "汽车", sentiment: "positive", time: timeStr },
    { title: "银河宏观：央行今日开展 20 亿逆回购操作", category: "宏观", sentiment: "neutral", time: timeStr }
  ];
};

export const getSmartCustomerSupport = async (query: string) => {
  return "智能客服正在维护中，请联系在线人工。";
};

export const validateTradeRisk = async (stockName: string, amount: number, userRiskLevel: string = 'C3') => {
  return { isAppropriate: true, reason: "银河风控审核中", riskWarning: "入市有风险，投资需谨慎。" };
};

export const getStockF10Analysis = async (symbol: string, name: string) => {
  return { 
    summary: "根据银河证券投研数据，该标的护城河极深，建议关注。", 
    valuation: "估值合理",
    yield: "2.10%",
    financials: [
      { label: "营业收入", value: "1503.2 亿", trend: "positive" },
      { label: "归母净利", value: "747.3 亿", trend: "positive" },
      { label: "毛利率", value: "91.8%", trend: "neutral" }
    ],
    businessSegments: [
      { name: "主营产品", ratio: "88.2%" },
      { name: "次要业务", ratio: "11.8%" }
    ],
    shareholders: [
      { name: "中央汇金", ratio: "10.22%", change: "持平" },
      { name: "香港结算", ratio: "7.15%", change: "增持" }
    ],
    announcements: [
      { date: "2026-03-20", title: "银河证券承销业务公告" }
    ]
  };
};

export { frontendMarketService } from './frontendMarketService';

// Re-export getRealtimeStock as a standalone function
const { getRealtimeStock } = frontendMarketService;
export { getRealtimeStock };

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
