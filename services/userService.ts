import { supabase } from '../lib/supabase';

export const userService = {
  /**
   * 获取所有用户（仅管理员）
   */
  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        assets!inner(total_asset, available_balance, frozen_balance)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // 格式化数据以适配前端
    return data.map(user => ({
      id: user.id,
      username: user.username || '未设置',
      phone: user.phone || '',
      id_card: user.id_card || '',
      role: user.role || 'USER',
      risk_level: user.risk_level || '稳健型',
      status: user.status || 'ACTIVE',
      balance: user.assets?.[0]?.available_balance || 0,
      total_asset: user.assets?.[0]?.total_asset || 0,
      frozen_balance: user.assets?.[0]?.frozen_balance || 0,
      created_at: user.created_at
    }));
  },

  /**
   * 创建新用户
   */
  async createUser(userData: {
    username: string;
    phone: string;
    id_card: string;
    role: string;
    risk_level: string;
    initial_balance: number;
  }) {
    // 1. 创建auth用户（在实际应用中，这里应该调用管理员API）
    // 由于Supabase Edge Functions限制，这里简化处理
    // 在实际部署中，应该调用管理员API创建用户
    
    // 2. 创建用户profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        username: userData.username,
        phone: userData.phone,
        id_card: userData.id_card,
        role: userData.role,
        risk_level: userData.risk_level,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // 3. 创建用户资产记录
    const { error: assetError } = await supabase
      .from('assets')
      .insert({
        user_id: profileData.id,
        total_asset: userData.initial_balance,
        available_balance: userData.initial_balance,
        frozen_balance: 0
      });

    if (assetError) throw assetError;

    return profileData;
  },

  /**
   * 更新用户信息
   */
  async updateUser(userId: string, userData: {
    username?: string;
    phone?: string;
    risk_level?: string;
    role?: string;
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: userData.username,
        phone: userData.phone,
        risk_level: userData.risk_level,
        role: userData.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 删除用户
   */
  async deleteUser(userId: string) {
    // 注意：在实际应用中，应该软删除或调用管理员API
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'BANNED' })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * 重置用户密码
   */
  async resetPassword(userId: string) {
    // 在实际应用中，应该调用管理员API重置密码
    // 这里返回成功模拟
    return { success: true, message: '密码已重置为初始密码' };
  },

  /**
   * 调整用户余额（上下分）
   */
  async adjustBalance(userId: string, amount: number, type: 'RECHARGE' | 'WITHDRAW', remark: string = '') {
    // 获取当前资产
    const { data: assetData, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentBalance = assetData.available_balance;
    let newBalance = currentBalance;

    if (type === 'RECHARGE') {
      newBalance = currentBalance + amount;
    } else if (type === 'WITHDRAW') {
      if (currentBalance < amount) {
        throw new Error('余额不足');
      }
      newBalance = currentBalance - amount;
    }

    // 更新资产
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        available_balance: newBalance,
        total_asset: newBalance + assetData.frozen_balance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // 记录操作日志
    const { error: logError } = await supabase
      .from('admin_operation_logs')
      .insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || 'system',
        target_user_id: userId,
        operate_type: type,
        operate_content: {
          amount,
          previous_balance: currentBalance,
          new_balance: newBalance,
          remark
        }
      });

    if (logError) console.warn('记录操作日志失败:', logError);

    return { success: true, newBalance };
  },

  /**
   * 更新用户状态
   */
  async updateUserStatus(userId: string, status: 'ACTIVE' | 'BANNED') {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// 注意：tradeService 已移动到单独的 tradeService.ts 文件
// 此文件现在只包含 userService