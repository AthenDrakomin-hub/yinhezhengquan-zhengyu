
import React, { useState } from 'react';
import { ICONS, MOCK_EDUCATION } from '../constants';

interface EducationBaseViewProps {
  onBack: () => void;
}

const EducationBaseView: React.FC<EducationBaseViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('全部');

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">Nexus 投教基地</h1>
        </div>
      </header>

      <div className="px-4 py-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-[var(--color-border)]">
        {['全部', '基础', '进阶', '规则', '风险'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === cat 
                ? 'bg-[#00D4AA] text-[#0A1628]' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-20">
        {/* Progress Tracker */}
        <div className="glass-card p-6 bg-gradient-to-br from-[#00D4AA]/5 to-transparent border-[#00D4AA]/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">学习进度：中级交易员</h3>
            <span className="text-[10px] font-mono font-black text-[#00D4AA]">64%</span>
          </div>
          <div className="h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden">
            <div className="w-[64%] h-full bg-[#00D4AA] shadow-[0_0_8px_#00D4AA]" />
          </div>
          <div className="mt-4 flex justify-between text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
            <span>已学 12 课时</span>
            <span>距通关还需 8 课时</span>
          </div>
        </div>

        {/* Content List */}
        <div className="grid grid-cols-1 gap-4">
          {MOCK_EDUCATION.filter(e => activeTab === '全部' || e.category === activeTab).map(topic => (
            <div key={topic.id} className="glass-card overflow-hidden group cursor-pointer hover:border-[#00D4AA]/30 transition-all">
              <div className="relative h-40">
                <img src={topic.image} alt={topic.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#00D4AA] text-[#0A1628] uppercase tracking-tighter">{topic.category}</span>
                    <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">{topic.duration}</span>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <h4 className="text-sm font-black text-[var(--color-text-primary)] group-hover:text-[#00D4AA] transition-colors">{topic.title}</h4>
                <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-relaxed">基于 2026 年最新证券法及衍生品交易细则，深度解析合规操作边界。</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Tutor Callout */}
        <div className="bg-[#00D4AA]/10 p-6 rounded-3xl border border-[#00D4AA]/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00D4AA] flex items-center justify-center text-[#0A1628]">
              <ICONS.Headset size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--color-text-primary)] uppercase tracking-widest">Nexus AI 导师</h3>
              <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">24/7 策略与合规答疑</p>
            </div>
          </div>
          <p className="text-[10px] text-[var(--color-text-secondary)] font-medium leading-relaxed">
            “您好，我是您的 AI 导师。在学习衍生品交易时，最重要的不是获利，而是对‘波动率’的深刻理解。有问题随时问我。”
          </p>
          <button className="w-full py-3 bg-[#00D4AA] text-[#0A1628] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#00D4AA]/20">
            开始对话
          </button>
        </div>
      </div>
    </div>
  );
};

export default EducationBaseView;
