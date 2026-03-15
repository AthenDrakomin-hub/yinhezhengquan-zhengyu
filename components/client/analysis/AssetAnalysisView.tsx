
import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserAccount, AssetSnapshot } from '../../../lib/types';
import { COLORS } from '../../../lib/constants';
import assetSnapshotService from '../../../services/assetSnapshotService';

interface AssetAnalysisViewProps {
  account: UserAccount | null;
  onBack: () => void;
}

const AssetAnalysisView: React.FC<AssetAnalysisViewProps> = ({ account, onBack }) => {
  const [historyData, setHistoryData] = useState<Array<{ date: string; equity: number; balance: number; profit: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    totalEquity: number;
    totalProfit: number;
    avgDailyProfit: number;
    profitableDays: number;
    lossDays: number;
  } | null>(null);

  // 加载历史数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 尝试从数据库获取真实历史数据
        const history = await assetSnapshotService.getAssetHistory(30);
        
        if (history && history.length > 0) {
          setHistoryData(history);
          
          // 获取统计摘要
          const summaryData = await assetSnapshotService.getAssetSummary();
          setSummary(summaryData);
        } else {
          // 如果没有历史数据，生成模拟数据
          const baseEquity = (account?.balance || 1000000) + 
            (account?.holdings?.reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0) || 0);
          const mockData = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            mockData.push({
              date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
              equity: baseEquity * (1 + (Math.random() - 0.5) * 0.02 * (7 - i) / 7),
              balance: account?.balance || 1000000,
              profit: 0
            });
          }
          setHistoryData(mockData);
        }
      } catch (error) {
        console.error('加载资产历史数据失败:', error);
        // 使用模拟数据
        const baseEquity = (account?.balance || 1000000) + 
          (account?.holdings?.reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0) || 0);
        const mockData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          mockData.push({
            date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
            equity: baseEquity * (1 + (Math.random() - 0.5) * 0.02 * (7 - i) / 7),
            balance: account?.balance || 1000000,
            profit: 0
          });
        }
        setHistoryData(mockData);
      } finally {
        setLoading(false);
      }
    };
    
    if (account) {
      loadData();
    }
  }, [account]);

  const pieData = useMemo(() => {
    if (!account) return [];
    const data = [
      { name: '可用资金', value: account.balance },
      ...account.holdings.map(h => ({ name: h.name, value: h.marketValue || h.quantity * h.currentPrice }))
    ];
    return data;
  }, [account]);

  const PIE_COLORS = ['#DC2626', '#3B82F6', '#8B5CF6', '#F59E0B', '#059669', '#10B981'];

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)] pb-10">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">资产分析报告</h1>
      </header>

      {!account ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[var(--color-text-muted)]">
            <p className="text-sm font-bold">加载中...</p>
          </div>
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-20">
        {/* Yield Curve */}
        <div className="galaxy-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest border-l-2 border-[#DC2626] pl-3">收益走势 (近7日)</h3>
            <span className="text-[10px] font-black text-[#DC2626]">+5.42%</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
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
                  itemStyle={{ color: '#DC2626' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="#DC2626" 
                  fillOpacity={1} 
                  fill="url(#colorEquity)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Allocation */}
        <div className="galaxy-card p-6 space-y-6">
          <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest border-l-2 border-[#DC2626] pl-3">资产分布 (Allocation)</h3>
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
                    {historyData.length > 0 && historyData[historyData.length-1].equity > 0
                      ? ((entry.value / historyData[historyData.length-1].equity) * 100).toFixed(1) + '%'
                      : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* P&L Attribution */}
        <div className="galaxy-card p-6 space-y-6">
           <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest border-l-2 border-[#DC2626] pl-3">盈亏归因 (Attribution)</h3>
           <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">最大盈利标的</p>
                    <p className="text-xs font-black text-[var(--color-text-primary)]">腾讯控股 (00700)</p>
                 </div>
                 <span className="text-xs font-black font-mono text-[#DC2626]">+¥32,400</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">手续费/利息支出</p>
                    <p className="text-xs font-black text-[var(--color-text-primary)]">累计扣款</p>
                 </div>
                 <span className="text-xs font-black font-mono text-[#059669]">-¥1,245.50</span>
              </div>
              <div className="p-4 bg-[var(--color-secondary-light)] rounded-2xl border border-[var(--color-secondary)]/20">
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
      )}
    </div>
  );
};

export default AssetAnalysisView;
