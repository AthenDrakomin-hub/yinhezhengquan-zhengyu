"use strict";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';

const AboutSettings: React.FC = () => {
  const navigate = useNavigate();
  
  const handleContactSupport = () => {
    navigate('/client/chat');
  };
  
  return (
    <div className="animate-slide-up space-y-6">
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#00D4AA]/10 flex items-center justify-center">
            <ICONS.Headset size={28} className="text-[#00D4AA]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[var(--color-text-primary)]">关于与帮助</h3>
            <p className="text-xs text-[var(--color-text-muted)]">联系客服、查看隐私政策和服务条款</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">系统版本</p>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">银河证券证裕单元 v2.10</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">© 2026 Galaxy Financial Technology</p>
          </div>
          
          <button 
            onClick={handleContactSupport}
            className="w-full p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between hover:border-[#00D4AA]/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <ICONS.MessageCircle size={18} className="text-[var(--color-text-muted)]" />
              <div className="text-left">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">联系客服</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">在线咨询或拨打 95551</p>
              </div>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </button>
          
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ICONS.FileText size={18} className="text-[var(--color-text-muted)]" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">服务条款</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </div>
          
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ICONS.Shield size={18} className="text-[var(--color-text-muted)]" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">隐私政策</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSettings;
