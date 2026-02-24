
"use strict";

import React, { useState } from 'react';
import { ICONS } from '../constants';
import ProfileDetailView from './ProfileDetailView';
import SecurityCenterView from './SecurityCenterView';
import TradingPreferencesView from './TradingPreferencesView';
import PersonalizedSettingsView from './PersonalizedSettingsView';
import AboutInvestZYView from './AboutInvestZYView';
import { OrderStrategy, TradingSettings, PersonalSettings } from '../types';

interface SettingsItem {
  id: string;
  label: string;
  value?: string;
  icon?: React.ComponentType<any>;
  action?: () => void;
  highlight?: boolean;
  toggle?: boolean;
  active?: boolean;
  arrow?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

interface SettingsViewProps {
  onBack: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  riskLevel: string;
  onLogout: () => void;
}

type SettingsSubPage = 'list' | 'profile' | 'security' | 'trading' | 'personalized' | 'about';

const SettingsView: React.FC<SettingsViewProps> = ({ onBack, isDarkMode, toggleTheme, riskLevel, onLogout }) => {
  const [subPage, setSubPage] = useState<SettingsSubPage>('list');
  
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

  if (subPage === 'profile') return <ProfileDetailView onBack={() => setSubPage('list')} />;
  if (subPage === 'security') return <SecurityCenterView onBack={() => setSubPage('list')} />;
  if (subPage === 'trading') return (
    <TradingPreferencesView 
      onBack={() => setSubPage('list')} 
      settings={tradingSettings}
      onUpdateSettings={handleUpdateTradingSettings}
    />
  );
  if (subPage === 'personalized') return (
    <PersonalizedSettingsView 
      onBack={() => setSubPage('list')} 
      settings={personalSettings}
      onUpdateSettings={handleUpdatePersonalSettings}
    />
  );
  if (subPage === 'about') return <AboutInvestZYView onBack={() => setSubPage('list')} />;

  const sections: SettingsSection[] = [
    {
      title: '账户与安全',
      items: [
        { id: 'profile', label: '个人资料', value: 'Invest_ZY_2026', icon: ICONS.User, action: () => setSubPage('profile') },
        { id: 'risk', label: '风险测评等级', value: riskLevel, icon: ICONS.Shield, highlight: true },
        { id: 'security', label: '账户安全中心', value: '极高防护', icon: ICONS.Shield, action: () => setSubPage('security') },
      ]
    },
    {
      title: '交易偏好',
      items: [
        { 
          id: 'trading_pref', 
          label: '交易行为设置', 
          value: tradingSettings.fastOrderMode ? '极速开启' : '普通模式', 
          icon: ICONS.Zap, 
          action: () => setSubPage('trading') 
        },
        { id: 'strategy', label: '默认委托策略', value: String(tradingSettings.defaultStrategy), icon: ICONS.Trade },
        { id: 'leverage', label: '衍生品默认杠杆', value: `${tradingSettings.defaultLeverage}x`, icon: ICONS.Chart },
      ]
    },
    {
      title: '显示与交互',
      items: [
        { id: 'theme', label: '深色模式', toggle: true, active: isDarkMode, action: toggleTheme },
        { id: 'personalized', label: '偏好与辅助功能', value: personalSettings.language === 'zh-CN' ? '简体中文' : 'Other', icon: ICONS.Eye, action: () => setSubPage('personalized') },
      ]
    },
    {
      title: '关于证裕',
      items: [
        { id: 'about', label: '版本信息与法律', value: 'v2.10.4', icon: ICONS.Headset, action: () => setSubPage('about') },
      ]
    }
  ];

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)] pb-10">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">系统设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">
              {section.title}
            </h3>
            <div className="glass-card overflow-hidden">
              {section.items.map((item, i) => (
                <div 
                  key={item.id}
                  onClick={() => item.action && item.action()}
                  className={`flex items-center justify-between p-4 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer ${item.action ? 'active:opacity-70' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon size={16} className="text-[var(--color-text-muted)]" />}
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">{item.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.value && (
                      <span className={`text-[10px] font-black font-mono uppercase ${(item.highlight ?? false) ? 'text-[#00D4AA]' : 'text-[var(--color-text-muted)]'}`}>
                        {item.value}
                      </span>
                    )}
                    {item.toggle && (
                      <div className={`w-10 h-5 rounded-full p-1 transition-colors ${(item.active ?? false) ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${(item.active ?? false) ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    )}
                    {((item.arrow ?? false) || (item.action && !item.toggle)) && <ICONS.ArrowRight size={12} className="text-[var(--color-text-muted)]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4">
          <button 
            onClick={onLogout}
            className="w-full py-4 rounded-2xl border border-[var(--color-warning)] text-[var(--color-warning)] font-black text-xs uppercase tracking-[0.2em] hover:bg-[var(--color-warning)]/10 transition-all active:scale-95"
          >
            安全退出 Nexus 交易单元
          </button>
        </div>

        <p className="text-center text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">
          Galaxy Securities Nexus v2.10 <br/>
          © 2026 Galaxy Financial Technology
        </p>
      </div>
    </div>
  );
};

export default SettingsView;
