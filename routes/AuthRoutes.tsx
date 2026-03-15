import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useRouteTheme } from '../contexts/ThemeContext';
import { FaCheckCircle, FaClock, FaInfoCircle } from 'react-icons/fa';
import LoginView from '../components/auth/LoginView';
import ForgotPasswordView from '../components/auth/ForgotPasswordView';
import QuickOpenView from '../components/auth/QuickOpenView';

// 开户成功提示组件
const AccountPendingNotice: React.FC<{
  data: {
    phone: string;
    username: string;
    isNewUser?: boolean;
    defaultPassword?: string;
  };
  onClose: () => void;
}> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-green-500 text-3xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {data.isNewUser ? '注册成功' : '开户申请已提交'}
          </h2>
          <p className="text-gray-600 text-sm">
            {data.isNewUser 
              ? '您的账号已创建成功，正在等待管理员审核激活'
              : '您的开户申请已提交，请等待审核'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">姓名</span>
            <span className="text-gray-900 font-medium">{data.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">手机号</span>
            <span className="text-gray-900 font-medium">{data.phone}</span>
          </div>
          {data.isNewUser && data.defaultPassword && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">初始密码</span>
              <span className="text-red-600 font-mono font-bold">{data.defaultPassword}</span>
            </div>
          )}
        </div>

        {data.isNewUser && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <FaInfoCircle className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-700">
              <p className="font-medium mb-1">重要提示</p>
              <p>初始密码为身份证后6位，请妥善保管。账号激活后即可登录使用。</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
          <FaClock className="text-blue-500" />
          <p className="text-xs text-blue-700">审核时间：工作日 9:00-17:00，预计1-2个工作日</p>
        </div>

        <button
          onClick={onClose}
          className="w-full h-12 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white rounded-xl font-semibold shadow-lg"
        >
          我知道了
        </button>
      </div>
    </div>
  );
};

const AuthRoutes: React.FC = () => {
  const navigate = useNavigate();
  const [pendingNotice, setPendingNotice] = useState<any>(null);
  
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

  const handleQuickOpenComplete = (data: any) => {
    console.log('[AuthRoutes] 开户完成:', data);
    setPendingNotice(data);
  };

  return (
    <>
      <Routes>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<LoginView onLoginSuccess={handleLoginSuccess} onBackToHome={handleBackToHome} />} />
        <Route path="forgot-password" element={<ForgotPasswordView onBack={handleBack} onComplete={() => {}} />} />
        <Route path="quick-open" element={<QuickOpenView onComplete={handleQuickOpenComplete} onBack={handleBackToHome} />} />
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>

      {/* 开户成功提示 */}
      {pendingNotice && (
        <AccountPendingNotice 
          data={pendingNotice} 
          onClose={() => {
            setPendingNotice(null);
            navigate('/auth/login');
          }} 
        />
      )}
    </>
  );
};

export default AuthRoutes;
