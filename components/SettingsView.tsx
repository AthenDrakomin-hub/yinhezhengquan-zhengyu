"use strict";

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import { TradingSettings, PersonalSettings, OrderStrategy } from '../types';

interface SettingsViewProps {
  onBack: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  riskLevel: string;
  onLogout: () => void;
}

interface SettingsNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<any>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack, isDarkMode, toggleTheme, riskLevel, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Local settings state
  const [tradingSettings, setTradingSettings] = useState<TradingSettings>({
    fastOrderMode: true,
    defaultStrategy: OrderStrategy.NORMAL,
    defaultLeverage: 10,
    autoStopLoss: false
  });

  const [personalSettings, setPersonalSettings] = useState<PersonalSettings>({
    language: 'zh-CN',
    fontSize: 'standard',
    hapticFeedback: true,
    soundEffects: true,
    theme: isDarkMode ? 'dark' : 'light'
  });

  const handleUpdateTradingSettings = (updates: Partial<TradingSettings>) => {
    setTradingSettings(prev => ({ ...prev, ...updates }));
  };

  const handleUpdatePersonalSettings = (updates: Partial<PersonalSettings>) => {
    if (updates.theme) {
      if ((updates.theme === 'dark' && !isDarkMode) || (updates.theme === 'light' && isDarkMode)) {
        toggleTheme();
      }
    }
    setPersonalSettings(prev => ({ ...prev, ...updates }));
  };

  const navItems: SettingsNavItem[] = [
    { id: 'overview', label: '设置概览', path: '/settings', icon: ICONS.Settings },
    { id: 'profile-detail', label: '个人资料', path: '/settings/profile-detail', icon: ICONS.User },
    { id: 'security', label: '账户安全', path: '/settings/security', icon: ICONS.Shield },
    { id: 'trading-preferences', label: '交易偏好', path: '/settings/trading-preferences', icon: ICONS.Zap },
    { id: 'personalized', label: '个性化', path: '/settings/personalized', icon: ICONS.Eye },
    { id: 'about', label: '关于', path: '/settings/about', icon: ICONS.Headset },
  ];

  const isActive = (path: string) => {
    if (path === '/settings') {
      return location.pathname === '/settings';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)] pb-10">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">系统设置</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航菜单 */}
        <div className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto no-scrollbar">
          <div className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  isActive(item.path)
                    ? 'bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <item.icon size={16} />
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase">风险等级</span>
                <span className="text-xs font-black text-[#00D4AA]">{riskLevel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase">主题</span>
                <div 
                  onClick={toggleTheme}
                  className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${isDarkMode ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <button 
              onClick={onLogout}
              className="w-full py-3 rounded-xl border border-[var(--color-warning)] text-[var(--color-warning)] font-black text-xs uppercase tracking-[0.2em] hover:bg-[var(--color-warning)]/10 transition-all active:scale-95"
            >
              安全退出
            </button>
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {/* 传递必要的 props 给子路由 */}
          <Outlet context={{
            tradingSettings,
            personalSettings,
            onUpdateTradingSettings: handleUpdateTradingSettings,
            onUpdatePersonalSettings: handleUpdatePersonalSettings,
            isDarkMode,
            toggleTheme,
            riskLevel
          }} />
        </div>
      </div>

      <div className="p-4 border-t border-[var(--color-border)] text-center">
        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">
          Galaxy Securities Nexus v2.10 <br/>
          © 2026 Galaxy Financial Technology
        </p>
      </div>
    </div>
  );
};

export default SettingsView;
