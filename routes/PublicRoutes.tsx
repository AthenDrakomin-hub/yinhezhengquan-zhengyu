import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LandingView from '../components/core/LandingView';

const PublicRoutes: React.FC = () => {
  const navigate = useNavigate();

  const handleEnter = () => navigate('/auth/login');
  const handleQuickOpen = () => navigate('/auth/quick-open');

  return (
    <Routes>
      {/* 注意：这里是 "landing"，不是 "/public/landing" */}
      <Route path="landing" element={<LandingView onEnter={handleEnter} onQuickOpen={handleQuickOpen} />} />
      <Route path="*" element={<div style={{ color: 'white', padding: '50px' }}>公共页面未找到</div>} />
    </Routes>
  );
};

export default PublicRoutes;