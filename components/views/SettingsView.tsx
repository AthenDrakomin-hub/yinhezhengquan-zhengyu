/**
 * 设置页面
 * 按银河证券官方App设置页面风格还原
 * 移动端优先设计
 */

import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { TradingSettings, PersonalSettings } from '../../lib/types';

interface SettingsViewProps {
  onBack: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  riskLevel: string;
  onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  onBack, 
  isDarkMode, 
  toggleTheme, 
  riskLevel, 
  onLogout 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 使用全局设置Context
  const { settings } = useUserSettings();

  // 检查是否在设置主页
  const isSettingsHome = location.pathname === '/client/settings' || location.pathname === '/client/settings/';

  // 设置项点击处理
  const handleItemClick = (path: string) => {
    navigate(path);
  };

  // 如果在子页面，显示子页面内容
  if (!isSettingsHome) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] pb-20">
        {/* 顶部蓝色标题栏 */}
        <div className="bg-[#0066CC] px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => navigate('/client/settings')} className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white text-lg font-medium">设置</h1>
        </div>
        
        {/* 子页面内容 */}
        <div className="p-4">
          <Outlet context={{
            tradingSettings: settings.trading,
            personalSettings: settings.personal,
            onUpdateTradingSettings: () => {},
            onUpdatePersonalSettings: () => {},
            isDarkMode,
            toggleTheme,
            riskLevel
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      {/* 顶部蓝色标题栏 */}
      <div className="bg-[#0066CC] px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={onBack} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-medium">设置</h1>
      </div>

      {/* 设置列表 */}
      <div className="bg-white">
        {/* 基础设置板块 */}
        <div className="px-4">
          {[
            { id: 'general', label: '通用', path: '/client/settings/general' },
            { id: 'account', label: '账户与安全', path: '/client/settings/security' },
            { id: 'trading', label: '交易设置', path: '/client/settings/trading-preferences' },
            { id: 'market', label: '行情设置', path: '/client/settings/market' },
            { id: 'conditional', label: '条件单设置', path: '/client/settings/conditional' },
            { id: 'news', label: '重大资讯精选', path: '/client/settings/news', hasSwitch: true },
          ].map((item, index) => (
            <button
              key={item.id}
              onClick={() => item.path && handleItemClick(item.path)}
              className="w-full flex items-center justify-between py-4 border-b border-[#F0F0F0] last:border-0"
            >
              <span className="text-sm text-[#333333]">{item.label}</span>
              {item.hasSwitch ? (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-5 bg-[#0066CC] rounded-full relative">
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </div>
              ) : (
                <svg className="w-4 h-4 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* 站点设置板块 */}
        <div className="mt-3">
          <div className="px-4 py-2 bg-[#F5F5F5]">
            <span className="text-xs text-[#999999]">站点设置</span>
          </div>
          <div className="px-4">
            {[
              { id: 'trade-site', label: '交易站点选择', value: '北京电信', path: '/client/settings/trade-site' },
              { id: 'market-site', label: '行情站点选择', value: '银河云A', path: '/client/settings/market-site' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => item.path && handleItemClick(item.path)}
                className="w-full flex items-center justify-between py-4 border-b border-[#F0F0F0] last:border-0"
              >
                <span className="text-sm text-[#333333]">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#999999]">{item.value}</span>
                  <svg className="w-4 h-4 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 隐私板块 */}
        <div className="mt-3">
          <div className="px-4 py-2 bg-[#F5F5F5]">
            <span className="text-xs text-[#999999]">隐私</span>
          </div>
          <div className="px-4">
            {[
              { id: 'permissions', label: '系统权限申请与使用', path: '/client/settings/permissions' },
              { id: 'collection', label: '个人信息收集与使用', path: '/client/settings/collection' },
              { id: 'third-party', label: '个人信息第三方共享清单', path: '/client/settings/third-party' },
              { id: 'privacy', label: '隐私设置', path: '/client/settings/personalized' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => item.path && handleItemClick(item.path)}
                className="w-full flex items-center justify-between py-4 border-b border-[#F0F0F0] last:border-0"
              >
                <span className="text-sm text-[#333333]">{item.label}</span>
                <svg className="w-4 h-4 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* 其他设置 */}
        <div className="mt-3">
          <div className="px-4 py-2 bg-[#F5F5F5]">
            <span className="text-xs text-[#999999]">其他</span>
          </div>
          <div className="px-4">
            {[
              { id: 'about', label: '关于', path: '/client/settings/about' },
              { id: 'feedback', label: '意见反馈', path: '/client/settings/feedback' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => item.path && handleItemClick(item.path)}
                className="w-full flex items-center justify-between py-4 border-b border-[#F0F0F0] last:border-0"
              >
                <span className="text-sm text-[#333333]">{item.label}</span>
                <svg className="w-4 h-4 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* 深色模式开关 */}
        <div className="mt-3">
          <div className="px-4">
            <div className="flex items-center justify-between py-4">
              <span className="text-sm text-[#333333]">深色模式</span>
              <button
                onClick={toggleTheme}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  isDarkMode ? 'bg-[#0066CC]' : 'bg-[#E5E5E5]'
                }`}
              >
                <span 
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isDarkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 退出登录按钮 */}
        <div className="mt-6 px-4 pb-6">
          <button 
            onClick={onLogout}
            className="w-full py-3 rounded-lg border border-[#E63946] text-[#E63946] text-sm font-medium hover:bg-[#FFF0F0] transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
