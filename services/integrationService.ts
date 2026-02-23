import { supabase } from '../lib/supabase';

export const integrationService = {
  /**
   * 获取所有 API Key (仅管理员)
   */
  async getApiKeys() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, api_key, status')
      .not('api_key', 'is', null);

    if (error) throw error;
    return data;
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
   * 测试接口
   */
  async testApi(path: string, params: any) {
    const { data, error } = await supabase.functions.invoke('get-market-data', {
      body: params
    });

    if (error) throw error;
    return data;
  }
};
