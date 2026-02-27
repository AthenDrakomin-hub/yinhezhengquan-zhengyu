"use strict";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import StockIcon from './StockIcon';
import { Holding, UserAccount } from '../types';

interface ProfileOverviewProps {
  account: UserAccount;
  onOpenAnalysis: () => void;
  onOpenConditional: () => void;
}

const ProfileOverview: React.FC<ProfileOverviewProps> = ({ account, onOpenAnalysis, onOpenConditional }) => {
  const navigate = useNavigate();

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
            <div key={holding.symbol} className="glass-card p-5 animate-slide-up hover:border-[#00D4AA]/40 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <StockIcon name={holding.name} logoUrl={holding.logoUrl} />
                  <div>
                    <h4 className="font-black text-sm text-[var(--color-text-primary)] group-hover:text-[#00D4AA] transition-colors">{holding.name}</h4>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold">{holding.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black font-mono ${holding.profit >= 0 ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>
                    {holding.profit >= 0 ? '+' : ''}{holding.profit.toLocaleString()}
                  </p>
                  <p className={`text-[10px] font-bold font-mono opacity-80 ${holding.profit >= 0 ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>
                    {holding.profitRate >= 0 ? '+' : ''}{holding.profitRate}%
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
                    ¥{holding.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                  <p className={`text-xs font-black font-mono ${holding.currentPrice >= holding.averagePrice ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>
                    {holding.currentPrice.toFixed(3)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileOverview;
