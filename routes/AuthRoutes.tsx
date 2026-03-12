import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useRouteTheme } from '../contexts/ThemeContext';
import LoginView from '../components/auth/LoginView';
import ForgotPasswordView from '../components/auth/ForgotPasswordView';
import QuickOpenView from '../components/auth/QuickOpenView';

const AuthRoutes: React.FC = () => {
  const navigate = useNavigate();
  
  // 使用统一主题管理 - 认证区域使用浅色主题
  useRouteTheme('auth');

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleBack = () => {
    navigate('/auth/login');
  };

  const handleLoginSuccess = (userData: any) => {
    console.log('[AuthRoutes] 登录成功，用户数据:', userData);
    
    // 根据用户角色进行不同的导航
    setTimeout(() => {
      const userRole = userData?.role || userData?.admin_level;
      console.log('[AuthRoutes] 用户角色:', userRole);
      
      if (userRole === 'admin' || userRole === 'super_admin') {
        console.log('[AuthRoutes] 跳转到管理端');
        navigate('/admin/dashboard', { replace: true });
      } else {
        console.log('[AuthRoutes] 跳转到客户端');
        navigate('/client/dashboard', { replace: true });
      }
    }, 150);
  };

  return (
    <Routes>
      <Route index element={<Navigate to="login" replace />} />
      <Route path="login" element={<LoginView onLoginSuccess={handleLoginSuccess} onBackToHome={handleBackToHome} />} />
      <Route path="forgot-password" element={<ForgotPasswordView onBack={handleBack} onComplete={() => {}} />} />
      <Route path="quick-open" element={<QuickOpenView onComplete={() => {}} onBack={handleBackToHome} />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default AuthRoutes;
