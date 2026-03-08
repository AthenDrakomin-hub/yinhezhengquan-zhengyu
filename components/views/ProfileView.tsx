"use strict";

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '../../lib/constants';
import StockIcon from '../shared/StockIcon';
import { UserAccount } from '../../lib/types';

interface ProfileViewProps {
  account: UserAccount | null;
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
    { id: 'overview', label: '个人概览', path: '/client/profile', type: 'menu' },
    { id: 'compliance', label: '合规中心', path: '/client/profile/compliance', type: 'menu' },
    { id: 'education', label: '投教中心', path: '/client/profile/education', type: 'menu' },
    { id: 'analysis', label: '资产分析', path: '', type: 'action', icon: ICONS.Chart },
    { id: 'conditional-action', label: '新建条件单', path: '', type: 'action', icon: ICONS.Plus },
  ];

  const isActive = (path: string) => {
    if (path === '/client/profile') {
      return location.pathname === '/client/profile';
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
      {/* 加载状态 */}
      {!account ? (
        <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
          <div className="text-center text-[var(--color-text-muted)]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4AA] mx-auto mb-4"></div>
            <p className="text-sm font-bold">加载中...</p>
          </div>
        </div>
      ) : (
      <>
      {/* 顶部用户信息卡片 */}
      <div className="glass-card m-4 mb-0 p-6 border-[var(--color-border)] bg-gradient-to-br from-[#00D4AA]/10 to-[#00D4AA]/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D4AA]/5 rounded-full -translate-y-16 translate-x-16" />
        
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <StockIcon name={account.username} size="xl" className="ring-4 ring-white/20" />
          <div className="flex-1">
            <h2 className="text-xl font-black text-[var(--color-text-primary)] mb-1">{account.username}</h2>
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">证裕 ID: {account.id}</p>
          </div>
          <button 
            onClick={() => setShowAssets(!showAssets)}
            className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            {showAssets ? <ICONS.EyeOff size={16} /> : <ICONS.Eye size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter truncate">可用资金</p>
            <p className="text-lg sm:text-2xl font-black font-mono text-[var(--color-text-primary)] truncate" title={showAssets ? `¥${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}>
              {showAssets ? `¥${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
            </p>
          </div>
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter truncate">持仓市值</p>
            <p className="text-lg sm:text-2xl font-black font-mono text-[#00D4AA] truncate" title={showAssets ? `¥${account.holdings.reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}>
              {showAssets ? `¥${account.holdings.reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
            </p>
          </div>
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter truncate">持仓数量</p>
            <p className="text-lg sm:text-2xl font-black font-mono text-[var(--color-text-primary)] truncate">
              {account.holdings.length}
            </p>
          </div>
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter truncate">账户状态</p>
            <p className="text-lg sm:text-2xl font-black font-mono text-[#00D4AA] truncate">
              正常
            </p>
          </div>
        </div>
      </div>

      {/* 主内容区域 - 使用网格布局优化空间利用 */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* 左侧导航菜单 */}
          <div className="lg:col-span-3 xl:col-span-2 glass-card p-4 overflow-y-auto no-scrollbar">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    item.type === 'action' 
                      ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                      : isActive(item.path)
                      ? 'bg-[#00D4AA] text-[#0A1628] shadow-[0_4px_12px_rgba(0,212,170,0.3)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {item.icon && <item.icon size={16} />}
                  <span className="text-xs font-bold">{item.label}</span>
                  {item.type === 'action' && item.id === 'analysis' && (
                    <span className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded bg-white/20 text-[#0A1628]">专业版</span>
                  )}
                </button>
              ))}
            </div>

            {/* 快速操作面板 */}
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <h3 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3">快捷操作</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate('/client/ipo')}
                  className="w-full p-3 rounded-xl bg-[#00D4AA]/10 border border-[#00D4AA]/20 text-[10px] font-black text-[#00D4AA] hover:bg-[#00D4AA]/20 transition-all text-left"
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"/></svg>
                    新股申购
                  </span>
                </button>
                <button 
                  onClick={() => navigate('/client/trade')}
                  className="w-full p-3 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-primary)] hover:border-[#00D4AA]/30 transition-all text-left"
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/></svg>
                    条件单交易
                  </span>
                </button>
                <button 
                  onClick={onOpenConditional}
                  className="w-full p-3 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-primary)] hover:border-[#00D4AA]/30 transition-all text-left"
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17v-2H4.5A2.5 2.5 0 0 1 2 12.5v0A2.5 2.5 0 0 1 4.5 10H9V7l6 5-6 5z"/><path d="M15 7v10"/></svg>
                    智能委托
                  </span>
                </button>
              </div>
            </div>

            {/* 通知设置 */}
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <h3 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3">通知设置</h3>
              <div className="space-y-3">
                {[
                  { id: 'tradeAlerts', label: '成交回报', checked: notifications.tradeAlerts },
                  { id: 'priceAlerts', label: '价格预警', checked: notifications.priceAlerts },
                  { id: 'systemNews', label: '系统公告', checked: notifications.systemNews },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text-secondary)]">{item.label}</span>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [item.id]: !item.checked }))}
                      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                        item.checked ? 'bg-[#00D4AA]' : 'bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
                      }`}
                    >
                      <span 
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          item.checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div className="lg:col-span-9 xl:col-span-10 glass-card overflow-hidden">
            <div className="h-full overflow-y-auto p-6 no-scrollbar">
              <Outlet context={{ account, isDarkMode, toggleTheme, onOpenAnalysis, onOpenConditional }} />
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default ProfileView;
