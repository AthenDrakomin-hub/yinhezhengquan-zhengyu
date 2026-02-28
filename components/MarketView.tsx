"use strict";

import React, { useState, useEffect, useMemo } from 'react';
import { Stock } from '../types';
import StockIcon from './StockIcon';
import { getMarketList } from '../services/marketService';
import { userService } from '../services/userService';

interface MarketViewProps {
  onSelectStock?: (symbol: string) => void;
}

const MarketView: React.FC<MarketViewProps> = ({ onSelectStock }) => {
  const [marketTab, setMarketTab] = useState('CN');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [watchlistStocks, setWatchlistStocks] = useState<Stock[]>([]);

  useEffect(() => {
    const loadMarket = async () => {
      if (marketTab === 'WATCH') {
        // 加载自选股
        try {
          setLoading(true);
          const watchlistItems = await userService.getWatchlist();
          if (watchlistItems && watchlistItems.length > 0) {
            // 从自选股中获取实时行情数据
            const symbols = watchlistItems.map(item => item.symbol);
            const marketType = symbols.some(s => s.startsWith('00') || s.startsWith('60') || s.startsWith('30')) ? 'CN' : 'HK';
            const allMarketStocks = await getMarketList(marketType);
            
            // 筛选出用户自选的股票
            const filteredWatchlistStocks = allMarketStocks.filter(stock => 
              watchlistItems.some(watchItem => watchItem.symbol === stock.symbol)
            );
            
            setWatchlistStocks(filteredWatchlistStocks);
            setStocks(filteredWatchlistStocks);
          } else {
            setWatchlistStocks([]);
            setStocks([]);
          }
        } catch (error) {
          console.error('加载自选股数据失败:', error);
          setWatchlistStocks([]);
          setStocks([]);
        } finally {
          setLoading(false);
        }
      } else if (marketTab === 'CN' || marketTab === 'HK') {
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
      }
    };
    
    loadMarket();

    // 每 30 秒刷新一次（减少频率以避免频繁请求）
    const timer = setInterval(loadMarket, 30000);
    return () => clearInterval(timer);
  }, [marketTab]);

  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set());

  // 加载自选股符号集
  useEffect(() => {
    const loadWatchlistSymbols = async () => {
      try {
        const watchlistItems = await userService.getWatchlist();
        const symbols = new Set(watchlistItems.map(item => item.symbol));
        setWatchlistSymbols(symbols);
      } catch (error) {
        console.error('加载自选股符号失败:', error);
      }
    };

    loadWatchlistSymbols();
  }, []);

  const filteredStocks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return stocks;
    return stocks.filter(s => s.name.toLowerCase().includes(term) || s.symbol.toLowerCase().includes(term));
  }, [stocks, searchTerm]);

  // 切换自选股状态
  const toggleWatchlist = async (stock: Stock, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，防止触发行点击事件
    
    try {
      if (watchlistSymbols.has(stock.symbol)) {
        // 从自选股中移除
        await userService.removeFromWatchlist(stock.symbol);
        setWatchlistSymbols(prev => {
          const newSet = new Set(prev);
          newSet.delete(stock.symbol);
          return newSet;
        });
        
        // 如果当前是自选标签页，则重新加载数据
        if (marketTab === 'WATCH') {
          const updatedWatchlist = Array.from(watchlistSymbols).filter(symbol => symbol !== stock.symbol);
          // 重新获取自选股数据
          const watchlistItems = await userService.getWatchlist();
          if (watchlistItems && watchlistItems.length > 0) {
            const symbols = watchlistItems.map(item => item.symbol);
            const marketType = symbols.some(s => s.startsWith('00') || s.startsWith('60') || s.startsWith('30')) ? 'CN' : 'HK';
            const allMarketStocks = await getMarketList(marketType);
            
            // 筛选出用户自选的股票
            const filteredWatchlistStocks = allMarketStocks.filter(stock => 
              watchlistItems.some(watchItem => watchItem.symbol === stock.symbol)
            );
            
            setWatchlistStocks(filteredWatchlistStocks);
            setStocks(filteredWatchlistStocks);
          } else {
            setWatchlistStocks([]);
            setStocks([]);
          }
        }
      } else {
        // 添加到自选股
        await userService.addToWatchlist(stock.symbol, stock.name);
        setWatchlistSymbols(prev => {
          const newSet = new Set(prev);
          newSet.add(stock.symbol);
          return newSet;
        });
      }
    } catch (error) {
      console.error('操作自选股失败:', error);
      alert('操作自选股失败，请重试');
    }
  };

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
            {tab.id === 'WATCH' && watchlistStocks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[#FF6B6B] text-white text-[7px] rounded-full">
                {watchlistStocks.length}
              </span>
            )}
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
            <div className="col-span-3 text-right flex justify-end items-center gap-2">
              <span>涨跌幅</span>
              {marketTab === 'WATCH' && (
                <span className="text-[6px] text-[var(--color-text-muted)]">自选</span>
              )}
            </div>
          </div>
          
          <div className="divide-y divide-[var(--color-border)] min-h-[400px]">
            {loading ? (
              <div className="py-20 text-center space-y-4">
                 <div className="w-8 h-8 border-2 border-[#00D4AA] border-t-transparent rounded-full animate-spin mx-auto" />
                 <p className="text-[10px] font-black uppercase text-[#00D4AA] tracking-[0.2em]">正在同步全市场行情...</p>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-[var(--color-text-muted)] mb-4">
                  {marketTab === 'WATCH' 
                    ? '暂无自选股，快去添加一些关注的股票吧！' 
                    : '未找到匹配的股票'}
                </div>
                {marketTab === 'WATCH' && (
                  <button 
                    onClick={() => setMarketTab('CN')}
                    className="px-4 py-2 bg-[#00D4AA] text-[#0A1628] rounded-xl text-sm font-black"
                  >
                    去添加自选
                  </button>
                )}
              </div>
            ) : (
              filteredStocks.map((stock: Stock) => (
                <div 
                  key={`${stock.symbol}-${marketTab}`} 
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
                  <div className="col-span-3 text-right flex justify-end items-center gap-2">
                    <span className={`inline-block px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-black min-w-[68px] text-center ${
                      stock.changePercent >= 0 ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : 'bg-[#FF6B6B]/20 text-[#FF6B6B]'
                    }`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                    <button 
                      onClick={(e) => toggleWatchlist(stock, e)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        watchlistSymbols.has(stock.symbol) 
                          ? 'bg-[#FF6B6B]/20 text-[#FF6B6B]' 
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[#00D4AA]/20 hover:text-[#00D4AA]'
                      }`}
                    >
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill={watchlistSymbols.has(stock.symbol) ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
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
