import React, { useState, useEffect } from 'react';
import { ICONS } from '../../../lib/constants';
import { ResearchReport } from '../../../lib/types';
import { getReports } from '../../../services/contentService';

interface ResearchReportsViewProps {
  onBack: () => void;
}

const ResearchReportsView: React.FC<ResearchReportsViewProps> = ({ onBack }) => {
  const [filter, setFilter] = useState('全部');
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await getReports();
        setReports(data);
      } catch (error) {
        console.error('Failed to load reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const filteredReports = filter === '全部' 
    ? reports 
    : reports.filter(r => r.category === filter);

  if (selectedReport) {
    return (
      <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
        <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
          <button onClick={() => setSelectedReport(null)} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">调研报告详情</h1>
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

          <div className="galaxy-card p-5 bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 space-y-3">
            <h3 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider flex items-center gap-2">
              <ICONS.Zap size={14} /> 核心观点摘要
            </h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-primary)] font-medium italic">
              {selectedReport.summary}
            </p>
          </div>

          {/* 报告正文 */}
          <div className="galaxy-card p-5 space-y-4">
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">
              报告正文
            </h3>
            <div className="prose prose-invert max-w-none text-xs leading-loose text-[var(--color-text-secondary)] font-medium space-y-4">
              <p>基于 2026 年量子算力节点的监测数据，本报告认为该行业已进入"溢价重估"阶段。分布式算力的需求曲线在 Q1 呈现出 45 度以上的斜率，主要受碳中和背景下能源链优化的推动。</p>
              <p>我们建议投资者重点关注具有"算力+储能"双重护城河的标的。这类企业在维持高毛利的同时，能有效对冲能源成本的波动风险。</p>
              <h4 className="text-sm font-black text-[var(--color-text-primary)] mt-4">一、行业背景分析</h4>
              <p>随着数字化转型加速，算力需求持续攀升。根据工信部数据，2025年全国算力规模预计达到300 EFLOPS，其中智能算力占比将超过50%。这一趋势为算力基础设施企业带来广阔发展空间。</p>
              <h4 className="text-sm font-black text-[var(--color-text-primary)] mt-4">二、重点标的分析</h4>
              <p>本报告重点分析了具有核心竞争力的算力企业，从技术壁垒、商业模式、财务指标三个维度进行综合评估。筛选出的标的具备持续成长潜力。</p>
              <h4 className="text-sm font-black text-[var(--color-text-primary)] mt-4">三、投资建议</h4>
              <p>建议投资者采取"核心+卫星"配置策略，核心仓位配置行业龙头，卫星仓位关注细分领域机会。同时注意控制仓位，保持流动性。</p>
              <p className="text-[var(--color-text-muted)] italic">风险提示：量子纠错算法的突破可能导致旧有算力节点加速折旧；地缘博弈对全球算力流通的影响具有不确定性。本报告仅供参考，不构成投资建议。</p>
            </div>
          </div>

          {/* 相关文件下载 */}
          <div className="galaxy-card p-5 space-y-3">
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-2">
              <ICONS.FileText size={14} /> 相关文件
            </h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15v2M12 11v6M15 13v4"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[var(--color-text-primary)]">完整研究报告.pdf</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">2.3 MB · PDF文档</div>
                  </div>
                </div>
                <ICONS.Download size={16} className="text-[var(--color-text-muted)] group-hover:text-[#00D4AA] transition-colors" />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[#00D4AA] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h2M8 17h2M12 13l2 2 4-4"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[var(--color-text-primary)]">财务数据附表.xlsx</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">156 KB · Excel表格</div>
                  </div>
                </div>
                <ICONS.Download size={16} className="text-[var(--color-text-muted)] group-hover:text-[#00D4AA] transition-colors" />
              </button>
            </div>
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
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">调研报告</h1>
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

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[var(--color-text-muted)] text-xs">加载中...</div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[var(--color-text-muted)] text-xs">暂无研报数据</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {filteredReports.map(report => (
            <div 
              key={report.id} 
              onClick={() => setSelectedReport(report)}
              className="galaxy-card p-5 space-y-3 border-l-4 border-transparent hover:border-[var(--color-primary)] transition-all cursor-pointer group"
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
      )}
    </div>
  );
};

export default ResearchReportsView;
