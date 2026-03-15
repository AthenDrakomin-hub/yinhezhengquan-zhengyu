/**
 * 基金服务层
 * 封装基金申购、赎回、持仓查询等API调用
 */

import { supabase } from '../lib/supabase';

// 基金类型定义
export interface Fund {
  id: string;
  code: string;
  name: string;
  fund_type: string;
  nav: number;
  nav_date: string;
  day_change: number;
  day_change_rate: number;
  one_week_return: number | null;
  one_month_return: number | null;
  three_month_return: number | null;
  six_month_return: number | null;
  one_year_return: number | null;
  scale: number | null;
  purchase_fee_rate: number;
  redeem_fee_rate: number;
  min_purchase: number;
  risk_level: number;
  status: string;
  can_purchase: boolean;
  can_redeem: boolean;
  manager: string | null;
  company: string | null;
  logo_url: string | null;
}

// 基金持仓类型
export interface FundHolding {
  id: string;
  fund_code: string;
  fund_name: string;
  total_shares: number;
  available_shares: number;
  frozen_shares: number;
  cost_amount: number;
  cost_nav: number;
  current_nav: number;
  market_value: number;
  profit: number;
  profit_rate: number;
  first_purchase_date: string;
}

// 基金订单类型
export interface FundOrder {
  id: string;
  user_id: string;
  fund_code: string;
  fund_name: string;
  order_type: 'PURCHASE' | 'REDEEM';
  amount?: number;
  shares?: number;
  fee: number;
  confirm_nav?: number;
  confirm_shares?: number;
  confirm_amount?: number;
  status: string;
  order_date: string;
  confirm_date?: string;
  settle_date?: string;
}

// 基金类型选项
export const FUND_TYPES = [
  { key: 'all', label: '全部' },
  { key: '股票型', label: '股票型' },
  { key: '债券型', label: '债券型' },
  { key: '混合型', label: '混合型' },
  { key: '指数型', label: '指数型' },
  { key: '货币型', label: '货币型' },
  { key: '商品型', label: '商品型' },
  { key: 'QDII', label: 'QDII' },
];

// 风险等级标签
export const RISK_LEVELS = {
  1: { label: '低风险', color: 'text-[#22C55E] bg-green-50' },
  2: { label: '中低风险', color: 'text-[#3B82F6] bg-blue-50' },
  3: { label: '中风险', color: 'text-[#F97316] bg-orange-50' },
  4: { label: '中高风险', color: 'text-[#EF4444] bg-red-50' },
  5: { label: '高风险', color: 'text-[#991B1B] bg-red-100' },
};

/**
 * 基金服务
 */
