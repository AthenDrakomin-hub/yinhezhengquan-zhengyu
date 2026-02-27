"use strict";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';

const AboutInvestZYView: React.FC = () => {
  const navigate = useNavigate();
  const LOGO_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png";

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">关于银河·证裕</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-10 no-scrollbar pb-10">
        {/* Brand Logo & Version */}
        <div className="flex flex-col items-center py-10 gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-[#00D4AA]/30 blur-[60px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="w-52 h-52 bg-white rounded-[48px] relative z-10 flex items-center justify-center shadow-[0_20px_50px_rgba(255,255,255,0.2)] border border-white/50">
              <img 
                src={LOGO_URL} 
                alt="证裕 Logo" 
                className="w-2/3 h-2/3 object-contain" 
              />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black tracking-tight text-[#00D4AA]">中国银河证券</h2>
            <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-[0.3em]">证裕交易单元 Nexus v2.10.4</p>
          </div>
        </div>

        {/* Feature Highlights */}
        <section className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">品牌愿景</h3>
          <div className="glass-card p-6 space-y-4">
             <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] font-medium">
               证裕（Invest ZY）是中国银河证券数字化转型的旗舰管理单元。依托银河 Nexus 2025 计划，我们致力于为专业用户提供高精度、低延迟的机构交易体验。
             </p>
             <div className="flex gap-2">
                <span className="text-[8px] font-black px-2 py-1 bg-[#00D4AA]/10 text-[#00D4AA] rounded uppercase">银河证券内核</span>
                <span className="text-[8px] font-black px-2 py-1 bg-blue-500/10 text-blue-500 rounded uppercase">AI 赋能研究</span>
             </div>
          </div>
        </section>

        <div className="text-center space-y-2">
           <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">
             © 2025 中国银河证券数字化金融技术部
           </p>
        </div>
      </div>
    </div>
  );
};

export default AboutInvestZYView;
