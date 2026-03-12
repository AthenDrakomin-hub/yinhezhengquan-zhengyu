import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useRouteTheme } from '../contexts/ThemeContext';
import AdminLayout from '../components/admin/AdminLayout';
import ErrorBoundary from '../components/common/ErrorBoundary';

// 懒加载管理端组件
const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard'));
const AdminUserManagement = lazy(() => import('../components/admin/AdminUserManagement'));
const AdminTradeManagement = lazy(() => import('../components/admin/AdminTradeManagement'));
const TradeRulesManagement = lazy(() => import('../components/admin/TradeRulesManagement'));
const AdminMatchIntervention = lazy(() => import('../components/admin/AdminMatchIntervention'));
const AdminContentManagement = lazy(() => import('../components/admin/AdminContentManagement'));
const AdminReports = lazy(() => import('../components/admin/AdminReports'));
const AdminEducation = lazy(() => import('../components/admin/AdminEducation'));
const AdminCalendar = lazy(() => import('../components/admin/AdminCalendar'));
const AdminIPOs = lazy(() => import('../components/admin/AdminIPOs'));
const AdminBanners = lazy(() => import('../components/admin/AdminBanners'));
const AdminTickets = lazy(() => import('../components/admin/AdminTickets'));
const AdminTicketDetail = lazy(() => import('../components/admin/AdminTicketDetail'));
const AdminAuditLogs = lazy(() => import('../components/admin/AdminAuditLogs'));
const AdminDataExport = lazy(() => import('../components/admin/AdminDataExport'));
const AdminConditionalOrders = lazy(() => import('../components/admin/AdminConditionalOrders'));
const AdminNotifications = lazy(() => import('../components/admin/AdminNotifications'));

// 使用 CSS 变量的加载指示器
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
    <div className="w-12 h-12 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin"></div>
  </div>
);

const AdminRoutes: React.FC = () => {
  // 使用统一主题管理 - 管理端区域使用浅色主题（当前强制浅色基准）
  useRouteTheme('admin');
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUserManagement />} />
            <Route path="trades" element={<AdminTradeManagement />} />
            <Route path="match" element={<AdminMatchIntervention />} />
            <Route path="rules" element={<TradeRulesManagement />} />
            <Route path="conditional-orders" element={<AdminConditionalOrders />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
            <Route path="content" element={<AdminContentManagement />} />
            {/* 内容管理子路由 */}
            <Route path="reports" element={<AdminReports />} />
            <Route path="education" element={<AdminEducation />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="ipos" element={<AdminIPOs />} />
            <Route path="banners" element={<AdminBanners />} />
            {/* 其他管理功能 */}
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="data-export" element={<AdminDataExport />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default AdminRoutes;
