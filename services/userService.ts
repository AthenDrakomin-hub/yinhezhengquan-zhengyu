import { supabase } from '../lib/supabase';

export const userService = {
  /**
   * 获取所有用户 (仅管理员)
   */
  async getAllUsers() {
    // 联表查询资产信息
    const { data, error } = await supabase
      .from('profiles')
      .select('*, assets(available_balance, total_asset)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // 扁平化数据以适配前端
    return data.map(user => ({
      ...user,
      balance: user.assets?.[0]?.available_balance || 0,
      totalAsset: user.assets?.[0]?.total_asset || 0
    }));
  },

  /**
   * 更新用户状态 (仅管理员)
   */
  async updateUserStatus(userId: string, status: 'ACTIVE' | 'BANNED') {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * 资金上下分 (仅管理员)
   */
  async adjustBalance(userId: string, amount: number, type: 'RECHARGE' | 'WITHDRAW', remark = '') {
    const { data, error } = await supabase.functions.invoke('admin-user-fund-operation', {
      body: { 
        target_user_id: userId, 
        amount, 
        operate_type: type,
        remark
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 获取审计日志 (仅管理员)
   */
  async getAuditLogs(limit = 50) {
    const { data, error } = await supabase
      .from('admin_operation_logs')
      .select('*, admin:profiles!admin_id(username)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};
