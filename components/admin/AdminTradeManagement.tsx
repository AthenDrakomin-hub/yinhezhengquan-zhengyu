import React, { useState } from 'react';
import { ICONS } from '@/lib/constants';
import { tradeService } from '@/services/tradeService';
// 注意：项目需要安装 @tanstack/react-query 和 toast 库（如 sonner）
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { toast } from 'sonner';

const AdminTradeManagement: React.FC = () => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // const queryClient = useQueryClient();

  // 模拟 React Query 的 useQuery
  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (filter === 'pending') {
        // 使用专门的方法查询待审批订单
        const data = await tradeService.getPendingApprovals();
        setTrades(data || []);
      } else {
        // 其他情况：查询所有订单或已审批订单
        if (filter === 'approved') {
          const data = await tradeService.getApprovalHistory(100);
          setTrades(data?.filter((item: any) => item.approval_status === 'APPROVED') || []);
        } else {
          const data = await tradeService.getTransactions(undefined, 100);
          setTrades(data || []);
        }
      }
    } catch (err) {
      console.error('获取订单失败:', err);
      // toast.error(`获取订单失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
  }, [filter]);

  // 处理审批操作
  const handleApprove = async (orderId: string, action: 'approved' | 'rejected') => {
    try {
      await tradeService.approveTradeOrder(orderId, action);
      // toast.success(`订单已${action === 'approved' ? '通过' : '拒绝'}`);
      alert(`订单已${action === 'approved' ? '通过' : '拒绝'}`);
      // 刷新列表
      fetchOrders();
      // queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    } catch (err: any) {
      console.error('审批操作失败:', err);
      // toast.error(`操作失败：${err.message}`);
      alert(`操作失败：${err.message}`);
    }
  };

  // 渲染表格行
  const renderOrderRow = (order: any) => (
    <tr key={order.id} className="hover:bg-industrial-50 transition-colors">
      <td className="px-6 py-4 text-xs font-black text-industrial-800 truncate max-w-[100px]">{order.id}</td>
      <td className="px-6 py-4 text-xs font-bold text-industrial-600 truncate max-w-[100px]">{order.user_id}</td>
      <td className="px-6 py-4">
        <p className="text-xs font-black text-industrial-800">{order.stock_name}</p>
        <p className="text-[9px] font-bold text-industrial-400 font-mono">{order.stock_code}</p>
      </td>
      <td className="px-6 py-4">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
          order.trade_type === 'BUY' ? 'bg-red-50 text-red-600' : 
          order.trade_type === 'SELL' ? 'bg-emerald-50 text-emerald-600' : 
          'bg-blue-50 text-blue-600'
        }`}>
          {order.trade_type === 'BUY' ? '买入' : 
           order.trade_type === 'SELL' ? '卖出' : 
           order.trade_type === 'IPO' ? '新股申购' :
           order.trade_type === 'BLOCK_TRADE' ? '大宗交易' : '一键打板'}
        </span>
      </td>
      <td className="px-6 py-4">
        <p className="text-xs font-black text-industrial-800">¥{parseFloat(order.price).toFixed(2)}</p>
        <p className="text-[9px] font-bold text-industrial-400">{order.quantity} 股</p>
      </td>
      <td className="px-6 py-4 text-xs font-black text-industrial-900">¥{(order.amount || (parseFloat(order.price) * order.quantity)).toLocaleString()}</td>
      <td className="px-6 py-4 text-[10px] text-industrial-400 font-bold">
        {new Date(order.created_at).toLocaleString()}
      </td>
      <td className="px-6 py-4">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
          order.approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
          order.approval_status === 'REJECTED' ? 'bg-red-50 text-red-600' :
          order.approval_status === 'PENDING' ? 'bg-orange-50 text-orange-600' :
          'bg-industrial-100 text-industrial-400'
        }`}>
          {order.approval_status === 'APPROVED' ? '已通过' : 
           order.approval_status === 'REJECTED' ? '已拒绝' : 
           order.approval_status === 'PENDING' ? '待审批' : '无需审批'}
        </span>
      </td>
      <td className="px-6 py-4">
        {filter === 'pending' && order.approval_status === 'PENDING' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(order.id, 'approved')}
              className="industrial-button-primary text-xs px-3 py-1"
            >
              通过
            </button>
            <button
              onClick={() => handleApprove(order.id, 'rejected')}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors"
            >
              拒绝
            </button>
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">交易管理</h3>
        <div className="flex gap-2">
          <input type="text" placeholder="搜索用户/代码..." className="industrial-input w-64 h-10" />
          <button className="industrial-button-primary h-10" onClick={fetchOrders}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新数据
          </button>
        </div>
      </div>

      {/* 筛选标签 */}
      <div className="flex border-b border-industrial-200">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest ${
            filter === 'pending'
              ? 'text-industrial-800 border-b-2 border-industrial-800'
              : 'text-industrial-400 hover:text-industrial-600'
          }`}
        >
          待审批
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest ${
            filter === 'approved'
              ? 'text-industrial-800 border-b-2 border-industrial-800'
              : 'text-industrial-400 hover:text-industrial-600'
          }`}
        >
          已审批
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest ${
            filter === 'all'
              ? 'text-industrial-800 border-b-2 border-industrial-800'
              : 'text-industrial-400 hover:text-industrial-600'
          }`}
        >
          全部
        </button>
      </div>

      {/* 订单列表 */}
      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">订单ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">标的</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">类型</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">价格/数量</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">总额</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">时间</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">审批状态</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : trades.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无数据</td></tr>
              ) : (
                trades.map(renderOrderRow)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTradeManagement;
