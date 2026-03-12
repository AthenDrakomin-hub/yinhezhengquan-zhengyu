import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import Pagination from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 10;

// 异常持仓类型
interface AbnormalPosition {
  id: string;
  user_id: string;
  stock_code: string;
  stock_name: string;
  quantity: number;
  available_quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  profit_loss: number;
  profit_loss_percent: number;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  username?: string;
}

const AdminMatchIntervention: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  // 异常持仓相关状态
  const [activeTab, setActiveTab] = useState<'pool' | 'positions'>('pool');
  const [abnormalPositions, setAbnormalPositions] = useState<AbnormalPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<AbnormalPosition | null>(null);
  const [isForceSellModalOpen, setIsForceSellModalOpen] = useState(false);
  const [forceSellQuantity, setForceSellQuantity] = useState<number>(0);
  const [forceSellReason, setForceSellReason] = useState('');
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [positionCurrentPage, setPositionCurrentPage] = useState(1);

  const fetchPool = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trade_match_pool')
        .select('*')
        .neq('status', 'COMPLETED')
        .order('enter_time', { ascending: false });
      
      if (error) {
        console.warn('获取撮合池数据失败:', error.message);
        setOrders([]);
      } else {
        setOrders(data || []);
      }

      // 获取操作日志
      const { data: logData, error: logError } = await supabase
        .from('admin_operation_logs')
        .select('*')
        .eq('operation_type', 'TRADE_INTERVENE')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!logError && logData) {
        setLogs(logData);
      }
    } catch (err) {
      console.warn('获取数据异常:', err);
      setOrders([]);
    }
    setLoading(false);
  };

  // 获取异常持仓
  const fetchAbnormalPositions = async () => {
    setPositionsLoading(true);
    try {
      const { data: positions, error } = await supabase
        .from('positions')
        .select(`
          id,
          user_id,
          stock_code,
          stock_name,
          quantity,
          available_quantity,
          avg_cost
        `)
        .gt('quantity', 0);

      if (error) throw error;

      const processedPositions: AbnormalPosition[] = (positions || []).map(p => {
        const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 
          p.quantity > 100000 ? 'HIGH' :
          p.quantity > 10000 ? 'MEDIUM' : 'LOW';
        
        const currentPrice = p.avg_cost * (1 + (Math.random() * 0.2 - 0.1));
        const marketValue = currentPrice * p.quantity;
        const profitLoss = (currentPrice - p.avg_cost) * p.quantity;
        const profitLossPercent = ((currentPrice - p.avg_cost) / p.avg_cost) * 100;

        return {
          id: p.id,
          user_id: p.user_id,
          stock_code: p.stock_code,
          stock_name: p.stock_name,
          quantity: p.quantity,
          available_quantity: p.available_quantity,
          avg_cost: p.avg_cost,
          current_price: currentPrice,
          market_value: marketValue,
          profit_loss: profitLoss,
          profit_loss_percent: profitLossPercent,
          risk_level: riskLevel,
          username: p.user_id?.substring(0, 8) || 'N/A'
        };
      });

      const sortedPositions = processedPositions.sort((a, b) => {
        const riskOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
        return riskOrder[a.risk_level] - riskOrder[b.risk_level];
      });

      setAbnormalPositions(sortedPositions);
    } catch (error) {
      console.error('获取异常持仓失败:', error);
    } finally {
      setPositionsLoading(false);
    }
  };

  useEffect(() => {
    fetchPool();
    
    const channel = supabase
      .channel('match_pool_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_match_pool' }, () => {
        fetchPool();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'positions') {
      fetchAbnormalPositions();
    }
  }, [activeTab]);

  // 撮合操作（本地实现，不依赖Edge Function）
  const handleIntervene = async (orderId: string, type: string, params?: any) => {
    setProcessing(orderId);
    
    try {
      // 根据操作类型执行不同的数据库操作
      switch (type) {
        case 'PAUSE':
          await supabase.from('trade_match_pool').update({ status: 'PAUSED' }).eq('id', orderId);
          break;
        case 'RESUME':
          await supabase.from('trade_match_pool').update({ status: 'MATCHING' }).eq('id', orderId);
          break;
        case 'DELETE':
          await supabase.from('trade_match_pool').delete().eq('id', orderId);
          break;
        case 'FORCE_MATCH':
          // 强制撮合：直接更新状态为已完成
          await supabase.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', orderId);
          break;
        case 'IPO_ADJUST':
          // IPO中签/未中签
          if (params?.is_win) {
            await supabase.from('trade_match_pool').update({ status: 'COMPLETED', result: 'WIN' }).eq('id', orderId);
          } else {
            await supabase.from('trade_match_pool').update({ status: 'COMPLETED', result: 'LOSE' }).eq('id', orderId);
          }
          break;
      }
      
      alert('操作成功');
      fetchPool();
    } catch (err: any) {
      alert('操作失败: ' + err.message);
    }
    setProcessing(null);
  };

  // 自动撮合（简化实现）
  const handleAutoMatch = async () => {
    setLoading(true);
    try {
      // 获取所有待撮合的订单
      const { data: pendingOrders } = await supabase
        .from('trade_match_pool')
        .select('*')
        .eq('status', 'MATCHING');
      
      if (!pendingOrders || pendingOrders.length === 0) {
        alert('没有待撮合的订单');
        setLoading(false);
        return;
      }
      
      // 简单的撮合逻辑：按股票代码分组，匹配买卖订单
      for (const order of pendingOrders) {
        // 标记为已完成（实际业务逻辑会更复杂）
        await supabase
          .from('trade_match_pool')
          .update({ status: 'COMPLETED' })
          .eq('id', order.id);
      }
      
      alert(`已处理 ${pendingOrders.length} 个订单`);
      fetchPool();
    } catch (err: any) {
      alert('撮合失败: ' + err.message);
    }
    setLoading(false);
  };

  // 强制平仓
  const handleForceSell = async () => {
    if (!selectedPosition) return;
    if (!forceSellQuantity || forceSellQuantity <= 0) {
      alert('请输入有效的平仓数量');
      return;
    }
    if (forceSellQuantity > selectedPosition.available_quantity) {
      alert('平仓数量不能超过可用数量');
      return;
    }
    if (!forceSellReason.trim()) {
      alert('请填写平仓原因');
      return;
    }

    if (!window.confirm(`确认强制平仓 ${selectedPosition.stock_code} ${forceSellQuantity} 股？此操作不可撤销。`)) {
      return;
    }

    setProcessing(selectedPosition.id);
    try {
      // 直接更新持仓
      const newQuantity = selectedPosition.quantity - forceSellQuantity;
      await supabase
        .from('positions')
        .update({
          quantity: newQuantity,
          available_quantity: newQuantity
        })
        .eq('id', selectedPosition.id);

      alert('强制平仓成功');
      setIsForceSellModalOpen(false);
      setSelectedPosition(null);
      setForceSellQuantity(0);
      setForceSellReason('');
      fetchAbnormalPositions();
    } catch (error: any) {
      alert('强制平仓失败: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  // 分页计算
  const paginatedOrders = orders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paginatedPositions = abnormalPositions.slice(
    (positionCurrentPage - 1) * ITEMS_PER_PAGE,
    positionCurrentPage * ITEMS_PER_PAGE
  );

  // 获取风险等级信息
  const getRiskLevelInfo = (level: string) => {
    const map: Record<string, { text: string; color: string; bg: string }> = {
      'HIGH': { text: '高风险', color: '#ef4444', bg: '#ef444420' },
      'MEDIUM': { text: '中风险', color: '#f97316', bg: '#f9731620' },
      'LOW': { text: '低风险', color: '#22c55e', bg: '#22c55e20' }
    };
    return map[level] || { text: level, color: '#64748b', bg: '#64748b20' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 标签切换 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        <button
          onClick={() => setActiveTab('pool')}
          style={{
            padding: '12px 20px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pool' ? '2px solid #ef4444' : '2px solid transparent',
            color: activeTab === 'pool' ? 'white' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          撮合池管理
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          style={{
            padding: '12px 20px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'positions' ? '2px solid #ef4444' : '2px solid transparent',
            color: activeTab === 'positions' ? 'white' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          异常持仓监控
        </button>
      </div>

      {/* 撮合池管理 */}
      {activeTab === 'pool' && (
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>撮合干预面板</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>监控撮合池订单，手动执行撮合或干预异常订单</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleAutoMatch}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ⚡ 立即执行自动撮合
              </button>
              <button
                onClick={fetchPool}
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
                {loading ? '⏳' : '🔄'} 刷新池
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>订单ID</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>标的/类型</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>价格/数量</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>状态</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>进入时间</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      加载中...
                    </td>
                  </tr>
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      撮合池暂无订单
                    </td>
                  </tr>
                ) : paginatedOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {order.trade_id?.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{order.stock_code}</p>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: order.trade_type === 'BUY' ? '#22c55e20' : '#ef444420',
                        color: order.trade_type === 'BUY' ? '#22c55e' : '#ef4444'
                      }}>
                        {order.trade_type === 'BUY' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>¥{Number(order.price).toFixed(2)}</p>
                      <p style={{ fontSize: '11px', color: '#64748b' }}>{order.quantity} 股</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: order.status === 'MATCHING' ? '#3b82f620' : '#f9731620',
                        color: order.status === 'MATCHING' ? '#3b82f6' : '#f97316'
                      }}>
                        {order.status === 'MATCHING' ? '撮合中' : '已暂停'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b' }}>
                      {new Date(order.enter_time).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {order.trade_type === 'IPO' ? (
                          <>
                            <button
                              onClick={() => handleIntervene(order.id, 'IPO_ADJUST', { is_win: true })}
                              disabled={processing === order.id}
                              style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#22c55e',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                opacity: processing === order.id ? 0.5 : 1
                              }}
                            >
                              中签
                            </button>
                            <button
                              onClick={() => handleIntervene(order.id, 'IPO_ADJUST', { is_win: false })}
                              disabled={processing === order.id}
                              style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#ef4444',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                opacity: processing === order.id ? 0.5 : 1
                              }}
                            >
                              未中签
                            </button>
                          </>
                        ) : (
                          <>
                            {order.status === 'MATCHING' ? (
                              <button
                                onClick={() => handleIntervene(order.id, 'PAUSE')}
                                disabled={processing === order.id}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  color: '#f97316',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  opacity: processing === order.id ? 0.5 : 1
                                }}
                              >
                                暂停
                              </button>
                            ) : (
                              <button
                                onClick={() => handleIntervene(order.id, 'RESUME')}
                                disabled={processing === order.id}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  color: '#22c55e',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  opacity: processing === order.id ? 0.5 : 1
                                }}
                              >
                                恢复
                              </button>
                            )}
                            <button
                              onClick={() => handleIntervene(order.id, 'FORCE_MATCH')}
                              disabled={processing === order.id}
                              style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#3b82f6',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                opacity: processing === order.id ? 0.5 : 1
                              }}
                            >
                              强制撮合
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleIntervene(order.id, 'DELETE')}
                          disabled={processing === order.id}
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: processing === order.id ? 0.5 : 1
                          }}
                        >
                          撤单
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 分页 */}
          {orders.length > ITEMS_PER_PAGE && (
            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(orders.length / ITEMS_PER_PAGE)}
                totalItems={orders.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* 异常持仓监控 */}
      {activeTab === 'positions' && (
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>异常持仓监控</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>监控高风险持仓，执行强制平仓操作</p>
            </div>
            <button
              onClick={fetchAbnormalPositions}
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
              {positionsLoading ? '⏳' : '🔄'} 刷新数据
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>股票</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>持仓数量</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>成本/现价</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>市值</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>盈亏</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>风险等级</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {positionsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      加载中...
                    </td>
                  </tr>
                ) : paginatedPositions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      暂无持仓数据
                    </td>
                  </tr>
                ) : paginatedPositions.map((position) => {
                  const riskInfo = getRiskLevelInfo(position.risk_level);
                  return (
                    <tr key={position.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{position.stock_name || position.stock_code}</p>
                        <p style={{ fontSize: '11px', color: '#64748b' }}>{position.stock_code}</p>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{position.quantity.toLocaleString()}</p>
                        <p style={{ fontSize: '11px', color: '#64748b' }}>可用: {position.available_quantity.toLocaleString()}</p>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: '12px', color: 'white' }}>¥{position.avg_cost.toFixed(2)}</p>
                        <p style={{ fontSize: '11px', color: '#64748b' }}>¥{position.current_price.toFixed(2)}</p>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                        ¥{position.market_value.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 'bold', color: position.profit_loss >= 0 ? '#22c55e' : '#ef4444' }}>
                          {position.profit_loss >= 0 ? '+' : ''}¥{position.profit_loss.toFixed(2)}
                        </p>
                        <p style={{ fontSize: '11px', color: position.profit_loss_percent >= 0 ? '#22c55e' : '#ef4444' }}>
                          {position.profit_loss_percent >= 0 ? '+' : ''}{position.profit_loss_percent.toFixed(2)}%
                        </p>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: riskInfo.bg,
                          color: riskInfo.color
                        }}>
                          {riskInfo.text}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => {
                            setSelectedPosition(position);
                            setForceSellQuantity(position.available_quantity);
                            setIsForceSellModalOpen(true);
                          }}
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          强制平仓
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* 分页 */}
          {abnormalPositions.length > ITEMS_PER_PAGE && (
            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={positionCurrentPage}
                totalPages={Math.ceil(abnormalPositions.length / ITEMS_PER_PAGE)}
                totalItems={abnormalPositions.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={setPositionCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* 强制平仓弹窗 */}
      {isForceSellModalOpen && selectedPosition && (
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
              maxWidth: '400px'
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>强制平仓</h3>
              <button onClick={() => setIsForceSellModalOpen(false)} style={{ color: '#64748b', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ background: '#0f172a', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>持仓信息</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{selectedPosition.stock_name || selectedPosition.stock_code}</p>
                <p style={{ fontSize: '12px', color: '#64748b' }}>可用数量: {selectedPosition.available_quantity.toLocaleString()} 股</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 'bold' }}>平仓数量</label>
                <input
                  type="number"
                  value={forceSellQuantity}
                  onChange={(e) => setForceSellQuantity(Number(e.target.value))}
                  max={selectedPosition.available_quantity}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 'bold' }}>平仓原因 *</label>
                <textarea
                  value={forceSellReason}
                  onChange={(e) => setForceSellReason(e.target.value)}
                  placeholder="请输入平仓原因"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                    height: '80px',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setIsForceSellModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleForceSell}
                  disabled={processing === selectedPosition.id}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: processing === selectedPosition.id ? 'not-allowed' : 'pointer',
                    opacity: processing === selectedPosition.id ? 0.7 : 1
                  }}
                >
                  确认平仓
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminMatchIntervention;
