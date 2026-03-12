"use strict";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';
import StockIcon from '../../shared/StockIcon';
import { Holding, UserAccount } from '../../../lib/types';

interface ProfileOverviewProps {
  account: UserAccount | null;
  onOpenAnalysis: () => void;
  onOpenConditional: () => void;
}

// 获取风险等级样式
const getRiskLevelStyle = (level?: string) => {
  switch (level) {
    case 'HIGH':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'MEDIUM':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'LOW':
    default:
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  }
};

// 获取风险等级文字
const getRiskLevelText = (level?: string) => {
  switch (level) {
    case 'HIGH':
      return '高风险';
    case 'MEDIUM':
      return '中风险';
    case 'LOW':
    default:
      return '低风险';
  }
};

const ProfileOverview: React.FC<ProfileOverviewProps> = ({ account, onOpenAnalysis, onOpenConditional }) => {
  const navigate = useNavigate();

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="p-12 text-center text-[var(--color-text-muted)] font-bold">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-[0.2em]">我的持仓</h2>
        <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase">
          {account.holdings.length} 只标的
        </span>
      </div>

      {account.holdings.length === 0 ? (
        <div className="p-12 text-center text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px]">
          当前暂无持仓标的
        </div>
      ) : (
        <div className="space-y-4">
          {account.holdings.map((holding: Holding) => (
            <div 
              key={holding.symbol} 
              className={`galaxy-card p-5 animate-slide-up hover:border-[var(--color-primary)]/40 transition-all cursor-pointer group relative ${
                holding.isForcedSell ? 'border-red-500/50 bg-red-500/5' : ''
              }`}
            >
              {/* 强制平仓警告横幅 */}
              {holding.isForcedSell && (
                <div className="absolute top-0 left-0 right-0 bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest py-1 text-center rounded-t-lg">
                  此持仓已被强制平仓
                </div>
              )}

              <div className={`flex justify-between items-start mb-6 ${holding.isForcedSell ? 'mt-6' : ''}`}>
                <div className="flex items-center gap-3">
                  <StockIcon name={holding.name} logoUrl={holding.logoUrl} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-[var(--color-text-primary)] group-hover:text-[#00D4AA] transition-colors">
                        {holding.name}
                      </h4>
                      {/* 风险等级标签 */}
                      {holding.riskLevel && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${getRiskLevelStyle(holding.riskLevel)}`}>
                          {getRiskLevelText(holding.riskLevel)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold">{holding.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black font-mono ${(holding.profit || 0) >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                    {(holding.profit || 0) >= 0 ? '+' : ''}{(holding.profit || 0).toLocaleString()}
                  </p>
                  <p className={`text-[10px] font-bold font-mono opacity-80 ${(holding.profit || 0) >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                    {(holding.profitRate || 0) >= 0 ? '+' : ''}{(holding.profitRate || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6 border-t border-[var(--color-border)] pt-5">
                <div className="space-y-1">
                  <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">持仓 / 可用</p>
                  <p className="text-xs font-black font-mono text-[var(--color-text-primary)]">
                    {holding.quantity} <span className="text-[var(--color-text-muted)] opacity-50">/</span> {holding.availableQuantity}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">最新市值 (元)</p>
                  <p className="text-xs font-black font-mono text-[var(--color-text-primary)]">
                    ¥{(holding.marketValue || holding.quantity * holding.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">成本价</p>
                  <p className="text-xs font-black font-mono text-[var(--color-text-secondary)]">
                    {holding.averagePrice.toFixed(3)}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">最新现价</p>
                  <p className={`text-xs font-black font-mono ${holding.currentPrice >= holding.averagePrice ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                    {holding.currentPrice.toFixed(3)}
                  </p>
                </div>
              </div>

              {/* 强制平仓原因 */}
              {holding.isForcedSell && holding.forcedSellReason && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-[9px] font-black text-red-400 uppercase">平仓原因</p>
                  <p className="text-xs text-red-300 mt-1">{holding.forcedSellReason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileOverview;
