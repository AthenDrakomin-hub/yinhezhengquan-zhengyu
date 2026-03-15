/**
 * 数据报表服务层
 * 封装各类统计报表API调用
 */

import { supabase } from '../lib/supabase';

// 仪表盘数据类型
export interface DashboardData {
  users: {
    total: number;
    today_new: number;
    today_active: number;
  };
  trades: {
    total: number;
    today: number;
    total_volume: number;
    today_volume: number;
  };
  assets: {
    total: number;
  };
  vip: {
    total: number;
  };
  points: {
    today_issued: number;
  };
  trends: {
    users: Record<string, number>;
    trades: Record<string, { count: number; volume: number }>;
  };
}

// 用户统计数据类型
export interface UserStats {
  new_users_trend: Record<string, number>;
  active_users_trend: Record<string, number>;
  device_distribution: Record<string, number>;
  region_distribution: Record<string, number>;
  total_new_users: number;
  total_active_users: number;
}

// 交易统计数据类型
export interface TradeStats {
  trades_trend: Record<string, { count: number; volume: number; buy: number; sell: number }>;
  trades_by_type: Record<string, number>;
  hot_stocks: Array<{ symbol: string; count: number; volume: number }>;
  total_trades: number;
  total_volume: number;
  total_buy: number;
  total_sell: number;
}

// 资产统计数据类型
export interface AssetStats {
  total_assets: number;
  asset_composition: {
    cash: number;
    stock: number;
    fund: number;
    wealth: number;
  };
  asset_distribution: Array<{ label: string; count: number }>;
  top_holdings: Array<{ symbol: string; quantity: number; value: number }>;
  avg_assets_per_user: number;
}

// 收入统计数据类型
export interface RevenueStats {
  revenue_trend: Record<string, { fee: number; other: number }>;
  total_fee_revenue: number;
  total_other_revenue: number;
  total_revenue: number;
}

// VIP统计数据类型
export interface VipStats {
  level_distribution: Record<number, number>;
  total_vip_users: number;
  vip_penetration: number;
  benefit_usage: Record<string, number>;
  upgrades_this_month: number;
}

// 活动统计数据类型
export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  type_distribution: Record<string, { count: number; participants: number }>;
  total_participations: number;
  campaigns: any[];
}

// 积分统计数据类型
export interface PointsStats {
  total_points_earned: number;
  total_points_spent: number;
  outstanding_points: number;
  source_distribution: Record<string, number>;
  total_exchanges: number;
}

/**
 * 数据报表服务
 */
