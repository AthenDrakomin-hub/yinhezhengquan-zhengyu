import { supabase, getCurrentProfile } from '../lib/supabase';

export const authService = {
  /**
   * 登录
   */
  async login(email: string, password?: string) {
    if (!password) {
      // 演示模式或快捷登录逻辑
      console.warn('正在使用演示模式登录');
      return { user: { email, username: '演示用户' }, role: 'user' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const profile = await getCurrentProfile();
    return { user: data.user, role: profile?.role || 'user' };
  },

  /**
   * 登出
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * 获取当前会话和角色
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const profile = await getCurrentProfile();
    return { session, role: profile?.role || 'user' };
  },

  /**
   * 注册并初始化 Profile
   */
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (error) throw error;

    // Profile 通常由数据库触发器或 Edge Function 在 Auth 注册后创建
    // 这里可以手动检查或等待
    return data.user;
  }
};
