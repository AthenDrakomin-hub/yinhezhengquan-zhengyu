/**
 * 批量IPO申购组件
 * 支持一键申购多只新股
 */

import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, XCircle, Loader } from 'lucide-react';
import { batchService, recommendationService } from '@/services/optimizationService';
import { supabase } from '@/lib/supabase';

interface IPOStock {
  symbol: string;
  name: string;
  issue_price: number;
  max_apply_quantity: number;
  status: string;
}

export const BatchIPOPanel: React.FC = () => {
  const [ipos, setIpos] = useState<IPOStock[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [batchStatus, setBatchStatus] = useState<any>(null);

  useEffect(() => {
    loadIPOs();
  }, []);

  const loadIPOs = async () => {
    const { data } = await supabase
      .from('ipo_stocks')
      .select('*')
      .eq('status', 'ONGOING')
      .order('apply_start_date', { ascending: true });

    if (data) setIpos(data);
  };

  const toggleSelect = (symbol: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelected(newSelected);
  };

  const handleBatchApply = async () => {
    if (selected.size === 0) return;

    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('未登录');

      // 构建批量订单
      const orders = ipos
        .filter(ipo => selected.has(ipo.symbol))
        .map(ipo => ({
          symbol: ipo.symbol,
          trade_type: 'IPO',
          direction: 'BUY' as const,
          quantity: ipo.max_apply_quantity,
          price: ipo.issue_price,
        }));

      // 创建批量订单
      const batch = await batchService.createBatchOrders(user.id, 'IPO_BATCH', orders);

      // 执行批量订单
      const result = await batchService.processBatchOrders(batch.id, user.id);

      setBatchStatus(result);

      // 记录用户行为
      await recommendationService.logUserBehavior(
        user.id,
        'BATCH_IPO_APPLY',
        undefined,
        { count: selected.size }
      );

      // 刷新列表
      await loadIPOs();
      setSelected(new Set());
    } catch (error: any) {
      console.error('批量申购失败:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          批量IPO申购
        </h2>
        <button
          onClick={handleBatchApply}
          disabled={loading || selected.size === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              处理中...
            </>
          ) : (
            <>一键申购 ({selected.size})</>
          )}
        </button>
      </div>

      {batchStatus && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>成功: {batchStatus.success_count}</span>
            <XCircle className="w-4 h-4 text-red-600 ml-4" />
            <span>失败: {batchStatus.failed_count}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {ipos.map(ipo => (
          <div
            key={ipo.symbol}
            onClick={() => toggleSelect(ipo.symbol)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selected.has(ipo.symbol)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{ipo.name}</div>
                <div className="text-sm text-gray-500">{ipo.symbol}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">¥{ipo.issue_price.toFixed(2)}</div>
                <div className="text-sm text-gray-500">
                  最多 {ipo.max_apply_quantity} 股
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ipos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无可申购的新股
        </div>
      )}
    </div>
  );
};