export const reportService = {
  /**
   * 获取仪表盘数据
   */
  async getDashboard(): Promise<DashboardData | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'dashboard' }
      });

      if (error) {
        // 权限问题或未登录时，返回模拟数据
        if (error.message?.includes('401') || error.message?.includes('登录') || error.message?.includes('过期')) {
          console.warn('仪表盘数据: 需要管理员权限');
          return this.getDefaultDashboard();
        }
        console.error('获取仪表盘数据失败:', error);
        return this.getDefaultDashboard();
      }

      if (!data?.success) {
        console.warn('仪表盘数据:', data?.error || '未知错误');
        return this.getDefaultDashboard();
      }

      return data.dashboard;
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      return this.getDefaultDashboard();
    }
  },

  /**
   * 获取默认仪表盘数据
   */
  getDefaultDashboard(): DashboardData {
    return {
      users: { total: 0, today_new: 0, today_active: 0 },
      trades: { total: 0, today: 0, total_volume: 0, today_volume: 0 },
      assets: { total: 0 },
      vip: { total: 0 },
      points: { today_issued: 0 },
      trends: { users: {}, trades: {} }
    };
  },

  /**
   * 获取用户统计
   */
  async getUserStats(params?: {
    start_date?: string;
    end_date?: string;
    group_by?: 'day' | 'month';
  }): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'user_stats', ...params }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return this.getDefaultUserStats();
        }
        console.error('获取用户统计失败:', error);
        return this.getDefaultUserStats();
      }

      if (!data?.success) {
        return this.getDefaultUserStats();
      }

      return data.stats;
    } catch (error) {
      console.error('获取用户统计失败:', error);
      return this.getDefaultUserStats();
    }
  },

  getDefaultUserStats(): UserStats {
    return {
      new_users_trend: {},
      active_users_trend: {},
      device_distribution: {},
      region_distribution: {},
      total_new_users: 0,
      total_active_users: 0
    };
  },

  /**
   * 获取交易统计
   */
  async getTradeStats(params?: {
    start_date?: string;
    end_date?: string;
    group_by?: 'day' | 'month';
  }): Promise<TradeStats | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'trade_stats', ...params }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return this.getDefaultTradeStats();
        }
        return this.getDefaultTradeStats();
      }

      return data?.stats || this.getDefaultTradeStats();
    } catch (error) {
      return this.getDefaultTradeStats();
    }
  },

  getDefaultTradeStats(): TradeStats {
    return {
      trades_trend: {},
      trades_by_type: {},
      hot_stocks: [],
      total_trades: 0,
      total_volume: 0,
      total_buy: 0,
      total_sell: 0
    };
  },

  /**
   * 获取资产统计
   */
  async getAssetStats(): Promise<AssetStats | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'asset_stats' }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return this.getDefaultAssetStats();
        }
        return this.getDefaultAssetStats();
      }

      return data?.stats || this.getDefaultAssetStats();
    } catch (error) {
      return this.getDefaultAssetStats();
    }
  },

  getDefaultAssetStats(): AssetStats {
    return {
      total_assets: 0,
      asset_composition: { cash: 0, stock: 0, fund: 0, wealth: 0 },
      asset_distribution: [],
      top_holdings: [],
      avg_assets_per_user: 0
    };
  },

  /**
   * 获取收入统计
   */
  async getRevenueStats(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<RevenueStats | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'revenue_stats', ...params }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return this.getDefaultRevenueStats();
        }
        return this.getDefaultRevenueStats();
      }

      return data?.stats || this.getDefaultRevenueStats();
    } catch (error) {
      return this.getDefaultRevenueStats();
    }
  },

  getDefaultRevenueStats(): RevenueStats {
    return {
      revenue_trend: {},
      total_fee_revenue: 0,
      total_other_revenue: 0,
      total_revenue: 0
    };
  },

  /**
   * 获取VIP统计
   */
  async getVipStats(): Promise<VipStats | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'vip_stats' }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return this.getDefaultVipStats();
        }
        return this.getDefaultVipStats();
      }

      return data?.stats || this.getDefaultVipStats();
    } catch (error) {
      return this.getDefaultVipStats();
    }
  },

  getDefaultVipStats(): VipStats {
    return {
      level_distribution: {},
      total_vip_users: 0,
      vip_penetration: 0,
      benefit_usage: {},
      upgrades_this_month: 0
    };
  },

  /**
   * 获取活动统计
   */
  async getCampaignStats(campaignId?: string): Promise<CampaignStats | null> {
    try {
      const body: any = { action: 'campaign_stats' };
      if (campaignId) {
        body.campaign_id = campaignId;
      }

      const { data, error } = await supabase.functions.invoke('data-reports', {
        body
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return this.getDefaultCampaignStats();
        }
        return this.getDefaultCampaignStats();
      }

      return data?.stats || this.getDefaultCampaignStats();
    } catch (error) {
      return this.getDefaultCampaignStats();
    }
  },

  getDefaultCampaignStats(): CampaignStats {
    return {
      total_campaigns: 0,
      active_campaigns: 0,
      type_distribution: {},
      total_participations: 0,
      campaigns: []
    };
  },

  /**
   * 获取积分统计
   */
  async getPointsStats(): Promise<PointsStats | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'points_stats' }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return this.getDefaultPointsStats();
        }
        return this.getDefaultPointsStats();
      }

      return data?.stats || this.getDefaultPointsStats();
    } catch (error) {
      return this.getDefaultPointsStats();
    }
  },

  getDefaultPointsStats(): PointsStats {
    return {
      total_points_earned: 0,
      total_points_spent: 0,
      outstanding_points: 0,
      source_distribution: {},
      total_exchanges: 0
    };
  },

  /**
   * 导出用户数据
   */
  async exportUsers(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<any[] | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'export_users', ...params }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return [];
        }
        return [];
      }

      return data?.data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * 导出交易数据
   */
  async exportTrades(params?: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
  }): Promise<any[] | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'export_trades', ...params }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return [];
        }
        return [];
      }

      return data?.data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * 导出资产数据
   */
  async exportAssets(params?: {
    min_value?: number;
  }): Promise<any[] | null> {
    try {
      const { data, error } = await supabase.functions.invoke('data-reports', {
        body: { action: 'export_assets', ...params }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('登录')) {
          return [];
        }
        return [];
      }

      return data?.data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * 格式化金额
   */
  formatAmount(amount: number): string {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(2)}亿`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return amount.toFixed(2);
  },

  /**
   * 格式化数字
   */
  formatNumber(num: number): string {
    if (num >= 100000000) {
      return `${(num / 100000000).toFixed(1)}亿`;
    }
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString();
  },

  /**
   * 获取日期范围
   */
  getDateRange(range: 'today' | 'week' | 'month' | 'quarter' | 'year'): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    switch (range) {
      case 'today':
        start = end;
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'quarter':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { start, end };
  }
};

export default reportService;
