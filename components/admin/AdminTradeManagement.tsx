import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { tradeService } from '@/services/tradeService';

// 交易详情类型
interface TradeDetail {
  id: string;
  user_id: string;
  stock_code: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL' | 'IPO' | 'BLOCK_TRADE' | 'LIMIT_UP';
  price: number;
  quantity: number;
  amount: number;
  status: string;
  approval_status: string;
  created_at: string;
  updated_at?: string;
  approved_by?: string;
  approved_at?: string;
  remark?: string;
  username?: string;
}

const AdminTradeManagement: React.FC = () => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [trades, setTrades] = useState<TradeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<TradeDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // 搜索和筛选
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeTypeFilter, setTradeTypeFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      
      if (filter === 'pending') {
        data = await tradeService.getPendingApprovals() || [];
      } else if (filter === 'approved') {
        const history = await tradeService.getApprovalHistory(100);
        data = history?.filter((item: any) => item.approval_status === 'APPROVED') || [];
      } else if (filter === 'rejected') {
        const history = await tradeService.getApprovalHistory(100);
        data = history?.filter((item: any) => item.approval_status === 'REJECTED') || [];
      } else {
        data = await tradeService.getTransactions(undefined, 100) || [];
      }
      
      // 应用搜索筛选
      if (searchTerm) {
        data = data.filter((t: any) => 
          t.stock_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.stock_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // 应用交易类型筛选
      if (tradeTypeFilter !== 'ALL') {
        data = data.filter((t: any) => t.trade_type === tradeTypeFilter);
      }
      
      // 应用日期范围筛选
      if (dateRange.start) {
        data = data.filter((t: any) => new Date(t.created_at) >= new Date(dateRange.start));
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59);
        data = data.filter((t: any) => new Date(t.created_at) <= endDate);
      }
      
      setTrades(data);
    } catch (err) {
      console.error('获取订单失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  // 处理审批操作
  const handleApprove = async (orderId: string, action: 'approved' | 'rejected') => {
    try {
      await tradeService.approveTradeOrder(orderId, action);
      alert(`订单已${action === 'approved' ? '通过' : '拒绝'}`);
      fetchOrders();
      setIsDetailModalOpen(false);
      setSelectedTrade(null);
    } catch (err: any) {
      console.error('审批操作失败:', err);
      alert(`操作失败：${err.message}`);
    }
  };

  // 打开详情弹窗
  const openDetailModal = (trade: TradeDetail) => {
    setSelectedTrade(trade);
    setIsDetailModalOpen(true);
  };

  // 获取交易类型文本
  const getTradeTypeText = (type: string) => {
    const map: Record<string, string> = {
      'BUY': '买入',
      'SELL': '卖出',
      'IPO': '新股申购',
      'BLOCK_TRADE': '大宗交易',
      'LIMIT_UP': '涨停打板'
    };
    return map[type] || type;
  };

  // 获取交易类型颜色
  const getTradeTypeColor = (type: string) => {
    const map: Record<string, string> = {
      'BUY': 'bg-red-50 text-red-600',
      'SELL': 'bg-emerald-50 text-emerald-600',
      'IPO': 'bg-blue-50 text-blue-600',
      'BLOCK_TRADE': 'bg-purple-50 text-purple-600',
      'LIMIT_UP': 'bg-orange-50 text-orange-600'
    };
    return map[type] || 'bg-gray-50 text-gray-600';
  };

  // 获取审批状态文本
  const getApprovalStatusText = (status: string) => {
    const map: Record<string, string> = {
      'APPROVED': '已通过',
      'REJECTED': '已拒绝',
      'PENDING': '待审批',
      'NOT_REQUIRED': '无需审批'
    };
    return map[status] || status;
  };

  // 获取审批状态颜色
  const getApprovalStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'APPROVED': 'bg-emerald-50 text-emerald-600',
      'REJECTED': 'bg-red-50 text-red-600',
      'PENDING': 'bg-orange-50 text-orange-600',
      'NOT_REQUIRED': 'bg-industrial-100 text-industrial-400'
    };
    return map[status] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">交易管理</h3>
        <div className="flex gap-2">
          <button className="industrial-button-primary h-10" onClick={fetchOrders}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新数据
          </button>
        </div>
      </div>

      {/* 筛选标签 */}
      <div className="flex border-b border-industrial-200">
        {[
          { key: 'pending', label: '待审批' },
          { key: 'approved', label: '已通过' },
          { key: 'rejected', label: '已拒绝' },
          { key: 'all', label: '全部' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest ${
              filter === tab.key
                ? 'text-industrial-800 border-b-2 border-industrial-800'
                : 'text-industrial-400 hover:text-industrial-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 高级筛选 */}
      <div className="industrial-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 搜索框 */}
          <div className="relative">
            <ICONS.Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-400" />
            <input
              type="text"
              placeholder="搜索代码/名称/用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="industrial-input pl-10 w-full"
            />
          </div>
          
          {/* 交易类型筛选 */}
          <select
            value={tradeTypeFilter}
            onChange={(e) => setTradeTypeFilter(e.target.value)}
            className="industrial-input"
          >
            <option value="ALL">全部类型</option>
            <option value="BUY">买入</option>
            <option value="SELL">卖出</option>
            <option value="IPO">新股申购</option>
            <option value="BLOCK_TRADE">大宗交易</option>
            <option value="LIMIT_UP">涨停打板</option>
          </select>
          
          {/* 开始日期 */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="industrial-input"
            placeholder="开始日期"
          />
          
          {/* 结束日期 */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="industrial-input flex-1"
              placeholder="结束日期"
            />
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-industrial-900 text-white text-xs font-bold rounded hover:bg-industrial-800"
            >
              查询
            </button>
          </div>
        </div>
        
        {/* 筛选结果统计 */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-industrial-100">
          <span className="text-xs text-industrial-400">
            筛选结果: <span className="font-black text-industrial-800">{trades.length}</span> 条记录
          </span>
          {(searchTerm || tradeTypeFilter !== 'ALL' || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTradeTypeFilter('ALL');
                setDateRange({ start: '', end: '' });
                fetchOrders();
              }}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              清除筛选
            </button>
          )}
        </div>
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
                trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-industrial-50 transition-colors cursor-pointer" onClick={() => openDetailModal(trade)}>
                    <td className="px-6 py-4 text-xs font-black text-industrial-800 truncate max-w-[100px]">{trade.id}</td>
                    <td className="px-6 py-4 text-xs font-bold text-industrial-600 truncate max-w-[100px]">{trade.user_id}</td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-industrial-800">{trade.stock_name}</p>
                      <p className="text-[9px] font-bold text-industrial-400 font-mono">{trade.stock_code}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded ${getTradeTypeColor(trade.trade_type)}`}>
                        {getTradeTypeText(trade.trade_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-industrial-800">¥{Number(trade.price).toFixed(2)}</p>
                      <p className="text-[9px] font-bold text-industrial-400">{trade.quantity} 股</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-industrial-900">¥{trade.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[10px] text-industrial-400 font-bold">
                      {new Date(trade.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded ${getApprovalStatusColor(trade.approval_status)}`}>
                        {getApprovalStatusText(trade.approval_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDetailModal(trade)}
                          className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                        >
                          详情
                        </button>
                        {trade.approval_status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(trade.id, 'approved')}
                              className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => handleApprove(trade.id, 'rejected')}
                              className="text-[10px] font-black text-red-600 uppercase hover:underline"
                            >
                              拒绝
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 交易详情弹窗 */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTrade && (
          <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="industrial-card w-full max-w-2xl p-8 bg-white max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">交易详情</h3>
                <button
                  onClick={() => { setIsDetailModalOpen(false); setSelectedTrade(null); }}
                  className="text-industrial-400 hover:text-industrial-800"
                >
                  <ICONS.Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-industrial-400 uppercase">订单ID</label>
                    <p className="text-sm font-bold text-industrial-800 font-mono">{selectedTrade.id}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-400 uppercase">用户ID</label>
                    <p className="text-sm font-bold text-industrial-800 font-mono">{selectedTrade.user_id}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-400 uppercase">交易类型</label>
                    <p>
                      <span className={`text-[10px] font-black px-2 py-1 rounded ${getTradeTypeColor(selectedTrade.trade_type)}`}>
                        {getTradeTypeText(selectedTrade.trade_type)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-400 uppercase">审批状态</label>
                    <p>
                      <span className={`text-[10px] font-black px-2 py-1 rounded ${getApprovalStatusColor(selectedTrade.approval_status)}`}>
                        {getApprovalStatusText(selectedTrade.approval_status)}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-industrial-400 uppercase">标的</label>
                    <p className="text-sm font-bold text-industrial-800">{selectedTrade.stock_name} ({selectedTrade.stock_code})</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-400 uppercase">价格</label>
                    <p className="text-sm font-bold text-industrial-800 font-mono">¥{Number(selectedTrade.price).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-400 uppercase">数量</label>
                    <p className="text-sm font-bold text-industrial-800">{selectedTrade.quantity.toLocaleString()} 股</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-400 uppercase">总额</label>
                    <p className="text-lg font-black text-industrial-800">¥{selectedTrade.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 时间信息 */}
              <div className="bg-industrial-50 rounded-lg p-4 mb-6">
                <h4 className="text-xs font-black text-industrial-800 uppercase mb-3">时间信息</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-industrial-400">创建时间:</span>
                    <span className="ml-2 font-bold text-industrial-800">{new Date(selectedTrade.created_at).toLocaleString()}</span>
                  </div>
                  {selectedTrade.approved_at && (
                    <div>
                      <span className="text-industrial-400">审批时间:</span>
                      <span className="ml-2 font-bold text-industrial-800">{new Date(selectedTrade.approved_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedTrade.approved_by && (
                    <div>
                      <span className="text-industrial-400">审批人:</span>
                      <span className="ml-2 font-bold text-industrial-800">{selectedTrade.approved_by}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 备注 */}
              {selectedTrade.remark && (
                <div className="bg-industrial-50 rounded-lg p-4 mb-6">
                  <h4 className="text-xs font-black text-industrial-800 uppercase mb-2">备注</h4>
                  <p className="text-sm text-industrial-600">{selectedTrade.remark}</p>
                </div>
              )}

              {/* 操作按钮 */}
              {selectedTrade.approval_status === 'PENDING' && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleApprove(selectedTrade.id, 'approved')}
                    className="industrial-button-primary bg-emerald-600 hover:bg-emerald-700 py-3"
                  >
                    批准通过
                  </button>
                  <button
                    onClick={() => handleApprove(selectedTrade.id, 'rejected')}
                    className="industrial-button-primary bg-red-600 hover:bg-red-700 py-3"
                  >
                    拒绝订单
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminTradeManagement;
