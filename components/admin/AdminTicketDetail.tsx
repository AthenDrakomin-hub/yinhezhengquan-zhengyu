import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ICONS } from '@/constants';
import { chatService } from '@/services/chatService';
import { Message, SupportTicket } from '@/types';
import { useAuth } from '@/services/authService';

const AdminTicketDetail: React.FC = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载工单详情和消息
  useEffect(() => {
    if (!ticketId) return;

    const loadTicketAndMessages = async () => {
      setLoading(true);
      try {
        // 加载消息
        const ticketMessages = await chatService.getMessages(ticketId);
        setMessages(ticketMessages);

        // 标记用户消息为已读
        if (ticketMessages.some(msg => msg.senderType === 'user' && !msg.isRead)) {
          await chatService.markMessagesAsRead(ticketId, user?.id || '', 'admin');
        }

        // 获取工单信息（从列表数据中获取或单独查询）
        const allTickets = await chatService.getAllTicketsForAdmin();
        const foundTicket = allTickets.find(t => t.id === ticketId);
        if (foundTicket) {
          setTicket({
            id: foundTicket.id,
            subject: foundTicket.subject,
            status: foundTicket.status,
            lastUpdate: foundTicket.lastUpdate,
            userId: foundTicket.userId,
            lastMessageAt: foundTicket.lastMessageAt,
            unreadCountUser: foundTicket.unreadCountUser,
            unreadCountAdmin: foundTicket.unreadCountAdmin,
          });
        }
      } catch (error) {
        console.error('加载工单详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTicketAndMessages();
  }, [ticketId, user]);

  // 订阅实时消息
  useEffect(() => {
    if (!ticketId) return;

    const unsubscribe = chatService.subscribeToMessages(ticketId, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMessage: Message = {
          id: payload.new.id,
          ticketId: payload.new.ticket_id,
          senderId: payload.new.sender_id,
          senderType: payload.new.sender_type,
          content: payload.new.content,
          isRead: payload.new.is_read,
          createdAt: payload.new.created_at,
        };

        setMessages(prev => [...prev, newMessage]);

        // 如果是用户消息，自动标记为已读
        if (newMessage.senderType === 'user' && !newMessage.isRead) {
          chatService.markMessagesAsRead(ticketId, user?.id || '', 'admin');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [ticketId, user]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !ticketId || !user || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      await chatService.sendMessage(ticketId, user.id, 'admin', content);
    } catch (error) {
      console.error('发送消息失败:', error);
      // 恢复输入
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUpdateStatus = async (newStatus: 'IN_PROGRESS' | 'CLOSED') => {
    if (!ticketId || updatingStatus) return;

    setUpdatingStatus(true);
    try {
      const updatedTicket = await chatService.updateTicketStatus(ticketId, newStatus);
      if (updatedTicket) {
        setTicket(updatedTicket);
      }
    } catch (error) {
      console.error('更新工单状态失败:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
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
          <p className="text-sm text-industrial-600">加载工单详情中...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <ICONS.AlertCircle size={48} className="text-industrial-300 mb-4" />
        <h3 className="text-lg font-bold text-industrial-700 mb-2">工单不存在</h3>
        <p className="text-sm text-industrial-500 mb-4">找不到指定的工单</p>
        <button
          onClick={() => navigate('/admin/tickets')}
          className="px-4 py-2 bg-industrial-900 text-white rounded-lg text-sm font-bold hover:bg-industrial-800 transition-colors"
        >
          返回工单列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 工单头部信息 */}
      <div className="bg-white rounded-xl border border-industrial-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate('/admin/tickets')}
                className="w-10 h-10 rounded-lg bg-industrial-50 border border-industrial-200 flex items-center justify-center text-industrial-600 hover:bg-industrial-100 transition-colors"
              >
                <ICONS.ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl font-black text-industrial-900">{ticket.subject}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                    {getStatusText(ticket.status)}
                  </span>
                  <span className="text-sm text-industrial-600">工单号: {ticket.id}</span>
                  <span className="text-sm text-industrial-600">创建: {new Date(ticket.lastUpdate).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-industrial-50 rounded-lg p-4">
                <p className="text-xs font-bold text-industrial-600 uppercase mb-1">用户信息</p>
                <p className="text-sm font-medium text-industrial-900">{ticket.userId}</p>
              </div>
              <div className="bg-industrial-50 rounded-lg p-4">
                <p className="text-xs font-bold text-industrial-600 uppercase mb-1">最后消息</p>
                <p className="text-sm font-medium text-industrial-900">
                  {ticket.lastMessageAt ? formatDate(ticket.lastMessageAt) : '暂无消息'}
                </p>
              </div>
              <div className="bg-industrial-50 rounded-lg p-4">
                <p className="text-xs font-bold text-industrial-600 uppercase mb-1">未读消息</p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-lg font-black text-industrial-900">{ticket.unreadCountUser || 0}</p>
                    <p className="text-[10px] text-industrial-500">用户未读</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-industrial-900">{ticket.unreadCountAdmin || 0}</p>
                    <p className="text-[10px] text-industrial-500">客服未读</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {ticket.status !== 'CLOSED' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('IN_PROGRESS')}
                  disabled={updatingStatus || ticket.status === 'IN_PROGRESS'}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-bold hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingStatus ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ICONS.Play size={16} />
                  )}
                  {ticket.status === 'IN_PROGRESS' ? '处理中' : '开始处理'}
                </button>
                <button
                  onClick={() => handleUpdateStatus('CLOSED')}
                  disabled={updatingStatus}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingStatus ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ICONS.Check size={16} />
                  )}
                  关闭工单
                </button>
              </>
            )}
            {ticket.status === 'CLOSED' && (
              <button
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updatingStatus ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ICONS.Refresh size={16} />
                )}
                重新打开
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 对话区域 */}
      <div className="bg-white rounded-xl border border-industrial-200 overflow-hidden">
        <div className="p-4 border-b border-industrial-200">
          <h2 className="text-lg font-black text-industrial-900">对话记录</h2>
          <p className="text-sm text-industrial-600">共 {messages.length} 条消息</p>
        </div>

        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <ICONS.MessageCircle size={48} className="text-industrial-300 mb-4" />
              <h3 className="text-lg font-bold text-industrial-700 mb-2">暂无消息</h3>
              <p className="text-sm text-industrial-500">开始与用户对话</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[85%]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        message.senderType === 'admin' 
                          ? 'bg-accent-red text-white' 
                          : 'bg-industrial-100 text-industrial-700'
                      }`}>
                        {message.senderType === 'admin' ? '客' : '用'}
                      </div>
                      <span className="text-xs text-industrial-500">
                        {message.senderType === 'admin' ? '客服专员' : '用户'} • {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        message.senderType === 'admin'
                          ? 'bg-accent-red text-white rounded-br-none'
                          : 'bg-industrial-50 text-industrial-900 rounded-bl-none border border-industrial-200'
                      }`}
                    >
                      {message.content}
                    </div>
                    {!message.isRead && message.senderType === 'user' && (
                      <div className="text-right mt-1">
                        <span className="text-[10px] text-accent-red font-bold">未读</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}

          {sending && (
            <div className="flex justify-end">
              <div className="max-w-[85%] p-3 rounded-lg rounded-br-none bg-accent-red text-white">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-industrial-200 p-4">
          {ticket.status === 'CLOSED' ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-800 font-bold">工单已关闭，无法发送消息</p>
              <p className="text-xs text-yellow-600 mt-1">如需继续对话，请先重新打开工单</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入回复内容..."
                  className="w-full bg-industrial-50 h-20 px-4 py-3 rounded-lg border border-industrial-200 text-sm outline-none text-industrial-900 resize-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
                  rows={3}
                  disabled={sending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="px-6 py-3 bg-accent-red text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ICONS.Send size={16} />
                  )}
                  发送
                </button>
                <button
                  onClick={() => setInput('')}
                  className="px-6 py-3 bg-industrial-100 text-industrial-700 rounded-lg text-sm font-bold hover:bg-industrial-200 transition-colors"
                >
                  清空
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-industrial-500 mt-2">
            按 Enter 发送，Shift + Enter 换行 • 工单状态: <span className={`font-bold ${getStatusColor(ticket.status)} px-2 py-0.5 rounded`}>{getStatusText(ticket.status)}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminTicketDetail;
