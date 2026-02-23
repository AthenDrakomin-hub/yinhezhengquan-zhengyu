
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserAccount, AssetSnapshot } from '../types';
import { COLORS } from '../constants';

interface AssetAnalysisViewProps {
  account: UserAccount;
  onBack: () => void;
}

const AssetAnalysisView: React.FC<AssetAnalysisViewProps> = ({ account, onBack }) => {
  const pieData = useMemo(() => {
    const data = [
      { name: '可用资金', value: account.balance },
      ...account.holdings.map(h => ({ name: h.name, value: h.marketValue }))
    ];
    return data;
  }, [account]);

  const PIE_COLORS = ['#00D4AA', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)] pb-10">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">资产分析报告</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-20">
        {/* Yield Curve */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest border-l-2 border-[#00D4AA] pl-3">收益走势 (近7日)</h3>
            <span className="text-[10px] font-black text-[#00D4AA]">+5.42%</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={account.history}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00D4AA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} 
                />
                <YAxis 
                  hide={true} 
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#00D4AA' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="#00D4AA" 
                  fillOpacity={1} 
                  fill="url(#colorEquity)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Allocation */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest border-l-2 border-[#00D4AA] pl-3">资产分布 (Allocation)</h3>
          <div className="flex items-center gap-4">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {pieData.map((entry, index) => (
                <div key={index} className="flex justify-between items-center text-[10px] font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="text-[var(--color-text-secondary)]">{entry.name}</span>
                  </div>
                  <span className="font-mono text-[var(--color-text-primary)]">
                    {((entry.value / account.history[account.history.length-1].equity) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* P&L Attribution */}
        <div className="glass-card p-6 space-y-6">
           <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest border-l-2 border-[#00D4AA] pl-3">盈亏归因 (Attribution)</h3>
           <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">最大盈利标的</p>
                    <p className="text-xs font-black text-[var(--color-text-primary)]">腾讯控股 (00700)</p>
                 </div>
                 <span className="text-xs font-black font-mono text-[#00D4AA]">+¥32,400</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">手续费/利息支出</p>
                    <p className="text-xs font-black text-[var(--color-text-primary)]">累计扣款</p>
                 </div>
                 <span className="text-xs font-black font-mono text-[#FF6B6B]">-¥1,245.50</span>
              </div>
              <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                   银河 Nexus 智能建议
                 </p>
                 <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed italic">
                   “您的资产组合波动率低于同风险等级用户 15%。近期建议适当增加港股红利标的配置，以平滑 A 股窄幅震荡带来的收益损耗。”
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AssetAnalysisView;
