import { supabase } from '../lib/supabase';
import { frontendMarketService } from './frontendMarketService';

/**
 * 获取银河证券新闻 - 从公开渠道获取
 * 通过 Supabase Edge Function 代理请求以避免 CORS 问题
 */
export const getGalaxyNews = async () => {
  try {
    // 尝试通过 Edge Function 获取新闻数据
    const { data, error } = await supabase.functions.invoke('fetch-galaxy-news');
    
    if (error) {
      console.warn('通过 Supabase 函数获取银河新闻失败:', error.message);
      // 如果 Edge Function 不可用，返回空数组
      return [];
    }
    
    // 如果 Edge Function 返回数据，直接返回
    if (data && Array.isArray(data.news)) {
      return data.news;
    }
    
    // 默认返回空数组
    return [];
  } catch (error) {
    console.warn('银河新闻获取失败，返回空数组:', error);
    return [];
  }
};

/**
 * 智能客服支持 - 基于知识库和工单系统
 */
export const getSmartCustomerSupport = async (query: string) => {
  try {
    // 1. 检查是否为常见问题
    const commonIssues = [
      { pattern: /密码|登录|忘记/i, response: "如果您忘记了登录密码，请点击登录页面的'忘记密码'链接进行重置。" },
      { pattern: /资金|余额|入金|出金/i, response: "资金相关问题请查看'资金管理'页面或联系客服。" },
      { pattern: /交易|下单|委托/i, response: "交易相关问题请查看'交易指南'或联系客服。" },
      { pattern: /新股|申购/i, response: "新股申购请关注'新股申购'页面，每日上午9:00更新最新信息。" }
    ];
    
    for (const issue of commonIssues) {
      if (issue.pattern.test(query)) {
        return issue.response;
      }
    }
    
    // 2. 如果不是常见问题，引导用户创建工单
    return "您好，欢迎使用银河证券智能客服。根据您的问题，建议您：\n1) 查看常见问题解答 \n2) 提交客服工单 \n3) 或联系人工客服热线 95551。";
  } catch (error) {
    console.warn('智能客服处理失败，返回默认回复:', error);
    return "系统维护中，请联系在线客服或拨打客服热线 95551。";
  }
};

/**
 * 验证交易风险 - 基于数据库中的风控规则
 */
export const validateTradeRisk = async (stockName: string, amount: number, userRiskLevel: string = 'C3') => {
  try {
    // 从数据库获取风控规则
    const { data: rules, error: rulesError } = await supabase
      .from('trade_rules')
      .select('config')
      .eq('rule_type', 'GENERAL')
      .single();

    if (rulesError || !rules) {
      console.warn('未能获取风控规则，使用默认通过策略:', rulesError?.message);
      return { 
        isAppropriate: true, 
        reason: "系统风控审核中", 
        riskWarning: "入市有风险，投资需谨慎。请根据自身风险承受能力理性投资。" 
      };
    }

    // 应用风控规则
    const generalRule = rules.config;
    const riskThreshold = generalRule.risk_level_threshold || 3;
    const dailyLossLimit = generalRule.daily_loss_limit || 100000;
    
    // 简单的风险评估逻辑
    let riskLevel = 1; // 默认低风险
    
    if (amount > dailyLossLimit * 0.5) {
      riskLevel = 3; // 高风险
    } else if (amount > dailyLossLimit * 0.2) {
      riskLevel = 2; // 中风险
    }

    // 根据用户风险等级判断是否适合
    const userRiskNum = parseInt(userRiskLevel.charAt(1)); // C1->1, C2->2, etc.
    
    const isAppropriate = userRiskNum >= riskLevel;
    const riskWarning = isAppropriate 
      ? "交易符合您的风险承受能力" 
      : `当前交易风险等级(${riskLevel})高于您的风险承受能力(${userRiskNum})`;

    return { 
      isAppropriate,
      reason: isAppropriate ? "符合风控规则" : "超出风险承受能力", 
      riskWarning: riskWarning + "，请谨慎投资。" 
    };
  } catch (error) {
    console.warn('风控验证失败，使用默认通过策略:', error);
    return { 
      isAppropriate: true, 
      reason: "系统风控审核中", 
      riskWarning: "入市有风险，投资需谨慎。请根据自身风险承受能力理性投资。" 
    };
  }
};

/**
 * 获取股票F10分析数据 - 从公开渠道获取
 */
export const getStockF10Analysis = async (symbol: string, name: string) => {
  try {
    // 尝试通过 Edge Function 获取F10数据
    const { data, error } = await supabase.functions.invoke('fetch-stock-f10', {
      body: { symbol, name }
    });

    if (error) {
      console.warn(`F10分析API获取失败 (${symbol}):`, error.message);
    }

    if (data && data.f10Data) {
      return data.f10Data;
    }

    // 如果Edge Function不可用，返回默认结构
    return { 
      summary: `${name}(${symbol}) F10数据获取中，请稍后重试`, 
      valuation: "市盈率、市净率等估值数据加载中",
      yield: "股息率数据加载中",
      financials: [],
      businessSegments: [],
      shareholders: [],
      announcements: []
    };
  } catch (error) {
    console.warn(`F10分析API未集成，股票: ${symbol}`, error);
    return { 
      summary: `${name}(${symbol}) F10数据获取中，请稍后重试`, 
      valuation: "市盈率、市净率等估值数据加载中",
      yield: "股息率数据加载中",
      financials: [],
      businessSegments: [],
      shareholders: [],
      announcements: []
    };
  }
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

// 集成服务 - 已移除，不再需要API密钥管理功能
export const integrationService = {
  /**
   * 获取所有 API Key - 已移除，不再需要
   */
  getApiKeys: () => {
    console.info('API密钥管理功能已移除，当前系统采用轻量化管理模式');
    return Promise.resolve([]);
  },

  /**
   * 生成/更新 API Key - 已移除，不再需要
   */
  manageApiKey: (userId: string, action: 'generate' | 'disable') => {
    console.info('API密钥管理功能已移除，当前系统采用轻量化管理模式');
    return Promise.resolve({ success: false, message: 'API密钥管理功能已移除' });
  },

  /**
   * 一键校验接入有效性 - 已移除，不再需要
   */
  validateIntegration: (userId: string) => {
    console.info('API密钥校验功能已移除，当前系统采用轻量化管理模式');
    return Promise.resolve({ success: false, message: 'API密钥校验功能已移除' });
  }
};
