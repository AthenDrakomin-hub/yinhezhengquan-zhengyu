/**
 * 持仓页面
 * 显示用户当前持有的股票、基金等资产情况
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { marketApi } from '../../../services/marketApi';

interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  availableQuantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
  profitRate: number;
  dayChange: number;
  dayChangeRate: number;
}

const HoldingsView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'profit' | 'loss'>('all');

  // 加载持仓数据
  useEffect(() => {
    loadHoldings();
  }, [user]);

  const loadHoldings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 获取用户持仓
      const { data: positions, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (!positions || positions.length === 0) {
        setHoldings([]);
        return;
      }

      // 获取实时价格
      const symbols = positions.map(p => p.symbol || p.stock_code).filter(Boolean);
      let stockPrices: Record<string, { price: number; change: number; changeRate: number }> = {};
      
      if (symbols.length > 0) {
        try {
          const cnSymbols = symbols.filter(s => s.length === 6);
          const hkSymbols = symbols.filter(s => s.length === 5);
          
          if (cnSymbols.length > 0) {
            const cnStocks = await marketApi.getBatchStocks(cnSymbols, 'CN');
            cnStocks.forEach((s: any) => {
              stockPrices[s.symbol] = {
                price: s.price,
                change: s.change || 0,
                changeRate: s.changePercent || 0
              };
            });
          }
          
          if (hkSymbols.length > 0) {
            const hkStocks = await marketApi.getBatchStocks(hkSymbols, 'HK');
            hkStocks.forEach((s: any) => {
              stockPrices[s.symbol] = {
                price: s.price,
                change: s.change || 0,
                changeRate: s.changePercent || 0
              };
            });
          }
        } catch (e) {
          console.warn('获取实时价格失败');
        }
      }

      // 构建持仓数据
      const holdingsData: Holding[] = positions.map(p => {
        const symbol = p.symbol || p.stock_code;
        const stockPrice = stockPrices[symbol] || { price: p.current_price || p.average_price, change: 0, changeRate: 0 };
        const avgPrice = Number(p.average_price);
        const quantity = Number(p.quantity);
        const availableQty = Number(p.available_quantity || p.quantity);
        const currentPrice = stockPrice.price;
        const marketValue = currentPrice * quantity;
        const cost = avgPrice * quantity;
        const profit = marketValue - cost;
        const profitRate = cost > 0 ? (profit / cost) * 100 : 0;

        return {
          symbol,
          name: p.name || p.stock_name || '未知',
          quantity,
          availableQuantity: availableQty,
          averagePrice: avgPrice,
          currentPrice,
          marketValue,
          profit,
          profitRate,
          dayChange: stockPrice.change * quantity,
          dayChangeRate: stockPrice.changeRate
        };
      });

      setHoldings(holdingsData);
    } catch (error) {
      console.error('加载持仓失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算汇总数据
  const summary = useMemo(() => {
    const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalProfit = holdings.reduce((sum, h) => sum + h.profit, 0);
    const totalCost = totalMarketValue - totalProfit;
    const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const todayPnL = holdings.reduce((sum, h) => sum + h.dayChange, 0);

    return {
      totalMarketValue,
      totalProfit,
      totalProfitRate,
      todayPnL
    };
  }, [holdings]);

  // 筛选持仓
  const filteredHoldings = useMemo(() => {
    switch (filter) {
      case 'profit':
        return holdings.filter(h => h.profit > 0);
      case 'loss':
        return holdings.filter(h => h.profit < 0);
      default:
        return holdings;
    }
  }, [holdings, filter]);

  // 卖出操作
  const handleSell = (holding: Holding) => {
    navigate('/client/trade', {
      state: {
        tradeType: 'SELL',
        stock: {
          symbol: holding.symbol,
          name: holding.name,
          price: holding.currentPrice
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <div className="bg-[#0066CC] px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-semibold flex-1">持仓查询</h1>
      </div>

      {/* 持仓汇总 */}
      <div className="bg-gradient-to-br from-[#0066CC] to-[#004C99] mx-4 mt-4 rounded-xl p-4 text-white">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/70 text-xs mb-1">持仓市值</p>
            <p className="text-xl font-bold">¥{summary.totalMarketValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs mb-1">持仓盈亏</p>
            <p className={`text-xl font-bold ${summary.totalProfit >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
              {summary.totalProfit >= 0 ? '+' : ''}{summary.totalProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-white/70 text-xs mb-1">盈亏比例</p>
            <p className={`text-lg font-semibold ${summary.totalProfitRate >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
              {summary.totalProfitRate >= 0 ? '+' : ''}{summary.totalProfitRate.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-white/70 text-xs mb-1">今日盈亏</p>
            <p className={`text-lg font-semibold ${summary.todayPnL >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
              {summary.todayPnL >= 0 ? '+' : ''}{summary.todayPnL.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-2 px-4 mt-4">
        {[
          { key: 'all', label: '全部' },
          { key: 'profit', label: '盈利' },
          { key: 'loss', label: '亏损' }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`px-4 py-1.5 rounded-full text-sm ${
              filter === item.key
                ? 'bg-[#0066CC] text-white'
                : 'bg-white text-[#666666]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 持仓列表 */}
      <div className="px-4 mt-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC]"></div>
          </div>
        ) : filteredHoldings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#999999]">
            <svg className="w-16 h-16 mb-4 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p>暂无持仓数据</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHoldings.map(holding => (
              <div key={holding.symbol} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#333333]">{holding.name}</span>
                      <span className="text-xs text-[#999999]">{holding.symbol}</span>
                    </div>
                    <p className="text-xs text-[#999999] mt-1">
                      持仓 {holding.quantity}股 | 可用 {holding.availableQuantity}股
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#333333]">{holding.currentPrice.toFixed(2)}</p>
                    <p className={`text-xs ${holding.dayChangeRate >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                      {holding.dayChangeRate >= 0 ? '+' : ''}{holding.dayChangeRate.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-t border-[#F0F0F0]">
                  <div>
                    <p className="text-xs text-[#999999]">成本价</p>
                    <p className="text-sm text-[#333333]">{holding.averagePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">市值</p>
                    <p className="text-sm text-[#333333]">{holding.marketValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">盈亏</p>
                    <p className={`text-sm font-semibold ${holding.profit >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                      {holding.profit >= 0 ? '+' : ''}{holding.profit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      <span className="text-xs ml-1">({holding.profitRate >= 0 ? '+' : ''}{holding.profitRate.toFixed(2)}%)</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleSell(holding)}
                    className="flex-1 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-medium"
                  >
                    卖出
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HoldingsView;
