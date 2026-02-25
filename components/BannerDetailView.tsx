
import React, { useState } from 'react';
import { Banner } from '../types';
import { ICONS } from '../constants';

const DetailHeroImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#0A1628] via-[#00D4AA]/10 to-[#0A1628] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-[#00D4AA] rounded-[24px] flex items-center justify-center font-black text-[#0A1628] text-xl shadow-2xl">ZY</div>
        <p className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest opacity-40">Nexus Interactive</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && <div className="absolute inset-0 bg-[#0A1628] animate-pulse" />}
      <img 
        src={src} 
        alt={alt} 
        className={`w-full h-full object-cover transition-opacity duration-1000 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
};

interface BannerDetailViewProps {
  banner: Banner;
  onBack: () => void;
  onAction?: (symbol: string) => void;
}

const BannerDetailView: React.FC<BannerDetailViewProps> = ({ banner, onBack, onAction }) => {
  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">专题详情</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Featured Image */}
        <div className="relative h-64 w-full overflow-hidden">
          <DetailHeroImage src={banner.img} alt={banner.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
             <span className="px-2 py-1 bg-[#00D4AA] text-[#0A1628] text-[8px] font-black uppercase tracking-widest rounded mb-2 inline-block shadow-lg">
               {banner.category}
             </span>
             <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">{banner.title}</h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-4">
             <span className="uppercase tracking-widest">证裕 Nexus 2025 战略局</span>
             <span className="font-mono">{banner.date}</span>
          </div>

          <div className="glass-card p-5 bg-[#00D4AA]/5 border-[#00D4AA]/20 space-y-3 shadow-inner">
            <h3 className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest flex items-center gap-2">
              <ICONS.Zap size={14} /> Nexus AI 摘要解读
            </h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-primary)] font-medium italic">
              {banner.desc}
            </p>
          </div>

          <article className="prose prose-invert max-w-none">
            <p className="text-sm leading-loose text-[var(--color-text-secondary)] font-medium">
              {banner.content}
            </p>
            <p className="text-sm leading-loose text-[var(--color-text-secondary)] font-medium mt-4">
              作为证裕交易单元的核心战略，Nexus 计划致力于通过极致的流动性管理与 AI 赋能的策略研究，为专业投资者提供全方位对冲工具。
            </p>
          </article>

          {banner.relatedSymbol && (
            <div className="pt-6">
              <button 
                onClick={() => onAction?.(banner.relatedSymbol!)}
                className="w-full py-4 rounded-2xl bg-[#00D4AA] text-[#0A1628] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#00D4AA]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <ICONS.Trade size={18} /> 查看相关标的行情
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BannerDetailView;
