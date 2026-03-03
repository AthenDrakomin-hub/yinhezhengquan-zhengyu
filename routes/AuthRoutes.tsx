import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginView from '../components/auth/LoginView';
import ForgotPasswordView from '../components/auth/ForgotPasswordView';
import QuickOpenView from '../components/auth/QuickOpenView';

const AuthRoutes: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/public/landing');
  };

  const handleBack = () => {
    navigate('/auth/login');
  };

  const handleLoginSuccess = () => {
    navigate('/client/dashboard');
  };

  return (
    <Routes>
      {/* 这里写 "login"，不是 "/auth/login" */}
      <Route index element={<Navigate to="login" replace />} />
      <Route path="login" element={<LoginView onLoginSuccess={handleLoginSuccess} onBackToHome={handleBackToHome} />} />
      <Route path="forgot-password" element={<ForgotPasswordView onBack={handleBack} onComplete={() => {}} />} />
      <Route path="quick-open" element={<QuickOpenView onComplete={() => {}} onBack={handleBack} />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default AuthRoutes;