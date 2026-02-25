import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '@/constants';
import { chatService } from '@/services/chatService';

interface TicketWithUser {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  lastUpdate: string;
  userId: string;
  username: string;
  email: string;
  lastMessageAt: string;
  unreadCountUser: number;
  unreadCountAdmin: number;
  messageCount: number;
}

const AdminTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 加载工单列表
  useEffect(() => {
    loadTickets();
    
    // 订阅工单变化
    const unsubscribe = chatService.subscribeToTickets(() => {
      loadTickets();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await chatService.getAllTicketsForAdmin();
      setTickets(data);
    } catch (error) {
      console.error('加载工单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤工单
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 状态标签文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN': return '待处理';
      case 'IN_PROGRESS': return '处理中';
      case 'CLOSED': return '已关闭';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent-red border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-industrial-600">加载工单中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-industrial-900">工单管理</h1>
          <p className="text-sm text-industrial-600 mt-1">管理用户提交的客服工单和对话</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-industrial-600">总工单数</p>
            <p className="text-2xl font-black text-industrial-900">{tickets.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-industrial-600">待处理</p>
            <p className="text-2xl font-black text-accent-red">
              {tickets.filter(t => t.status === 'OPEN').length}
            </p>
          </div>
        </div>
      </div>

      {/* 过滤和搜索 */}
      <div className="bg-white rounded-xl border border-industrial-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <ICONS.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-400" size={18} />
              <input
                type="text"
                placeholder="搜索工单ID、主题、用户..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-industrial-50 border border-industrial-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-industrial-50 border border-industrial-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
            >
              <option value="ALL">全部状态</option>
              <option value="OPEN">待处理</option>
              <option value="IN_PROGRESS">处理中</option>
              <option value="CLOSED">已关闭</option>
            </select>
            <button
              onClick={loadTickets}
              className="px-4 py-2.5 bg-industrial-900 text-white rounded-lg text-sm font-bold hover:bg-industrial-800 transition-colors flex items-center gap-2"
            >
              <ICONS.Refresh size={16} />
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 工单列表 */}
      <div className="bg-white rounded-xl border border-industrial-200 overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ICONS.MessageCircle size={48} className="text-industrial-300 mb-4" />
            <h3 className="text-lg font-bold text-industrial-700 mb-2">暂无工单</h3>
            <p className="text-sm text-industrial-500">没有找到匹配的工单</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-industrial-50 border-b border-industrial-200">
                  <th className="text-left py-3 px-4 text-xs font-bold text-industrial-600 uppercase tracking-wider">工单信息</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-industrial-600 uppercase tracking-wider">用户</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-industrial-600 uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-industrial-600 uppercase tracking-wider">最后消息</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-industrial-600 uppercase tracking-wider">未读</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-industrial-600 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100">
                {filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id}
                    className="hover:bg-industrial-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-industrial-900">{ticket.id}</span>
                          {ticket.unreadCountAdmin > 0 && (
                            <span className="w-2 h-2 bg-accent-red rounded-full animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-industrial-700 mt-1">{ticket.subject}</p>
                        <p className="text-xs text-industrial-500 mt-1">
                          消息数: {ticket.messageCount} • 创建: {new Date(ticket.lastUpdate).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm font-medium text-industrial-900">{ticket.username}</p>
                        <p className="text-xs text-industrial-500 mt-1">{ticket.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-industrial-700">
                        {ticket.lastMessageAt ? formatTime(ticket.lastMessageAt) : '暂无消息'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`text-sm font-bold ${ticket.unreadCountUser > 0 ? 'text-accent-red' : 'text-industrial-500'}`}>
                            {ticket.unreadCountUser}
                          </div>
                          <div className="text-[10px] text-industrial-500 uppercase">用户未读</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-bold ${ticket.unreadCountAdmin > 0 ? 'text-accent-red' : 'text-industrial-500'}`}>
                            {ticket.unreadCountAdmin}
                          </div>
                          <div className="text-[10px] text-industrial-500 uppercase">客服未读</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/tickets/${ticket.id}`);
                        }}
                        className="px-3 py-1.5 bg-industrial-900 text-white text-xs font-bold rounded-lg hover:bg-industrial-800 transition-colors"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页信息 */}
      {filteredTickets.length > 0 && (
        <div className="flex items-center justify-between text-sm text-industrial-600">
          <div>
            显示 <span className="font-bold">{filteredTickets.length}</span> 个工单中的 <span className="font-bold">{filteredTickets.length}</span> 个
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-industrial-200 hover:bg-industrial-50">
              <ICONS.ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 bg-industrial-900 text-white rounded-lg font-bold">1</span>
            <button className="p-2 rounded-lg border border-industrial-200 hover:bg-industrial-50">
              <ICONS.ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTickets;
