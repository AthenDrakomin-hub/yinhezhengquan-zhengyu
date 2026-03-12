import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { tradeService } from '@/services/tradeService';
import Pagination from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 10;

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
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1);

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
        const result = await tradeService.getTransactions(undefined, 100);
        data = result.data || [];
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

  // 应用筛选
  const filteredTrades = trades.filter((t: any) => {
    // 搜索筛选
    if (searchTerm) {
      const matchesSearch = 
        t.stock_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.stock_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
    }
    
    // 交易类型筛选
    if (tradeTypeFilter !== 'ALL' && t.trade_type !== tradeTypeFilter) {
      return false;
    }
    
    // 日期范围筛选
    if (dateRange.start && new Date(t.created_at) < new Date(dateRange.start)) {
      return false;
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      if (new Date(t.created_at) > endDate) return false;
    }
    
    return true;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE);
  const paginatedTrades = filteredTrades.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tradeTypeFilter, dateRange, filter]);

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

  // 获取交易类型信息
  const getTradeTypeInfo = (type: string) => {
    const map: Record<string, { text: string; color: string }> = {
      'BUY': { text: '买入', color: '#ef4444' },
      'SELL': { text: '卖出', color: '#22c55e' },
      'IPO': { text: '新股申购', color: '#3b82f6' },
      'BLOCK_TRADE': { text: '大宗交易', color: '#a855f7' },
      'LIMIT_UP': { text: '涨停打板', color: '#f97316' }
    };
    return map[type] || { text: type, color: '#64748b' };
  };

  // 获取审批状态信息
  const getApprovalStatusInfo = (status: string) => {
    const map: Record<string, { text: string; color: string }> = {
      'APPROVED': { text: '已通过', color: '#22c55e' },
      'REJECTED': { text: '已拒绝', color: '#ef4444' },
      'PENDING': { text: '待审批', color: '#f97316' },
      'NOT_REQUIRED': { text: '无需审批', color: '#64748b' }
    };
    return map[status] || { text: status, color: '#64748b' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>交易管理</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>审批和管理所有交易订单</p>
        </div>
        <button 
          onClick={fetchOrders}
          style={{
            padding: '8px 16px',
            background: '#334155',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {loading ? '⏳' : '🔄'} 刷新数据
        </button>
      </div>

      {/* 筛选标签 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {[
          { key: 'pending', label: '待审批', count: trades.filter(t => t.approval_status === 'PENDING').length },
          { key: 'approved', label: '已通过', count: trades.filter(t => t.approval_status === 'APPROVED').length },
          { key: 'rejected', label: '已拒绝', count: trades.filter(t => t.approval_status === 'REJECTED').length },
          { key: 'all', label: '全部', count: trades.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '12px 20px',
              fontSize: '12px',
              fontWeight: 'bold',
              background: 'transparent',
              border: 'none',
              borderBottom: filter === tab.key ? '2px solid #ef4444' : '2px solid transparent',
              color: filter === tab.key ? 'white' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* 高级筛选 */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* 搜索框 */}
          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
            <input
              type="text"
              placeholder="搜索代码/名称/用户/订单ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          
          {/* 交易类型筛选 */}
          <select
            value={tradeTypeFilter}
            onChange={(e) => setTradeTypeFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">全部类型</option>
            <option value="BUY">买入</option>
            <option value="SELL">卖出</option>
            <option value="IPO">新股申购</option>
            <option value="BLOCK_TRADE">大宗交易</option>
            <option value="LIMIT_UP">涨停打板</option>
          </select>
          
          {/* 日期范围 */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            style={{
              padding: '10px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            style={{
              padding: '10px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
          筛选结果: <span style={{ color: 'white', fontWeight: 'bold' }}>{filteredTrades.length}</span> 条记录
        </div>
      </div>

      {/* 交易列表 */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>订单ID</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>股票信息</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>交易类型</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>价格/数量</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>金额</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>审批状态</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>时间</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    加载中...
                  </td>
                </tr>
              ) : paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    暂无数据
                  </td>
                </tr>
              ) : paginatedTrades.map((trade) => {
                const typeInfo = getTradeTypeInfo(trade.trade_type);
                const statusInfo = getApprovalStatusInfo(trade.approval_status);
                
                return (
                  <tr key={trade.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {trade.id?.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{trade.stock_name || trade.stock_code}</p>
                      <p style={{ fontSize: '11px', color: '#64748b' }}>{trade.stock_code}</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: typeInfo.color + '20',
                        color: typeInfo.color
                      }}>
                        {typeInfo.text}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '12px', color: 'white' }}>¥{Number(trade.price).toFixed(2)}</p>
                      <p style={{ fontSize: '11px', color: '#64748b' }}>{trade.quantity}股</p>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                      ¥{(trade.price * trade.quantity).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: statusInfo.color + '20',
                        color: statusInfo.color
                      }}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b' }}>
                      {new Date(trade.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedTrade(trade);
                          setIsDetailModalOpen(true);
                        }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#3b82f6',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* 分页 */}
        {filteredTrades.length > ITEMS_PER_PAGE && (
          <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTrades.length}
              pageSize={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {isDetailModalOpen && selectedTrade && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: '#1e293b',
              borderRadius: '12px',
              border: '1px solid #334155',
              width: '100%',
              maxWidth: '560px'
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>交易详情</h3>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ color: '#64748b', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>订单ID</p>
                  <p style={{ fontSize: '12px', color: 'white', fontFamily: 'monospace' }}>{selectedTrade.id}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>用户ID</p>
                  <p style={{ fontSize: '12px', color: 'white', fontFamily: 'monospace' }}>{selectedTrade.user_id?.substring(0, 16)}...</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>股票代码</p>
                  <p style={{ fontSize: '12px', color: 'white' }}>{selectedTrade.stock_code}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>股票名称</p>
                  <p style={{ fontSize: '12px', color: 'white' }}>{selectedTrade.stock_name || '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>交易类型</p>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: getTradeTypeInfo(selectedTrade.trade_type).color
                  }}>
                    {getTradeTypeInfo(selectedTrade.trade_type).text}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>审批状态</p>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: getApprovalStatusInfo(selectedTrade.approval_status).color
                  }}>
                    {getApprovalStatusInfo(selectedTrade.approval_status).text}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>委托价格</p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>¥{Number(selectedTrade.price).toFixed(2)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>委托数量</p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{selectedTrade.quantity} 股</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>委托金额</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>¥{(selectedTrade.price * selectedTrade.quantity).toLocaleString()}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>创建时间</p>
                  <p style={{ fontSize: '12px', color: 'white' }}>{new Date(selectedTrade.created_at).toLocaleString('zh-CN')}</p>
                </div>
                {selectedTrade.remark && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>备注</p>
                    <p style={{ fontSize: '12px', color: 'white' }}>{selectedTrade.remark}</p>
                  </div>
                )}
              </div>

              {/* 审批按钮 */}
              {selectedTrade.approval_status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button
                    onClick={() => handleApprove(selectedTrade.id, 'approved')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ 通过审批
                  </button>
                  <button
                    onClick={() => handleApprove(selectedTrade.id, 'rejected')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ 拒绝订单
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminTradeManagement;
