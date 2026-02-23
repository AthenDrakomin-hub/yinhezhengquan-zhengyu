
import React, { useState, useEffect } from 'react';
import { Stock } from '../types';
import { ICONS, MOCK_REPORTS } from '../constants';
import StockIcon from './StockIcon';
import InteractiveChart from './InteractiveChart';
import { getStockF10Analysis, getGalaxyNews, getRealtimeStock } from '../services/marketService';

interface StockDetailViewProps {
  stock: Stock;
  onBack: () => void;
  onTradeClick?: (stock: Stock) => void;
}

const StockDetailView: React.FC<StockDetailViewProps> = ({ stock: initialStock, onBack, onTradeClick }) => {
  const [activeTab, setActiveTab] = useState('chart');
  const [stock, setStock] = useState<Stock>(initialStock);
  const [f10Data, setF10Data] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loadingF10, setLoadingF10] = useState(false);

  // 实时价格轮询
  useEffect(() => {
    const updatePrice = async () => {
      const updates = await getRealtimeStock(initialStock.symbol, initialStock.market);
      if (updates.price) {
        setStock(prev => ({ ...prev, ...updates as Partial<Stock> }));
      }
    };
    updatePrice();
    const timer = setInterval(updatePrice, 5000);
    return () => clearInterval(timer);
  }, [initialStock]);

  useEffect(() => {
    const loadData = async () => {
      setLoadingF10(true);
      const [f10, newsData] = await Promise.all([
        getStockF10Analysis(stock.symbol, stock.market),
        getGalaxyNews()
      ]);
      setF10Data(f10);
      setNews(newsData);
      setLoadingF10(false);
    };
    loadData();
  }, [stock.symbol]);

  const tabs = [
    { id: 'chart', label: '分时/K线' },
    { id: 'f10', label: 'F10资料' },
    { id: 'news', label: '相关新闻' },
    { id: 'reports', label: '研究报告' }
  ];

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)] pb-24">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-3">
            <StockIcon name={stock.name} logoUrl={stock.logoUrl} size="sm" />
            <div>
              <h1 className="text-sm font-black tracking-tight">{stock.name}</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-[9px] text-[var(--color-text-muted)] font-mono font-bold uppercase">{stock.symbol}.{stock.market}</p>
                <div className="w-1 h-1 bg-[#00D4AA] rounded-full animate-pulse" />
                <span className="text-[7px] font-black text-[#00D4AA] uppercase tracking-tighter">Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="px-6 py-6 space-y-2">
        <div className="flex items-baseline gap-4">
          <h2 className={`text-4xl font-black font-mono tracking-tighter ${stock.changePercent >= 0 ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>
            {stock.price.toFixed(2)}
          </h2>
          <div className={`flex items-center gap-1.5 font-black font-mono text-sm ${stock.changePercent >= 0 ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>
            <span>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 pt-2">
           <div className="space-y-0.5">
             <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">成交额</p>
             <p className="text-xs font-bold font-mono">数据同步中</p>
           </div>
           <div className="space-y-0.5">
             <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">换手率</p>
             <p className="text-xs font-bold font-mono">--</p>
           </div>
           <div className="space-y-0.5">
             <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">市盈率</p>
             <p className="text-xs font-bold font-mono">计算中</p>
           </div>
           <div className="space-y-0.5">
             <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">外盘/内盘</p>
             <p className="text-xs font-bold font-mono">1:1</p>
           </div>
        </div>
      </section>

      <div className="px-4 border-b border-[var(--color-border)] flex gap-6 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 text-[11px] font-black uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? 'text-[#00D4AA]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4AA] rounded-full" />}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
        {activeTab === 'chart' && (
          <div className="space-y-6">
            <InteractiveChart 
              symbol={stock.symbol} 
              basePrice={stock.price} 
              changePercent={stock.changePercent} 
            />
            <div className="bg-[#00D4AA]/5 border border-[#00D4AA]/20 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-[#00D4AA] uppercase tracking-widest">证裕 Nexus 预测</p>
                <p className="text-xs font-bold">该标的当前位于【阻力位】附近，建议观察成交量配合。</p>
              </div>
              <ICONS.Zap size={20} className="text-[#00D4AA] opacity-50" />
            </div>
          </div>
        )}

        {activeTab === 'f10' && (
          <div className="space-y-8 animate-slide-up pb-8">
            {loadingF10 ? (
              <div className="space-y-4 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[var(--color-surface)] rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="glass-card p-6 space-y-4">
                  <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-[0.2em] border-l-2 border-[#00D4AA] pl-4">业务摘要 (Realtime)</h3>
                  <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] font-medium italic">{f10Data?.summary}</p>
                </div>
                {/* 更多资料展示... */}
              </div>
            )}
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-4 animate-slide-up">
            {news.map((item, idx) => (
              <div key={idx} className="glass-card p-4 flex gap-4 hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer group">
                <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] mt-1 shrink-0">{item.time}</span>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest bg-[var(--color-surface)] px-1.5 py-0.5 rounded">{item.category}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.sentiment === 'positive' ? 'bg-[#00D4AA]' : 'bg-[#FF6B6B]'}`} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[#00D4AA] leading-relaxed transition-colors">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 glass-nav flex gap-4 z-40 border-t border-[var(--color-border)] shadow-2xl">
         <button onClick={() => onTradeClick?.(stock)} className="flex-[2] py-4 rounded-2xl bg-[#FF6B6B] text-white font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all">卖出持有</button>
         <button onClick={() => onTradeClick?.(stock)} className="flex-[3] py-4 rounded-2xl bg-[#00D4AA] text-[#0A1628] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#00D4AA]/20 active:scale-95 transition-all">确认买入</button>
      </div>
    </div>
  );
};

export default StockDetailView;
