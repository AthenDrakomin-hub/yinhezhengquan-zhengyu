import React, { useState, useEffect, useRef } from 'react';
import { FaComments, FaTimes, FaPaperPlane, FaUser } from 'react-icons/fa';
import { chatService } from '../../services/chatService';
import { supabase } from '../../lib/supabase';
import { Message } from '../../lib/types';

interface TrainingCampChatProps {
  subject?: string;
}

const TrainingCampChat: React.FC<TrainingCampChatProps> = ({ subject = '银河特训营助理' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取当前用户
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // 初始化工单
  useEffect(() => {
    if (userId && isOpen && !ticketId) {
      initTicket();
    }
  }, [userId, isOpen]);

  // 订阅消息更新
  useEffect(() => {
    if (!ticketId) return;

    const unsubscribe = chatService.subscribeToMessages(ticketId, (newMessage) => {
      setMessages(prev => {
        const exists = prev.find(m => m.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
    });

    return () => unsubscribe();
  }, [ticketId]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initTicket = async () => {
    if (!userId) return;
    try {
      const ticket = await chatService.createTicketWithSubject(userId, subject);
      setTicketId(ticket.id);
      // 加载历史消息
      const historyMessages = await chatService.getMessages(ticket.id);
      setMessages(historyMessages);
    } catch (error) {
      console.error('初始化工单失败:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !ticketId || !userId) return;

    setLoading(true);
    try {
      await chatService.sendMessage(ticketId, userId, 'user', inputMessage.trim());
      setInputMessage('');
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative">
      {/* 聊天窗口 */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100]">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-[#0F2B5C] to-[#1E3A8A] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <FaUser className="text-white text-sm" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{subject}</div>
                <div className="text-[#1F2937] text-xs">在线客服</div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition"
            >
              <FaTimes size={18} />
            </button>
          </div>

          {/* 消息区域 */}
          <div className="h-80 overflow-y-auto p-4 bg-gray-50">
            {!userId ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">请先登录后再咨询</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FaComments className="mx-auto text-4xl mb-2 text-gray-300" />
                <p className="text-sm">您好！我是{subject}</p>
                <p className="text-xs mt-1">请问有什么可以帮您？</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        msg.senderType === 'user' 
                          ? 'bg-[#FFD700] text-[#1F2937] rounded-br-none' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="p-3 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={userId ? "请输入消息..." : "请先登录"}
                disabled={!userId || loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#2563EB] disabled:bg-gray-100"
              />
              <button
                onClick={handleSendMessage}
                disabled={!userId || !inputMessage.trim() || loading}
                className="px-3 py-2 bg-[#FFD700] text-[#1F2937] rounded-lg hover:bg-[#E5C100] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 悬浮按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gradient-to-r from-[#0F2B5C] to-[#1E3A8A] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition hover:scale-105"
      >
        <FaComments size={18} />
        <span className="text-sm font-medium">在线咨询</span>
      </button>
    </div>
  );
};

export default TrainingCampChat;
