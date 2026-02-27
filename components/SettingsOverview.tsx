"use strict";

import React from 'react';
import { ICONS } from '../constants';

interface SettingsOverviewProps {
  onNavigate: (path: string) => void;
}

const SettingsOverview: React.FC<SettingsOverviewProps> = ({ onNavigate }) => {
  const sections = [
    {
      title: '账户与安全',
      items: [
        { id: 'profile-detail', label: '个人资料', value: 'Invest_ZY_2026', icon: ICONS.User },
        { id: 'risk', label: '风险测评等级', value: 'C3-稳健型', icon: ICONS.Shield, highlight: true },
        { id: 'security', label: '账户安全中心', value: '极高防护', icon: ICONS.Shield },
      ]
    },
    {
      title: '交易偏好',
      items: [
        { id: 'trading-preferences', label: '交易行为设置', value: '极速开启', icon: ICONS.Zap },
        { id: 'strategy', label: '默认委托策略', value: 'NORMAL', icon: ICONS.Trade },
        { id: 'leverage', label: '衍生品默认杠杆', value: '10x', icon: ICONS.Chart },
      ]
    },
    {
      title: '显示与交互',
      items: [
        { id: 'personalized', label: '偏好与辅助功能', value: '简体中文', icon: ICONS.Eye },
      ]
    },
    {
      title: '关于证裕',
      items: [
        { id: 'about', label: '版本信息与法律', value: 'v2.10.4', icon: ICONS.Headset },
      ]
    }
  ];

  return (
    <div className="animate-slide-up">
      <div className="mb-6">
        <h1 className="text-sm font-black uppercase tracking-[0.2em] mb-2">系统设置</h1>
        <p className="text-[10px] text-[var(--color-text-muted)] font-bold">
          请选择要配置的选项，或使用左侧导航菜单
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">
              {section.title}
            </h3>
            <div className="glass-card overflow-hidden">
              {section.items.map((item, i) => (
                <div 
                  key={item.id}
                  onClick={() => item.id && onNavigate(`/settings/${item.id}`)}
                  className={`flex items-center justify-between p-4 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer ${item.id ? 'active:opacity-70' : ''}`}
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
                    {item.id && <ICONS.ArrowRight size={12} className="text-[var(--color-text-muted)]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4">
          <p className="text-center text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">
            Galaxy Securities Nexus v2.10 <br/>
            © 2026 Galaxy Financial Technology
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverview;
