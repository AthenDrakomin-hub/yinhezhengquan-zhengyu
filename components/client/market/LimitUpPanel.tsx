/**
 * 涨停个股展示面板
 * 用于首页展示当日涨停股票
 * 
 * 优化：移除自动刷新，减少API请求
 */
import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLimitUpList, LimitUpData } from '../../../services/limitUpService';

const LimitUpPanel: React.FC = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<LimitUpData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // getLimitUpList 会优先从东方财富API获取，失败则使用模拟数据
      const data = await getLimitUpList();
      // 只筛选涨停的股票
      const limitUpStocks = data.filter(s => s.isLimitUp);
      setStocks(limitUpStocks.slice(0, 8)); // 最多显示8只
    } catch (error) {
      // 静默失败
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 移除自动刷新定时器
  }, []);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    fetchData();
  };

  // 格式化价格
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // 格式化成交量
  const formatVolume = (volume: number) => {
    if (volume >= 100000000) {
      return `${(volume / 100000000).toFixed(2)}亿`;
    } else if (volume >= 10000) {
      return `${(volume / 10000).toFixed(2)}万`;
    }
    return volume.toString();
  };

  // 获取股票类型标签
  const getStockTypeTag = (stock: LimitUpData) => {
    if (stock.stockType === 'ST') {
      return <span className="text-[10px] px-1 py-0.5 bg-red-100 text-red-600 rounded">ST</span>;
    }
    if (stock.stockType === 'GEM') {
      return <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-600 rounded">创业板</span>;
    }
    if (stock.stockType === 'STAR') {
      return <span className="text-[10px] px-1 py-0.5 bg-purple-100 text-purple-600 rounded">科创板</span>;
    }
    return null;
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm h-full flex flex-col">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex justify-between items-center bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">涨停个股</h3>
          <span className="text-xs text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
            {stocks.length}只
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-md hover:bg-[var(--color-bg)] transition-colors"
          title="刷新"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-muted)] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[var(--color-text-muted)] text-sm">
            加载中...
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--color-text-muted)]">
            <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">暂无涨停个股</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stocks.map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => navigate(`/client/trade?symbol=${stock.symbol}`)}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg)] hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm text-[var(--color-text-primary)]">{stock.name}</span>
                      {getStockTypeTag(stock)}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">{stock.symbol}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-500">
                    {formatPrice(stock.currentPrice)}
                  </div>
                  <div className="text-xs text-red-500">
                    +{formatPrice(Math.abs(stock.change))} (+{stock.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 查看更多 */}
      {stocks.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--color-border)]">
          <button
            onClick={() => navigate('/client/market?tab=limitup')}
            className="w-full flex items-center justify-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors"
          >
            查看更多涨停股
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LimitUpPanel;
