/**
 * 热门股票组件
 * 展示交易热度最高的股票
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Activity } from 'lucide-react';
import { hotStocksService } from '@/services/optimizationService';

interface HotStock {
  symbol: string;
  trade_count: number;
  total_volume: number;
  unique_traders: number;
  avg_price: number;
}

export const HotStocksPanel: React.FC = () => {
  const [hotStocks, setHotStocks] = useState<HotStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHotStocks();
    const interval = setInterval(loadHotStocks, 60000); // 每分钟刷新
    return () => clearInterval(interval);
  }, []);

  const loadHotStocks = async () => {
    try {
      const data = await hotStocksService.getHotStocks(10);
      setHotStocks(data || []);
    } catch (error) {
      console.error('加载热门股票失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-64" />;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-red-500" />
        热门股票 (24小时)
      </h3>

      <div className="space-y-2">
        {hotStocks.map((stock, index) => (
          <div
            key={stock.symbol}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{stock.symbol}</div>
                <div className="text-xs text-gray-500">
                  ¥{stock.avg_price?.toFixed(2) || '-'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Activity className="w-4 h-4" />
                <span>{stock.trade_count}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{stock.unique_traders}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hotStocks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无交易数据
        </div>
      )}
    </div>
  );
};
