import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaUser, FaPaperPlane, FaHeadset, FaTimes, FaClock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { soundLibrary } from '../../lib/sound';

interface SmartAssistantProps {
  onClose?: () => void;
  onSwitchToHuman?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
}

// 知识库问答
const knowledgeBase: Record<string, { answer: string; quickReplies?: string[] }> = {
  '密码': {
    answer: '如果您忘记了登录密码，请点击登录页面的"忘记密码"链接，通过手机号验证后重置密码。交易密码和资金密码需要在客户端"设置-安全中心"中修改。',
    quickReplies: ['如何修改交易密码', '资金密码忘记了', '密码安全建议']
  },
  '登录': {
    answer: '登录遇到问题？请检查：1) 用户名/密码是否正确；2) 网络连接是否正常；3) 账户是否被锁定。如果仍有问题，请联系人工客服。',
    quickReplies: ['账户被锁定', '收不到验证码', '联系人工客服']
  },
  '资金': {
    answer: '资金相关问题：\n• 入金：通过银行转账至您的资金账户\n• 出金：在"资产中心-资金划转"中申请提现\n• 资金查询：在"资产中心"查看余额和流水',
    quickReplies: ['如何入金', '如何出金', '资金到账时间']
  },
  '交易': {
    answer: '交易操作指南：\n• 买入/卖出：在"极速交易"页面搜索股票代码，输入价格和数量后下单\n• 委托查询：在"资产中心-委托记录"查看\n• 成交查询：在"资产中心-成交记录"查看',
    quickReplies: ['如何下单', '如何撤单', '交易时间']
  },
  '新股': {
    answer: '新股申购信息：\n• 申购时间：交易日9:30-11:30, 13:00-15:00\n• 申购额度：根据您的持仓市值确定\n• 中签查询：T+2日公布中签结果\n• 最新新股：请在"新股申购"页面查看最新信息。',
    quickReplies: ['申购额度查询', '中签后如何缴款', '新股上市时间']
  },
  '开户': {
    answer: '开户流程：\n1. 下载证裕交易APP或访问网页版\n2. 点击"快速开户"，完成手机号验证\n3. 上传身份证照片，完成实名认证\n4. 进行人脸识别\n5. 完成风险测评\n6. 签署相关协议\n7. 等待审核（通常1-2个工作日）',
    quickReplies: ['开户需要多久', '开户失败原因', '重新开户']
  },
  '费率': {
    answer: '交易费率说明：\n• A股交易佣金：万2.5（最低5元）\n• 印花税：成交金额的千分之0.5（卖出时收取）\n• 过户费：成交金额的万分之0.1\n• 具体费率请以您的账户实际费率为准。',
    quickReplies: ['如何查询费率', '可以降低费率吗', '其他费用']
  },
  '风险': {
    answer: '风险提示：\n证券投资有风险，入市需谨慎。市场波动可能导致投资损失，请您根据自身风险承受能力理性投资，不要借贷炒股，建议分散投资降低风险。',
    quickReplies: ['风险测评', '如何止损', '投资建议']
  }
};

// 默认回复
const defaultReply = {
  answer: '您好，我是银小河，您的智能投资助手。\n\n我可以帮您解答以下问题：\n• 密码登录相关\n• 资金出入金\n• 交易操作\n• 新股申购\n• 开户流程\n• 交易费率\n• 风险提示\n\n请输入您想了解的问题，或点击"联系人工客服"获取人工帮助。',
  quickReplies: ['忘记密码', '如何交易', '新股申购', '联系人工客服']
};

