import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
    // 使用 setTimeout 确保状态更新完成后再跳转
    setTimeout(() => {
      navigate('/admin/dashboard', { replace: true });
    }, 100);
  };

  return (
    <>
      <NetworkStatusBar />
      <Routes>
        {/* 公共路由 - 无需登录 */}
        <Route path="/public/*" element={<PublicRoutes />} />
        
        {/* 认证路由 - 未登录用户（客户登录入口） */}
        <Route path="/auth/*" element={<AuthRoutes />} />
        
        {/* 管理端登录页面 - 无需保护，必须放在 /admin/* 之前 */}
        <Route path="/admin/login" element={<AdminLoginView onLoginSuccess={handleAdminLoginSuccess} />} />
        
        {/* 管理端路由 - 管理员用户 */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminRoutes />
            </ProtectedRoute>
          } 
        />
        
        {/* 客户端路由 - 已登录用户 */}
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
        
        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/public/landing" replace />} />
        <Route path="*" element={<Navigate to="/public/landing" replace />} />
      </Routes>
    </>
  );
};

const OptimizedApp: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OptimizedAppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default OptimizedApp;