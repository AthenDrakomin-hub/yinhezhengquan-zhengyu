import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useRouteTheme } from '../contexts/ThemeContext';
import LandingView from '../components/core/LandingView';
import ServiceCenterView from '../components/client/service/ServiceCenterView';
import GalaxyTrainingCamp from '../components/landing/GalaxyTrainingCamp';
import OnlineChatView from '../components/landing/OnlineChatView';

const PublicRoutes: React.FC = () => {
  const navigate = useNavigate();
  
  // 使用统一主题管理 - 公共区域使用浅色主题
  useRouteTheme('public');

  const handleEnter = () => navigate('/auth/login');
  const handleQuickOpen = () => navigate('/auth/quick-open');

  return (
    <Routes>
      {/* 首页 */}
      <Route index element={<LandingView onEnter={handleEnter} onQuickOpen={handleQuickOpen} />} />
      {/* 下载中心 */}
      <Route path="service" element={
        <div className="min-h-screen bg-[var(--color-bg)]">
          <ServiceCenterView onBack={() => navigate('/')} />
        </div>
      } />
      {/* 银河特训营 */}
      <Route path="training-camp" element={<GalaxyTrainingCamp />} />
      {/* 在线客服 */}
      <Route path="support" element={<OnlineChatView />} />
      <Route path="*" element={<div className="text-[var(--color-text-primary)] p-12">公共页面未找到</div>} />
    </Routes>
  );
};

export default PublicRoutes;
