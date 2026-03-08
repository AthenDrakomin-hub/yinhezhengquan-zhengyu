"use strict";

import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';
import { TradingSettings, PersonalSettings } from '../../../lib/types';

interface SettingsOverviewProps {
  tradingSettings: TradingSettings;
  personalSettings: PersonalSettings;
  isDarkMode: boolean;
  riskLevel: string;
}

const SettingsOverview: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{
    tradingSettings: TradingSettings;
    personalSettings: PersonalSettings;
    isDarkMode: boolean;
    riskLevel: string;
  }>();

  const { tradingSettings, personalSettings, isDarkMode, riskLevel } = context || {};

  const settingsCards = [
    {
      id: 'profile-detail',
      title: '个人资料',
      description: '管理您的账户信息和实名认证',
      icon: ICONS.User,
      path: '/client/settings/profile-detail',
      status: '已完成认证',
      statusColor: 'text-[#00D4AA]',
    },
    {
      id: 'security',
      title: '账户安全',
      description: '密码、双重验证和登录设备管理',
      icon: ICONS.Shield,
      path: '/client/settings/security',
      status: '已开启2FA',
      statusColor: 'text-[#00D4AA]',
    },
    {
      id: 'trading-preferences',
      title: '交易偏好',
      description: `默认策略: ${tradingSettings?.defaultStrategy || 'NORMAL'} · 杠杆: ${tradingSettings?.defaultLeverage || 10}x`,
      icon: ICONS.Zap,
      path: '/client/settings/trading-preferences',
      status: tradingSettings?.fastOrderMode ? '极速模式开启' : '标准模式',
      statusColor: tradingSettings?.fastOrderMode ? 'text-[#00D4AA]' : 'text-[var(--color-text-muted)]',
    },
    {
      id: 'personalized',
      title: '个性化',
      description: `主题: ${isDarkMode ? '深色模式' : '浅色模式'} · 字体: ${personalSettings?.fontSize === 'large' ? '大字增强' : '标准'}`,
      icon: ICONS.Eye,
      path: '/client/settings/personalized',
      status: personalSettings?.hapticFeedback ? '触感反馈开启' : '触感反馈关闭',
      statusColor: personalSettings?.hapticFeedback ? 'text-[#00D4AA]' : 'text-[var(--color-text-muted)]',
    },
  ];

  const quickStats = [
    { label: '风险等级', value: riskLevel || 'C3', color: 'text-[#00D4AA]' },
    { label: '当前主题', value: isDarkMode ? '深色' : '浅色', color: 'text-[var(--color-text-primary)]' },
    { label: '语言', value: personalSettings?.language === 'zh-CN' ? '简体中文' : 'English', color: 'text-[var(--color-text-primary)]' },
    { label: '系统版本', value: 'v2.10', color: 'text-[var(--color-text-muted)]' },
  ];

  return (
    <div className="animate-slide-up space-y-6">
      {/* 快速状态概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 设置分类卡片 */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] px-1">设置分类</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.path)}
                className="glass-card p-5 text-left hover:border-[#00D4AA]/30 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center group-hover:bg-[#00D4AA]/10 group-hover:border-[#00D4AA]/30 transition-all">
                    <Icon size={22} className="text-[var(--color-text-muted)] group-hover:text-[#00D4AA] transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-sm text-[var(--color-text-primary)] group-hover:text-[#00D4AA] transition-colors">
                        {card.title}
                      </h4>
                      <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 truncate">{card.description}</p>
                    <span className={`text-[9px] font-bold mt-2 inline-block ${card.statusColor}`}>{card.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 快捷操作区域 */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] px-1">快捷操作</h3>
        <div className="glass-card p-4 space-y-3">
          <button 
            onClick={() => navigate('/client/settings/about')}
            className="w-full p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between hover:border-[#00D4AA]/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center group-hover:bg-[#00D4AA]/10">
                <ICONS.Headset size={18} className="text-[var(--color-text-muted)] group-hover:text-[#00D4AA]" />
              </div>
              <div>
                <h4 className="font-black text-sm text-[var(--color-text-primary)]">关于与帮助</h4>
                <p className="text-[10px] text-[var(--color-text-muted)]">联系客服、查看隐私政策和服务条款</p>
              </div>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </button>

          <button 
            onClick={() => navigate('/client/compliance')}
            className="w-full p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between hover:border-[#00D4AA]/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center group-hover:bg-[#00D4AA]/10">
                <ICONS.FileText size={18} className="text-[var(--color-text-muted)] group-hover:text-[#00D4AA]" />
              </div>
              <div>
                <h4 className="font-black text-sm text-[var(--color-text-primary)]">合规中心</h4>
                <p className="text-[10px] text-[var(--color-text-muted)]">查看交易合规记录和风险评估</p>
              </div>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
      </div>

      {/* 安全提示 */}
      <div className="p-4 bg-[#00D4AA]/5 rounded-2xl border border-[#00D4AA]/20">
        <div className="flex items-start gap-3">
          <ICONS.Shield size={18} className="text-[#00D4AA] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-[#00D4AA] uppercase tracking-widest mb-1">安全提示</p>
            <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
              建议您定期更换密码并开启双重验证，以保护账户安全。银河证券证裕单元采用银行级加密技术保护您的资产和交易数据。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverview;
