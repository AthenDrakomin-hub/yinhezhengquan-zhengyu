"use strict";

import React, { useState, useEffect } from 'react';
import { ICONS } from '../../../lib/constants';
import { getTickets } from '../../../services/contentService';
import { userService } from '../../../services/userService';
import type { SupportTicket } from '../../../lib/types';

interface ComplianceCenterProps {
  onBack?: () => void;
  onOpenShield?: () => void;
}

const ComplianceCenter: React.FC<ComplianceCenterProps> = ({ onBack, onOpenShield }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskLevel, setRiskLevel] = useState('C3');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 获取工单数据
        const ticketsData = await getTickets();
        setTickets(ticketsData);
        
        // 获取用户风险等级
        const profile = await userService.getCurrentUserProfile();
        setRiskLevel(profile.risk_level || 'C3');
        
        // 检查是否实名认证
        const securitySettings = await userService.getSecuritySettings();
        setIsVerified(!!securitySettings);
      } catch (err) {
        console.error('获取合规数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  return (
    <div className="space-y-4 animate-slide-up">
      {/* 页面头部 */}
      {onBack && (
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-lg font-black text-[var(--color-text-primary)]">合规中心</h1>
        </div>
      )}

      {/* 合规盾牌入口 */}
      <div 
        onClick={onOpenShield}
        className="galaxy-card p-4 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border-[var(--color-primary)]/20 cursor-pointer hover:border-[var(--color-primary)]/40 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#00D4AA]/10 flex items-center justify-center text-[#00D4AA]">
              <ICONS.Shield size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">日斗合规盾牌</h3>
              <p className="text-[10px] text-[var(--color-text-muted)]">实时交易风控 · 异常监测预警</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>

      {/* 投资者身份信息 */}
      <div className="galaxy-card p-4 border-[var(--color-border)] shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">投资者身份信息</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isVerified ? 'text-[#00D4AA] bg-[#00D4AA]/10' : 'text-[var(--color-warning)] bg-[var(--color-warning)]/10'}`}>
            {isVerified ? '已实名认证' : '未认证'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] space-y-1">
            <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">风险承受能力</p>
            <p className="text-xs font-black text-[#00D4AA]">{getRiskLevelText(riskLevel)}</p>
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

      {/* 服务工单与纠纷处理 */}
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
