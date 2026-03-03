import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LandingView from '../components/core/LandingView';

const PublicRoutes: React.FC = () => {
  const navigate = useNavigate();

  // 处理进入平台的逻辑
  const handleEnter = () => {
    // 这里可以根据实际需求修改，比如跳转到登录页或客户端首页
    navigate('/auth/login');
  };

  // 处理快速开户的逻辑
  const handleQuickOpen = () => {
    navigate('/auth/quick-open');
  };

  return (
    <Routes>
      {/* 核心落地页路由 */}
      <Route 
        path="landing" 
        element={<LandingView onEnter={handleEnter} onQuickOpen={handleQuickOpen} />} 
      />
      
      {/* 兜底路由：如果匹配不到，重定向回 landing */}
      <Route path="*" element={<div style={{ color: 'white', padding: '50px' }}>公共页面未找到</div>} />
    </Routes>
  );
};

export default PublicRoutes;