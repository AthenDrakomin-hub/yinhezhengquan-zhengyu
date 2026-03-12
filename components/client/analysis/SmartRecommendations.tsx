/**
 * 智能推荐组件 - 银河证券风格
 * 基于用户行为和风险偏好推荐股票
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { recommendationService } from '@/services/optimizationService';
import { frontendMarketService } from '@/services/frontendMarketService';
import { supabase } from '@/lib/supabase';

interface Recommendation {
  id: string;
  symbol: string;
  name?: string;
  reason: string;
  score: number;
  price?: number;
  change?: number;
  metadata?: any;
}

// 默认推荐股票代码（价格和涨跌从行情API获取）
const defaultRecommendSymbols = [
  { symbol: '600519', reason: '北向资金持续流入，机构持仓增加', score: 0.92 },
  { symbol: '000858', reason: '消费复苏预期，估值修复空间大', score: 0.88 },
  { symbol: '601318', reason: '保险业景气度回升，股息率高', score: 0.85 },
  { symbol: '300750', reason: '新能源赛道龙头，业绩超预期', score: 0.82 },
  { symbol: '000333', reason: '家电出口增长，盈利能力提升', score: 0.78 },
];

export const SmartRecommendations: React.FC = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      let recommendationsList: Recommendation[] = [];
      
      if (user) {
        const result = await recommendationService.getRecommendations(user.id);
        if (result && result.length > 0) {
          recommendationsList = result;
        }
      }
      
      // 如果没有个性化推荐，使用默认推荐并获取真实行情
      if (recommendationsList.length === 0) {
        // 获取默认推荐股票的真实行情
        const stockPromises = defaultRecommendSymbols.map(async (item) => {
          try {
            const stockData = await frontendMarketService.getRealtimeStock(item.symbol, 'CN');
            return {
              id: `rec-${item.symbol}`,
              symbol: item.symbol,
              name: stockData.name,
              reason: item.reason,
              score: item.score,
              price: stockData.price,
              change: stockData.changePercent,
            };
          } catch (e) {
            // 如果获取行情失败，返回基本信息
            return {
              id: `rec-${item.symbol}`,
              symbol: item.symbol,
              reason: item.reason,
              score: item.score,
            };
          }
        });
        
        recommendationsList = await Promise.all(stockPromises);
      } else {
        // 为个性化推荐获取真实行情
        const enrichedRecommendations = await Promise.all(
          recommendationsList.map(async (rec) => {
            if (!rec.price) {
              try {
                const stockData = await frontendMarketService.getRealtimeStock(rec.symbol, 'CN');
                return {
                  ...rec,
                  name: rec.name || stockData.name,
                  price: stockData.price,
                  change: stockData.changePercent,
                };
              } catch (e) {
                return rec;
              }
            }
            return rec;
          })
        );
        recommendationsList = enrichedRecommendations;
      }
      
      setRecommendations(recommendationsList);
    } catch (error) {
      console.error('加载推荐失败:', error);
      // 使用默认推荐（不获取行情，使用空数据）
      setRecommendations(defaultRecommendSymbols.map(item => ({
        id: `rec-${item.symbol}`,
        symbol: item.symbol,
        reason: item.reason,
        score: item.score,
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (symbol: string) => {
    // 导航到股票详情页
    navigate(`/client/stock/${symbol}`);
    
    // 记录用户行为
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await recommendationService.logUserBehavior(
          user.id,
          'VIEW_RECOMMENDATION',
          symbol
        );
      }
    } catch (error) {
      console.error('记录行为失败:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] h-48" />;
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">为您推荐</h3>
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">基于AI分析</span>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {recommendations.slice(0, 5).map((rec) => {
          const isUp = (rec.change || 0) >= 0;
          return (
            <div
              key={rec.id}
              onClick={() => handleClick(rec.symbol)}
              className="px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[var(--color-text-primary)]">{rec.symbol}</span>
                  {rec.name && (
                    <span className="text-xs text-[var(--color-text-muted)]">{rec.name}</span>
                  )}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1 truncate">{rec.reason}</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {rec.price && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">¥{rec.price.toFixed(2)}</div>
                    {rec.change !== undefined && (
                      <div className={`flex items-center gap-1 text-xs ${isUp ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isUp ? '+' : ''}{rec.change.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-1 rounded">
                  {(rec.score * 100).toFixed(0)}分
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
              </div>
            </div>
          );
        })}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
          暂无推荐，继续交易以获得个性化推荐
        </div>
      )}
    </div>
  );
};
