/**
 * 热门股票组件 - 银河证券风格
 * 使用 Redis 缓存的行情服务
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { marketApi } from '@/services/marketApi';

interface HotStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const PAGE_SIZE = 5;

// 热门股票代码列表
const HOT_STOCK_SYMBOLS = [
  '600519', '000858', '601318', '000333', '002415',
  '300750', '002594', '600036', '601012', '600887',
  '601888', '002230', '600276', '000002', '002714',
];

export const HotStocksPanel: React.FC = () => {
  const navigate = useNavigate();
  const [hotStocks, setHotStocks] = useState<HotStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadHotStocks();
  }, []);

  const loadHotStocks = async () => {
    try {
      setLoading(true);
      // 使用代理接口获取行情（有 Redis 缓存）
      const stocks = await marketApi.getBatchStocks(HOT_STOCK_SYMBOLS, 'CN');
      setHotStocks(stocks.map(s => ({
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        change: s.change,
        changePercent: s.changePercent,
      })));
    } catch (error) {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  // 计算分页数据
  const totalPages = Math.ceil(hotStocks.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const currentStocks = hotStocks.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (loading) {
    return <div className="animate-pulse bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] h-64" />;
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">热门股票</h3>
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">实时行情</span>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {currentStocks.map((stock, index) => {
          const isUp = stock.changePercent >= 0;
          const rank = startIndex + index + 1;
          return (
            <div
              key={stock.symbol}
              onClick={() => navigate(`/client/trade?symbol=${stock.symbol}`)}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                  rank <= 3 ? 'bg-[var(--color-positive)] text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                }`}>
                  {rank}
                </div>
                <div>
                  <div className="font-medium text-sm text-[var(--color-text-primary)]">{stock.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{stock.symbol}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1 text-xs font-medium ${isUp ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                </div>
                
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  ¥{stock.price.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center justify-between">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-1 rounded hover:bg-[var(--color-bg)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-1 rounded hover:bg-[var(--color-bg)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
