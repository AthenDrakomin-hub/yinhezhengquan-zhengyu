"use strict";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import StockIcon from './StockIcon';

interface ProfileItem {
  label: string;
  value: string;
  editable?: boolean;
  copyable?: boolean;
  status?: string;
}

interface InfoGroup {
  title: string;
  items: ProfileItem[];
}

const ProfileDetailView: React.FC = () => {
  const navigate = useNavigate();
  
  const infoGroups: InfoGroup[] = [
    {
      title: '基本身份信息',
      items: [
        { label: '用户昵称', value: 'Invest_ZY_2026', editable: true },
        { label: '证裕 ID', value: 'Nexus_0992837', copyable: true },
        { label: '实名认证', value: '已认证 (*振华)', status: 'verified' },
      ]
    },
    {
      title: '联系方式',
      items: [
        { label: '绑定手机', value: '138****8888', editable: true },
        { label: '电子邮箱', value: 'nexus_user@galaxy.com', editable: true },
        { label: '通讯地址', value: '北京市西城区金融街 8 号银河大厦', editable: true },
      ]
    },
    {
      title: '投教背景',
      items: [
        { label: '投资经验', value: '5-10 年' },
        { label: '职业背景', value: '金融/科技从业者' },
        { label: '关联项目', value: '银河 Nexus 2.0 种子计划' },
      ]
    }
  ];

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">个人资料</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-10">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6 gap-4">
          <div className="relative group">
            <StockIcon name="Invest_ZY_2026" size="lg" className="ring-4 ring-[#00D4AA]/20" />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#00D4AA] rounded-full border-4 border-[var(--color-bg)] flex items-center justify-center text-[#0A1628] shadow-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
          <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">修改头像</p>
        </div>

        {infoGroups.map((group, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">
              {group.title}
            </h3>
            <div className="glass-card overflow-hidden">
              {group.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-xs font-bold text-[var(--color-text-secondary)]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black font-mono ${(item.status ?? '') === 'verified' ? 'text-[#00D4AA]' : 'text-[var(--color-text-primary)]'}`}>
                      {item.value}
                    </span>
                    {(item.editable ?? false) && <ICONS.ArrowRight size={10} className="text-[var(--color-text-muted)]" />}
                    {(item.copyable ?? false) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)]"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 p-4 rounded-2xl">
          <p className="text-[10px] font-black text-[#FF6B6B] uppercase tracking-widest mb-2 flex items-center gap-2">
            <ICONS.Shield size={12} /> 敏感信息保护
          </p>
          <p className="text-[9px] text-[var(--color-text-secondary)] leading-relaxed font-medium">
            为了您的账户安全，关键实名信息已进行脱敏处理。如需修改认证信息，请前往"账户安全中心"提交审核申请。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetailView;
