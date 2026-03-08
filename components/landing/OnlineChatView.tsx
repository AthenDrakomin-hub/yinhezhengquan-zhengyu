import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRobot, FaUser, FaPaperPlane, FaSpinner, FaBell, FaVolumeUp, FaVolumeMute, FaClock } from 'react-icons/fa';
import VisitorInfoModal from './VisitorInfoModal';
import {
  getGuestId,
  getVisitorInfo,
  saveVisitorInfo,
  createTicketAndQueue,
  checkTicketStatus,
  getTicketMessages,
  sendMessage,
  subscribeToTicketStatus,
  subscribeToMessages,
} from '../../services/liveChatService';
import { soundLibrary, requestNotificationPermission, showNotification } from '../../lib/sound';
import type { Message } from '../../lib/types';

interface ChatMessage extends Message {
  isPending?: boolean;
}

type ChatPhase = 'form' | 'queuing' | 'chatting' | 'ended';

const LOGO_URL = import.meta.env.VITE_LOGO_URL || '/logo.png';
const AGENT_AVATAR = import.meta.env.VITE_AGENT_AVATAR_URL || '/avatar-default.png';

const QUICK_QUESTIONS = [
  '如何修改交易密码？',
  '开户需要准备哪些材料？',
  '如何查询持仓和资金？',
  '手机交易软件下载地址？',
];

