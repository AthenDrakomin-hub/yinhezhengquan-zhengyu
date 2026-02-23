import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { supabase } from '@/lib/supabase';

const AdminMatchIntervention: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchedPositions, setSearchedPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchUserId, setSearchUserId] = useState('');
  const [logs, setLogs] = useState<any[]>([]);

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

  const handleIntervene = async (orderId: string, type: string, params?: any) => {
    setProcessing(orderId);
    const { error } = await supabase.functions.invoke('admin-intervene-trade', {
      body: { operation_type: type, target_order_id: orderId, params }
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

  return (
    <div className="space-y-8">
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
                    <code className="text-[10px] font-mono text-industrial-400">{order.trade_id.substring(0, 8)}...</code>
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
                            className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                          >
                            中签
                          </button>
                          <button 
                            onClick={() => handleIntervene(order.id, 'IPO_ADJUST', { is_win: false })}
                            disabled={processing === order.id}
                            className="text-[10px] font-black text-red-600 uppercase hover:underline"
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
                            className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                          >
                            强制撮合
                          </button>
                        </>
                      )}
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

      {/* Matching Operation Logs */}
      <div className="industrial-card p-8">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest mb-6">撮合操作日志</h3>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs text-industrial-400 font-bold text-center py-8">暂无操作记录</p>
          ) : logs.map((log) => (
            <div key={log.id} className="p-4 bg-industrial-50 rounded-lg border border-industrial-100 flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-industrial-800 uppercase">撮合干预</span>
                  <span className="text-[9px] text-industrial-400 font-bold">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs font-bold text-industrial-600">{log.remark}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-industrial-400 uppercase">操作人</p>
                <p className="text-xs font-black text-industrial-800">{log.admin_id.substring(0, 8)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 异常调账与强制平仓 */}
      <div className="industrial-card p-8">
        <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight mb-8">异常调账与强制平仓</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-industrial-400 uppercase">搜索用户持仓 (输入用户 ID)</label>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="User ID..." 
                className="industrial-input flex-1"
              />
              <button 
                className="industrial-button-primary"
                onClick={async () => {
                  if (!searchUserId) return;
                  const { data, error } = await supabase.from('positions').select('*').eq('user_id', searchUserId);
                  if (!error) setSearchedPositions(data || []);
                }}
              >
                查询
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchedPositions.map((pos: any) => (
                <div key={pos.id} className="flex items-center justify-between p-4 bg-industrial-50 rounded-xl border border-industrial-200">
                  <div>
                    <p className="text-xs font-black text-industrial-800">{pos.stock_name} ({pos.stock_code})</p>
                    <p className="text-[10px] text-industrial-400 font-bold">{pos.quantity} 股 | 市值: ¥{Number(pos.market_value).toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => handleIntervene('', 'DERIVATIVES_LIQUIDATE', { position_id: pos.id })}
                    className="text-[10px] font-black text-accent-red uppercase hover:underline"
                  >
                    强制平仓
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-industrial-900 p-6 rounded-2xl border border-industrial-800">
            <h4 className="text-xs font-black text-industrial-100 uppercase mb-4">操作说明</h4>
            <ul className="text-[10px] text-industrial-400 space-y-2 list-disc pl-4">
              <li><strong className="text-industrial-200">强制撮合:</strong> 直接将订单标记为成功，不经过价格匹配。</li>
              <li><strong className="text-industrial-200">中签/未中签:</strong> 针对新股申购订单的手动抽签干预。</li>
              <li><strong className="text-industrial-200">强制平仓:</strong> 立即清空用户指定持仓，并按当前市值结算资金。</li>
              <li>所有干预操作均会记录在审计日志中，请谨慎操作。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMatchIntervention;
