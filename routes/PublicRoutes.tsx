import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LandingView from '../components/core/LandingView';
import ServiceCenterView from '../components/client/service/ServiceCenterView';
import GalaxyTrainingCamp from '../components/landing/GalaxyTrainingCamp';
import OnlineChatView from '../components/landing/OnlineChatView';

const PublicRoutes: React.FC = () => {
  const navigate = useNavigate();

  // 公共路由使用浅色主题
  useEffect(() => {
    document.body.classList.add('light-mode');
    document.documentElement.style.backgroundColor = '#F1F5F9';
    
    return () => {
      // 离开公共路由时恢复深色主题
      document.body.classList.remove('light-mode');
      document.documentElement.style.backgroundColor = '#0A1628';
    };
  }, []);

  const handleEnter = () => navigate('/auth/login');
  const handleQuickOpen = () => navigate('/auth/quick-open');

  return (
    <Routes>
      {/* 首页 */}
      <Route index element={<LandingView onEnter={handleEnter} onQuickOpen={handleQuickOpen} />} />
      {/* 服务中心 */}
      <Route path="service" element={
        <div className="min-h-screen bg-[var(--color-bg)]">
          <ServiceCenterView onBack={() => navigate('/')} />
        </div>
      } />
      {/* 银河特训营 */}
      <Route path="training-camp" element={<GalaxyTrainingCamp />} />
      {/* 在线客服 */}
      <Route path="support" element={<OnlineChatView />} />
      <Route path="*" element={<div style={{ color: 'white', padding: '50px' }}>公共页面未找到</div>} />
    </Routes>
  );
};

export default PublicRoutes;