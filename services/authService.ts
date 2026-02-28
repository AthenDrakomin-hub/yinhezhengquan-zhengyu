"use strict";

import { useState, useEffect } from 'react';
import { supabase, getCurrentProfile } from '../lib/supabase';

/**
 * React Hook for authentication state
 * Returns { session, user } from Supabase auth
 */
export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 清除本地存储的数据
      localStorage.removeItem('user_preferences');
      localStorage.removeItem('session_data');
      
      // 重定向到首页
      window.location.href = '/';
      return { success: true };
    } catch (error: any) {
      console.error('登出失败:', error);
      throw error;
    }
  },

  /**
   * 检查会话是否有效
   */
  async checkSessionValidity(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.warn('会话无效:', error);
        return false;
      }
      return !!user;
    } catch (error) {
      console.error('检查会话失败:', error);
      return false;
    }
  },

  /**
   * 刷新会话
   */
  async refreshSession(): Promise<any> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return data.session;
    } catch (error: any) {
      console.error('刷新会话失败:', error);
      throw error;
    }
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
