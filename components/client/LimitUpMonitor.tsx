/**
 * 涨停板监控组件
 * 实时监控涨停板股票
 * 
 * 优化：默认关闭自动刷新，减少API请求
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { getLimitUpList } from '../../services/limitUpService';

interface LimitUpData {
  symbol: string;
  name: string;
  market: string;
  stockType: string;
  currentPrice: number;
  preClose: number;
  limitUpPrice: number;
  limitDownPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  buyOneVolume: number;
  buyOnePrice: number;
  isLimitUp: boolean;
  timestamp: string;
}

interface Props {
  symbols?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number; // 毫秒
}

const LimitUpMonitor: React.FC<Props> = ({
  symbols,
  autoRefresh = false, // 默认关闭自动刷新
  refreshInterval = 60000, // 默认60秒刷新
}) => {
  const [stocks, setStocks] = useState<LimitUpData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getLimitUpList();
      setStocks(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [symbols]);

  // 手动刷新
  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    loadData();
  };

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自动刷新（默认关闭）
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // 格式化数字
  const formatNumber = (num: number, decimals = 2): string => {
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // 格式化成交量
  const formatVolume = (volume: number): string => {
    if (volume >= 100000000) {
      return `${(volume / 100000000).toFixed(2)}亿`;
    } else if (volume >= 10000) {
      return `${(volume / 10000).toFixed(2)}万`;
    }
    return volume.toString();
  };

  // 获取股票类型颜色
  const getStockTypeColor = (stockType: string): string => {
    switch (stockType) {
      case 'ST':
        return 'text-red-600 bg-red-50';
      case 'GEM':
        return 'text-[var(--color-secondary)] bg-[var(--color-secondary-light)]';
      case 'STAR':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 获取股票类型名称
  const getStockTypeName = (stockType: string): string => {
    switch (stockType) {
      case 'ST':
        return 'ST';
      case 'GEM':
        return '创业板';
      case 'STAR':
        return '科创板';
      default:
        return '主板';
    }
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg shadow-lg overflow-hidden">
      {/* 标题栏 */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">涨停板监控</h2>
              <p className="text-sm text-red-100">
                {stocks.length} 只涨停股票
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {lastRefresh && (
              <div className="flex items-center space-x-2 text-white text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  最后更新: {lastRefresh.toLocaleTimeString('zh-CN')}
                </span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 bg-[var(--color-surface)]/20 hover:bg-[var(--color-surface)]/30 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-6">
        {loading && stocks.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>加载中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6" />
              <span>{error}</span>
            </div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>当前没有涨停股票</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">股票代码</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">股票类型</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">当前价格</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">涨跌幅</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">涨停价</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">成交量</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">成交额</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, index) => (
                  <tr
                    key={stock.symbol}
                    className={`border-b border-gray-100 hover:bg-[var(--color-surface-hover)] transition-colors ${
                      index === 0 ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-gray-900">
                          {stock.symbol}
                        </span>
                        {index === 0 && (
                          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                            龙头
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStockTypeColor(
                          stock.stockType
                        )}`}
                      >
                        {getStockTypeName(stock.stockType)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-semibold text-gray-900">
                        {formatNumber(stock.currentPrice)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-red-600">
                        +{formatNumber(stock.changePercent)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-gray-600">
                        {formatNumber(stock.limitUpPrice)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-gray-600">
                        {formatVolume(stock.volume)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-gray-600">
                        {formatVolume(stock.turnover)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-500">
                        {stock.timestamp}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LimitUpMonitor;
