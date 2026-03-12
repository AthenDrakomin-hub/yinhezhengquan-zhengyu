import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaUser, FaPaperPlane, FaHeadset, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../lib/constants';

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
    answer: '登录遇到问题？请检查：\n1) 用户名/密码是否正确\n2) 网络连接是否正常\n3) 账户是否被锁定\n\n如果仍有问题，请联系人工客服。',
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
    answer: '新股申购信息：\n• 申购时间：交易日9:30-11:30, 13:00-15:00\n• 申购额度：根据您的持仓市值确定\n• 中签查询：T+2日公布中签结果',
    quickReplies: ['申购额度查询', '中签后如何缴款', '新股上市时间']
  },
  '开户': {
    answer: '开户流程：\n1. 点击"快速开户"，完成手机号验证\n2. 上传身份证照片，完成实名认证\n3. 进行人脸识别\n4. 完成风险测评\n5. 签署相关协议\n6. 等待审核（通常1-2个工作日）',
    quickReplies: ['开户需要多久', '开户失败原因', '重新开户']
  },
  '费率': {
    answer: '交易费率说明：\n• A股交易佣金：万2.5（最低5元）\n• 印花税：成交金额的千分之0.5（卖出时收取）\n• 过户费：成交金额的万分之0.1\n具体费率请以您的账户实际费率为准。',
    quickReplies: ['如何查询费率', '可以降低费率吗', '其他费用']
  },
  '风险': {
    answer: '风险提示：\n证券投资有风险，入市需谨慎。市场波动可能导致投资损失，请您根据自身风险承受能力理性投资，不要借贷炒股，建议分散投资降低风险。',
    quickReplies: ['风险测评', '如何止损', '投资建议']
  }
};

// 默认回复
const defaultReply = {
  answer: '您好，我是智能投资助手。\n\n我可以帮您解答以下问题：\n• 密码登录相关\n• 资金出入金\n• 交易操作\n• 新股申购\n• 开户流程\n• 交易费率\n\n请输入您想了解的问题，或点击"转人工客服"获取人工帮助。',
  quickReplies: ['忘记密码', '如何交易', '新股申购', '转人工客服']
};

// 根据用户输入匹配最佳回复
const findBestReply = (input: string): { answer: string; quickReplies?: string[] } => {
  const lowerInput = input.toLowerCase();
  
  for (const [keyword, reply] of Object.entries(knowledgeBase)) {
    if (lowerInput.includes(keyword)) {
      return reply;
    }
  }
  
  if (lowerInput.includes('怎么') || lowerInput.includes('如何') || lowerInput.includes('怎样')) {
    return {
      answer: '您想了解操作步骤吗？请告诉我具体是什么业务，比如"如何交易"、"如何开户"等。',
      quickReplies: ['如何交易', '如何开户', '如何入金', '转人工客服']
    };
  }
  
  if (lowerInput.includes('吗') || lowerInput.includes('？') || lowerInput.includes('?')) {
    return {
      answer: '抱歉，我可能没有完全理解您的问题。您可以换个方式提问，或者选择下方的问题类型，也可以转人工客服获得更详细的帮助。',
      quickReplies: ['密码问题', '交易问题', '资金问题', '转人工客服']
    };
  }
  
  return defaultReply;
};

const SmartAssistant: React.FC<SmartAssistantProps> = ({ onClose, onSwitchToHuman }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化欢迎消息
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: '您好！我是日斗投资单元智能助手。\n\n我可以帮您解答投资、交易、账户等相关问题。请问有什么可以帮您？',
      timestamp: new Date(),
      quickReplies: defaultReply.quickReplies
    };
    setMessages([welcomeMsg]);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;

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
    }, 500 + Math.random() * 500);
  };

  const handleQuickReply = (reply: string) => {
    if (reply === '转人工客服' || reply === '联系人工客服') {
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
    <div className="fixed inset-0 z-[200] bg-[var(--color-bg)] flex flex-col">
      {/* 头部 */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
            <FaRobot className="text-white text-lg" />
          </div>
          <div>
            <h2 className="font-bold text-[var(--color-text-primary)]">智能助手</h2>
            <p className="text-xs text-[var(--color-text-muted)]">日斗投资单元</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToHuman}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary-light)] hover:bg-blue-100 rounded-lg text-[var(--color-primary)] text-sm font-medium transition"
          >
            <FaHeadset size={14} />
            <span className="hidden sm:inline">转人工</span>
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] rounded-lg transition"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              {/* 头像和名称 */}
              <div className={`flex items-center gap-2 mb-1 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                {msg.type === 'assistant' && (
                  <>
                    <div className="w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                      <FaRobot className="text-white text-xs" />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">智能助手</span>
                  </>
                )}
                {msg.type === 'user' && (
                  <>
                    <span className="text-xs text-[var(--color-text-muted)]">我</span>
                    <div className="w-6 h-6 bg-[var(--color-text-muted)] rounded-full flex items-center justify-center">
                      <FaUser className="text-white text-xs" />
                    </div>
                  </>
                )}
              </div>

              {/* 消息内容 */}
              <div
                className={`px-4 py-3 rounded-xl whitespace-pre-line text-sm leading-relaxed ${
                  msg.type === 'user'
                    ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-bl-sm border border-[var(--color-border)]'
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
                      className="px-3 py-1.5 bg-[var(--color-surface)] hover:bg-[var(--color-bg)] text-[var(--color-primary)] text-xs rounded-full border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] transition"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* 时间 */}
              <div className={`text-[10px] text-[var(--color-text-muted)] mt-1 ${msg.type === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* 输入中提示 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-surface)] px-4 py-3 rounded-xl rounded-bl-sm border border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="flex-shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题..."
            className="flex-1 h-11 px-4 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-primary)] transition-all"
            disabled={isTyping}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="w-11 h-11 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            <FaPaperPlane size={14} />
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] text-center mt-2">
          按 Enter 发送消息
        </p>
      </div>
    </div>
  );
};

export default SmartAssistant;
