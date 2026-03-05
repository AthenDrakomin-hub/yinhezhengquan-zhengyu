import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, checkIsAdmin, checkIsSuperAdmin } from '../lib/supabase';
import { UserAccount } from '../lib/types';

// Profile 类型定义
interface Profile {
  id: string;
  email: string;
  username?: string;
  real_name?: string;
  phone?: string;
  role: 'user' | 'admin';
  admin_level: 'user' | 'admin' | 'super_admin';
  status: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
  risk_level?: string;
  [key: string]: any;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: (credentials: { email?: string; phone?: string; password?: string }) => Promise<any>;
  signOut: () => Promise<void>;
  updateUserProfile: (profileData: Partial<UserAccount>) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;

      console.log('[Auth] init session:', session?.user?.id || null);
      setSession(session);

      if (!session?.user) {
        console.log('[Auth] 无用户，设置 loading=false');
        setProfile(null);
        setLoading(false);
      } else {
        // 应用启动时，如果用户已登录，需要加载profile
        console.log('[Auth] 应用启动，加载用户profile');
        setLoading(true);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, username, real_name, phone, role, status, admin_level, risk_level')
          .eq('id', session.user.id)
          .maybeSingle();
        
        console.log('[Auth] init profile loaded:', {
          userId: session.user.id,
          hasProfile: !!profile,
        });
        
        setProfile(profile);
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] state change:', event, session?.user?.id || null);
        
        setSession(session);
        
        // 【关键修复】只有这几种事件才需要重新加载 profile
        const shouldReloadProfile = 
          event === 'SIGNED_IN' || 
          event === 'TOKEN_REFRESHED' || 
          event === 'USER_UPDATED';
        
        if (shouldReloadProfile && session?.user) {
          // 先设置 loading，然后加载 profile
          setLoading(true);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, username, real_name, phone, role, status, admin_level, risk_level')
            .eq('id', session.user.id)
            .maybeSingle();
          
          console.log('[Auth] profile loaded:', {
            userId: session.user.id,
            hasProfile: !!profile,
          });
          
          setProfile(profile);
          setLoading(false); // 【必须在这里设置 false】
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        } else {
          // 其他事件不要重置 loading，避免无限循环
          setLoading(false);
        }
      }
    );

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);



  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, username, real_name, phone, role, status, admin_level, risk_level')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('获取用户资料失败:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('获取用户资料异常:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (credentials: { email?: string; phone?: string; password?: string }) => {
    let result: any;
    
    if (credentials.phone) {
      // 使用手机号登录
      result = await supabase.auth.signInWithOtp({
        phone: credentials.phone,
        options: {
          shouldCreateUser: false,
        },
      });
    } else if (credentials.email) {
      // 使用邮箱和密码登录
      result = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password!,
      });
    }

    if (result?.data?.user) {
      setSession(result.data.session);
      await fetchProfile(result.data.user.id);
    }

    return result;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setSession(null);
      setProfile(null);
    }
  };

  const updateUserProfile = async (profileData: Partial<UserAccount>) => {
    if (!session?.user) throw new Error('用户未登录');

    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', session.user.id);

    if (!error && profile) {
      // 更新本地缓存
      setProfile({ ...profile, ...profileData });
    }

    return { error };
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin: checkIsAdmin(profile),
    isSuperAdmin: checkIsSuperAdmin(profile),
    signIn,
    signOut,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};