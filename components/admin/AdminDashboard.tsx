import React from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: '09:30', users: 12, trades: 45 },
  { name: '10:30', users: 25, trades: 120 },
  { name: '11:30', users: 32, trades: 89 },
  { name: '13:30', users: 28, trades: 67 },
  { name: '14:30', users: 45, trades: 210 },
  { name: '15:00', users: 50, trades: 340 },
];

const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: '在线用户', value: '50', change: '+12%', icon: ICONS.User, color: 'text-blue-600' },
          { label: '今日交易额', value: '¥1,240,500', change: '+5.4%', icon: ICONS.Trade, color: 'text-accent-red' },
          { label: '活跃账户', value: '128', change: '+2.1%', icon: ICONS.Shield, color: 'text-emerald-600' },
          { label: '系统负载', value: '12%', change: '正常', icon: ICONS.Zap, color: 'text-orange-500' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="industrial-card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg bg-industrial-50 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className={`text-xs font-black px-2 py-1 rounded ${
                stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-industrial-100 text-industrial-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-[10px] font-black text-industrial-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-industrial-800 tracking-tighter">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 industrial-card p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">实时交易热度</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-industrial-900 text-white text-[10px] font-bold">今日</button>
              <button className="px-3 py-1 rounded bg-industrial-100 text-industrial-600 text-[10px] font-bold">昨日</button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTrades" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4500" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ff4500" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a8a8a8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a8a8a8' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="trades" stroke="#ff4500" strokeWidth={3} fillOpacity={1} fill="url(#colorTrades)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="industrial-card p-6">
          <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest mb-6">异常交易预警</h3>
          <div className="space-y-4">
            {[
              { user: 'ZY-8821', action: '大额提现', amount: '¥500,000', time: '14:22', status: 'PENDING' },
              { user: 'ZY-1029', action: '高频打板', amount: '24笔/分', time: '14:15', status: 'WARNING' },
              { user: 'ZY-4432', action: '异地登录', amount: '俄罗斯', time: '13:50', status: 'BLOCKED' },
            ].map((alert, i) => (
              <div key={i} className="p-4 bg-industrial-50 rounded-lg border border-industrial-100 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-industrial-800">{alert.user}</span>
                    <span className="text-[9px] font-bold text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded">{alert.action}</span>
                  </div>
                  <p className="text-xs font-black text-industrial-800">{alert.amount}</p>
                  <p className="text-[9px] text-industrial-400 font-bold">{alert.time}</p>
                </div>
                <button className="text-[10px] font-black text-blue-600 uppercase hover:underline">处理</button>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 rounded-lg border border-industrial-200 text-industrial-400 text-[10px] font-black uppercase tracking-widest hover:bg-industrial-50 transition-all">
            查看全部预警
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
