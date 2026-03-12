"use strict";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Stock } from '../../lib/types';
import StockIdentity from '../shared/StockIdentity';
import { getMarketList, getTotalStockCount } from '../../services/marketService';
import { userService } from '../../services/userService';

interface MarketViewProps {
  onSelectStock?: (symbol: string) => void;
}

const PAGE_SIZE = 10; // 每页显示数量

const MarketView: React.FC<MarketViewProps> = ({ onSelectStock }) => {
  const [marketTab, setMarketTab] = useState('CN');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set());
  const [watchlistCount, setWatchlistCount] = useState(0);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // 加载自选股符号集（抽取为独立函数，方便复用）
  const loadWatchlistSymbols = useCallback(async () => {
    try {
      const watchlistItems = await userService.getWatchlist();
      const symbols = new Set(watchlistItems.map(item => item.symbol));
      setWatchlistSymbols(symbols);
      setWatchlistCount(symbols.size);
      return symbols;
    } catch (error) {
      console.error('加载自选股符号失败:', error);
      return new Set();
    }
  }, []);

  // 初始化时加载自选股符号
  useEffect(() => {
    loadWatchlistSymbols();
  }, [loadWatchlistSymbols]);

  // 加载市场数据
  const loadMarketData = useCallback(async (page: number = 1) => {
    if (marketTab === 'WATCH') {
      // 加载自选股
      try {
        setLoading(true);
        const watchlistItems = await userService.getWatchlist();
        if (watchlistItems && watchlistItems.length > 0) {
          // 从自选股中获取实时行情数据
          const symbols = watchlistItems.map(item => item.symbol);
          const marketType = symbols.some(s => s.startsWith('00') || s.startsWith('60') || s.startsWith('30')) ? 'CN' : 'HK';
          const result = await getMarketList(marketType, page, PAGE_SIZE);
          
          // 处理返回结果（可能是数组或分页对象）
          const allStocks = Array.isArray(result) ? result : (result as any).stocks || [];
          const pagination = Array.isArray(result) ? null : (result as any).pagination;
          
          // 筛选出用户自选的股票
          const filteredWatchlistStocks = allStocks.filter((stock: Stock) => 
            watchlistItems.some(watchItem => watchItem.symbol === stock.symbol)
          );
          
          setStocks(filteredWatchlistStocks);
          setWatchlistCount(watchlistItems.length);
        } else {
          setStocks([]);
          setWatchlistCount(0);
        }
      } catch (error) {
        console.error('加载自选股数据失败:', error);
        setStocks([]);
        setWatchlistCount(0);
      } finally {
        setLoading(false);
      }
    } else if (marketTab === 'CN' || marketTab === 'HK') {
      try {
        setLoading(true);
        
        // 获取总数并计算总页数
        const total = getTotalStockCount(marketTab);
        setTotalCount(total);
        const pages = Math.ceil(total / PAGE_SIZE);
        setTotalPages(pages);
        
        const result = await getMarketList(marketTab, page, PAGE_SIZE);
        
        // 处理返回结果（可能是数组或分页对象）
        const stocksData = Array.isArray(result) ? result : (result as any).stocks || [];
        const pagination = Array.isArray(result) ? null : (result as any).pagination;
        
        if (stocksData && stocksData.length > 0) {
          setStocks(stocksData);
          if (pagination) {
            setHasMore(pagination.hasMore);
          } else {
            setHasMore(page < pages);
          }
        } else {
          console.warn(`获取${marketTab === 'CN' ? 'A股' : '港股'}行情数据失败，返回空数组`);
          setStocks([]);
          setHasMore(false);
        }
      } catch (error) {
        console.error('加载市场数据失败:', error);
        setStocks([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    }
  }, [marketTab]);

  // 切换市场时重置分页
  useEffect(() => {
    setCurrentPage(1);
  }, [marketTab]);

  useEffect(() => {
    loadMarketData(currentPage);
    // 每 30 秒刷新一次
    const timer = setInterval(() => loadMarketData(currentPage), 30000);
    return () => clearInterval(timer);
  }, [loadMarketData, currentPage]);

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
        
        // 更新本地状态
        const newSymbols = new Set(watchlistSymbols);
        newSymbols.delete(stock.symbol);
        setWatchlistSymbols(newSymbols);
        setWatchlistCount(newSymbols.size);
        
        // 如果当前是自选标签页，从列表中移除该股票
        if (marketTab === 'WATCH') {
          setStocks(prev => prev.filter(s => s.symbol !== stock.symbol));
        }
      } else {
        // 添加到自选股
        await userService.addToWatchlist(stock.symbol, stock.name);
        
        // 更新本地状态
        const newSymbols = new Set(watchlistSymbols);
        newSymbols.add(stock.symbol);
        setWatchlistSymbols(newSymbols);
        setWatchlistCount(newSymbols.size);
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
          <div className="absolute inset-y-0 left-4 flex items-center text-[var(--color-text-muted)] group-focus-within:text-[#DC2626] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="搜索全市场实时标的..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 bg-[var(--color-surface)] pl-11 pr-4 rounded-2xl border border-[var(--color-border)] text-[11px] font-black outline-none focus:border-[#DC2626]/50 transition-all"
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
                ? 'bg-[#DC2626] text-white border-transparent shadow-lg' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
            }`}
          >
            {tab.label}
            {tab.id === 'WATCH' && watchlistCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[#FF6B6B] text-white text-[7px] rounded-full">
                {watchlistCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="galaxy-card overflow-hidden">
          <div className="sticky top-0 z-10 grid grid-cols-12 p-4 border-b border-[var(--color-border)] text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest bg-[var(--nav-bg)] backdrop-blur-md">
            <div className="col-span-6 flex items-center gap-2">
              代码 / 名称
              <div className="w-1.5 h-1.5 bg-[#DC2626] rounded-full animate-pulse" />
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
                  <div className="col-span-6">
                    <StockIdentity 
                      symbol={stock.symbol} 
                      name={stock.name} 
                      logoUrl={stock.logoUrl} 
                      market={marketTab === 'HK' ? 'HK' : 'CN'}
                      showBoard={true}
                      size="sm"
                    />
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                      {stock.price ? stock.price.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className="col-span-3 text-right flex justify-end items-center gap-2">
                    <span className={`inline-block px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-black min-w-[68px] text-center ${
                      stock.changePercent >= 0 ? 'bg-[var(--color-positive)]/20 text-[var(--color-positive)]' : 'bg-[var(--color-negative)]/20 text-[var(--color-negative)]'
                    }`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                    <button 
                      onClick={(e) => toggleWatchlist(stock, e)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        watchlistSymbols.has(stock.symbol) 
                          ? 'bg-[var(--color-negative)]/20 text-[var(--color-negative)]' 
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-positive)]/20 hover:text-[var(--color-positive)]'
                      }`}
                      title={watchlistSymbols.has(stock.symbol) ? '从自选移除' : '添加到自选'}
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
          
          {/* 分页控件 - 仅在非自选股模式显示 */}
          {marketTab !== 'WATCH' && !loading && stocks.length > 0 && (
            <div className="sticky bottom-0 z-10 p-4 border-t border-[var(--color-border)] bg-[var(--nav-bg)] backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[var(--color-text-muted)]">
                  第 {currentPage} / {totalPages} 页，共 {totalCount} 只股票
                </div>
                <div className="flex items-center gap-2">
                  {/* 首页按钮 */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      currentPage === 1
                        ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-white'
                    }`}
                    title="首页"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                    </svg>
                  </button>
                  
                  {/* 上一页按钮 */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      currentPage === 1
                        ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-white'
                    }`}
                    title="上一页"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  
                  {/* 页码显示 */}
                  <div className="flex items-center gap-1">
                    {/* 显示页码按钮 */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === pageNum
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* 下一页按钮 */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      currentPage === totalPages
                        ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-white'
                    }`}
                    title="下一页"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                  
                  {/* 末页按钮 */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      currentPage === totalPages
                        ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-white'
                    }`}
                    title="末页"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketView;
