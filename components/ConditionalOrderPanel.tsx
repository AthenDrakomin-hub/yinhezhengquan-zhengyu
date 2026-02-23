
import React, { useState } from 'react';
import { Stock, ConditionalOrder } from '../types';
import { ICONS } from '../constants';
import StockIcon from './StockIcon';

interface ConditionalOrderPanelProps {
  onBack: () => void;
  stock: Stock;
  onAddOrder: (order: Partial<ConditionalOrder>) => void;
}

const ConditionalOrderPanel: React.FC<ConditionalOrderPanelProps> = ({ onBack, stock, onAddOrder }) => {
  const [type, setType] = useState<'TP_SL' | 'GRID'>('TP_SL');
  const [stopLoss, setStopLoss] = useState((stock.price * 0.95).toFixed(2));
  const [takeProfit, setTakeProfit] = useState((stock.price * 1.1).toFixed(2));
  const [gridUpper, setGridUpper] = useState((stock.price * 1.05).toFixed(2));
  const [gridLower, setGridLower] = useState((stock.price * 0.95).toFixed(2));
  const [gridCount, setGridCount] = useState('10');

  const handleSubmit = () => {
    const config = type === 'TP_SL' 
      ? { stopLoss: parseFloat(stopLoss), takeProfit: parseFloat(takeProfit) }
      : { gridUpper: parseFloat(gridUpper), gridLower: parseFloat(gridLower), gridCount: parseInt(gridCount) };
    
    onAddOrder({
      symbol: stock.symbol,
      name: stock.name,
      type,
      config,
      status: 'RUNNING',
      createdAt: new Date()
    });
    alert('条件单已部署至银河 Nexus 云端执行引擎');
    onBack();
  };

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">智能条件单</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-10">
        <div className="glass-card p-5 flex items-center gap-4">
          <StockIcon name={stock.name} logoUrl={stock.logoUrl} />
          <div>
            <h3 className="text-sm font-black text-[var(--color-text-primary)]">{stock.name}</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] font-mono">当前价: ¥{stock.price.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex p-1 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
           <button 
             onClick={() => setType('TP_SL')}
             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'TP_SL' ? 'bg-[#00D4AA] text-[#0A1628]' : 'text-[var(--color-text-muted)]'}`}
           >止盈止损 (TP/SL)</button>
           <button 
             onClick={() => setType('GRID')}
             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'GRID' ? 'bg-[#00D4AA] text-[#0A1628]' : 'text-[var(--color-text-muted)]'}`}
           >网格交易 (Grid)</button>
        </div>

        {type === 'TP_SL' ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest px-2">止损触发价 (Stop Loss)</label>
              <div className="flex items-center bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] h-14 px-4 gap-4">
                 <input 
                   type="number" 
                   value={stopLoss} 
                   onChange={(e) => setStopLoss(e.target.value)}
                   className="flex-1 bg-transparent font-mono font-black text-sm text-[#FF6B6B] outline-none"
                 />
                 <span className="text-[10px] font-black text-[#FF6B6B]">-5%</span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest px-2">止盈触发价 (Take Profit)</label>
              <div className="flex items-center bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] h-14 px-4 gap-4">
                 <input 
                   type="number" 
                   value={takeProfit} 
                   onChange={(e) => setTakeProfit(e.target.value)}
                   className="flex-1 bg-transparent font-mono font-black text-sm text-[#00D4AA] outline-none"
                 />
                 <span className="text-[10px] font-black text-[#00D4AA]">+10%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">网格上限</label>
                 <input type="number" value={gridUpper} onChange={(e) => setGridUpper(e.target.value)} className="w-full bg-[var(--color-surface)] h-12 px-4 rounded-xl border border-[var(--color-border)] font-mono font-black text-xs outline-none" />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">网格下限</label>
                 <input type="number" value={gridLower} onChange={(e) => setGridLower(e.target.value)} className="w-full bg-[var(--color-surface)] h-12 px-4 rounded-xl border border-[var(--color-border)] font-mono font-black text-xs outline-none" />
               </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest px-2">网格数量 (Grid Density)</label>
              <input 
                type="number" 
                value={gridCount} 
                onChange={(e) => setGridCount(e.target.value)}
                className="w-full bg-[var(--color-surface)] h-14 px-4 rounded-2xl border border-[var(--color-border)] font-mono font-black text-sm outline-none"
              />
            </div>
            <div className="p-4 bg-[#00D4AA]/5 border border-[#00D4AA]/20 rounded-2xl text-[10px] text-[#00D4AA] leading-relaxed italic">
               “网格交易将在价格震荡时自动执行‘低吸高抛’。请确保账户中有足够的现金和持仓作为网格底仓。”
            </div>
          </div>
        )}

        <div className="pt-6">
           <button 
             onClick={handleSubmit}
             className="w-full py-5 rounded-3xl bg-[#00D4AA] text-[#0A1628] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
           >
             <ICONS.Zap size={18} /> 部署条件单
           </button>
           <p className="text-center text-[9px] font-black text-[var(--color-text-muted)] mt-4 uppercase tracking-widest">
             条件单由银河 Nexus 云端免费执行，不占用本地资源
           </p>
        </div>
      </div>
    </div>
  );
};

export default ConditionalOrderPanel;
