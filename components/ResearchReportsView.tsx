
import React, { useState } from 'react';
import { ICONS, MOCK_REPORTS } from '../constants';
import { ResearchReport } from '../types';

interface ResearchReportsViewProps {
  onBack: () => void;
}

const ResearchReportsView: React.FC<ResearchReportsViewProps> = ({ onBack }) => {
  const [filter, setFilter] = useState('全部');
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);

  const filteredReports = filter === '全部' 
    ? MOCK_REPORTS 
    : MOCK_REPORTS.filter(r => r.category === filter);

  if (selectedReport) {
    return (
      <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
        <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
          <button onClick={() => setSelectedReport(null)} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">研报详情</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-20">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-[#00D4AA] uppercase tracking-[0.3em]">{selectedReport.category}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${selectedReport.sentiment === '看多' ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)]'}`}>
                观点：{selectedReport.sentiment}
              </span>
            </div>
            <h2 className="text-xl font-black text-[var(--color-text-primary)] leading-tight">{selectedReport.title}</h2>
            <div className="flex items-center gap-4 text-[var(--color-text-muted)] text-[10px] font-bold">
              <span>{selectedReport.author}</span>
              <span>•</span>
              <span>{selectedReport.date}</span>
            </div>
          </div>

          <div className="glass-card p-5 bg-[#00D4AA]/5 border-[#00D4AA]/20 space-y-3">
            <h3 className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest flex items-center gap-2">
              <ICONS.Zap size={14} /> Nexus AI 核心观点摘要
            </h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-primary)] font-medium italic">
              {selectedReport.summary}
            </p>
          </div>

          <div className="prose prose-invert max-w-none text-xs leading-loose text-[var(--color-text-secondary)] font-medium space-y-4">
            <p>基于 2026 年 Nexus 量子算力节点的监测数据，本报告认为该行业已进入“溢价重估”阶段。分布式算力的需求曲线在 Q1 呈现出 45 度以上的斜率，主要受碳中和背景下能源链优化的推动。</p>
            <p>我们建议投资者重点关注具有“算力+储能”双重护城河的标的。这类企业在维持高毛利的同时，能有效对冲能源成本的波动风险。</p>
            <p>风险提示：量子纠错算法的突破可能导致旧有算力节点加速折旧；地缘博弈对全球算力流通的影响具有不确定性。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">证裕深度研报</h1>
        </div>
      </header>

      <div className="px-4 py-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-[var(--color-border)]">
        {['全部', '个股', '行业', '宏观', '策略'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === cat 
                ? 'bg-[#00D4AA] text-[#0A1628]' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {filteredReports.map(report => (
          <div 
            key={report.id} 
            onClick={() => setSelectedReport(report)}
            className="glass-card p-5 space-y-3 border-l-4 border-transparent hover:border-[#00D4AA] transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-[#00D4AA] uppercase tracking-[0.2em]">{report.category}</span>
              <span className="text-[9px] text-[var(--color-text-muted)] font-bold">{report.date}</span>
            </div>
            <h4 className="text-sm font-black text-[var(--color-text-primary)] group-hover:text-[#00D4AA] leading-snug transition-colors">{report.title}</h4>
            <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">{report.summary}</p>
            <div className="flex justify-between items-center pt-3 border-t border-[var(--color-border)] mt-2">
              <span className="text-[9px] text-[var(--color-text-secondary)] font-bold italic">{report.author}</span>
              <div className="flex items-center gap-1">
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${report.sentiment === '看多' ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)]'}`}>
                  {report.sentiment}
                </span>
                <ICONS.ArrowRight size={10} className="text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResearchReportsView;
