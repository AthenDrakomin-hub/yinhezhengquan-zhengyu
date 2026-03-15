import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, checkIsAdmin } from '../lib/supabase';

interface AdminContextType {
  adminLevel: 'super_admin' | 'admin' | null;
  userId: string | null;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType>({
  adminLevel: null,
  userId: null,
  loading: true,
});

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminLevel, setAdminLevel] = useState<'super_admin' | 'admin' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadAdminInfo = async () => {
      console.log('[Admin] 开始加载');
      
      // 等待 supabase auth 初始化
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!alive) return;

      console.log('[Admin] session:', session ? '已登录' : '未登录');

      if (!session?.user) {
        setAdminLevel(null);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // 从 profiles 表获取权限信息
      const { data, error } = await supabase
        .from('profiles')
        .select('admin_level, is_admin')
        .eq('id', session.user.id)
        .maybeSingle();

      const adminData = data as { admin_level: string | null; is_admin: boolean | null } | null;

      if (!alive) return;

      console.log('[Admin] profile:', { adminData, error });

      if (!error && adminData?.is_admin) {
        const level = adminData.admin_level;
        if (level === 'super_admin' || level === 'admin') {
          setAdminLevel(level);
        } else {
          setAdminLevel('admin');
        }
      } else {
        setAdminLevel(null);
      }

      setLoading(false);
    };

    loadAdminInfo();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <AdminContext.Provider value={{ adminLevel, userId, loading }}>
      {children}
    </AdminContext.Provider>
  );
}
