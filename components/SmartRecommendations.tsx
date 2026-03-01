/**
 * 智能推荐组件
 * 基于用户行为和风险偏好推荐股票
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { recommendationService } from '@/services/optimizationService';
import { supabase } from '@/lib/supabase';

interface Recommendation {
  id: string;
  symbol: string;
  reason: string;
  score: number;
  metadata?: any;
}

export const SmartRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const result = await recommendationService.getRecommendations(user.id);
      setRecommendations(result);
    } catch (error) {
      console.error('加载推荐失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (symbol: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      await recommendationService.logUserBehavior(
        user.id,
        'VIEW_RECOMMENDATION',
        symbol
      );
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-48" />;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        为您推荐
      </h3>

      <div className="space-y-2">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            onClick={() => handleClick(rec.symbol)}
            className="bg-white p-3 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{rec.symbol}</div>
                <div className="text-sm text-gray-600 mt-1">{rec.reason}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-purple-600">
                  {(rec.score * 100).toFixed(0)}分
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无推荐，继续交易以获得个性化推荐
        </div>
      )}
    </div>
  );
};