// 格式化时间
const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// 消息气泡组件
const MessageBubble = memo(({ msg, guestName }: { msg: ChatMessage; guestName: string }) => {
  const isUser = msg.senderType === 'user';
  const isSystem = msg.senderType === 'system';
  const time = formatTime(msg.createdAt);
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex-shrink-0">
          {isSystem ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs flex items-center justify-center font-bold shadow-md">
              系
            </div>
          ) : (
            <img 
              src={AGENT_AVATAR} 
              alt="客服" 
              className="w-8 h-8 rounded-full object-cover shadow-md"
            />
          )}
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm'
            : isSystem
            ? 'bg-amber-50 text-amber-900 rounded-bl-sm border border-amber-200'
            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
        } ${msg.isPending ? 'opacity-70' : ''}`}
      >
        {msg.content.split('\n').map((line, idx) => (
          <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
        ))}
        <div className={`mt-1 text-[10px] ${isUser ? 'text-blue-100 text-right' : 'text-gray-400 text-right'}`}>
          {time} {msg.isPending && '· 发送中'}
        </div>
      </div>
      {isUser && (
        <div className="ml-2 mt-1 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 text-white text-xs flex items-center justify-center font-bold">
            {guestName ? guestName.charAt(0) : <FaUser />}
          </div>
        </div>
      )}
    </div>
  );
});

// 排队状态组件
const QueueStatus = ({ position, onCancel }: { position: number; onCancel: () => void }) => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="text-center max-w-sm">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FaClock className="text-3xl text-blue-600 animate-pulse" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">正在排队中</h3>
      <p className="text-gray-500 mb-4">您当前排在第 <span className="text-blue-600 font-bold text-xl">{position}</span> 位</p>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: `${Math.max(10, 100 - position * 10)}%` }} />
      </div>
      <p className="text-sm text-gray-400 mb-6">客服人员接入后将自动开始会话</p>
      <button
        onClick={onCancel}
        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        取消排队
      </button>
    </div>
  </div>
);

const OnlineChatView: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ChatPhase>('form');
  const [showForm, setShowForm] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [ticketId, setTicketId] = useState<string>('');
  const [guestId, setGuestId] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [queuePosition, setQueuePosition] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [clientIP, setClientIP] = useState('获取中...');
  const scrollRef = useRef<HTMLDivElement>(null);
  const unsubscribeStatusRef = useRef<(() => void) | null>(null);
  const unsubscribeMsgRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化
  useEffect(() => {
    const gid = getGuestId();
    setGuestId(gid);
    
    // 获取IP
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIP(data.ip))
      .catch(() => setClientIP('218.*.*.*'));

    // 检查是否有访客信息
    const visitorInfo = getVisitorInfo();
    if (visitorInfo) {
      setGuestName(visitorInfo.name);
      // 自动开始排队
      startQueue(visitorInfo.name, visitorInfo.phone);
    } else {
      setShowForm(true);
    }

    // 请求通知权限
    requestNotificationPermission().then(setNotificationsEnabled);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (unsubscribeStatusRef.current) unsubscribeStatusRef.current();
      if (unsubscribeMsgRef.current) unsubscribeMsgRef.current();
    };
  }, []);

  // 开始排队
  const startQueue = async (name: string, phone: string) => {
    try {
      const { ticketId: tid, queuePosition: pos } = await createTicketAndQueue(guestId, name, phone);
      setTicketId(tid);
      setQueuePosition(pos);
      setPhase('queuing');
      setShowForm(false);

      // 播放连接音效
      soundLibrary.playConnect();

      // 订阅工单状态变化
      unsubscribeStatusRef.current = subscribeToTicketStatus(tid, (status, adminId) => {
        if (status === 'PROCESSING' && adminId) {
          handleAdminConnected(tid);
        }
      });

      // 定期刷新排队位置
      intervalRef.current = setInterval(async () => {
        try {
          const status = await checkTicketStatus(tid);
          if (status.queuePosition) {
            setQueuePosition(status.queuePosition);
          }
        } catch (err) {
          console.error('刷新排队状态失败:', err);
        }
      }, 5000);

    } catch (err) {
      console.error('开始排队失败:', err);
      alert('系统繁忙，请稍后重试');
    }
  };

  // 客服接入处理
  const handleAdminConnected = async (tid: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setPhase('chatting');
    
    // 播放通知音
    soundLibrary.playNotification();
    
    // 浏览器通知
    if (notificationsEnabled) {
      showNotification('客服已接入', '您的专属客服已上线，开始为您服务');
    }

    // 获取历史消息
    const msgs = await getTicketMessages(tid);
    setMessages(msgs.map(m => ({ ...m, isPending: false })));

    // 添加系统欢迎消息
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      ticketId: tid,
      senderId: 'system',
      senderType: 'system',
      content: `您好 ${guestName}，客服专员已接入会话，请问有什么可以帮助您？`,
      isRead: false,
      createdAt: new Date().toISOString(),
      isPending: false,
    };
    setMessages(prev => [...prev, welcomeMsg]);

    // 订阅新消息
    unsubscribeMsgRef.current = subscribeToMessages(tid, (newMsg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        
        // 播放消息提示音
        if (soundEnabled && newMsg.senderType !== 'user') {
          soundLibrary.playMessage();
        }
        
        // 浏览器通知
        if (notificationsEnabled && newMsg.senderType !== 'user' && document.hidden) {
          showNotification('新消息', newMsg.content.substring(0, 50) + (newMsg.content.length > 50 ? '...' : ''));
        }
        
        return [...prev, { ...newMsg, isPending: false }];
      });
    });
  };

  // 表单提交
  const handleFormSubmit = ({ name, phone }: { name: string; phone: string }) => {
    saveVisitorInfo(name, phone);
    setGuestName(name);
    startQueue(name, phone);
  };

  // 取消排队
  const handleCancelQueue = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (unsubscribeStatusRef.current) unsubscribeStatusRef.current();
    navigate('/');
  };

  // 发送消息
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !ticketId || isSending) return;

    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    
    const optimisticMessage: ChatMessage = {
      id: tempId,
      ticketId,
      senderId: guestId,
      senderType: 'user',
      content: text,
      isRead: false,
      createdAt: now,
      isPending: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setInput('');

    try {
      const savedMessage = await sendMessage(ticketId, guestId, 'user', text);
      
      setMessages(prev => 
        prev.map(m => m.id === tempId ? { ...savedMessage, isPending: false } : m)
      );
      
      soundLibrary.playSend();
    } catch (err: any) {
      console.error('发送失败:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert(err.message || '发送失败，请重试');
    } finally {
      setIsSending(false);
    }
  }, [input, ticketId, guestId, isSending]);

  // 键盘发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 快捷问题
  const handleQuickQuestion = (q: string) => {
    setInput(q);
  };

  // 切换声音
  const toggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    soundLibrary.setEnabled(newEnabled);
  };

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col text-gray-900">
      {/* 访客信息弹窗 */}
      <VisitorInfoModal 
        isOpen={showForm} 
        onSubmit={handleFormSubmit}
        onClose={() => navigate('/')}
      />

      {/* 顶部品牌栏 */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="中国银河证券" className="h-8 sm:h-10 object-contain" />
            <div className="hidden sm:flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-amber-500 text-[11px] font-medium tracking-wide">
                <span>2000-2026</span>
                <span className="text-gray-300">|</span>
                <span>20TH ANNIVERSARY</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-2 py-0.5 text-[11px] font-bold rounded">
                  证裕交易单元
                </div>
                <span className="text-xs text-gray-700">中国银河证券</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* 声音开关 */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
              title={soundEnabled ? '关闭声音' : '开启声音'}
            >
              {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
            </button>
            {/* 通知开关 */}
            <button
              onClick={() => requestNotificationPermission().then(setNotificationsEnabled)}
              className={`p-2 rounded-lg transition-colors ${notificationsEnabled ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
              title={notificationsEnabled ? '通知已开启' : '开启通知'}
            >
              <FaBell />
            </button>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-medium text-gray-800">在线客服</span>
              <span className="text-[10px] text-gray-500">{phase === 'queuing' ? '排队中' : phase === 'chatting' ? '会话中' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 flex justify-center p-3 sm:p-4 min-h-0">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden flex min-h-0">
          {/* 左侧边栏 */}
          <div className="w-64 sm:w-72 border-r border-gray-100 flex flex-col bg-slate-50/80 flex-shrink-0 hidden md:flex">
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
              <div className="text-sm font-semibold text-gray-800">服务信息</div>
              <div className="text-[11px] text-gray-500 mt-0.5">ID: {guestId.slice(-12)}</div>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-xs font-semibold text-gray-700 mb-2">快捷问题</div>
              <div className="space-y-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    disabled={phase !== 'chatting'}
                    className="w-full text-left text-[11px] text-gray-700 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded px-2 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">服务说明</div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                请填写信息后进入排队，客服接入后即可开始对话。
              </p>
            </div>

            <div className="mt-auto px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
              <div>当前 IP: <span className="text-gray-700">{clientIP}</span></div>
              <div>服务时间: 工作日 9:00-17:00</div>
            </div>
          </div>

          {/* 右侧聊天区 */}
          <div className="flex-1 flex flex-col bg-white min-h-0">
            {/* 聊天头部 */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <img 
                  src={AGENT_AVATAR} 
                  alt="客服" 
                  className="w-10 h-10 rounded-full object-cover shadow-lg"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {phase === 'chatting' ? '客服专员' : '智能客服'}
                  </div>
                  <div className="text-[11px] text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    {phase === 'queuing' ? '排队中' : phase === 'chatting' ? '在线' : '在线'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/')}
                className="text-[11px] text-blue-600 hover:underline"
              >
                返回首页
              </button>
            </div>

            {/* 聊天内容区 */}
            {phase === 'queuing' ? (
              <QueueStatus position={queuePosition} onCancel={handleCancelQueue} />
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 px-4 py-4 bg-slate-50 overflow-y-auto min-h-0 scroll-smooth">
                  <div className="max-w-2xl mx-auto space-y-4">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} guestName={guestName} />
                    ))}
                    {messages.length === 0 && phase === 'chatting' && (
                      <div className="text-center text-gray-400 py-8">
                        <p>会话已开始，请发送消息</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0">
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={phase === 'chatting' ? "请输入您的问题..." : "请等待客服接入..."}
                        rows={1}
                        disabled={phase !== 'chatting'}
                        className="flex-1 resize-none text-sm px-4 py-2.5 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all max-h-24 disabled:bg-gray-100"
                        style={{ minHeight: '44px' }}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isSending || phase !== 'chatting'}
                        className={`h-11 px-5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 flex-shrink-0 ${
                          input.trim() && !isSending && phase === 'chatting'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                        发送
                      </button>
                    </div>
                    <div className="mt-1.5 text-[10px] text-gray-400 text-center">
                      按 Enter 发送，Shift+Enter 换行
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="py-2 text-center text-[11px] text-gray-500 flex-shrink-0">
        中国银河证券·证裕交易单元 版权所有
      </div>
    </div>
  );
};

export default OnlineChatView;
