"use strict";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';

const ProfileDetailSettings: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="animate-slide-up space-y-6">
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#00D4AA]/10 flex items-center justify-center">
            <ICONS.User size={28} className="text-[#00D4AA]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[var(--color-text-primary)]">个人资料</h3>
            <p className="text-xs text-[var(--color-text-muted)]">管理您的账户信息和实名认证</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">用户名</label>
            <p className="text-sm font-bold text-[var(--color-text-primary)] mt-1">银河投资者</p>
          </div>
          
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">实名认证</label>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">已认证</p>
              <span className="text-[10px] font-black text-[#00D4AA] bg-[#00D4AA]/10 px-2 py-1 rounded-lg">已通过</span>
            </div>
          </div>
          
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">风险等级</label>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">C3 - 稳健型</p>
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">2025-01-01 认定</span>
            </div>
          </div>
        </div>
        
        <button className="w-full mt-6 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-xs font-bold text-[var(--color-text-secondary)] hover:border-[#00D4AA]/30 hover:text-[#00D4AA] transition-all">
          编辑资料
        </button>
      </div>
    </div>
  );
};

export default ProfileDetailSettings;
