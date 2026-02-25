import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { chatService } from '../services/chatService';
import { Message, SupportTicket } from '../types';
import { useAuth } from '../services/authService';

interface ChatViewProps {
  onBack?: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取或创建工单
  useEffect(() => {
    if (!session || !user) {
      navigate('/');
      return;
    }

    const loadTicketAndMessages = async () => {
      setLoading(true);
      try {
        // 获取或创建活动工单
        const activeTicket = await chatService.getOrCreateActiveTicket(user.id);
        setTicket(activeTicket);

        // 加载消息
        const ticketMessages = await chatService.getMessages(activeTicket.id);
        setMessages(ticketMessages);

        // 标记管理员消息为已读
        if (ticketMessages.some(msg => msg.senderType === 'admin' && !msg.isRead)) {
          await chatService.markMessagesAsRead(activeTicket.id, user.id, 'user');
        }
      } catch (error) {
        console.error('加载聊天失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTicketAndMessages();
  }, [session, user, navigate]);

  // 订阅实时消息
  useEffect(() => {
    if (!ticket) return;

    const unsubscribe = chatService.subscribeToMessages(ticket.id, (payload) => {
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

        // 如果是管理员消息，自动标记为已读
        if (newMessage.senderType === 'admin' && !newMessage.isRead) {
          chatService.markMessagesAsRead(ticket.id, user?.id || '', 'user');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [ticket, user]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !ticket || !user || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      await chatService.sendMessage(ticket.id, user.id, 'user', content);
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[var(--color-bg)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <button onClick={onBack || (() => navigate(-1))} className="text-[var(--color-text-secondary)]">
            <ICONS.ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest">客服中心</h1>
          <div className="w-6" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-[#00D4AA] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[var(--color-text-muted)]">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      {/* 顶部标题栏 */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-border)] p-4 flex items-center justify-between">
        <button 
          onClick={onBack || (() => navigate(-1))}
          className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all"
        >
          <ICONS.ArrowLeft size={18} />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00D4AA] rounded-lg flex items-center justify-center text-[#0A1628]">
              <ICONS.Headset size={16} />
            </div>
            <h1 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-primary)]">
              客服中心
            </h1>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            工单号: {ticket?.id} • {ticket?.status === 'CLOSED' ? '已关闭' : '进行中'}
          </p>
        </div>

        <button 
          onClick={() => window.open('tel:95551')}
          className="text-[10px] font-bold text-[#00D4AA] uppercase px-3 py-1.5 border border-[#00D4AA] rounded-lg hover:bg-[#00D4AA] hover:text-[#0A1628] transition-all"
        >
          人工热线
        </button>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-4">
              <ICONS.MessageCircle size={24} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">开始对话</h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-xs">
              您好！我是银河证券证裕单元客服专员，很高兴为您服务。请问有什么可以帮您的？
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[85%]">
                  <div
                    className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${
                      message.senderType === 'user'
                        ? 'bg-[#00D4AA] text-[#0A1628] rounded-br-none'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-bl-none border border-[var(--color-border)]'
                    }`}
                  >
                    {message.content}
                  </div>
                  <div
                    className={`text-[9px] text-[var(--color-text-muted)] mt-1 ${
                      message.senderType === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                    {!message.isRead && message.senderType === 'user' && (
                      <span className="ml-2 text-[#FF6B6B]">未读</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {sending && (
          <div className="flex justify-end">
            <div className="max-w-[85%] p-3 rounded-2xl rounded-br-none bg-[#00D4AA] text-[#0A1628]">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-[#0A1628] rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-[#0A1628] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-[#0A1628] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border)] p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题..."
              className="w-full bg-[var(--color-surface)] h-12 px-4 py-3 rounded-xl border border-[var(--color-border)] text-xs font-medium outline-none text-[var(--color-text-primary)] resize-none"
              rows={1}
              disabled={sending || ticket?.status === 'CLOSED'}
            />
            {ticket?.status === 'CLOSED' && (
              <div className="absolute inset-0 bg-[var(--color-surface)]/80 rounded-xl flex items-center justify-center">
                <span className="text-[10px] text-[var(--color-text-muted)] font-bold">
                  工单已关闭，无法发送消息
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || ticket?.status === 'CLOSED'}
            className="w-12 h-12 bg-[#00D4AA] rounded-xl flex items-center justify-center text-[#0A1628] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-[#0A1628] border-t-transparent rounded-full animate-spin" />
            ) : (
              <ICONS.ArrowRight size={20} />
            )}
          </button>
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)] text-center mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  );
};

export default ChatView;
