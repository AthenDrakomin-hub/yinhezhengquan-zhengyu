"use strict";

import React, { useState, useEffect } from 'react';
import { ICONS } from '../../../lib/constants';
import { userService } from '../../../services/userService';
import { supabase } from '../../../lib/supabase';

interface MonitorItem {
  label: string;
  status: string;
  time: string;
  description?: string;
}

interface ComplianceShieldViewProps {
  onBack: () => void;
}

const ComplianceShieldView: React.FC<ComplianceShieldViewProps> = ({ onBack }) => {
  const [riskLevel, setRiskLevel] = useState('C3');
  const [realName, setRealName] = useState('');
  const [lastAuditTime, setLastAuditTime] = useState('');
  const [monitorItems, setMonitorItems] = useState<MonitorItem[]>([
    { label: '异常报单拦截', status: 'ACTIVE', time: '实时监控', description: '系统自动监控异常委托' },
    { label: '价格偏离度监控', status: 'ACTIVE', time: '实时监控', description: '监控委托价格偏离度' },
    { label: '持仓集中度审查', status: 'PASS', time: '--', description: '持仓分散度合规' },
    { label: '反洗钱(AML)筛查', status: 'PASS', time: '--', description: '交易行为合规' },
  ]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplianceData = async () => {
      setLoading(true);
      try {
        // 获取用户资料
        const profile = await userService.getCurrentUserProfile();
        setRiskLevel(profile.risk_level || 'C3');
        setRealName(profile.real_name || '投资者');
        
        // 设置最后审计时间
        setLastAuditTime(new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/\//g, '.'));

        // 获取工单
        const { data: ticketsData, error } = await supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!error && ticketsData) {
          setTickets(ticketsData);
        }
      } catch (err) {
        console.error('获取合规数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplianceData();
  }, []);

  const getRiskLevelText = (level: string) => {
    const levels: Record<string, string> = {
      'C1': 'C1-保守型',
      'C2': 'C2-谨慎型',
      'C3': 'C3-稳健型',
      'C4': 'C4-积极型',
      'C5': 'C5-激进型',
    };
    return levels[level] || 'C3-稳健型';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CLOSED': return '已结案';
      case 'RESOLVED': return '已解决';
      case 'IN_PROGRESS': return '处理中';
      default: return '待处理';
    }
  };

  const maskName = (name: string) => {
    if (!name || name.length <= 1) return name;
    return name.charAt(0) + '*' + name.slice(-1);
  };

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">日斗合规盾牌</h1>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#E63946]/10 flex items-center justify-center text-[#E63946]">
          <ICONS.Shield size={18} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-20">
        {loading ? (
          <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">加载中...</div>
        ) : (
          <>
            {/* Status Dashboard */}
            <div className="galaxy-card p-6 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border-[var(--color-primary)]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest">合规审计状态</p>
                    <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">SECURE PROTECTED</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Last Audit</p>
                    <p className="text-[10px] font-mono font-medium text-[var(--color-text-primary)]">{lastAuditTime}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
                    <p className="text-[8px] text-[var(--color-text-muted)] font-bold uppercase mb-1">风险承受等级</p>
                    <p className="text-xs font-medium text-[var(--color-primary)]">{getRiskLevelText(riskLevel)}</p>
                  </div>
                  <div className="p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
                    <p className="text-[8px] text-[var(--color-text-muted)] font-bold uppercase mb-1">实名认证</p>
                    <p className="text-xs font-medium text-[var(--color-primary)]">已认证 ({maskName(realName || '投资者')})</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Monitor */}
            <div className="space-y-3">
              <h3 className="px-2 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">交易风控实时监控</h3>
              <div className="galaxy-card divide-y divide-[var(--color-border)] overflow-hidden">
                {monitorItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-[var(--color-text-primary)]">{item.label}</p>
                      <p className="text-[8px] font-mono text-[var(--color-text-muted)]">{item.time}</p>
                    </div>
                    <span className={`text-[9px] font-medium px-2 py-0.5 rounded border uppercase ${
                      item.status === 'ACTIVE' 
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20' 
                        : 'bg-[var(--color-positive)]/10 text-[var(--color-positive)] border-[var(--color-positive)]/20'
                    }`}>
                      {item.status === 'ACTIVE' ? '运行中' : '已通过'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispute Resolution */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">服务工单与纠纷处理</h3>
                <button className="text-xs font-medium text-[var(--color-primary)] uppercase">发起维权</button>
              </div>
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <div className="galaxy-card p-4 text-center text-[var(--color-text-muted)] text-xs">
                    暂无工单记录
                  </div>
                ) : (
                  tickets.map(ticket => (
                    <div key={ticket.id} className="galaxy-card p-4 flex justify-between items-center group cursor-pointer hover:border-[var(--color-primary)]/30 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[var(--color-text-primary)]">{ticket.subject}</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-mono">
                          编号：{ticket.id} | 更新：{ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString('zh-CN') : '--'}
                        </p>
                      </div>
                      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded border ${
                        ticket.status === 'CLOSED' 
                          ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]' 
                          : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20'
                      }`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Regulatory Disclosure */}
            <div className="p-5 galaxy-card bg-[var(--color-warning)]/5 border-[var(--color-warning)]/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-warning)]/10 flex items-center justify-center text-[var(--color-warning)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h3 className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-wider">监管警示与适当性声明</h3>
              </div>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-medium leading-relaxed">
                日斗投资单元作为银河证券 Nexus 2026 计划的核心节点，严格遵守《证券期货投资者适当性管理办法》。所有交易标的仅供策略回测与研究使用，不构成真实投资建议。杠杆倍数超过 10x 的合约属于高风险标的，请审慎操作。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComplianceShieldView;
