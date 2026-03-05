import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;

      if (!session?.user) {
        setAdminLevel(null);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, admin_level')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!alive) return;

      console.log('[Admin] profile loaded:', { data, error });

      if (!error && data?.is_admin === true) {
        setAdminLevel(data.admin_level || 'admin');
      } else {
        setAdminLevel(null);
      }

      setLoading(false);
    };

    loadAdminInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[Admin] state change:', event);
      setTimeout(() => {
        loadAdminInfo();
      }, 0);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AdminContext.Provider value={{ adminLevel, userId, loading }}>
      {children}
    </AdminContext.Provider>
  );
}
