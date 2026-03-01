import { supabase } from '../lib/supabase';

export const cancelService = {
  /**
   * 撤销交易订单
   */
  async cancelOrder(tradeId: string, reason: string = '用户主动撤单') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登录');

      const { data, error } = await supabase.rpc('cancel_trade_order', {
        p_trade_id: tradeId,
        p_user_id: user.id,
        p_reason: reason
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || '撤单失败');
      }

      return {
        success: true,
        refundAmount: data.refund_amount
      };
    } catch (error: any) {
      console.error('撤单失败:', error);
      throw error;
    }
  },

  /**
   * 获取用户资金流水
   */
  async getFundFlows(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('fund_flows')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('获取资金流水失败:', error);
      return [];
    }
  },

  /**
   * 手动触发撮合（管理员或测试用）
   */
  async triggerMatch() {
    try {
      const { data, error } = await supabase.rpc('match_trade_orders');
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('触发撮合失败:', error);
      throw error;
    }
  },

  /**
   * 手动触发清算（管理员或测试用）
   */
  async triggerSettlement() {
    try {
      const { data, error } = await supabase.rpc('daily_settlement');
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('触发清算失败:', error);
      throw error;
    }
  }
};
