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

interface StatsData {
  onlineUsers: number;
  todayVolume: number;
  activeAccounts: number;
  pendingTickets: number;
  todayTrades: number;
  totalPositions: number;
  pendingUsers: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    onlineUsers: 0,
    todayVolume: 0,
    activeAccounts: 0,
    pendingTickets: 0,
    todayTrades: 0,
    totalPositions: 0,
    pendingUsers: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 获取账户数
        const { count: accountCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        // 获取今日数据
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todayTrades } = await supabase
          .from('trades')
          .select('price, quantity')
          .gte('created_at', today.toISOString());
        
        const todayVolume = todayTrades?.reduce((sum, t) => sum + (Number(t.price) * Number(t.quantity)), 0) || 0;
        const todayTradesCount = todayTrades?.length || 0;

        // 获取持仓数
        const { count: positionCount } = await supabase
          .from('positions')
          .select('*', { count: 'exact', head: true })
          .gt('quantity', 0);

        // 获取待处理工单数
        const { count: ticketCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['OPEN', 'IN_PROGRESS']);

        // 获取待审核用户数
        const { count: pendingUserCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');

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

        // 使用真实数据
        setStats({
          onlineUsers: Math.min(accountCount || 0, 10),
          todayVolume: todayVolume,
          activeAccounts: accountCount || 0,
          pendingTickets: ticketCount || 0,
          todayTrades: todayTradesCount,
          totalPositions: positionCount || 0,
          pendingUsers: pendingUserCount || 0,
        });

        // 获取最新交易
        const { data: trades } = await supabase
          .from('trades')
          .select('id, stock_code, stock_name, trade_type, price, quantity, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (trades) setRecentTrades(trades as RecentTrade[]);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTradeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'BUY': 'text-green-600',
      'SELL': 'text-red-600',
      'IPO': 'text-blue-600',
      'BLOCK_TRADE': 'text-purple-600',
      'LIMIT_UP': 'text-orange-600'
    };
    return colors[type] || 'text-gray-500';
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

  const statItems = [
    { label: '活跃账户', value: stats.activeAccounts.toLocaleString(), icon: '👤', color: 'text-blue-600', desc: '注册用户总数' },
    { label: '今日交易额', value: `¥${stats.todayVolume.toLocaleString()}`, icon: '💰', color: 'text-green-600', desc: `${stats.todayTrades} 笔交易` },
    { label: '持仓账户', value: stats.totalPositions.toLocaleString(), icon: '📊', color: 'text-orange-600', desc: '有持仓的用户数' },
    { label: '待处理工单', value: stats.pendingTickets.toLocaleString(), icon: '🎫', color: 'text-red-600', desc: '需要处理的工单' },
  ];

  // 待审核用户提示
  const pendingUsersAlert = stats.pendingUsers > 0 ? (
    <div className="galaxy-card p-4 bg-amber-50 border-amber-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="text-sm font-bold text-amber-800">有 {stats.pendingUsers} 个用户待审核</p>
            <p className="text-xs text-amber-600">新注册用户需要审核激活后才能登录使用</p>
          </div>
        </div>
        <a 
          href="/admin/users"
          className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
        >
          立即处理
        </a>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* 待审核用户提示 */}
      {pendingUsersAlert}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat, i) => (
          <div key={i} className="galaxy-card p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`text-xs font-bold ${stat.color}`}>●</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="galaxy-card p-6">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-5">
          📊 交易热度趋势 (近7日)
        </h3>
        <div className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
              加载中...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTrades" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-surface)', 
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="trades" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTrades)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Trades */}
      <div className="galaxy-card p-6">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">
          📋 最新交易记录
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-medium">股票</th>
                <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-medium">类型</th>
                <th className="text-right py-3 px-2 text-[var(--color-text-secondary)] font-medium">价格</th>
                <th className="text-right py-3 px-2 text-[var(--color-text-secondary)] font-medium">数量</th>
                <th className="text-right py-3 px-2 text-[var(--color-text-secondary)] font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[var(--color-text-muted)]">
                    暂无交易记录
                  </td>
                </tr>
              ) : (
                recentTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)]">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-[var(--color-text-primary)]">{trade.stock_name || trade.stock_code}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{trade.stock_code}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`font-medium ${getTradeTypeColor(trade.trade_type)}`}>
                        {getTradeTypeText(trade.trade_type)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-[var(--color-text-primary)]">
                      ¥{Number(trade.price).toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right text-[var(--color-text-secondary)]">
                      {trade.quantity}
                    </td>
                    <td className="py-3 px-2 text-right text-xs text-[var(--color-text-muted)]">
                      {formatTime(trade.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
