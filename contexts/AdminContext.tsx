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
    const fetchAdminInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('admin_level')
          .eq('id', session.user.id)
          .single();
        
        setAdminLevel(data?.admin_level || null);
        setUserId(session.user.id);
      }
      setLoading(false);
    };

    fetchAdminInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAdminInfo();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AdminContext.Provider value={{ adminLevel, userId, loading }}>
      {children}
    </AdminContext.Provider>
  );
}
