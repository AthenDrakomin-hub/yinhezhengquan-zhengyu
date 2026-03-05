import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase, checkIsAdmin } from './lib/supabase';
import AdminLoginView from "./components/admin/AdminLoginView";
import ErrorBoundary from './components/common/ErrorBoundary';
import { AdminProvider } from './contexts/AdminContext';

const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminUserManagement = lazy(() => import('./components/admin/AdminUserManagement'));
const AdminTradeManagement = lazy(() => import('./components/admin/AdminTradeManagement'));
const AdminRuleManagement = lazy(() => import('./components/admin/AdminRuleManagement'));
const AdminMatchIntervention = lazy(() => import('./components/admin/AdminMatchIntervention'));
const AdminReports = lazy(() => import('./components/admin/AdminReports'));
const AdminEducation = lazy(() => import('./components/admin/AdminEducation'));
const AdminCalendar = lazy(() => import('./components/admin/AdminCalendar'));
const AdminIPOs = lazy(() => import('./components/admin/AdminIPOs'));
const AdminBanners = lazy(() => import('./components/admin/AdminBanners'));
const AdminTickets = lazy(() => import('./components/admin/AdminTickets'));
const AdminTicketDetail = lazy(() => import('./components/admin/AdminTicketDetail'));
const AdminAuditLogs = lazy(() => import('./components/admin/AdminAuditLogs'));
const AdminDataExport = lazy(() => import('./components/admin/AdminDataExport'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const AdminApp: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [adminLevel, setAdminLevel] = useState<'super_admin' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // 验证是否为管理员并获取层级 - 使用统一的权限校验函数
        supabase
          .from('profiles')
          .select('admin_level, is_admin, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            // 使用统一的权限校验函数检查是否为管理员
            if (checkIsAdmin(data)) {
              setSession(session);
              setAdminLevel(data?.admin_level);
            } else {
              supabase.auth.signOut();
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        supabase
          .from('profiles')
          .select('admin_level, is_admin, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            // 使用统一的权限校验函数检查是否为管理员
            if (checkIsAdmin(data)) {
              setSession(session);
              setAdminLevel(data?.admin_level);
            } else {
              setSession(null);
              setAdminLevel(null);
              supabase.auth.signOut();
            }
          });
      } else {
        setSession(null);
        setAdminLevel(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (userData: any) => {
    // 登录成功后跳转到管理后台仪表板
    console.log('[AdminApp] 管理员登录成功，跳转到管理后台', userData);
    navigate('/admin/dashboard');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return <AdminLoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AdminProvider>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUserManagement />} />
            <Route path="trades" element={<AdminTradeManagement />} />
            <Route path="rules" element={<AdminRuleManagement />} />
            <Route path="match" element={<AdminMatchIntervention />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="education" element={<AdminEducation />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="ipos" element={<AdminIPOs />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="data-export" element={<AdminDataExport />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
    </AdminProvider>
  );
};

export default AdminApp;
