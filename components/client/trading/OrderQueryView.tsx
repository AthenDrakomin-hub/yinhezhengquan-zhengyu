/**
 * 委托查询页面
 * 查看已提交的委托单状态
 * 支持实时推送更新
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useOrderSubscription, OrderChangeEvent } from '../../../hooks/useOrderSubscription';

interface Order {
  id: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  filledQuantity: number;
  status: 'PENDING' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  createdAt: string;
  filledAt?: string;
}

const OrderQueryView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'filled' | 'cancelled'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  // 实时订阅订单状态变化
  const { status: subscriptionStatus, isConnected } = useOrderSubscription({
    enableOrders: true,
    enableExecutions: true,
    enableNotifications: true,
    onOrderChange: (event: OrderChangeEvent) => {
      console.log('[OrderQuery] 收到订单变化:', event);
      
      // 刷新订单列表
      loadOrders();
      
      // 显示提示
      const { new: newRecord, eventType } = event;
      if (eventType === 'INSERT') {
        // 新订单
        showToast(`新订单已提交: ${newRecord.stock_name}`);
      } else if (eventType === 'UPDATE') {
        // 状态变化
        const statusText = getStatusDisplay(newRecord.status).text;
        showToast(`${newRecord.stock_name} ${statusText}`);
      }
    }
  });

  // 显示提示（简单实现）
  const showToast = (message: string) => {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-[#333333] text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 3秒后移除
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // 加载委托记录
  const loadOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 计算日期范围
      const now = new Date();
      let startDate: Date;
      switch (dateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      // 从trades表获取委托记录
      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        const statusMap: Record<string, string[]> = {
          'pending': ['PENDING', 'PARTIAL', 'MATCHING', 'SUBMITTED'],
          'filled': ['FILLED', 'SUCCESS'],
          'cancelled': ['CANCELLED', 'REJECTED']
        };
        query = query.in('status', statusMap[filter] || []);
      }

      const { data, error } = await query;

      if (error) throw error;

      const orderList = (data || []).map((order: any) => ({
        id: order.id,
        symbol: order.symbol || order.stock_code,
        name: order.name || order.stock_name || '未知',
        type: order.type || order.trade_type || 'BUY',
        price: Number(order.price),
        quantity: Number(order.quantity),
        filledQuantity: Number(order.filled_quantity || order.executed_quantity || 0),
        status: order.status?.toUpperCase() || 'PENDING',
        createdAt: order.created_at || order.createdAt,
        filledAt: order.filled_at || order.filledAt
      }));

      setOrders(orderList);
    } catch (error) {
      console.error('加载委托失败:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user, filter, dateRange]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; bgColor: string }> = {
      'PENDING': { text: '待成交', color: 'text-[#F97316]', bgColor: 'bg-[#FFF3E5]' },
      'SUBMITTED': { text: '已提交', color: 'text-[#3B82F6]', bgColor: 'bg-[#E5F0FF]' },
      'MATCHING': { text: '撮合中', color: 'text-[#8B5CF6]', bgColor: 'bg-[#F3E8FF]' },
      'PARTIAL': { text: '部分成交', color: 'text-[#3B82F6]', bgColor: 'bg-[#E5F0FF]' },
      'FILLED': { text: '已成交', color: 'text-[#22C55E]', bgColor: 'bg-[#E5F9EF]' },
      'SUCCESS': { text: '已成交', color: 'text-[#22C55E]', bgColor: 'bg-[#E5F9EF]' },
      'CANCELLED': { text: '已撤销', color: 'text-[#999999]', bgColor: 'bg-[#F5F5F5]' },
      'REJECTED': { text: '已拒绝', color: 'text-[#E63946]', bgColor: 'bg-[#FEE2E2]' }
    };
    return statusMap[status] || { text: status, color: 'text-[#333333]', bgColor: 'bg-[#F5F5F5]' };
  };

  // 统计数据
  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['PENDING', 'PARTIAL', 'MATCHING', 'SUBMITTED'].includes(o.status)).length,
    filled: orders.filter(o => ['FILLED', 'SUCCESS'].includes(o.status)).length,
    cancelled: orders.filter(o => ['CANCELLED', 'REJECTED'].includes(o.status)).length
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
        <h1 className="text-white text-lg font-semibold flex-1">委托查询</h1>
        {/* 实时连接状态 */}
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-[#22C55E] animate-pulse' : 
            subscriptionStatus === 'CONNECTING' ? 'bg-[#F97316] animate-pulse' : 
            'bg-[#999999]'
          }`} />
          <span className="text-white text-xs">
            {isConnected ? '实时' : subscriptionStatus === 'CONNECTING' ? '连接中' : '离线'}
          </span>
        </div>
      </div>

      {/* 日期筛选 */}
      <div className="bg-white px-4 py-3 flex gap-2 border-b border-[#F0F0F0]">
        {[
          { key: 'today', label: '今日' },
          { key: 'week', label: '近一周' },
          { key: 'month', label: '近一月' }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setDateRange(item.key as any)}
            className={`px-3 py-1 rounded-lg text-sm ${
              dateRange === item.key
                ? 'bg-[#0066CC] text-white'
                : 'bg-[#F5F5F5] text-[#666666]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 状态统计 */}
      <div className="bg-white px-4 py-3 grid grid-cols-4 gap-2 border-b border-[#F0F0F0]">
        <button
          onClick={() => setFilter('all')}
          className={`text-center p-2 rounded-lg ${filter === 'all' ? 'bg-[#E5EDFF]' : ''}`}
        >
          <p className="text-lg font-bold text-[#333333]">{stats.total}</p>
          <p className="text-xs text-[#666666]">全部</p>
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`text-center p-2 rounded-lg ${filter === 'pending' ? 'bg-[#FFF3E5]' : ''}`}
        >
          <p className="text-lg font-bold text-[#F97316]">{stats.pending}</p>
          <p className="text-xs text-[#666666]">待成交</p>
        </button>
        <button
          onClick={() => setFilter('filled')}
          className={`text-center p-2 rounded-lg ${filter === 'filled' ? 'bg-[#E5F9EF]' : ''}`}
        >
          <p className="text-lg font-bold text-[#22C55E]">{stats.filled}</p>
          <p className="text-xs text-[#666666]">已成交</p>
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`text-center p-2 rounded-lg ${filter === 'cancelled' ? 'bg-[#F5F5F5]' : ''}`}
        >
          <p className="text-lg font-bold text-[#999999]">{stats.cancelled}</p>
          <p className="text-xs text-[#666666]">已撤销</p>
        </button>
      </div>

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
            <p>暂无委托记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const statusDisplay = getStatusDisplay(order.status);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  {/* 头部：股票信息 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#333333]">{order.symbol}</span>
                      <span className="text-sm text-[#666666]">{order.name}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                      {statusDisplay.text}
                    </span>
                  </div>

                  {/* 主体：委托信息 */}
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div>
                      <span className="text-[#999999]">委托类型</span>
                      <span className={`ml-2 ${order.type === 'BUY' ? 'text-[#E63946]' : 'text-[#00A86B]'}`}>
                        {order.type === 'BUY' ? '买入' : '卖出'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#999999]">委托价格</span>
                      <span className="ml-2 text-[#333333]">¥{order.price.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[#999999]">委托数量</span>
                      <span className="ml-2 text-[#333333]">{order.quantity}股</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#999999]">成交数量</span>
                      <span className="ml-2 text-[#333333]">{order.filledQuantity}股</span>
                    </div>
                  </div>

                  {/* 底部：时间 */}
                  <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex items-center justify-between text-xs text-[#999999]">
                    <span>委托时间: {new Date(order.createdAt).toLocaleString('zh-CN')}</span>
                    {order.filledAt && (
                      <span>成交时间: {new Date(order.filledAt).toLocaleString('zh-CN')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderQueryView;
