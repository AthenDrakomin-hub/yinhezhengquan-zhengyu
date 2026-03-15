/**
 * 签到积分服务层
 * 封装签到、积分、兑换相关API调用
 */

import { supabase } from '../lib/supabase';

// 签到状态类型
export interface CheckinStatus {
  today_checked_in: boolean;
  consecutive_days: number;
  total_days: number;
  today_points: number;
  configs: CheckinConfig[];
}

// 签到配置类型
export interface CheckinConfig {
  id: string;
  consecutive_days: number;
  bonus_points: number;
  bonus_multiplier: number;
  extra_reward: string | null;
}

// 签到记录类型
export interface CheckinRecord {
  id: string;
  user_id: string;
  checkin_date: string;
  consecutive_days: number;
  total_days: number;
  points_earned: number;
  bonus_multiplier: number;
}

// 积分记录类型
export interface PointRecord {
  id: string;
  user_id: string;
  points: number;
  balance_before: number;
  balance_after: number;
  source_type: string;
  source_id: string | null;
  description: string;
  created_at: string;
}

// 积分商品类型
export interface PointGoods {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_required: number;
  stock: number;
  max_per_user: number;
  goods_type: string;
  goods_value: number | null;
  status: string;
}

// 兑换记录类型
export interface RedemptionRecord {
  id: string;
  user_id: string;
  goods_id: string;
  goods_name: string;
  points_spent: number;
  quantity: number;
  status: string;
  created_at: string;
}

// 积分来源类型
export const POINT_SOURCE_TYPES = {
  SIGN_IN: '签到',
  TRADE: '交易',
  ACTIVITY: '活动',
  REDEEM: '兑换',
  EXPIRE: '过期',
  GIFT: '赠送'
};

/**
 * 签到积分服务
 */
export const checkinService = {
  /**
   * 签到
   */
  async checkin(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('user-checkin', {
        body: { action: 'checkin' }
      });

      if (error) {
        return { success: false, error: error.message || '签到失败' };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('签到失败:', error);
      return { success: false, error: error.message || '签到失败，请稍后重试' };
    }
  },

  /**
   * 获取签到状态
   */
  async getCheckinStatus(): Promise<CheckinStatus | null> {
    try {
      const { data, error } = await supabase.functions.invoke('user-checkin', {
        body: { action: 'get_checkin_status' }
      });

      if (error || !data?.success) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('获取签到状态失败:', error);
      return null;
    }
  },

  /**
   * 获取签到记录
   */
  async getCheckinRecords(month?: number): Promise<CheckinRecord[]> {
    try {
      const { data, error } = await supabase.functions.invoke('user-checkin', {
        body: { action: 'get_checkin_records', month }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.records || [];
    } catch (error) {
      console.error('获取签到记录失败:', error);
      return [];
    }
  },

  /**
   * 获取积分记录
   */
  async getPointRecords(limit: number = 50): Promise<PointRecord[]> {
    try {
      const { data, error } = await supabase.functions.invoke('user-checkin', {
        body: { action: 'get_point_records', limit }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.records || [];
    } catch (error) {
      console.error('获取积分记录失败:', error);
      return [];
    }
  },

  /**
   * 获取积分商品列表
   */
  async getPointGoods(): Promise<PointGoods[]> {
    try {
      const { data, error } = await supabase.functions.invoke('user-checkin', {
        body: { action: 'get_point_goods' }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.goods || [];
    } catch (error) {
      console.error('获取积分商品失败:', error);
      return [];
    }
  },

  /**
   * 兑换商品
   */
  async redeemGoods(goodsId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('user-checkin', {
        body: { action: 'redeem_goods', goods_id: goodsId }
      });

      if (error) {
        return { success: false, error: error.message || '兑换失败' };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('兑换商品失败:', error);
      return { success: false, error: error.message || '兑换失败，请稍后重试' };
    }
  },

  /**
   * 获取兑换记录
   */
  async getRedemptions(): Promise<RedemptionRecord[]> {
    try {
      const { data, error } = await supabase.functions.invoke('user-checkin', {
        body: { action: 'get_redemptions' }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.redemptions || [];
    } catch (error) {
      console.error('获取兑换记录失败:', error);
      return [];
    }
  },

  /**
   * 格式化签到日期（用于日历显示）
   */
  formatCheckinDates(records: CheckinRecord[]): Set<string> {
    const dates = new Set<string>();
    records.forEach(record => {
      dates.add(record.checkin_date);
    });
    return dates;
  },

  /**
   * 获取连续签到天数图标
   */
  getConsecutiveIcon(days: number): string {
    if (days >= 30) return '🏆';
    if (days >= 14) return '🎉';
    if (days >= 7) return '🔥';
    if (days >= 3) return '⭐';
    return '📅';
  },

  /**
   * 计算下次里程碑
   */
  getNextMilestone(days: number): { days: number; bonus: number } | null {
    const milestones = [7, 14, 30];
    for (const milestone of milestones) {
      if (days < milestone) {
        return {
          days: milestone,
          bonus: milestone === 7 ? 50 : (milestone === 14 ? 100 : 500)
        };
      }
    }
    return null;
  }
};

export default checkinService;
