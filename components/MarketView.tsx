"use strict";

import React, { useState, useEffect, useMemo } from 'react';
import { Stock } from '../types';
import StockIcon from './StockIcon';
import { getMarketList } from '../services/marketService';

interface MarketViewProps {
  onSelectStock?: (symbol: string) => void;
}

const MarketView: React.FC<MarketViewProps> = ({ onSelectStock }) => {
  const [marketTab, setMarketTab] = useState('CN');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadMarket = async () => {
      // getMarketList 只支持 'CN' 和 'HK' 市场
      if (marketTab !== 'CN' && marketTab !== 'HK') {
        // 对于自选等，不调用 getMarketList，保持空数组或从其他地方加载
        setStocks([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getMarketList(marketTab);
        if (data && data.length > 0) {
          setStocks(data);
        } else {
          // 如果获取不到数据，保持现有数据或显示空状态
          console.warn(`获取${marketTab === 'CN' ? 'A股' : '港股'}行情数据失败，返回空数组`);
          setStocks([]);
        }
      } catch (error) {
        console.error('加载市场数据失败:', error);
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMarket();

    // 每 30 秒刷新一次（减少频率以避免频繁请求）
    const timer = setInterval(loadMarket, 30000);
    return () => clearInterval(timer);
  }, [marketTab]);

  const filteredStocks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return stocks;
    return stocks.filter(s => s.name.toLowerCase().includes(term) || s.symbol.toLowerCase().includes(term));
  }, [stocks, searchTerm]);

  return (
    <div className="flex flex-col h-full space-y-4 pt-4 pb-24 overflow-hidden">
      <div className="px-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center text-[var(--color-text-muted)] group-focus-within:text-[#00D4AA] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="搜索全市场实时标的..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 bg-[var(--color-surface)] pl-11 pr-4 rounded-2xl border border-[var(--color-border)] text-[11px] font-black outline-none focus:border-[#00D4AA]/50 transition-all"
          />
        </div>
      </div>

      <div className="px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'CN', label: '沪深A股' },
          { id: 'HK', label: '港股主板' },
          { id: 'WATCH', label: '我的自选' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMarketTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${
              marketTab === tab.id 
                ? 'bg-[#00D4AA] text-[#0A1628] border-transparent shadow-lg' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="glass-card overflow-hidden">
          <div className="sticky top-0 z-10 grid grid-cols-12 p-4 border-b border-[var(--color-border)] text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest bg-[var(--nav-bg)] backdrop-blur-md">
            <div className="col-span-6 flex items-center gap-2">
              代码 / 名称
              <div className="w-1.5 h-1.5 bg-[#00D4AA] rounded-full animate-pulse" />
            </div>
            <div className="col-span-3 text-right">最新价</div>
            <div className="col-span-3 text-right">涨跌幅</div>
          </div>
          
          <div className="divide-y divide-[var(--color-border)] min-h-[400px]">
            {loading ? (
              <div className="py-20 text-center space-y-4">
                 <div className="w-8 h-8 border-2 border-[#00D4AA] border-t-transparent rounded-full animate-spin mx-auto" />
                 <p className="text-[10px] font-black uppercase text-[#00D4AA] tracking-[0.2em]">正在同步全市场行情...</p>
              </div>
            ) : (
              filteredStocks.map((stock: Stock) => (
                <div 
                  key={stock.symbol} 
                  onClick={() => onSelectStock?.(stock.symbol)}
                  className="grid grid-cols-12 p-4 items-center transition-all duration-300 ease-out cursor-pointer hover:bg-[var(--color-surface-hover)] active:scale-[0.98] group"
                >
                  <div className="col-span-6 flex items-center gap-3">
                    <StockIcon name={stock.name} logoUrl={stock.logoUrl} size="sm" />
                    <div>
                      <h4 className="text-[13px] font-black tracking-tight group-hover:text-[#00D4AA] transition-colors">{stock.name}</h4>
                      <p className="text-[9px] text-[var(--color-text-muted)] font-mono font-bold">{stock.symbol}</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                      {stock.price ? stock.price.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`inline-block px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-black min-w-[68px] text-center ${
                      stock.changePercent >= 0 ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : 'bg-[#FF6B6B]/20 text-[#FF6B6B]'
                    }`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketView;
