import React, { useState, useEffect } from 'react';
import { ICONS } from '../../../lib/constants';
import { getTickets } from '../../../services/contentService';
import type { SupportTicket } from '../../../lib/types';

const ComplianceCenter: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const data = await getTickets();
        setTickets(data);
      } catch (err) {
        console.error('获取工单失败:', err);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CLOSED': return '已结案';
      case 'RESOLVED': return '已解决';
      case 'IN_PROGRESS': return '处理中';
      default: return '待处理';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-4 animate-slide-up">
       <div className="galaxy-card p-4 border-[var(--color-border)] shadow-sm space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">投资者身份信息</h3>
             <span className="text-[10px] font-bold text-[#00D4AA] bg-[#00D4AA]/10 px-2 py-0.5 rounded">已实名认证</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] space-y-1">
                <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">风险承受能力</p>
                <p className="text-xs font-black text-[#00D4AA]">C3-稳健型</p>
             </div>
             <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] space-y-1">
                <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">评测有效期</p>
                <p className="text-xs font-black text-[var(--color-text-primary)]">长期有效</p>
             </div>
          </div>
          <button className="w-full py-2.5 rounded-xl border border-[#00D4AA]/30 text-[#00D4AA] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D4AA]/10 transition-all">
             重新进行风险测评
          </button>
       </div>

       <div className="galaxy-card p-4 border-[var(--color-border)] shadow-sm">
          <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest mb-3">服务工单与纠纷处理</h3>
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-xs">加载中...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-xs">暂无工单记录</div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <div key={ticket.id} className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex justify-between items-center group cursor-pointer hover:border-[#00D4AA]/30 transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">{ticket.subject}</p>
                    <p className="text-[9px] text-[var(--color-text-muted)] font-mono">编号：{ticket.id.substring(0, 8)} | 更新：{ticket.updatedAt ? formatDate(ticket.updatedAt) : ticket.createdAt ? formatDate(ticket.createdAt) : ticket.lastUpdate || '-'}</p>
                  </div>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                    ticket.status === 'CLOSED' ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]' : 'bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/20'
                  }`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg">
             <ICONS.Plus size={14} /> 发起新的投诉或纠纷维权
          </button>
       </div>
    </div>
  );
};

export default ComplianceCenter;
