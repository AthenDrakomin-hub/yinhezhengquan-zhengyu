/**
 * 条件单管理 - 管理端
 * 管理员可以查看、监控和管理所有用户的条件单
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import Pagination from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 15;

interface ConditionalOrder {
  id: string;
  user_id: string;
  symbol: string;
  stock_name: string;
  order_type: 'TP_SL' | 'GRID' | 'PRICE_ALERT';
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED';
  stop_loss_price?: number;
  take_profit_price?: number;
  grid_upper_price?: number;
  grid_lower_price?: number;
  trigger_price?: number;
  quantity?: number;
  triggered_at?: string;
  triggered_price?: number;
  created_at: string;
  expires_at?: string;
  username?: string;
}

const AdminConditionalOrders: React.FC = () => {
  const [orders, setOrders] = useState<ConditionalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'TRIGGERED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<ConditionalOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('conditional_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'ALL') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // 获取所有唯一的 user_id
      const userIds = [...new Set((data || []).map(item => item.user_id))];
      
      // 批量查询用户信息
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        if (!profileError && profiles) {
          profiles.forEach(profile => {
            userMap[profile.id] = profile.username || '未知用户';
          });
        }
      }
      
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        username: userMap[item.user_id] || '未知用户'
      }));
      
      setOrders(formattedData);
    } catch (err) {
      console.error('获取条件单失败:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('确定要撤销该条件单吗？')) return;
    
    try {
      const { error } = await supabase
        .from('conditional_orders')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', orderId);
      
      if (error) throw error;
      
      await fetchOrders();
      setIsDetailOpen(false);
    } catch (err) {
      console.error('撤销失败:', err);
      alert('撤销失败');
    }
  };

  // 筛选
  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    return (
      order.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.stock_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 分页
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getOrderTypeText = (type: string) => {
    const types: Record<string, string> = {
      'TP_SL': '止盈止损',
      'GRID': '网格交易',
      'PRICE_ALERT': '价格预警'
    };
    return types[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'ACTIVE': 'bg-green-500/20 text-green-400 border-green-500/30',
      'TRIGGERED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'CANCELLED': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'EXPIRED': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'ACTIVE': '运行中',
      'TRIGGERED': '已触发',
      'CANCELLED': '已撤销',
      'EXPIRED': '已过期'
    };
    return texts[status] || status;
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">条件单管理</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">监控和管理所有用户的条件单</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-text-muted)]">
            运行中: <span className="text-green-400 font-bold">{orders.filter(o => o.status === 'ACTIVE').length}</span>
          </span>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <input
          type="text"
          placeholder="搜索股票代码、名称或用户..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'TRIGGERED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => { setFilter(status as any); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filter === status
                  ? 'bg-blue-500 text-[var(--color-text-primary)]'
                  : 'bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {status === 'ALL' ? '全部' : getStatusText(status)}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <ICONS.Info size={48} className="mx-auto mb-4 opacity-50" />
          <p>暂无条件单</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border)] cursor-pointer transition-all"
              onClick={() => { setSelectedOrder(order); setIsDetailOpen(true); }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <ICONS.Trade size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[var(--color-text-primary)] font-bold">{order.stock_name || order.symbol}</h3>
                      <span className="text-xs text-[var(--color-text-muted)] font-mono">{order.symbol}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {order.username} · {getOrderTypeText(order.order_type)}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
              
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]/50 flex justify-between text-xs">
                <div className="flex gap-6">
                  {order.order_type === 'TP_SL' && (
                    <>
                      {order.stop_loss_price && (
                        <span className="text-[var(--color-text-muted)]">止损: <span className="text-green-400 font-mono">{order.stop_loss_price}</span></span>
                      )}
                      {order.take_profit_price && (
                        <span className="text-[var(--color-text-muted)]">止盈: <span className="text-red-400 font-mono">{order.take_profit_price}</span></span>
                      )}
                    </>
                  )}
                  {order.order_type === 'GRID' && (
                    <span className="text-[var(--color-text-muted)]">
                      区间: <span className="text-blue-400 font-mono">{order.grid_lower_price} - {order.grid_upper_price}</span>
                    </span>
                  )}
                  {order.quantity && (
                    <span className="text-[var(--color-text-muted)]">数量: <span className="text-[var(--color-text-primary)] font-mono">{order.quantity}</span></span>
                  )}
                </div>
                <span className="text-[var(--color-text-muted)]">{formatTime(order.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* 详情模态框 */}
      <AnimatePresence>
        {isDetailOpen && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsDetailOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--color-bg)] rounded-2xl p-6 max-w-lg w-full border border-[var(--color-border)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">条件单详情</h2>
                <button onClick={() => setIsDetailOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  <ICONS.Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[var(--color-surface)] rounded-lg">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">用户</p>
                    <p className="text-[var(--color-text-primary)] font-bold">{selectedOrder.username}</p>
                  </div>
                  <div className="p-3 bg-[var(--color-surface)] rounded-lg">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">状态</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="p-3 bg-[var(--color-surface)] rounded-lg">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">类型</p>
                    <p className="text-[var(--color-text-primary)] font-bold">{getOrderTypeText(selectedOrder.order_type)}</p>
                  </div>
                  <div className="p-3 bg-[var(--color-surface)] rounded-lg">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">创建时间</p>
                    <p className="text-[var(--color-text-primary)] text-sm">{formatTime(selectedOrder.created_at)}</p>
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">触发条件</p>
                  <div className="space-y-2 text-sm">
                    {selectedOrder.order_type === 'TP_SL' && (
                      <>
                        {selectedOrder.stop_loss_price && (
                          <p className="text-[var(--color-text-secondary)]">止损价: <span className="text-green-400 font-mono">{selectedOrder.stop_loss_price}</span></p>
                        )}
                        {selectedOrder.take_profit_price && (
                          <p className="text-[var(--color-text-secondary)]">止盈价: <span className="text-red-400 font-mono">{selectedOrder.take_profit_price}</span></p>
                        )}
                      </>
                    )}
                    {selectedOrder.order_type === 'GRID' && (
                      <>
                        <p className="text-[var(--color-text-secondary)]">网格上限: <span className="text-red-400 font-mono">{selectedOrder.grid_upper_price}</span></p>
                        <p className="text-[var(--color-text-secondary)]">网格下限: <span className="text-green-400 font-mono">{selectedOrder.grid_lower_price}</span></p>
                      </>
                    )}
                    {selectedOrder.quantity && (
                      <p className="text-[var(--color-text-secondary)]">委托数量: <span className="text-[var(--color-text-primary)] font-mono">{selectedOrder.quantity}</span></p>
                    )}
                  </div>
                </div>

                {selectedOrder.triggered_at && (
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-blue-400 mb-2">触发信息</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">触发时间: {formatTime(selectedOrder.triggered_at)}</p>
                    {selectedOrder.triggered_price && (
                      <p className="text-sm text-[var(--color-text-secondary)]">触发价格: <span className="text-[var(--color-text-primary)] font-mono">{selectedOrder.triggered_price}</span></p>
                    )}
                  </div>
                )}

                {selectedOrder.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-colors"
                  >
                    撤销条件单
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminConditionalOrders;
