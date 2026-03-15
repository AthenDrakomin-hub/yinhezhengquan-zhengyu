/**
 * 撤单页面
 * 撤销尚未成交的委托单
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { tradeService } from '../../../services/tradeService';

interface PendingOrder {
  id: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  filledQuantity: number;
  status: 'PENDING' | 'PARTIAL';
  createdAt: string;
  expireDate?: string;
}

const CancelOrdersView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // 加载待成交委托
  const loadPendingOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 从trades表获取待成交委托
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['PENDING', 'PARTIAL'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const pendingOrders = (data || []).map((order: any) => ({
        id: order.id,
        symbol: order.symbol || order.stock_code,
        name: order.name || order.stock_name || '未知',
        type: order.type || order.trade_type || 'BUY',
        price: Number(order.price),
        quantity: Number(order.quantity),
        filledQuantity: Number(order.filled_quantity || 0),
        status: (order.status === 'PARTIAL' ? 'PARTIAL' : 'PENDING') as 'PENDING' | 'PARTIAL',
        createdAt: order.created_at || order.createdAt,
        expireDate: order.expire_date
      }));

      setOrders(pendingOrders);
    } catch (error) {
      console.error('加载委托失败:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPendingOrders();
  }, [loadPendingOrders]);

  // 撤销单个订单
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('确定要撤销该委托吗？')) return;

    try {
      setCancelling(orderId);
      const result = await tradeService.cancelTradeOrder(orderId);
      
      if (result && result.success) {
        const refundMsg = result.refundAmount ? `，退款金额：¥${result.refundAmount.toFixed(2)}` : '';
        alert(`撤单成功${refundMsg}`);
      } else {
        alert('撤单成功');
      }
      
      // 刷新列表
      loadPendingOrders();
    } catch (error: any) {
      alert(`撤单失败: ${error.message || '请稍后重试'}`);
    } finally {
      setCancelling(null);
    }
  };

  // 批量撤单
  const handleBatchCancel = async () => {
    if (selectedOrders.size === 0) {
      alert('请先选择要撤销的委托');
      return;
    }

    if (!confirm(`确定要撤销选中的 ${selectedOrders.size} 个委托吗？`)) return;

    try {
      setCancelling('batch');
      let successCount = 0;
      let failCount = 0;

      for (const orderId of selectedOrders) {
        try {
          await tradeService.cancelTradeOrder(orderId);
          successCount++;
        } catch {
          failCount++;
        }
      }

      alert(`批量撤单完成：成功 ${successCount} 个，失败 ${failCount} 个`);
      setSelectedOrders(new Set());
      loadPendingOrders();
    } finally {
      setCancelling(null);
    }
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  // 切换单个选择
  const toggleSelect = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
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
        <h1 className="text-white text-lg font-semibold flex-1">撤单</h1>
        {orders.length > 0 && (
          <button
            onClick={handleSelectAll}
            className="text-white text-sm"
          >
            {selectedOrders.size === orders.length ? '取消全选' : '全选'}
          </button>
        )}
      </div>

      {/* 操作栏 */}
      {orders.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-[#F0F0F0]">
          <span className="text-sm text-[#666666]">
            已选择 {selectedOrders.size} 个委托
          </span>
          <button
            onClick={handleBatchCancel}
            disabled={selectedOrders.size === 0 || cancelling === 'batch'}
            className="px-4 py-1.5 bg-[#F97316] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {cancelling === 'batch' ? '撤单中...' : '批量撤单'}
          </button>
        </div>
      )}

      {/* 委托列表 */}
      <div className="px-4 mt-3 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC]"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#999999]">
            <svg className="w-16 h-16 mb-4 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>暂无可撤销的委托</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* 选择框 */}
                  <button
                    onClick={() => toggleSelect(order.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-1 ${
                      selectedOrders.has(order.id)
                        ? 'bg-[#0066CC] border-[#0066CC]'
                        : 'border-[#CCCCCC]'
                    }`}
                  >
                    {selectedOrders.has(order.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            order.type === 'BUY' 
                              ? 'bg-[#FFE5E5] text-[#E63946]' 
                              : 'bg-[#E5EDFF] text-[#3B82F6]'
                          }`}>
                            {order.type === 'BUY' ? '买入' : '卖出'}
                          </span>
                          <span className="font-semibold text-[#333333]">{order.name}</span>
                          <span className="text-xs text-[#999999]">{order.symbol}</span>
                        </div>
                        {order.status === 'PARTIAL' && (
                          <span className="text-xs text-[#F97316] mt-1 inline-block">部分成交</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancelling === order.id}
                        className="px-3 py-1 bg-[#F97316] text-white rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {cancelling === order.id ? '撤单中' : '撤单'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-2 border-t border-[#F0F0F0]">
                      <div>
                        <p className="text-xs text-[#999999]">委托价格</p>
                        <p className="text-sm text-[#333333]">¥{order.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999999]">委托数量</p>
                        <p className="text-sm text-[#333333]">{order.quantity}股</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999999]">已成交</p>
                        <p className="text-sm text-[#333333]">{order.filledQuantity}股</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999999]">委托金额</p>
                        <p className="text-sm text-[#333333]">¥{(order.price * order.quantity).toFixed(2)}</p>
                      </div>
                    </div>

                    <p className="text-xs text-[#999999] mt-2">
                      委托时间: {new Date(order.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CancelOrdersView;
