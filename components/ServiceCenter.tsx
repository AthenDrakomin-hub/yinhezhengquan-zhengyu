import React, { useState } from 'react';
import { ICONS } from '../constants';
import { getSmartCustomerSupport } from '../services/marketService';

const ServiceCenter: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: '您好！我是银河证券证裕单元智能助理，很高兴为您服务。请问有什么可以帮您的？' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    
    // 延迟模拟真实响应
    setTimeout(async () => {
        const botReply = await getSmartCustomerSupport(userMsg);
        setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
        setLoading(false);
    }, 500);
  };

  return (
    <div className="flex flex-col h-[500px] glass-card border-[var(--color-border)] shadow-sm overflow-hidden animate-slide-up">
       <div className="bg-[var(--color-surface)] p-4 border-b border-[var(--color-border)] flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-[#00D4AA] rounded-lg flex items-center justify-center text-[#0A1628]"><ICONS.Headset size={16} /></div>
             <span className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">证裕客服中心 24H</span>
          </div>
          <button className="text-[10px] font-bold text-[#00D4AA] uppercase">人工热线</button>
       </div>
       
       <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${
                 m.role === 'user' ? 'bg-[#00D4AA] text-[#0A1628] rounded-br-none' : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-bl-none border border-[var(--color-border)]'
               }`}>
                  {m.text}
               </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
               <div className="bg-[var(--color-surface)] p-3 rounded-2xl rounded-bl-none border border-[var(--color-border)]">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-[var(--color-text-muted)] rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
               </div>
            </div>
          )}
       </div>

       <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入您的问题..."
            className="flex-1 bg-[var(--color-bg)] h-10 px-4 rounded-xl border border-[var(--color-border)] text-xs font-medium outline-none text-[var(--color-text-primary)]"
          />
          <button onClick={handleSend} className="w-10 h-10 bg-[#00D4AA] rounded-xl flex items-center justify-center text-[#0A1628] shadow-lg active:scale-95 transition-all">
             <ICONS.ArrowRight size={18} />
          </button>
       </div>
    </div>
  );
};

export default ServiceCenter;