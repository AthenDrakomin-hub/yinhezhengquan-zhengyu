import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// 创建使用service_role key的admin客户端（仅用于需要admin权限的操作）
const createAdminClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('缺少Supabase admin配置，部分功能可能无法使用');
    return null;
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export const userService = {
  /**
   * 获取所有用户（仅管理员）
   */
  async getAllUsers() {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // 获取所有用户的资产数据
    const userIds = profilesData.map(profile => profile.id);
    let assetsData: any[] = [];
    if (userIds.length > 0) {
      const { data: assetsResult, error: assetsError } = await supabase
        .from('assets')
        .select('user_id, total_asset, available_balance, frozen_balance')
        .in('user_id', userIds);
      
      if (assetsError) {
        console.error('获取资产数据失败:', assetsError);
        // 即使资产获取失败，也继续返回用户数据
        assetsData = [];
      } else {
        assetsData = assetsResult || [];
      }
    }

    // 尝试获取用户邮箱信息
    const userEmails = new Map<string, string>();
    try {
      const adminClient = createAdminClient();
      if (adminClient && userIds.length > 0) {
        // 使用admin客户端查询auth.users表获取邮箱
        const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
        if (!authError && authUsers) {
          authUsers.users.forEach((user: any) => {
            userEmails.set(user.id, user.email || '');
          });
        }
      }
    } catch (err) {
      console.warn('获取用户邮箱信息失败:', err);
    }

    // 将资产数据与用户数据合并
    const assetsMap = new Map(assetsData.map(asset => [asset.user_id, asset]));
    
    return profilesData.map(profile => {
      const asset = assetsMap.get(profile.id);
      return {
        id: profile.id,
        username: profile.username || '未设置',
        phone: profile.phone || '',
        id_card: profile.id_card || '',
        email: userEmails.get(profile.id) || '', // 添加邮箱字段
        role: profile.role || 'USER',
        risk_level: profile.risk_level || '稳健型',
        status: profile.status || 'ACTIVE',
        balance: asset?.available_balance || 0,
        total_asset: asset?.total_asset || 0,
        frozen_balance: asset?.frozen_balance || 0,
        created_at: profile.created_at
      };
    });
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
    id_card?: string;
    real_name?: string;
    risk_level?: string;
    role?: string;
    status?: string;
    api_key?: string;
    api_secret?: string;
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: userData.username,
        phone: userData.phone,
        id_card: userData.id_card,
        real_name: userData.real_name,
        risk_level: userData.risk_level,
        role: userData.role,
        status: userData.status,
        api_key: userData.api_key,
        api_secret: userData.api_secret,
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
    try {
      const adminClient = createAdminClient();
      if (!adminClient) {
        throw new Error('管理员客户端初始化失败，请检查环境变量配置');
      }
      
      // 使用Supabase admin API重置密码为123456
      const { data, error } = await adminClient.auth.admin.updateUserById(
        userId,
        { password: '123456' }
      );
      
      if (error) {
        console.error('重置密码失败:', error);
        throw new Error(`重置密码失败: ${error.message}`);
      }
      
      // 记录操作日志
      const adminId = (await supabase.auth.getUser()).data.user?.id || 'system';
      await supabase.from('admin_operation_logs').insert({
        admin_id: adminId,
        target_user_id: userId,
        operate_type: 'PASSWORD_RESET',
        operate_content: {
          action: 'reset_password',
          new_password: '123456'
        }
      }).then(result => {
        if (result.error) {
          console.warn('记录操作日志失败:', result.error);
        }
      });
      
      return { success: true, message: '密码已重置为123456' };
    } catch (err: any) {
      console.error('重置密码异常:', err);
      throw new Error(err.message || '重置密码失败');
    }
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
  },

  /**
   * 更新交易偏好设置
   */
  async updateTradingPreferences(settings: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 将交易偏好设置保存到用户配置表
    const { error } = await supabase
      .from('user_configs')
      .upsert({
        user_id: user.id,
        config_type: 'trading_preferences',
        config_value: settings,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('保存交易偏好设置失败:', error);
      throw error;
    }

    return { success: true };
  },

  /**
   * 更新个性化偏好设置
   */
  async updatePersonalPreferences(settings: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 将个性化偏好设置保存到用户配置表
    const { error } = await supabase
      .from('user_configs')
      .upsert({
        user_id: user.id,
        config_type: 'personal_preferences',
        config_value: settings,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('保存个性化偏好设置失败:', error);
      throw error;
    }

    return { success: true };
  },

  /**
   * 注销设备会话
   */
  async revokeDeviceSession() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('注销会话失败:', error);
      throw error;
    }
    
    return { success: true };
  },

  /**
   * 添加自选股
   */
  async addToWatchlist(symbol: string, name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { error } = await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        symbol,
        name
      });

    if (error && error.code !== '23505') { // 23505 是唯一约束冲突错误，表示已存在
      console.error('添加自选股失败:', error);
      throw error;
    }

    return { success: true };
  },

  /**
   * 从自选股中删除
   */
  async removeFromWatchlist(symbol: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('symbol', symbol);

    if (error) {
      console.error('删除自选股失败:', error);
      throw error;
    }

    return { success: true };
  },

  /**
   * 获取用户自选股列表
   */
  async getWatchlist() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取自选股列表失败:', error);
      throw error;
    }

    return data;
  },

  /**
   * 检查股票是否在自选股中
   */
  async isInWatchlist(symbol: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .limit(1);

    if (error) {
      console.error('检查自选股状态失败:', error);
      return false;
    }

    return data && data.length > 0;
  }
};

// 注意：tradeService 已移动到单独的 tradeService.ts 文件
// 此文件现在只包含 userService