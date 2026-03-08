import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import NetworkStatusBar from './components/shared/NetworkStatusBar';
import PublicRoutes from './routes/PublicRoutes';
import AuthRoutes from './routes/AuthRoutes';
import ClientRoutes from './routes/ClientRoutes';
import AdminRoutes from './routes/AdminRoutes';
import AdminLoginView from './components/admin/AdminLoginView';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import UnauthorizedView from './components/shared/UnauthorizedView';

const OptimizedAppContent: React.FC = () => {
  const navigate = useNavigate();

  const handleAdminLoginSuccess = (userData: Record<string, any>) => {
    console.log('[OptimizedApp] 管理员登录成功，跳转到 /admin/dashboard');
    window.location.href = '/admin/dashboard';
  };

  return (
    <>
      <NetworkStatusBar />
      <Routes>
        {/* 公共路由 - 浅色主题 */}
        <Route path="/*" element={<PublicRoutes />} />
        
        {/* 认证路由 - 深色主题 */}
        <Route path="/auth/*" element={<AuthRoutes />} />
        
        {/* 管理端登录页面 */}
        <Route path="/admin/login" element={<AdminLoginView onLoginSuccess={handleAdminLoginSuccess} />} />
        
        {/* 管理端路由 */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminRoutes />
            </ProtectedRoute>
          } 
        />
        
        {/* 客户端路由 */}
        <Route 
          path="/client/*" 
          element={
            <ProtectedRoute allowedRoles={['user', 'admin', 'super_admin']}>
              <ClientRoutes />
            </ProtectedRoute>
          } 
        />
        
        {/* 无权限页面 */}
        <Route path="/unauthorized" element={<UnauthorizedView />} />
      </Routes>
    </>
  );
};

const OptimizedApp: React.FC = () => {
  return (
    <AuthProvider>
      <AdminProvider>
        <BrowserRouter>
          <OptimizedAppContent />
        </BrowserRouter>
      </AdminProvider>
    </AuthProvider>
  );
};

export default OptimizedApp;