
"use strict";

import React from 'react';
import { ICONS, MOCK_TICKETS } from '../constants';

interface MonitorItem {
  label: string;
  status: string;
  time: string;
}

interface ComplianceShieldViewProps {
  onBack: () => void;
}

const ComplianceShieldView: React.FC<ComplianceShieldViewProps> = ({ onBack }) => {
  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">证裕合规盾牌</h1>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#00D4AA]/10 flex items-center justify-center text-[#00D4AA]">
          <ICONS.Shield size={18} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-20">
        {/* Status Dashboard */}
        <div className="glass-card p-6 bg-gradient-to-br from-[#00D4AA]/10 to-transparent border-[#00D4AA]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D4AA]/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-[#00D4AA] uppercase tracking-[0.2em]">合规审计状态</p>
                <h3 className="text-2xl font-black text-[var(--color-text-primary)]">SECURE PROTECTED</h3>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase mb-1">Last Audit</p>
                <p className="text-[10px] font-mono font-black text-[var(--color-text-primary)]">2026.03.26 14:30</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
                <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase mb-1">风险承受等级</p>
                <p className="text-xs font-black text-[#00D4AA]">C3-稳健型</p>
              </div>
              <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
                <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase mb-1">实名认证</p>
                <p className="text-xs font-black text-[#00D4AA]">已认证 (*振华)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Monitor */}
        <div className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">交易风控实时监控</h3>
          <div className="glass-card divide-y divide-[var(--color-border)] overflow-hidden">
            {[
              { label: '异常报单拦截', status: 'ACTIVE', time: 'REALTIME' },
              { label: '价格偏离度监控', status: 'ACTIVE', time: 'REALTIME' },
              { label: '持仓集中度审查', status: 'PASS', time: '12:00' },
              { label: '反洗钱(AML)筛查', status: 'PASS', time: '09:00' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center p-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[8px] font-mono text-[var(--color-text-muted)]">{item.time}</p>
                </div>
                <span className="text-[9px] font-black text-[#00D4AA] px-2 py-0.5 rounded bg-[#00D4AA]/5 border border-[#00D4AA]/20 uppercase tracking-tighter">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dispute Resolution */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">服务工单与纠纷处理</h3>
            <button className="text-[9px] font-black text-[#00D4AA] uppercase tracking-widest">发起维权</button>
          </div>
          <div className="space-y-3">
             {MOCK_TICKETS.map(ticket => (
               <div key={ticket.id} className="glass-card p-4 flex justify-between items-center group cursor-pointer hover:border-[#00D4AA]/30 transition-all">
                  <div className="space-y-1">
                     <p className="text-xs font-bold text-[var(--color-text-primary)]">{ticket.subject}</p>
                     <p className="text-[9px] text-[var(--color-text-muted)] font-mono">编号：{ticket.id} | 更新：{ticket.lastUpdate}</p>
                  </div>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                    ticket.status === 'CLOSED' ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]' : 'bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/20'
                  }`}>
                    {ticket.status === 'CLOSED' ? '已结案' : '处理中'}
                  </span>
               </div>
             ))}
          </div>
        </div>

        {/* Regulatory Disclosure */}
        <div className="p-5 glass-card bg-[#FF6B6B]/5 border-[#FF6B6B]/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B6B]/10 flex items-center justify-center text-[#FF6B6B]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 className="text-xs font-black text-[#FF6B6B] uppercase tracking-widest">监管警示与适当性声明</h3>
          </div>
          <p className="text-[10px] text-[var(--color-text-secondary)] font-medium leading-relaxed">
            证裕交易单元作为银河证券 Nexus 2026 计划的核心节点，严格遵守《证券期货投资者适当性管理办法》。所有交易标的仅供策略回测与研究使用，不构成真实投资建议。杠杆倍数超过 10x 的合约属于高风险标的，请审慎操作。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComplianceShieldView;
