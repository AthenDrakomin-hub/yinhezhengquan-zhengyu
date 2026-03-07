import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

// 最新交易类型定义
interface RecentTrade {
  id: string;
  user_id: string;
  stock_code: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL' | 'IPO' | 'BLOCK_TRADE' | 'LIMIT_UP';
  price: number;
  quantity: number;
  amount: number;
  status: string;
  created_at: string;
  username?: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    onlineUsers: '0',
    todayVolume: '¥0',
    activeAccounts: '0',
    systemLoad: '0%'
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const tradesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

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
      'BUY': 'bg-red-100 text-red-600',
      'SELL': 'bg-emerald-100 text-emerald-600',
      'IPO': 'bg-blue-100 text-blue-600',
      'BLOCK_TRADE': 'bg-purple-100 text-purple-600',
      'LIMIT_UP': 'bg-orange-100 text-orange-600'
    };
    return map[type] || 'bg-gray-100 text-gray-600';
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 获取活跃账户数
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        // 获取今日交易额
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: todayTrades } = await supabase
          .from('trades')
          .select('price, quantity, created_at')
          .gte('created_at', today.toISOString());
        
        const volume = todayTrades?.reduce((sum, t) => sum + (Number(t.price) * Number(t.quantity)), 0) || 0;

        // 获取近7日交易数据
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: weeklyTrades } = await supabase
          .from('trades')
          .select('price, quantity, created_at')
          .gte('created_at', sevenDaysAgo.toISOString());
        
        // 按日期聚合数据
        const dailyData: Record<string, { trades: number; volume: number }> = {};
        
        // 初始化最近7天的数据
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
          dailyData[dateStr] = { trades: 0, volume: 0 };
        }
        
        weeklyTrades?.forEach(trade => {
          const dateStr = new Date(trade.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
          if (dailyData[dateStr]) {
            dailyData[dateStr].trades += 1;
            dailyData[dateStr].volume += Number(trade.price) * Number(trade.quantity);
          }
        });
        
        // 转换为图表所需格式
        const chartPoints = Object.keys(dailyData).map(date => ({
          name: date,
          trades: dailyData[date].trades,
          volume: dailyData[date].volume
        }));
        
        setChartData(chartPoints);
        
        // 获取在线用户数
        const recentMinutes = 10;
        const recentTime = new Date();
        recentTime.setMinutes(recentTime.getMinutes() - recentMinutes);
        
        const { data: recentTradeActivity } = await supabase
          .from('trades')
          .select('user_id')
          .gte('created_at', recentTime.toISOString());
        
        const { data: recentPositionActivity } = await supabase
          .from('positions')
          .select('user_id')
          .gte('updated_at', recentTime.toISOString());
        
        const activeUserIds = new Set<string>();
        
        recentTradeActivity?.forEach(activity => {
          if (activity.user_id) activeUserIds.add(activity.user_id);
        });
        
        recentPositionActivity?.forEach(activity => {
          if (activity.user_id) activeUserIds.add(activity.user_id);
        });
        
        const uniqueUsers = activeUserIds.size;

        setStats({
          onlineUsers: uniqueUsers.toString(),
          todayVolume: `¥${volume.toLocaleString()}`,
          activeAccounts: (userCount || 0).toString(),
          systemLoad: `${Math.floor(Math.random() * 20 + 5)}%`
        });
      } catch (error) {
        console.error('Fetch stats error:', error);
      } finally {
        setLoading(false);
      }
    };

    // 获取最新交易动态
    const fetchRecentTrades = async () => {
      try {
        const { data: trades, error } = await supabase
          .from('trades')
          .select(`
            id,
            user_id,
            stock_code,
            stock_name,
            trade_type,
            price,
            quantity,
            status,
            created_at,
            profiles!trades_user_id_fkey (username)
          `)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!error && trades) {
          const formattedTrades: RecentTrade[] = trades.map(t => ({
            id: t.id,
            user_id: t.user_id,
            stock_code: t.stock_code,
            stock_name: t.stock_name,
            trade_type: t.trade_type,
            price: Number(t.price),
            quantity: Number(t.quantity),
            amount: Number(t.price) * Number(t.quantity),
            status: t.status,
            created_at: t.created_at,
            username: (t.profiles as any)?.username || t.user_id?.substring(0, 8)
          }));
          setRecentTrades(formattedTrades);
        }
      } catch (error) {
        console.error('Fetch recent trades error:', error);
      }
    };

    fetchStats();
    fetchRecentTrades();

    // 定时刷新
    const statsInterval = setInterval(fetchStats, 30000);
    const tradesInterval = setInterval(fetchRecentTrades, 5000); // 每5秒刷新交易动态

    // 实时订阅新交易
    const channel = supabase
      .channel('admin-trades-channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'trades' },
        (payload) => {
          const newTrade = payload.new as any;
          setRecentTrades(prev => {
            const exists = prev.some(t => t.id === newTrade.id);
            if (exists) return prev;
            
            const formatted: RecentTrade = {
              id: newTrade.id,
              user_id: newTrade.user_id,
              stock_code: newTrade.stock_code,
              stock_name: newTrade.stock_name,
              trade_type: newTrade.trade_type,
              price: Number(newTrade.price),
              quantity: Number(newTrade.quantity),
              amount: Number(newTrade.price) * Number(newTrade.quantity),
              status: newTrade.status,
              created_at: newTrade.created_at,
              username: newTrade.user_id?.substring(0, 8)
            };
            
            // 保持最多15条记录
            return [formatted, ...prev].slice(0, 15);
          });
        }
      )
      .subscribe();

    return () => {
      clearInterval(statsInterval);
      clearInterval(tradesInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && tradesContainerRef.current) {
      tradesContainerRef.current.scrollTop = 0;
    }
  }, [recentTrades, autoScroll]);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: '在线用户', value: stats.onlineUsers, change: '+12%', icon: ICONS.User, color: 'text-blue-600' },
          { label: '今日交易额', value: stats.todayVolume, change: '+5.4%', icon: ICONS.Trade, color: 'text-accent-red' },
          { label: '活跃账户', value: stats.activeAccounts, change: '+2.1%', icon: ICONS.Shield, color: 'text-emerald-600' },
          { label: '系统负载', value: stats.systemLoad, change: '正常', icon: ICONS.Zap, color: 'text-orange-500' },
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
            <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">交易热度趋势 (近7日)</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-industrial-900 text-white text-[10px] font-bold">交易量</button>
              <button className="px-3 py-1 rounded bg-industrial-100 text-industrial-600 text-[10px] font-bold">交易额</button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTradesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4500" stopOpacity={0.2}/>
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
                  formatter={(value: any, name: string) => [
                    name === 'trades' ? `${value} 笔` : `¥${Number(value).toLocaleString()}`,
                    name === 'trades' ? '交易量' : '交易额'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="trades" 
                  stroke="#ff4500" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorTradesGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="industrial-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">异常交易预警</h3>
            <span className="w-2 h-2 bg-accent-red rounded-full animate-pulse" />
          </div>
          <div className="space-y-4">
            {[
              { user: 'ZY-8821', action: '大额提现监控', amount: '¥500,000', time: '14:22', status: 'PENDING', type: 'WITHDRAW' },
              { user: 'ZY-1029', action: '高频打板检测', amount: '24笔/分', time: '14:15', status: 'WARNING', type: 'LIMIT_UP' },
              { user: 'ZY-4432', action: '异地登录告警', amount: '俄罗斯', time: '13:50', status: 'BLOCKED', type: 'LOGIN' },
              { user: 'ZY-9901', action: '大额提现监控', amount: '¥1,200,000', time: '13:10', status: 'PENDING', type: 'WITHDRAW' },
            ].map((alert, i) => (
              <div key={i} className="p-4 bg-industrial-50 rounded-lg border border-industrial-100 flex justify-between items-center group hover:border-accent-red/30 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-industrial-800">{alert.user}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      alert.type === 'LOGIN' ? 'bg-orange-100 text-orange-600' : 'bg-accent-red/10 text-accent-red'
                    }`}>{alert.action}</span>
                  </div>
                  <p className="text-xs font-black text-industrial-800">{alert.amount}</p>
                  <p className="text-[9px] text-industrial-400 font-bold">{alert.time}</p>
                </div>
                <button className="text-[10px] font-black text-blue-600 uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity">处理</button>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 rounded-lg border border-industrial-200 text-industrial-400 text-[10px] font-black uppercase tracking-widest hover:bg-industrial-50 transition-all">
            查看全部预警
          </button>
        </div>
      </div>

      {/* 最新交易动态列表 */}
      <div className="industrial-card p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">最新交易动态</h3>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              实时更新
            </span>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[10px] font-bold text-industrial-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3 h-3 rounded border-industrial-300"
              />
              自动滚动
            </label>
            <button className="text-[10px] font-black text-blue-600 uppercase hover:underline">
              查看全部
            </button>
          </div>
        </div>

        <div 
          ref={tradesContainerRef}
          className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-industrial-200 scrollbar-track-transparent"
        >
          <AnimatePresence initial={false}>
            {recentTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-industrial-400">
                <ICONS.Trade size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-bold">暂无交易记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTrades.map((trade, index) => (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3, delay: index === 0 ? 0 : 0 }}
                    className="p-4 bg-industrial-50 rounded-lg border border-industrial-100 hover:border-industrial-200 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* 交易类型图标 */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          trade.trade_type === 'BUY' ? 'bg-red-100' :
                          trade.trade_type === 'SELL' ? 'bg-emerald-100' :
                          'bg-blue-100'
                        }`}>
                          <ICONS.Trade size={20} className={
                            trade.trade_type === 'BUY' ? 'text-red-600' :
                            trade.trade_type === 'SELL' ? 'text-emerald-600' :
                            'text-blue-600'
                          } />
                        </div>
                        
                        {/* 交易信息 */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-industrial-800">{trade.stock_code}</span>
                            <span className="text-[10px] text-industrial-400">{trade.stock_name}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${getTradeTypeColor(trade.trade_type)}`}>
                              {getTradeTypeText(trade.trade_type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="text-industrial-400">用户:</span>
                            <span className="font-bold text-industrial-600">{trade.username || trade.user_id?.substring(0, 8)}</span>
                            <span className="text-industrial-300">|</span>
                            <span className="text-industrial-400">数量:</span>
                            <span className="font-bold text-industrial-600">{trade.quantity.toLocaleString()}股</span>
                            <span className="text-industrial-300">|</span>
                            <span className="text-industrial-400">单价:</span>
                            <span className="font-bold text-industrial-600">¥{trade.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 金额和时间 */}
                      <div className="text-right">
                        <p className="text-sm font-black text-industrial-800">¥{trade.amount.toLocaleString()}</p>
                        <p className="text-[9px] text-industrial-400 font-bold">{formatTime(trade.created_at)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
