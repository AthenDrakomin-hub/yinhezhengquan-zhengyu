/**
 * 持仓上下文
 * 管理用户持仓数据，支持交易后实时更新
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { marketApi } from '../services/marketApi';

// 持仓项类型
export interface PositionItem {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  availableQuantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
  profitRate: number;
  category?: 'STOCK' | 'FUND' | 'BOND';
  market?: string;
}

// 上下文类型
interface PositionContextType {
  positions: PositionItem[];
  loading: boolean;
  totalAssets: number;
  totalProfit: number;
  totalProfitRate: number;
  refreshPositions: () => Promise<void>;
  updatePosition: (symbol: string, updates: Partial<PositionItem>) => void;
  addPosition: (position: PositionItem) => void;
  removePosition: (symbol: string) => void;
}

const PositionContext = createContext<PositionContextType>({
  positions: [],
  loading: true,
  totalAssets: 0,
  totalProfit: 0,
  totalProfitRate: 0,
  refreshPositions: async () => {},
  updatePosition: () => {},
  addPosition: () => {},
  removePosition: () => {},
});

export const usePosition = () => useContext(PositionContext);

// Provider组件
export const PositionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载持仓数据
  const refreshPositions = useCallback(async () => {
    if (!user) {
      setPositions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 获取持仓数据
      const { data: positionsData, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('获取持仓失败:', error);
        setPositions([]);
        return;
      }

      if (!positionsData || positionsData.length === 0) {
        setPositions([]);
        return;
      }

      // 获取实时价格
      const symbols = positionsData.map(p => p.symbol || p.stock_code).filter(Boolean);
      const stockPrices: Record<string, number> = {};

      if (symbols.length > 0) {
        try {
          const cnSymbols = symbols.filter(s => s.length === 6);
          const hkSymbols = symbols.filter(s => s.length === 5);

          if (cnSymbols.length > 0) {
            const cnStocks = await marketApi.getBatchStocks(cnSymbols, 'CN');
            cnStocks.forEach((s: any) => {
              stockPrices[s.symbol] = s.price;
            });
          }

          if (hkSymbols.length > 0) {
            const hkStocks = await marketApi.getBatchStocks(hkSymbols, 'HK');
            hkStocks.forEach((s: any) => {
              stockPrices[s.symbol] = s.price;
            });
          }
        } catch (e) {
          console.warn('获取实时价格失败，使用缓存价格');
        }
      }

      // 构建持仓列表
      const positionItems: PositionItem[] = positionsData.map(p => {
        const symbol = p.symbol || p.stock_code;
        const currentPrice = stockPrices[symbol] || Number(p.current_price || p.average_price);
        const avgPrice = Number(p.average_price);
        const quantity = Number(p.quantity);
        const marketValue = currentPrice * quantity;
        const cost = avgPrice * quantity;
        const profit = marketValue - cost;
        const profitRate = cost > 0 ? (profit / cost) * 100 : 0;

        return {
          id: p.id,
          symbol,
          name: p.name || p.stock_name || '',
          quantity,
          availableQuantity: Number(p.available_quantity) || quantity,
          averagePrice: avgPrice,
          currentPrice,
          marketValue,
          profit,
          profitRate,
          category: 'STOCK' as const,
          market: symbol.length === 5 ? 'HK' : 'CN',
        };
      });

      setPositions(positionItems);
    } catch (error) {
      console.error('加载持仓数据失败:', error);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 初始加载
  useEffect(() => {
    refreshPositions();
  }, [refreshPositions]);

  // 定时刷新价格（每30秒）
  useEffect(() => {
    if (!user || positions.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const symbols = positions.map(p => p.symbol);
        const stockPrices: Record<string, number> = {};

        const cnSymbols = symbols.filter(s => s.length === 6);
        const hkSymbols = symbols.filter(s => s.length === 5);

        if (cnSymbols.length > 0) {
          const cnStocks = await marketApi.getBatchStocks(cnSymbols, 'CN');
          cnStocks.forEach((s: any) => {
            stockPrices[s.symbol] = s.price;
          });
        }

        if (hkSymbols.length > 0) {
          const hkStocks = await marketApi.getBatchStocks(hkSymbols, 'HK');
          hkStocks.forEach((s: any) => {
            stockPrices[s.symbol] = s.price;
          });
        }

        // 更新价格
        setPositions(prev => prev.map(p => {
          const newPrice = stockPrices[p.symbol];
          if (newPrice && newPrice !== p.currentPrice) {
            const marketValue = newPrice * p.quantity;
            const cost = p.averagePrice * p.quantity;
            const profit = marketValue - cost;
            const profitRate = cost > 0 ? (profit / cost) * 100 : 0;
            return {
              ...p,
              currentPrice: newPrice,
              marketValue,
              profit,
              profitRate,
            };
          }
          return p;
        }));
      } catch (e) {
        console.warn('刷新价格失败');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, positions]);

  // 更新单个持仓
  const updatePosition = useCallback((symbol: string, updates: Partial<PositionItem>) => {
    setPositions(prev => prev.map(p => 
      p.symbol === symbol ? { ...p, ...updates } : p
    ));
  }, []);

  // 添加持仓
  const addPosition = useCallback((position: PositionItem) => {
    setPositions(prev => {
      const existing = prev.find(p => p.symbol === position.symbol);
      if (existing) {
        // 合并持仓
        const newQuantity = existing.quantity + position.quantity;
        const newCost = existing.averagePrice * existing.quantity + position.averagePrice * position.quantity;
        const newAvgPrice = newCost / newQuantity;
        return prev.map(p => 
          p.symbol === position.symbol 
            ? { 
                ...p, 
                quantity: newQuantity,
                availableQuantity: existing.availableQuantity + position.quantity,
                averagePrice: newAvgPrice,
              }
            : p
        );
      }
      return [...prev, position];
    });
  }, []);

  // 移除持仓
  const removePosition = useCallback((symbol: string) => {
    setPositions(prev => prev.filter(p => p.symbol !== symbol));
  }, []);

  // 计算汇总数据
  const totalAssets = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.averagePrice * p.quantity, 0);
  const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <PositionContext.Provider value={{
      positions,
      loading,
      totalAssets,
      totalProfit,
      totalProfitRate,
      refreshPositions,
      updatePosition,
      addPosition,
      removePosition,
    }}>
      {children}
    </PositionContext.Provider>
  );
};

export default PositionContext;
