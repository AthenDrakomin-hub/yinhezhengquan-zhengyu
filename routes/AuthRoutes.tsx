import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginView from '../components/auth/LoginView';
import ForgotPasswordView from '../components/auth/ForgotPasswordView';
import QuickOpenView from '../components/auth/QuickOpenView';

const AuthRoutes: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleBack = () => {
    navigate('/auth/login');
  };

  const handleLoginSuccess = (userData: any) => {
    console.log('[AuthRoutes] 登录成功，用户数据:', userData);
    
    // 根据用户角色进行不同的导航
    // 使用 setTimeout 确保 AuthContext 的状态更新完成后再跳转
    setTimeout(() => {
      // 同时支持 role 和 admin_level 字段
      const userRole = userData?.role || userData?.admin_level;
      console.log('[AuthRoutes] 用户角色:', userRole);
      
      if (userRole === 'admin' || userRole === 'super_admin') {
        // 管理员用户导航到管理端
        console.log('[AuthRoutes] 跳转到管理端');
        navigate('/admin/dashboard', { replace: true });
      } else {
        // 普通用户导航到客户端仪表板
        console.log('[AuthRoutes] 跳转到客户端');
        navigate('/client/dashboard', { replace: true });
      }
    }, 150);
  };

  return (
    <Routes>
      {/* 这里写 "login"，不是 "/auth/login" */}
      <Route index element={<Navigate to="login" replace />} />
      <Route path="login" element={<LoginView onLoginSuccess={handleLoginSuccess} onBackToHome={handleBackToHome} />} />
      <Route path="forgot-password" element={<ForgotPasswordView onBack={handleBack} onComplete={() => {}} />} />
      <Route path="quick-open" element={<QuickOpenView onComplete={() => {}} onBack={handleBackToHome} />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default AuthRoutes;