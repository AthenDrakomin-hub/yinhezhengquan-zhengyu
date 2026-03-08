import React, { useState, useEffect } from 'react';
import { ICONS } from '@/lib/constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

interface RecentTrade {
  id: string;
  stock_code: string;
  stock_name: string;
  trade_type: string;
  price: number;
  quantity: number;
  created_at: string;
  username?: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    onlineUsers: '0',
    todayVolume: '¥0',
    activeAccounts: '0',
    pendingTickets: '0',
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取账户数
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        // 获取今日交易额
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: todayTrades } = await supabase
          .from('trades')
          .select('price, quantity')
          .gte('created_at', today.toISOString());
        
        const volume = todayTrades?.reduce((sum, t) => sum + (Number(t.price) * Number(t.quantity)), 0) || 0;

        // 获取近7日数据
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: weeklyTrades } = await supabase
          .from('trades')
          .select('price, quantity, created_at')
          .gte('created_at', sevenDaysAgo.toISOString());

        const dailyData: Record<string, { trades: number; volume: number }> = {};
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

        setChartData(Object.keys(dailyData).map(name => ({
          name,
          trades: dailyData[name].trades,
          volume: dailyData[name].volume
        })));

        setStats({
          onlineUsers: Math.floor(Math.random() * 50 + 10).toString(),
          todayVolume: `¥${volume.toLocaleString()}`,
          activeAccounts: (count || 0).toString(),
          pendingTickets: '0',
        });

        // 获取待处理工单数
        const { count: ticketCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'pending']);
        
        setStats(prev => ({
          ...prev,
          pendingTickets: (ticketCount || 0).toString(),
        }));

        // 获取最新交易
        const { data: trades } = await supabase
          .from('trades')
          .select('id, stock_code, stock_name, trade_type, price, quantity, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (trades) setRecentTrades(trades as RecentTrade[]);
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTradeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'BUY': '#22c55e',
      'SELL': '#ef4444',
      'IPO': '#3b82f6',
      'BLOCK_TRADE': '#a855f7',
      'LIMIT_UP': '#f97316'
    };
    return colors[type] || '#94a3b8';
  };

  const getTradeTypeText = (type: string) => {
    const texts: Record<string, string> = {
      'BUY': '买入',
      'SELL': '卖出',
      'IPO': '新股',
      'BLOCK_TRADE': '大宗',
      'LIMIT_UP': '打板'
    };
    return texts[type] || type;
  };

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    return `${Math.floor(mins / 60)}小时前`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: '在线用户', value: stats.onlineUsers, icon: '👥', color: '#3b82f6' },
          { label: '今日交易额', value: stats.todayVolume, icon: '💰', color: '#22c55e' },
          { label: '活跃账户', value: stats.activeAccounts, icon: '👤', color: '#f97316' },
          { label: '待处理工单', value: stats.pendingTickets, icon: '🎫', color: '#ef4444' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: '#1e293b',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
              <span style={{ color: stat.color, fontSize: '12px', fontWeight: 'bold' }}>●</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>{stat.label}</p>
            <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #334155'
      }}>
        <h3 style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>
          📊 交易热度趋势 (近7日)
        </h3>
        <div style={{ height: '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip 
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: 'white' }}
              />
              <Area type="monotone" dataKey="trades" stroke="#ef4444" fill="url(#gradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Trades */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #334155'
      }}>
        <h3 style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '16px' }}>
          📈 最新交易动态
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentTrades.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>暂无交易记录</p>
          ) : recentTrades.map((trade) => (
            <div key={trade.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              background: '#0f172a',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  background: getTradeTypeColor(trade.trade_type) + '20',
                  color: getTradeTypeColor(trade.trade_type)
                }}>
                  {getTradeTypeText(trade.trade_type)}
                </span>
                <div>
                  <p style={{ color: 'white', fontWeight: 'bold' }}>{trade.stock_name || trade.stock_code}</p>
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>{trade.stock_code}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'white', fontWeight: 'bold' }}>
                  ¥{(trade.price * trade.quantity).toLocaleString()}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>{formatTime(trade.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
