import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../lib/constants';
import { chatService } from '../../services/chatService';
import { Message, SupportTicket } from '../../lib/types';
import { useAuth } from '../../services/authService';

interface ChatViewProps {
  onBack?: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 获取或创建工单
  useEffect(() => {
    if (!session || !user) {
      return;
    }

    let mounted = true;

    const loadTicketAndMessages = async () => {
      try {
        // 获取或创建活动工单
        const activeTicket = await chatService.getOrCreateActiveTicket(user.id);
        if (!mounted) return;
        
        setTicket(activeTicket);

        // 加载消息
        const ticketMessages = await chatService.getMessages(activeTicket.id);
        if (!mounted) return;
        
        setMessages(ticketMessages);

        // 标记管理员消息为已读
        if (ticketMessages.some(msg => msg.senderType === 'admin' && !msg.isRead)) {
          await chatService.markMessagesAsRead(activeTicket.id, user.id, 'user');
        }
      } catch (err) {
        console.error('加载聊天失败:', err);
        if (mounted) {
          setError('加载失败，请重试');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTicketAndMessages();

    return () => {
      mounted = false;
    };
  }, [session, user]);

  // 订阅实时消息
  useEffect(() => {
    if (!ticket?.id) return;

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

        setMessages(prev => {
          // 避免重复消息
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        // 如果是管理员消息，自动标记为已读
        if (newMessage.senderType === 'admin' && !newMessage.isRead && user?.id) {
          chatService.markMessagesAsRead(ticket.id, user.id, 'user');
        }
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [ticket?.id, user?.id]);

  // 滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || !ticket || !user || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      await chatService.sendMessage(ticket.id, user.id, 'user', content);
    } catch (err) {
      console.error('发送消息失败:', err);
      setInput(content); // 恢复输入
      setError('发送失败，请重试');
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

  // 加载状态
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <button 
            onClick={onBack || (() => navigate(-1))} 
            className="w-10 h-10 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-secondary)]"
          >
            <ICONS.ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-bold text-[var(--color-text-primary)]">客服中心</h1>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--color-text-muted)]">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error && !ticket) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <button 
            onClick={onBack || (() => navigate(-1))} 
            className="w-10 h-10 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-secondary)]"
          >
            <ICONS.ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-bold text-[var(--color-text-primary)]">客服中心</h1>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm text-[var(--color-text-muted)] mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* 顶部标题栏 */}
      <div className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 flex items-center justify-between">
        <button 
          onClick={onBack || (() => navigate('/client/dashboard'))}
          className="w-10 h-10 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all"
        >
          <ICONS.ArrowLeft size={18} />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white">
              <ICONS.Headset size={16} />
            </div>
            <h1 className="text-sm font-bold text-[var(--color-text-primary)]">
              客服中心
            </h1>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            {ticket?.status === 'CLOSED' ? '工单已关闭' : '在线服务中'}
          </p>
        </div>

        <button 
          onClick={() => window.open('tel:95551')}
          className="text-xs font-medium text-[var(--color-primary)] px-3 py-1.5 border border-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-all"
        >
          热线
        </button>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-border)]">
              <ICONS.MessageCircle size={24} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">开始对话</h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-xs leading-relaxed">
              您好！我是日斗投资单元客服专员，很高兴为您服务。请问有什么可以帮您的？
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[80%]">
                  <div
                    className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                      message.senderType === 'user'
                        ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-bl-sm border border-[var(--color-border)]'
                    }`}
                  >
                    {message.content}
                  </div>
                  <div
                    className={`text-[10px] text-[var(--color-text-muted)] mt-1 px-1 ${
                      message.senderType === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {sending && (
          <div className="flex justify-end">
            <div className="max-w-[80%] px-4 py-2.5 rounded-xl rounded-br-sm bg-[var(--color-primary)] text-white">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[var(--color-surface)] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[var(--color-surface)] rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-1.5 h-1.5 bg-[var(--color-surface)] rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="flex-shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-3">
        {error && (
          <p className="text-xs text-red-500 mb-2 text-center">{error}</p>
        )}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题..."
              className="w-full bg-[var(--color-bg)] h-12 px-4 py-3 rounded-lg border border-[var(--color-border)] text-sm outline-none text-[var(--color-text-primary)] resize-none focus:border-[var(--color-primary)] transition-all"
              rows={1}
              disabled={sending || ticket?.status === 'CLOSED'}
            />
            {ticket?.status === 'CLOSED' && (
              <div className="absolute inset-0 bg-[var(--color-surface)]/80 rounded-lg flex items-center justify-center">
                <span className="text-xs text-[var(--color-text-muted)] font-medium">
                  工单已关闭
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || ticket?.status === 'CLOSED'}
            className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ICONS.ArrowRight size={20} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] text-center mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  );
};

export default ChatView;
