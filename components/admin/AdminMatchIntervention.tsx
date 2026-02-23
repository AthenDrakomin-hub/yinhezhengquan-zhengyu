import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { supabase } from '@/lib/supabase';

const AdminMatchIntervention: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPool = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trade_match_pool')
      .select('*')
      .neq('status', 'COMPLETED')
      .order('enter_time', { ascending: false });
    if (!error) setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPool();
    // 实时监听撮合池变化
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

  const handleIntervene = async (orderId: string, type: string) => {
    setProcessing(orderId);
    const { error } = await supabase.functions.invoke('admin-intervene-trade', {
      body: { operation_type: type, target_order_id: orderId }
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

  const [matchLogs, setMatchLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchMatchLogs = async () => {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from('admin_operation_logs')
      .select('*')
      .in('operate_type', ['TRADE_MATCH_MANUAL', 'TRADE_MATCH_PAUSE', 'TRADE_MATCH_RESUME', 'TRADE_MATCH_FORCE', 'TRADE_MATCH_DELETE'])
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error) setMatchLogs(data || []);
    setLogsLoading(false);
  };

  useEffect(() => {
    fetchMatchLogs();
  }, []);

  return (
    <div className="space-y-8">
      {/* 撮合池列表 */}
      <div className="industrial-card p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">撮合干预面板</h3>
            <p className="text-xs text-industrial-400 font-bold mt-1">监控撮合池订单，手动执行撮合或干预异常订单</p>
          </div>
          <div className="flex gap-4">
            <button 
              className="industrial-button-primary" 
              onClick={() => handleIntervene('batch', 'MANUAL_MATCH')}
              disabled={loading || orders.length === 0}
            >
              <ICONS.Zap size={16} /> 手动触发撮合
            </button>
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
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户 ID</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">标的/类型</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">价格/数量</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">状态</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">进入时间</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作干预</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading && orders.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs font-bold text-industrial-400">撮合池暂无订单</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id}>
                  <td className="py-4">
                    <code className="text-[10px] font-mono text-industrial-400">{order.trade_id.substring(0, 8)}...</code>
                  </td>
                  <td className="py-4">
                    <code className="text-[10px] font-mono text-industrial-400">{order.user_id.substring(0, 8)}...</code>
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
                      order.status === 'MATCHING' ? 'bg-blue-50 text-blue-600' : 
                      order.status === 'PAUSED' ? 'bg-orange-50 text-orange-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {order.status === 'MATCHING' ? '撮合中' : 
                       order.status === 'PAUSED' ? '已暂停' : '已完成'}
                    </span>
                  </td>
                  <td className="py-4 text-[10px] font-bold text-industrial-400">
                    {new Date(order.enter_time).toLocaleString()}
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleIntervene(order.id, 'MANUAL_MATCH')}
                        disabled={processing === order.id}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        手动撮合
                      </button>
                      {order.status === 'MATCHING' ? (
                        <button 
                          onClick={() => handleIntervene(order.id, 'PAUSE')}
                          disabled={processing === order.id}
                          className="text-[10px] font-black text-orange-600 uppercase hover:underline"
                        >
                          暂停
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleIntervene(order.id, 'RESUME')}
                          disabled={processing === order.id}
                          className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                        >
                          恢复
                        </button>
                      )}
                      <button 
                        onClick={() => handleIntervene(order.id, 'FORCE_MATCH')}
                        disabled={processing === order.id}
                        className="text-[10px] font-black text-purple-600 uppercase hover:underline"
                      >
                        强制撮合
                      </button>
                      <button 
                        onClick={() => handleIntervene(order.id, 'DELETE')}
                        disabled={processing === order.id}
                        className="text-[10px] font-black text-accent-red uppercase hover:underline"
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

      {/* 撮合操作日志 */}
      <div className="industrial-card p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">撮合操作日志</h3>
            <p className="text-xs text-industrial-400 font-bold mt-1">展示撮合操作人、操作类型、操作时间、涉及订单ID</p>
          </div>
          <button className="industrial-button-secondary" onClick={fetchMatchLogs}>
            <ICONS.Refresh size={16} className={logsLoading ? 'animate-spin' : ''} /> 刷新日志
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-industrial-200">
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作类型</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作人</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">订单ID</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作时间</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {logsLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : matchLogs.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-xs font-bold text-industrial-400">暂无撮合操作日志</td></tr>
              ) : matchLogs.map((log) => {
                const content = log.operate_content;
                const operationTypeMap: Record<string, string> = {
                  'TRADE_MATCH_MANUAL': '手动撮合',
                  'TRADE_MATCH_PAUSE': '暂停撮合',
                  'TRADE_MATCH_RESUME': '恢复撮合',
                  'TRADE_MATCH_FORCE': '强制撮合',
                  'TRADE_MATCH_DELETE': '删除订单'
                };
                return (
                  <tr key={log.id} className="hover:bg-industrial-50 transition-colors">
                    <td className="py-4">
                      <span className="text-xs font-black text-industrial-800">
                        {operationTypeMap[log.operate_type] || log.operate_type}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-bold text-industrial-600 truncate max-w-[100px]">{log.admin_id}</td>
                    <td className="py-4">
                      <code className="text-[10px] font-mono text-industrial-400">
                        {content?.order_id ? content.order_id.substring(0, 8) + '...' : 'N/A'}
                      </code>
                    </td>
                    <td className="py-4 text-[10px] text-industrial-400 font-bold">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-industrial-400">前状态:</span>
                          <code className="text-[9px] font-mono bg-industrial-50 px-1 py-0.5 rounded text-industrial-600">
                            {content?.before_status || 'N/A'}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-industrial-400">后状态:</span>
                          <code className="text-[9px] font-mono bg-emerald-50 px-1 py-0.5 rounded text-emerald-600">
                            {content?.after_status || 'N/A'}
                          </code>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminMatchIntervention;