export const fundService = {
  /**
   * 获取基金列表
   */
  async getFunds(type?: string): Promise<Fund[]> {
    try {
      let query = supabase
        .from('funds')
        .select('*');

      // 根据表结构调整过滤条件
      // 如果 status 列存在，则过滤
      // 如果 can_purchase 列存在，则过滤
      
      if (type && type !== 'all') {
        // 兼容两种表结构：fund_type 或 type
        query = query.or(`fund_type.eq.${type},type.eq.${type}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取基金列表失败:', error);
        return getDefaultFunds();
      }

      // 如果有数据，按收益率排序（前端排序，避免依赖数据库列）
      if (data && data.length > 0) {
        const formattedData = data.map(formatFund);
        // 按 one_year_return 降序排序
        formattedData.sort((a, b) => (b.one_year_return || 0) - (a.one_year_return || 0));
        return formattedData;
      }

      return getDefaultFunds();
    } catch (error) {
      console.error('获取基金列表异常:', error);
      return getDefaultFunds();
    }
  },

  /**
   * 获取基金详情
   */
  async getFundDetail(code: string): Promise<Fund | null> {
    try {
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        console.error('获取基金详情失败:', error);
        return null;
      }

      return data ? formatFund(data) : null;
    } catch (error) {
      console.error('获取基金详情异常:', error);
      return null;
    }
  },

  /**
   * 获取用户基金持仓
   */
  async getFundHoldings(userId: string): Promise<FundHolding[]> {
    try {
      const { data, error } = await supabase
        .from('fund_holdings')
        .select('*')
        .eq('user_id', userId)
        .gt('total_shares', 0);

      if (error) {
        // 如果表不存在，返回模拟数据
        if (error.code === 'PGRST205' || error.message.includes('Could not find')) {
          console.warn('fund_holdings 表不存在，返回模拟持仓数据');
          return getDefaultFundHoldings(userId);
        }
        console.error('获取基金持仓失败:', error);
        return [];
      }

      return (data || []).map(formatHolding);
    } catch (error) {
      console.error('获取基金持仓异常:', error);
      return [];
    }
  },

  /**
   * 获取基金订单记录
   */
  async getFundOrders(userId: string, limit: number = 20): Promise<FundOrder[]> {
    try {
      const { data, error } = await supabase
        .from('fund_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取基金订单失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取基金订单异常:', error);
      return [];
    }
  },

  /**
   * 基金申购
   */
  async purchase(params: {
    fund_code: string;
    amount: number;
    request_id?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('fund-purchase', {
        body: params
      });

      if (error) {
        return { success: false, error: error.message || '申购失败' };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('基金申购异常:', error);
      return { success: false, error: error.message || '申购失败，请稍后重试' };
    }
  },

  /**
   * 基金赎回
   */
  async redeem(params: {
    fund_code: string;
    shares?: number;
    redeem_all?: boolean;
    request_id?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('fund-redeem', {
        body: params
      });

      if (error) {
        return { success: false, error: error.message || '赎回失败' };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('基金赎回异常:', error);
      return { success: false, error: error.message || '赎回失败，请稍后重试' };
    }
  },

  /**
   * 计算申购份额预览
   */
  calculatePurchase(amount: number, nav: number, feeRate: number): {
    fee: number;
    netAmount: number;
    shares: number;
  } {
    const fee = amount * feeRate;
    const netAmount = amount - fee;
    const shares = netAmount / nav;
    return { fee, netAmount, shares };
  },

  /**
   * 计算赎回金额预览
   */
  calculateRedeem(
    shares: number,
    nav: number,
    feeRate: number,
    holdingDays: number = 0
  ): {
    amount: number;
    feeRate: number;
    fee: number;
    netAmount: number;
  } {
    const amount = shares * nav;
    
    // 根据持有天数调整费率
    let actualFeeRate = feeRate;
    if (holdingDays >= 730) {
      actualFeeRate = 0;
    } else if (holdingDays >= 365) {
      actualFeeRate = feeRate * 0.25;
    } else if (holdingDays >= 180) {
      actualFeeRate = feeRate * 0.5;
    } else if (holdingDays >= 30) {
      actualFeeRate = feeRate * 0.75;
    }

    const fee = amount * actualFeeRate;
    const netAmount = amount - fee;

    return { amount, feeRate: actualFeeRate, fee, netAmount };
  },
};

/**
 * 格式化基金数据
 */
function formatFund(data: any): Fund {
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    fund_type: data.fund_type || '混合型',
    nav: Number(data.nav) || 1,
    nav_date: data.nav_date,
    day_change: Number(data.day_change) || 0,
    day_change_rate: Number(data.day_change_rate) || 0,
    one_week_return: data.one_week_return ? Number(data.one_week_return) : null,
    one_month_return: data.one_month_return ? Number(data.one_month_return) : null,
    three_month_return: data.three_month_return ? Number(data.three_month_return) : null,
    six_month_return: data.six_month_return ? Number(data.six_month_return) : null,
    one_year_return: data.one_year_return ? Number(data.one_year_return) : null,
    scale: data.scale ? Number(data.scale) : null,
    purchase_fee_rate: Number(data.purchase_fee_rate) || 0.0015,
    redeem_fee_rate: Number(data.redeem_fee_rate) || 0.005,
    min_purchase: Number(data.min_purchase) || 10,
    risk_level: Number(data.risk_level) || 3,
    status: data.status || 'active',
    can_purchase: data.can_purchase !== false,
    can_redeem: data.can_redeem !== false,
    manager: data.manager,
    company: data.company,
    logo_url: data.logo_url,
  };
}

/**
 * 格式化持仓数据
 */
function formatHolding(data: any): FundHolding {
  const currentNav = Number(data.current_nav) || 0;
  const totalShares = Number(data.total_shares) || 0;
  const costAmount = Number(data.cost_amount) || 0;
  const marketValue = totalShares * currentNav;
  const profit = marketValue - costAmount;
  const profitRate = costAmount > 0 ? (profit / costAmount) * 100 : 0;

  return {
    id: data.id,
    fund_code: data.fund_code,
    fund_name: data.fund_name,
    total_shares: totalShares,
    available_shares: Number(data.available_shares) || 0,
    frozen_shares: Number(data.frozen_shares) || 0,
    cost_amount: costAmount,
    cost_nav: Number(data.cost_nav) || 0,
    current_nav: currentNav,
    market_value: marketValue,
    profit,
    profit_rate: profitRate,
    first_purchase_date: data.first_purchase_date,
  };
}

/**
 * 默认基金数据（当数据库无数据时使用）
 */
function getDefaultFunds(): Fund[] {
  return [
    {
      id: '1',
      code: '110022',
      name: '易方达消费行业股票',
      fund_type: '股票型',
      nav: 4.5234,
      nav_date: new Date().toISOString().split('T')[0],
      day_change: 0.0234,
      day_change_rate: 0.52,
      one_week_return: 1.2,
      one_month_return: 3.5,
      three_month_return: 8.2,
      six_month_return: 15.3,
      one_year_return: 28.5,
      scale: 150.5,
      purchase_fee_rate: 0.0015,
      redeem_fee_rate: 0.005,
      min_purchase: 10,
      risk_level: 4,
      status: 'active',
      can_purchase: true,
      can_redeem: true,
      manager: '萧楠',
      company: '易方达基金',
      logo_url: null,
    },
    {
      id: '2',
      code: '000961',
      name: '天弘沪深300ETF联接A',
      fund_type: '指数型',
      nav: 1.8521,
      nav_date: new Date().toISOString().split('T')[0],
      day_change: -0.0089,
      day_change_rate: -0.48,
      one_week_return: 0.8,
      one_month_return: 2.1,
      three_month_return: 5.6,
      six_month_return: 10.2,
      one_year_return: 15.2,
      scale: 89.3,
      purchase_fee_rate: 0.001,
      redeem_fee_rate: 0.005,
      min_purchase: 10,
      risk_level: 3,
      status: 'active',
      can_purchase: true,
      can_redeem: true,
      manager: '张子法',
      company: '天弘基金',
      logo_url: null,
    },
    {
      id: '3',
      code: '000198',
      name: '天弘余额宝货币',
      fund_type: '货币型',
      nav: 1.0000,
      nav_date: new Date().toISOString().split('T')[0],
      day_change: 0,
      day_change_rate: 0,
      one_week_return: 0.03,
      one_month_return: 0.15,
      three_month_return: 0.45,
      six_month_return: 0.9,
      one_year_return: 1.8,
      scale: 15000,
      purchase_fee_rate: 0,
      redeem_fee_rate: 0,
      min_purchase: 1,
      risk_level: 1,
      status: 'active',
      can_purchase: true,
      can_redeem: true,
      manager: '王登峰',
      company: '天弘基金',
      logo_url: null,
    },
  ];
}

/**
 * 获取默认基金持仓数据（模拟数据）
 */
function getDefaultFundHoldings(userId: string): FundHolding[] {
  return [
    {
      id: 'demo-1',
      fund_code: '110022',
      fund_name: '易方达消费行业',
      total_shares: 1000,
      available_shares: 1000,
      frozen_shares: 0,
      cost_amount: 4000,
      cost_nav: 4.0,
      current_nav: 4.5234,
      market_value: 4523.40,
      profit: 523.40,
      profit_rate: 13.09,
      first_purchase_date: '2025-01-15',
    },
    {
      id: 'demo-2',
      fund_code: '000961',
      fund_name: '天弘沪深300',
      total_shares: 2000,
      available_shares: 2000,
      frozen_shares: 0,
      cost_amount: 3900,
      cost_nav: 1.95,
      current_nav: 1.8521,
      market_value: 3704.20,
      profit: -195.80,
      profit_rate: -5.02,
      first_purchase_date: '2025-02-01',
    },
    {
      id: 'demo-3',
      fund_code: '519772',
      fund_name: '交银定期支付双息',
      total_shares: 500,
      available_shares: 500,
      frozen_shares: 0,
      cost_amount: 700,
      cost_nav: 1.40,
      current_nav: 1.4523,
      market_value: 726.15,
      profit: 26.15,
      profit_rate: 3.73,
      first_purchase_date: '2025-03-01',
    },
  ];
}

export default fundService;
