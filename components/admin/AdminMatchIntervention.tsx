import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

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

  const fetchPool = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trade_match_pool')
      .select('*')
      .neq('status', 'COMPLETED')
      .order('enter_time', { ascending: false });
    if (!error) setOrders(data || []);

    // Fetch logs
    const { data: logData } = await supabase
      .from('admin_operation_logs')
      .select('*')
      .eq('operation_type', 'TRADE_INTERVENE')
      .order('created_at', { ascending: false })
      .limit(10);
    if (logData) setLogs(logData);

    setLoading(false);
  };

  // 获取异常持仓
  const fetchAbnormalPositions = async () => {
    setPositionsLoading(true);
    try {
      // 查询所有持仓
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

      // 模拟风险评级（实际应该根据业务规则计算）
      const processedPositions: AbnormalPosition[] = (positions || []).map(p => {
        // 简单的风险评级逻辑：根据持仓数量和股票代码
        const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 
          p.quantity > 100000 ? 'HIGH' :
          p.quantity > 10000 ? 'MEDIUM' : 'LOW';
        
        const currentPrice = p.avg_cost * (1 + (Math.random() * 0.2 - 0.1)); // 模拟当前价格
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
          username: p.user_id?.substring(0, 8) || 'N/A' // 使用 user_id 前8位作为标识
        };
      });

      // 按风险等级排序，高风险在前
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

  // 切换到持仓标签时加载数据
  useEffect(() => {
    if (activeTab === 'positions') {
      fetchAbnormalPositions();
    }
  }, [activeTab]);

  const handleIntervene = async (orderId: string, type: string, params?: any) => {
    setProcessing(orderId);
    const { error } = await supabase.functions.invoke('admin-operations', {
      body: { operation: 'intervene_trade', operation_type: type, target_order_id: orderId, params }
    });

    if (error) {
      alert('操作失败: ' + error.message);
    } else {
      fetchPool();
    }
    setProcessing(null);
  };

  const handleAutoMatch = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke('match-trade-order');
    if (error) alert('撮合失败: ' + error.message);
    else fetchPool();
    setLoading(false);
  };

  // 强制平仓操作
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
      // 调用后端函数执行强制平仓
      const { error } = await supabase.functions.invoke('admin-operations', {
        body: {
          operation: 'force_sell_position',
          position_id: selectedPosition.id,
          user_id: selectedPosition.user_id,
          stock_code: selectedPosition.stock_code,
          quantity: forceSellQuantity,
          reason: forceSellReason
        }
      });

      if (error) throw error;

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

  // 获取风险等级颜色
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-100 text-red-600';
      case 'MEDIUM': return 'bg-orange-100 text-orange-600';
      case 'LOW': return 'bg-emerald-100 text-emerald-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* 标签切换 */}
      <div className="flex border-b border-industrial-200">
        <button
          onClick={() => setActiveTab('pool')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest ${
            activeTab === 'pool'
              ? 'text-industrial-800 border-b-2 border-industrial-800'
              : 'text-industrial-400 hover:text-industrial-600'
          }`}
        >
          撮合池管理
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest ${
            activeTab === 'positions'
              ? 'text-industrial-800 border-b-2 border-industrial-800'
              : 'text-industrial-400 hover:text-industrial-600'
          }`}
        >
          异常持仓监控
        </button>
      </div>

      {/* 撮合池管理 */}
      {activeTab === 'pool' && (
        <div className="industrial-card p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">撮合干预面板</h3>
              <p className="text-xs text-industrial-400 font-bold mt-1">监控撮合池订单，手动执行撮合或干预异常订单</p>
            </div>
            <div className="flex gap-4">
              <button className="industrial-button-primary" onClick={handleAutoMatch} disabled={loading}>
                <ICONS.Zap size={16} /> 立即执行自动撮合
              </button>
              <button className="industrial-button-secondary" onClick={fetchPool}>
                <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新池
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-industrial-200">
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">订单 ID</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">标的/类型</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">价格/数量</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">状态</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">进入时间</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作干预</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100">
                {loading && orders.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-xs font-bold text-industrial-400">撮合池暂无订单</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-4">
                      <code className="text-[10px] font-mono text-industrial-400">{order.trade_id?.substring(0, 8)}...</code>
                    </td>
                    <td className="py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-industrial-800 uppercase">{order.stock_code}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${order.trade_type === 'BUY' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {order.trade_type === 'BUY' ? '买入' : '卖出'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-industrial-800">¥{Number(order.price).toFixed(2)}</p>
                        <p className="text-[10px] font-bold text-industrial-400">{order.quantity} 股</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                        order.status === 'MATCHING' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {order.status === 'MATCHING' ? '撮合中' : '已暂停'}
                      </span>
                    </td>
                    <td className="py-4 text-[10px] font-bold text-industrial-400">
                      {new Date(order.enter_time).toLocaleTimeString()}
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        {order.trade_type === 'IPO' ? (
                          <>
                            <button 
                              onClick={() => handleIntervene(order.id, 'IPO_ADJUST', { is_win: true })}
                              disabled={processing === order.id}
                              className="text-[10px] font-black text-emerald-600 uppercase hover:underline disabled:opacity-50"
                            >
                              中签
                            </button>
                            <button 
                              onClick={() => handleIntervene(order.id, 'IPO_ADJUST', { is_win: false })}
                              disabled={processing === order.id}
                              className="text-[10px] font-black text-red-600 uppercase hover:underline disabled:opacity-50"
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
                                className="text-[10px] font-black text-orange-600 uppercase hover:underline disabled:opacity-50"
                              >
                                暂停
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleIntervene(order.id, 'RESUME')}
                                disabled={processing === order.id}
                                className="text-[10px] font-black text-emerald-600 uppercase hover:underline disabled:opacity-50"
                              >
                                恢复
                              </button>
                            )}
                            <button 
                              onClick={() => handleIntervene(order.id, 'FORCE_MATCH')}
                              disabled={processing === order.id}
                              className="text-[10px] font-black text-blue-600 uppercase hover:underline disabled:opacity-50"
                            >
                              强制撮合
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleIntervene(order.id, 'DELETE')}
                          disabled={processing === order.id}
                          className="text-[10px] font-black text-accent-red uppercase hover:underline disabled:opacity-50"
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
        </div>
      )}

      {/* 异常持仓监控 */}
      {activeTab === 'positions' && (
        <div className="industrial-card p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">异常持仓监控</h3>
              <p className="text-xs text-industrial-400 font-bold mt-1">监控高风险持仓，执行强制平仓操作</p>
            </div>
            <div className="flex gap-4">
              <button className="industrial-button-secondary" onClick={fetchAbnormalPositions}>
                <ICONS.Market size={16} className={positionsLoading ? 'animate-spin' : ''} /> 刷新数据
              </button>
            </div>
          </div>

          {/* 风险统计 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <p className="text-[10px] font-black text-red-400 uppercase">高风险持仓</p>
              <p className="text-2xl font-black text-red-600">
                {abnormalPositions.filter(p => p.risk_level === 'HIGH').length}
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
              <p className="text-[10px] font-black text-orange-400 uppercase">中风险持仓</p>
              <p className="text-2xl font-black text-orange-600">
                {abnormalPositions.filter(p => p.risk_level === 'MEDIUM').length}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              <p className="text-[10px] font-black text-emerald-400 uppercase">低风险持仓</p>
              <p className="text-2xl font-black text-emerald-600">
                {abnormalPositions.filter(p => p.risk_level === 'LOW').length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-industrial-200">
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">股票</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">持仓数量</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">市值</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">盈亏</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">风险等级</th>
                  <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100">
                {positionsLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
                ) : abnormalPositions.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-xs font-bold text-industrial-400">暂无持仓数据</td></tr>
                ) : abnormalPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-industrial-50 transition-colors">
                    <td className="py-4">
                      <p className="text-xs font-black text-industrial-800">{position.username || '未知用户'}</p>
                      <p className="text-[9px] text-industrial-400 font-mono">{position.user_id?.substring(0, 8)}...</p>
                    </td>
                    <td className="py-4">
                      <p className="text-xs font-black text-industrial-800">{position.stock_code}</p>
                      <p className="text-[9px] text-industrial-400">{position.stock_name}</p>
                    </td>
                    <td className="py-4">
                      <p className="text-xs font-black text-industrial-800">{position.quantity.toLocaleString()}</p>
                      <p className="text-[9px] text-industrial-400">可用: {position.available_quantity.toLocaleString()}</p>
                    </td>
                    <td className="py-4 text-xs font-black text-industrial-800">
                      ¥{position.market_value.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <p className={`text-xs font-black ${position.profit_loss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {position.profit_loss >= 0 ? '+' : ''}¥{position.profit_loss.toFixed(2)}
                      </p>
                      <p className={`text-[9px] font-bold ${position.profit_loss_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {position.profit_loss_percent >= 0 ? '+' : ''}{position.profit_loss_percent.toFixed(2)}%
                      </p>
                    </td>
                    <td className="py-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded ${getRiskLevelColor(position.risk_level)}`}>
                        {position.risk_level === 'HIGH' ? '高风险' : position.risk_level === 'MEDIUM' ? '中风险' : '低风险'}
                      </span>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => {
                          setSelectedPosition(position);
                          setForceSellQuantity(position.available_quantity);
                          setIsForceSellModalOpen(true);
                        }}
                        className="text-[10px] font-black text-red-600 uppercase hover:underline"
                      >
                        强制平仓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 操作日志 */}
      <div className="industrial-card p-8">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest mb-6">操作日志</h3>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs text-industrial-400 font-bold text-center py-8">暂无操作记录</p>
          ) : logs.map((log) => (
            <div key={log.id} className="p-4 bg-industrial-50 rounded-lg border border-industrial-100">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-industrial-800 uppercase">{log.operation_type}</span>
                  <p className="text-xs text-industrial-600 mt-1">{JSON.stringify(log.operation_content)}</p>
                </div>
                <span className="text-[9px] text-industrial-400">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 强制平仓确认弹窗 */}
      <AnimatePresence>
        {isForceSellModalOpen && selectedPosition && (
          <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="industrial-card w-full max-w-md p-8 bg-white"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-red-600 uppercase tracking-tight">强制平仓确认</h3>
                <button
                  onClick={() => { setIsForceSellModalOpen(false); setSelectedPosition(null); }}
                  className="text-industrial-400 hover:text-industrial-800"
                >
                  <ICONS.Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* 持仓信息 */}
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-red-400 text-xs">股票</span>
                    <p className="font-black text-red-800">{selectedPosition.stock_code} {selectedPosition.stock_name}</p>
                  </div>
                  <div>
                    <span className="text-red-400 text-xs">用户</span>
                    <p className="font-black text-red-800">{selectedPosition.username || '未知'}</p>
                  </div>
                  <div>
                    <span className="text-red-400 text-xs">可用数量</span>
                    <p className="font-black text-red-800">{selectedPosition.available_quantity.toLocaleString()} 股</p>
                  </div>
                  <div>
                    <span className="text-red-400 text-xs">当前市值</span>
                    <p className="font-black text-red-800">¥{selectedPosition.market_value.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 平仓表单 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">平仓数量</label>
                  <input
                    type="number"
                    value={forceSellQuantity}
                    onChange={(e) => setForceSellQuantity(Number(e.target.value))}
                    max={selectedPosition.available_quantity}
                    className="industrial-input w-full"
                  />
                  <p className="text-[9px] text-industrial-400 mt-1">最大可平仓: {selectedPosition.available_quantity.toLocaleString()} 股</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">平仓原因</label>
                  <textarea
                    value={forceSellReason}
                    onChange={(e) => setForceSellReason(e.target.value)}
                    placeholder="请输入平仓原因（必填）"
                    className="industrial-input w-full h-24 resize-none"
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button
                  onClick={() => { setIsForceSellModalOpen(false); setSelectedPosition(null); }}
                  className="industrial-button-secondary py-3"
                >
                  取消
                </button>
                <button
                  onClick={handleForceSell}
                  disabled={processing === selectedPosition.id || !forceSellReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-lg uppercase tracking-widest disabled:opacity-50 transition-colors"
                >
                  {processing === selectedPosition.id ? '处理中...' : '确认平仓'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMatchIntervention;
