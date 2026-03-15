/**
 * 运营活动服务层
 * 封装活动列表、参与、管理相关API调用
 */

import { supabase } from '../lib/supabase';

// 活动类型
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  campaign_type: string;
  start_time: string;
  end_time: string;
  rules: Record<string, any>;
  reward_type: string;
  reward_value: number | null;
  reward_config: Record<string, any>;
  max_participants: number;
  max_per_user: number;
  vip_only: boolean;
  min_vip_level: number;
  participant_count: number;
  reward_given_count: number;
  status: string;
  created_at: string;
}

// 活动参与记录类型
export interface CampaignParticipation {
  id: string;
  campaign_id: string;
  user_id: string;
  participation_data: Record<string, any>;
  reward_received: boolean;
  reward_type: string | null;
  reward_value: number | null;
  reward_given_at: string | null;
  participated_at: string;
  campaign?: Campaign;
}

// 活动类型说明
export const CAMPAIGN_TYPES = {
  SIGN_BONUS: { label: '注册奖励', icon: '🎁' },
  TRADE_REWARD: { label: '交易返利', icon: '💰' },
  IPO_ACTIVITY: { label: '新股活动', icon: '📈' },
  REFERRAL: { label: '邀请有礼', icon: '👥' },
  LIMITED_TIME: { label: '限时活动', icon: '⏰' }
};

// 奖励类型说明
export const REWARD_TYPES = {
  points: '积分',
  cash: '现金',
  coupon: '优惠券',
  gift: '实物礼品'
};

/**
 * 运营活动服务
 */
export const campaignService = {
  /**
   * 获取活动列表（用户端）
   */
  async getCampaigns(type?: string): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign', {
        body: { action: 'list', type }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.campaigns || [];
    } catch (error) {
      console.error('获取活动列表失败:', error);
      return [];
    }
  },

  /**
   * 获取活动详情
   */
  async getCampaignDetail(campaignId: string): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign', {
        body: { action: 'detail', campaign_id: campaignId }
      });

      if (error || !data?.success) {
        return null;
      }

      return data.campaign || null;
    } catch (error) {
      console.error('获取活动详情失败:', error);
      return null;
    }
  },

  /**
   * 参与活动
   */
  async participate(campaignId: string, data?: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await supabase.functions.invoke('campaign', {
        body: { action: 'participate', campaign_id: campaignId, data }
      });

      if (result.error) {
        return { success: false, error: result.error.message || '参与失败' };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('参与活动失败:', error);
      return { success: false, error: error.message || '参与失败，请稍后重试' };
    }
  },

  /**
   * 获取我参与的活动
   */
  async getMyParticipations(): Promise<CampaignParticipation[]> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign', {
        body: { action: 'my_participations' }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.participations || [];
    } catch (error) {
      console.error('获取参与记录失败:', error);
      return [];
    }
  },

  /**
   * 检查活动是否进行中
   */
  isActive(campaign: Campaign): boolean {
    const now = new Date();
    const startTime = new Date(campaign.start_time);
    const endTime = new Date(campaign.end_time);
    return campaign.status === 'active' && now >= startTime && now <= endTime;
  },

  /**
   * 检查活动是否已结束
   */
  isEnded(campaign: Campaign): boolean {
    const now = new Date();
    const endTime = new Date(campaign.end_time);
    return now > endTime || campaign.status === 'ended';
  },

  /**
   * 检查活动是否即将开始
   */
  isUpcoming(campaign: Campaign): boolean {
    const now = new Date();
    const startTime = new Date(campaign.start_time);
    return now < startTime && campaign.status === 'active';
  },

  /**
   * 获取活动剩余时间
   */
  getRemainingTime(campaign: Campaign): { days: number; hours: number; minutes: number } | null {
    if (!this.isActive(campaign)) return null;

    const now = new Date();
    const endTime = new Date(campaign.end_time);
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  },

  /**
   * 获取活动进度
   */
  getProgress(campaign: Campaign): number {
    if (campaign.max_participants <= 0) return 0;
    return Math.min(100, (campaign.participant_count / campaign.max_participants) * 100);
  }
};

// 管理员活动服务
export const adminCampaignService = {
  /**
   * 获取所有活动（管理员）
   */
  async getCampaigns(params?: { status?: string; type?: string }): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign', {
        body: { action: 'admin_list', ...params }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.campaigns || [];
    } catch (error) {
      console.error('获取活动列表失败:', error);
      return [];
    }
  },

  /**
   * 创建活动
   */
  async createCampaign(params: Partial<Campaign>): Promise<{ success: boolean; data?: Campaign; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign', {
        body: { action: 'admin_create', ...params }
      });

      if (error) {
        return { success: false, error: error.message || '创建失败' };
      }

      return { success: true, data: data.campaign };
    } catch (error: any) {
      console.error('创建活动失败:', error);
      return { success: false, error: error.message || '创建失败，请稍后重试' };
    }
  },

  /**
   * 更新活动
   */
  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<{ success: boolean; data?: Campaign; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign', {
        body: { action: 'admin_update', campaign_id: campaignId, ...updates }
      });

      if (error) {
        return { success: false, error: error.message || '更新失败' };
      }

      return { success: true, data: data.campaign };
    } catch (error: any) {
      console.error('更新活动失败:', error);
      return { success: false, error: error.message || '更新失败，请稍后重试' };
    }
  },

  /**
   * 删除活动
   */
  async deleteCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('campaign', {
        body: { action: 'admin_delete', campaign_id: campaignId }
      });

      if (error) {
        return { success: false, error: error.message || '删除失败' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('删除活动失败:', error);
      return { success: false, error: error.message || '删除失败，请稍后重试' };
    }
  },

  /**
   * 获取活动统计
   */
  async getStats(campaignId: string): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign', {
        body: { action: 'admin_stats', campaign_id: campaignId }
      });

      if (error || !data?.success) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('获取活动统计失败:', error);
      return null;
    }
  },

  /**
   * 发放奖励
   */
  async giveReward(participationId: string, rewardType?: string, rewardValue?: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('campaign', {
        body: { action: 'admin_give_reward', participation_id: participationId, reward_type: rewardType, reward_value: rewardValue }
      });

      if (error) {
        return { success: false, error: error.message || '发放失败' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('发放奖励失败:', error);
      return { success: false, error: error.message || '发放失败，请稍后重试' };
    }
  }
};

export default campaignService;
