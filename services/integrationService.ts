import { supabase } from '../lib/supabase';

export const integrationService = {
  /**
   * 获取所有 API Key (仅管理员)
   */
  async getApiKeys() {
    const { data, error } = await supabase
      .from('api_access_keys')
      .select('*, profiles(username)');

    if (error) throw error;
    
    // 适配前端展示
    return data.map(item => ({
      ...item,
      username: item.profiles?.username || '系统/外部客户端'
    }));
  },

  /**
   * 生成/更新 API Key (仅管理员)
   */
  async manageApiKey(userId: string, action: 'generate' | 'disable') {
    const { data, error } = await supabase.functions.invoke('admin-manage-api-key', {
      body: { target_user_id: userId, action }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 一键校验接入有效性 (API Key + 规则)
   */
  async validateIntegration(userId: string) {
    const { data, error } = await supabase.functions.invoke('admin-validate-integration', {
      body: { target_user_id: userId }
    });

    if (error) throw error;
    return data;
  }
};
