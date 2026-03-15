/**
 * VIP会员服务层
 * 封装VIP等级、权益相关API调用
 */

import { supabase } from '../lib/supabase';

// VIP等级类型
export interface VipLevel {
  id: string;
  level: number;
  name: string;
  required_points: number;
  required_trades: number;
  required_assets: number;
  fee_discount: number;
  condition_order_limit: number;
  ipo_priority: number;
  level2_quote: boolean;
  exclusive_service: boolean;
  withdrawal_limit: number;
  badge_color: string;
  icon_url: string | null;
}

// 用户VIP信息类型
export interface UserVip {
  id: string;
  user_id: string;
  current_level: number;
  current_points: number;
  total_points: number;
  total_trades: number;
  total_assets: number;
  vip_expire_at: string | null;
  monthly_condition_orders_used: number;
  level_config?: VipLevel;
  next_level?: VipLevel | null;
  progress_percent: number;
}

// VIP权益类型
export interface VipBenefits {
  condition_orders: {
    used: number;
    limit: number;
  };
  fee_discount: number;
  ipo_priority: number;
  level2_quote: boolean;
  exclusive_service: boolean;
  withdrawal_limit: number;
}

/**
 * VIP服务
 */
export const vipService = {
  /**
   * 获取VIP等级配置
   */
  async getVipLevels(): Promise<VipLevel[]> {
    try {
      const { data, error } = await supabase.functions.invoke('user-vip', {
        body: { action: 'get_vip_levels' }
      });

      if (error || !data?.success) {
        return getDefaultVipLevels();
      }

      return data.levels || getDefaultVipLevels();
    } catch (error) {
      console.error('获取VIP等级配置失败:', error);
      return getDefaultVipLevels();
    }
  },

  /**
   * 获取用户VIP信息
   */
  async getMyVip(): Promise<UserVip | null> {
    try {
      const { data, error } = await supabase.functions.invoke('user-vip', {
        body: { action: 'get_my_vip' }
      });

      if (error || !data?.success) {
        return null;
      }

      return data.vip || null;
    } catch (error) {
      console.error('获取用户VIP信息失败:', error);
      return null;
    }
  },

  /**
   * 获取用户VIP权益
   */
  async getVipBenefits(): Promise<VipBenefits | null> {
    try {
      const { data, error } = await supabase.functions.invoke('user-vip', {
        body: { action: 'get_benefits' }
      });

      if (error || !data?.success) {
        return null;
      }

      return data.benefits || null;
    } catch (error) {
      console.error('获取VIP权益失败:', error);
      return null;
    }
  },

  /**
   * 计算交易手续费折扣
   */
  calculateFeeWithDiscount(originalFee: number, feeDiscount: number): number {
    return originalFee * feeDiscount;
  },

  /**
   * 检查是否可以使用条件单
   */
  canUseConditionOrder(benefits: VipBenefits | null): boolean {
    if (!benefits) return false;
    return benefits.condition_orders.used < benefits.condition_orders.limit;
  },

  /**
   * 获取等级名称
   */
  getLevelName(level: number): string {
    const names: Record<number, string> = {
      1: '普通会员',
      2: '白银VIP',
      3: '黄金VIP',
      4: '铂金VIP',
      5: '钻石VIP'
    };
    return names[level] || '普通会员';
  },

  /**
   * 获取等级颜色
   */
  getLevelColor(level: number): string {
    const colors: Record<number, string> = {
      1: '#666666',
      2: '#C0C0C0',
      3: '#FFD700',
      4: '#E5E4E2',
      5: '#B9F2FF'
    };
    return colors[level] || '#666666';
  }
};

/**
 * 默认VIP等级配置
 */
function getDefaultVipLevels(): VipLevel[] {
  return [
    {
      id: '1',
      level: 1,
      name: '普通会员',
      required_points: 0,
      required_trades: 0,
      required_assets: 0,
      fee_discount: 1.0,
      condition_order_limit: 3,
      ipo_priority: 0,
      level2_quote: false,
      exclusive_service: false,
      withdrawal_limit: 100000,
      badge_color: '#666666',
      icon_url: null
    },
    {
      id: '2',
      level: 2,
      name: '白银VIP',
      required_points: 1000,
      required_trades: 10,
      required_assets: 50000,
      fee_discount: 0.95,
      condition_order_limit: 5,
      ipo_priority: 1,
      level2_quote: false,
      exclusive_service: false,
      withdrawal_limit: 200000,
      badge_color: '#C0C0C0',
      icon_url: null
    },
    {
      id: '3',
      level: 3,
      name: '黄金VIP',
      required_points: 5000,
      required_trades: 50,
      required_assets: 200000,
      fee_discount: 0.90,
      condition_order_limit: 10,
      ipo_priority: 2,
      level2_quote: true,
      exclusive_service: false,
      withdrawal_limit: 500000,
      badge_color: '#FFD700',
      icon_url: null
    },
    {
      id: '4',
      level: 4,
      name: '铂金VIP',
      required_points: 20000,
      required_trades: 200,
      required_assets: 1000000,
      fee_discount: 0.85,
      condition_order_limit: 20,
      ipo_priority: 3,
      level2_quote: true,
      exclusive_service: true,
      withdrawal_limit: 1000000,
      badge_color: '#E5E4E2',
      icon_url: null
    },
    {
      id: '5',
      level: 5,
      name: '钻石VIP',
      required_points: 100000,
      required_trades: 500,
      required_assets: 5000000,
      fee_discount: 0.80,
      condition_order_limit: 50,
      ipo_priority: 5,
      level2_quote: true,
      exclusive_service: true,
      withdrawal_limit: 5000000,
      badge_color: '#B9F2FF',
      icon_url: null
    }
  ];
}

export default vipService;