// 根据用户输入匹配最佳回复
const findBestReply = (input: string): { answer: string; quickReplies?: string[] } => {
  const lowerInput = input.toLowerCase();
  
  for (const [keyword, reply] of Object.entries(knowledgeBase)) {
    if (lowerInput.includes(keyword)) {
      return reply;
    }
  }
  
  // 模糊匹配
  if (lowerInput.includes('怎么') || lowerInput.includes('如何') || lowerInput.includes('怎样')) {
    return {
      answer: '您想了解操作步骤吗？请告诉我具体是什么业务，比如"如何交易"、"如何开户"等。',
      quickReplies: ['如何交易', '如何开户', '如何入金', '联系人工客服']
    };
  }
  
  if (lowerInput.includes('吗') || lowerInput.includes('？') || lowerInput.includes('?')) {
    return {
      answer: '抱歉，我可能没有完全理解您的问题。您可以换个方式提问，或者选择下方的问题类型，也可以联系人工客服获得更详细的帮助。',
      quickReplies: ['密码问题', '交易问题', '资金问题', '联系人工客服']
    };
  }
  
  return defaultReply;
};

const SmartAssistant: React.FC<SmartAssistantProps> = ({ onClose, onSwitchToHuman }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化欢迎消息
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: '您好！我是银小河，银河证券智能投资助手。\n\n我可以帮您解答投资、交易、账户等相关问题。请问有什么可以帮您？',
      timestamp: new Date(),
      quickReplies: defaultReply.quickReplies
    };
    setMessages([welcomeMsg]);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    // 播放发送音效
    soundLibrary.playSend();

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // 显示输入中状态
    setIsTyping(true);

    // 模拟思考延迟
    setTimeout(() => {
      const reply = findBestReply(text);
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: reply.answer,
        timestamp: new Date(),
        quickReplies: reply.quickReplies
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
      
      // 播放接收消息音效
      soundLibrary.playMessage();
    }, 500 + Math.random() * 1000);
  };

  const handleQuickReply = (reply: string) => {
    if (reply === '联系人工客服') {
      onSwitchToHuman?.();
      return;
    }
    handleSend(reply);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A1628] flex flex-col">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-[#0F2B5C] to-[#1E3A8A] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <FaRobot className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-white font-semibold">银小河</h2>
            <p className="text-blue-200 text-xs">智能投资助手</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToHuman}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition"
          >
            <FaHeadset />
            <span className="hidden sm:inline">人工客服</span>
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
              {/* 头像 */}
              <div className={`flex items-center gap-2 mb-1 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                {msg.type === 'assistant' && (
                  <>
                    <div className="w-6 h-6 bg-[#2563EB] rounded-full flex items-center justify-center">
                      <FaRobot className="text-white text-xs" />
                    </div>
                    <span className="text-xs text-gray-400">银小河</span>
                  </>
                )}
                {msg.type === 'user' && (
                  <>
                    <span className="text-xs text-gray-400">您</span>
                    <div className="w-6 h-6 bg-[#00D4AA] rounded-full flex items-center justify-center">
                      <FaUser className="text-white text-xs" />
                    </div>
                  </>
                )}
              </div>

              {/* 消息内容 */}
              <div
                className={`px-4 py-3 rounded-2xl whitespace-pre-line ${
                  msg.type === 'user'
                    ? 'bg-[#2563EB] text-white rounded-br-none'
                    : 'bg-[#1E3A8A]/50 text-white rounded-bl-none border border-[#2563EB]/30'
                }`}
              >
                {msg.content}
              </div>

              {/* 快捷回复 */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.quickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-1.5 bg-[#2563EB]/20 hover:bg-[#2563EB]/40 text-[#00D4AA] text-xs rounded-full border border-[#2563EB]/30 transition"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* 时间 */}
              <div className={`text-[10px] text-gray-500 mt-1 ${msg.type === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* 输入中提示 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#1E3A8A]/50 px-4 py-3 rounded-2xl rounded-bl-none border border-[#2563EB]/30">
              <div className="flex items-center gap-2">
                <FaRobot className="text-[#2563EB]" />
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-[#2563EB]/20 p-4 bg-[#0F172A]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入您的问题..."
            className="flex-1 px-4 py-3 bg-[#1E3A8A]/30 border border-[#2563EB]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#2563EB]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="px-4 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-600 text-white rounded-xl transition"
          >
            <FaPaperPlane />
          </button>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">
          银小河提供智能问答服务，复杂问题请转人工客服
        </p>
      </div>
    </div>
  );
};

export default SmartAssistant;
