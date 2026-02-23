import React, { useState, useEffect } from 'react';
import { ICONS } from '@/constants';
import { tradeService } from '@/services/tradeService';

const AdminTradeManagement: React.FC = () => {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      // 获取所有用户的交易记录 (管理员视角)
      const data = await tradeService.getTransactions(undefined, 100);
      setTrades(data || []);
    } catch (err) {
      console.error('获取交易流水失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">交易流水</h3>
        <div className="flex gap-2">
          <input type="text" placeholder="搜索用户/代码..." className="industrial-input w-64 h-10" />
          <button className="industrial-button-primary h-10" onClick={fetchTrades}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新数据
          </button>
        </div>
      </div>

      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">交易编号</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">标的</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">类型</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">价格/数量</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">总额</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">时间</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : trades.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无交易记录</td></tr>
              ) : trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-black text-industrial-800 truncate max-w-[100px]">{trade.id}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-600 truncate max-w-[100px]">{trade.user_id}</td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-industrial-800">{trade.stock_name}</p>
                    <p className="text-[9px] font-bold text-industrial-400 font-mono">{trade.stock_code}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      trade.trade_type === 'BUY' ? 'bg-red-50 text-red-600' : 
                      trade.trade_type === 'SELL' ? 'bg-emerald-50 text-emerald-600' : 
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {trade.trade_type === 'BUY' ? '买入' : 
                       trade.trade_type === 'SELL' ? '卖出' : 
                       trade.trade_type === 'IPO' ? '新股申购' :
                       trade.trade_type === 'BLOCK_TRADE' ? '大宗交易' : '一键打板'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-industrial-800">¥{parseFloat(trade.price).toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-industrial-400">{trade.quantity} 股</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-industrial-900">¥{(parseFloat(trade.price) * trade.quantity).toLocaleString()}</td>
                  <td className="px-6 py-4 text-[10px] text-industrial-400 font-bold">
                    {new Date(trade.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      trade.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 
                      trade.status === 'MATCHING' ? 'bg-blue-50 text-blue-600' :
                      trade.status === 'CANCELLED' ? 'bg-industrial-100 text-industrial-400' :
                      trade.status === 'FAILED' ? 'bg-red-50 text-red-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {trade.status === 'SUCCESS' ? '成功' : 
                       trade.status === 'MATCHING' ? '撮合中' :
                       trade.status === 'CANCELLED' ? '已撤单' : 
                       trade.status === 'FAILED' ? '失败' : '处理中'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTradeManagement;
