"use strict";

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import StockIcon from './StockIcon';
import { UserAccount } from '../types';

interface ProfileViewProps {
  account: UserAccount;
  onOpenAnalysis: () => void;
  onOpenConditional: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

interface ProfileNavItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
  type: 'menu' | 'action';
}

const ProfileView: React.FC<ProfileViewProps> = ({ account, onOpenAnalysis, onOpenConditional, isDarkMode, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAssets, setShowAssets] = useState(true);
  const [notifications, setNotifications] = useState({
    tradeAlerts: true,
    priceAlerts: true,
    systemNews: false
  });

  const navItems: ProfileNavItem[] = [
    { id: 'overview', label: '个人概览', path: '/profile', type: 'menu' },
    { id: 'compliance', label: '合规中心', path: '/profile/compliance', type: 'menu' },
    { id: 'service', label: '服务中心', path: '/profile/service', type: 'menu' },
    { id: 'education', label: '投教中心', path: '/profile/education', type: 'menu' },
    { id: 'analysis', label: '资产分析', path: '', type: 'action', icon: ICONS.Chart },
    { id: 'conditional-action', label: '新建条件单', path: '', type: 'action', icon: ICONS.Plus },
  ];

  const isActive = (path: string) => {
    if (path === '/profile') {
      return location.pathname === '/profile';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: ProfileNavItem) => {
    if (item.type === 'action') {
      if (item.id === 'analysis') {
        onOpenAnalysis();
      } else if (item.id === 'conditional-action') {
        onOpenConditional();
      }
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="flex flex-col h-full animate-slide-up">
      {/* 顶部用户信息卡片 */}
      <div className="glass-card m-4 p-6 border-[var(--color-border)] bg-gradient-to-br from-[#00D4AA]/10 to-[#00D4AA]/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D4AA]/5 rounded-full -translate-y-16 translate-x-16" />
        
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <StockIcon name={account.username} size="xl" className="ring-4 ring-white/20" />
          <div className="flex-1">
            <h2 className="text-xl font-black text-[var(--color-text-primary)] mb-1">{account.username}</h2>
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">证裕 ID: {account.id}</p>
          </div>
          <button 
            onClick={() => setShowAssets(!showAssets)}
            className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm"
          >
            {showAssets ? <ICONS.EyeOff size={16} /> : <ICONS.Eye size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">可用资金</p>
            <p className="text-2xl font-black font-mono text-[var(--color-text-primary)]">
              {showAssets ? `¥${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
            </p>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">持仓市值</p>
            <p className="text-2xl font-black font-mono text-[#00D4AA]">
              {showAssets ? `¥${account.holdings.reduce((sum, h) => sum + h.marketValue, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航菜单 */}
        <div className="w-56 border-r border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto no-scrollbar">
          <div className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  item.type === 'action' 
                    ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                    : isActive(item.path)
                    ? 'bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {item.icon && <item.icon size={16} />}
                <span className="text-xs font-bold">{item.label}</span>
                {item.type === 'action' && item.id === 'analysis' && (
                  <span className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded bg-[#00D4AA]/10 text-[#00D4AA]">专业版</span>
                )}
              </button>
            ))}
          </div>

          {/* 快速操作面板 */}
          <div className="p-4 border-t border-[var(--color-border)]">
            <h3 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3">快速操作</h3>
            <div className="space-y-2">
              <button className="w-full p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-primary)] hover:border-[#00D4AA]/30 transition-all">
                一键申购新股
              </button>
              <button className="w-full p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-primary)] hover:border-[#00D4AA]/30 transition-all">
                收益报告导出
              </button>
            </div>
          </div>

          {/* 通知设置 */}
          <div className="p-4 border-t border-[var(--color-border)]">
            <h3 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3">通知设置</h3>
            <div className="space-y-3">
              {[
                { id: 'tradeAlerts', label: '成交回报', checked: notifications.tradeAlerts },
                { id: 'priceAlerts', label: '价格预警', checked: notifications.priceAlerts },
                { id: 'systemNews', label: '系统公告', checked: notifications.systemNews },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-text-secondary)]">{item.label}</span>
                  <div 
                    onClick={() => setNotifications(prev => ({ ...prev, [item.id]: !item.checked }))}
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${item.checked ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${item.checked ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧内容区域 - 始终渲染 Outlet */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          <Outlet context={{ account, isDarkMode, toggleTheme, onOpenAnalysis, onOpenConditional }} />
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
