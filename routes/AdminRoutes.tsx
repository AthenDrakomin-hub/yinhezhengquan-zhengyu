import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import ErrorBoundary from '../components/common/ErrorBoundary';

// 懒加载管理端组件
const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard'));
const AdminUserManagement = lazy(() => import('../components/admin/AdminUserManagement'));
const AdminTradeManagement = lazy(() => import('../components/admin/AdminTradeManagement'));
const AdminRuleManagement = lazy(() => import('../components/admin/AdminRuleManagement'));
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

const LoadingSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
    <div style={{ width: '48px', height: '48px', border: '3px solid #334155', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
  </div>
);

const AdminRoutes: React.FC = () => {
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
            <Route path="rules" element={<AdminRuleManagement />} />
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
