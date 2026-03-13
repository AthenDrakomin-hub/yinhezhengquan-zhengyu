"use strict";

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';
import StockIcon from '../../shared/StockIcon';
import { Holding, UserAccount } from '../../../lib/types';

interface ProfileOverviewProps {
  account: UserAccount | null;
  onOpenAnalysis: () => void;
  onOpenConditional: () => void;
}

// 排序类型
type SortField = 'name' | 'marketValue' | 'profit' | 'profitRate' | 'quantity';
type SortOrder = 'asc' | 'desc';

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
  const [showAssets, setShowAssets] = useState(true);
  const [sortField, setSortField] = useState<SortField>('marketValue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 计算账户统计数据
  const accountStats = useMemo(() => {
    if (!account) return null;

    const holdingsValue = account.holdings.reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0);
    const totalProfit = account.holdings.reduce((sum, h) => sum + (h.profit || 0), 0);
    const totalCost = account.holdings.reduce((sum, h) => sum + (h.quantity * h.averagePrice), 0);
    const totalAssets = account.balance + holdingsValue;
    
    // 今日盈亏（模拟，实际需要从后端获取当日开盘价）
    const todayPnL = totalProfit * 0.1; // 假设今日盈亏为总盈亏的10%
    
    // 资产分布
    const stockValue = account.holdings
      .filter(h => h.category === 'STOCK' || !h.category)
      .reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0);
    const fundValue = account.holdings
      .filter(h => h.category === 'FUND')
      .reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0);
    
    return {
      totalAssets,
      availableCash: account.balance,
      holdingsValue,
      totalProfit,
      totalProfitRate: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
      todayPnL,
      todayPnLRate: holdingsValue > 0 ? (todayPnL / holdingsValue) * 100 : 0,
      stockRatio: holdingsValue > 0 ? (stockValue / holdingsValue) * 100 : 0,
      fundRatio: holdingsValue > 0 ? (fundValue / holdingsValue) * 100 : 0,
      cashRatio: totalAssets > 0 ? (account.balance / totalAssets) * 100 : 0,
    };
  }, [account]);

  // 排序后的持仓列表
  const sortedHoldings = useMemo(() => {
    if (!account?.holdings) return [];
    
    const sorted = [...account.holdings].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;
      
      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'marketValue':
          aValue = a.marketValue || a.quantity * a.currentPrice;
          bValue = b.marketValue || b.quantity * b.currentPrice;
          break;
        case 'profit':
          aValue = a.profit || 0;
          bValue = b.profit || 0;
          break;
        case 'profitRate':
          aValue = a.profitRate || 0;
          bValue = b.profitRate || 0;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
    });
    
    return sorted;
  }, [account?.holdings, sortField, sortOrder]);

  // 切换排序
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 排序图标组件
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 text-[var(--color-text-muted)] opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-3 h-3 text-[#00D4AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 15l-5-5-5 5"/>
      </svg>
    ) : (
      <svg className="w-3 h-3 text-[#00D4AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 9l5 5 5-5"/>
      </svg>
    );
  };

  if (!account || !accountStats) {
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
      {/* 账户总览卡片 */}
      <div className="galaxy-card p-6 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border-[var(--color-primary)]/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-primary)]">
            账户总览
          </h2>
          <button 
            onClick={() => setShowAssets(!showAssets)}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-white/20 transition-colors"
          >
            {showAssets ? <ICONS.EyeOff size={14} /> : <ICONS.Eye size={14} />}
          </button>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 总资产 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter mb-1">总资产</p>
            <p className="text-xl font-black font-mono text-[var(--color-text-primary)]" title={showAssets ? `¥${accountStats.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}>
              {showAssets ? `¥${accountStats.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
            </p>
          </div>
          
          {/* 可用资金 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter mb-1">可用资金</p>
            <p className="text-xl font-black font-mono text-[#00D4AA]" title={showAssets ? `¥${accountStats.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}>
              {showAssets ? `¥${accountStats.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
            </p>
          </div>
          
          {/* 持仓市值 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter mb-1">持仓市值</p>
            <p className="text-xl font-black font-mono text-[var(--color-text-primary)]" title={showAssets ? `¥${accountStats.holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}>
              {showAssets ? `¥${accountStats.holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
            </p>
          </div>
          
          {/* 今日盈亏 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter mb-1">今日盈亏</p>
            <p className={`text-xl font-black font-mono ${accountStats.todayPnL >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`} title={showAssets ? `${accountStats.todayPnL >= 0 ? '+' : ''}¥${accountStats.todayPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}>
              {showAssets ? `${accountStats.todayPnL >= 0 ? '+' : ''}¥${accountStats.todayPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
            </p>
            <p className={`text-[10px] font-bold font-mono ${accountStats.todayPnL >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
              {showAssets ? `${accountStats.todayPnL >= 0 ? '+' : ''}${accountStats.todayPnLRate.toFixed(2)}%` : '****'}
            </p>
          </div>
        </div>
      </div>

      {/* 资产分布和总盈亏 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 资产分布 */}
        <div className="galaxy-card p-5">
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-text-primary)] mb-4">
            资产分布
          </h3>
          <div className="space-y-3">
            {/* 股票 */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#00D4AA]" />
              <span className="text-xs font-bold text-[var(--color-text-secondary)] flex-1">股票</span>
              <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                {showAssets ? `${accountStats.stockRatio.toFixed(1)}%` : '****'}
              </span>
            </div>
            {/* 基金 */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
              <span className="text-xs font-bold text-[var(--color-text-secondary)] flex-1">基金</span>
              <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                {showAssets ? `${accountStats.fundRatio.toFixed(1)}%` : '****'}
              </span>
            </div>
            {/* 现金 */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span className="text-xs font-bold text-[var(--color-text-secondary)] flex-1">现金</span>
              <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                {showAssets ? `${accountStats.cashRatio.toFixed(1)}%` : '****'}
              </span>
            </div>
          </div>
          {/* 进度条 */}
          <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div 
              className="h-full bg-[#00D4AA] transition-all duration-500" 
              style={{ width: `${accountStats.stockRatio}%` }} 
            />
            <div 
              className="h-full bg-[#3B82F6] transition-all duration-500" 
              style={{ width: `${accountStats.fundRatio}%` }} 
            />
            <div 
              className="h-full bg-[#F59E0B] transition-all duration-500" 
              style={{ width: `${accountStats.cashRatio}%` }} 
            />
          </div>
        </div>

        {/* 总盈亏 */}
        <div className="galaxy-card p-5">
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-text-primary)] mb-4">
            累计盈亏
          </h3>
          <div className="flex items-end gap-4">
            <div>
              <p className={`text-3xl font-black font-mono ${accountStats.totalProfit >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                {showAssets ? `${accountStats.totalProfit >= 0 ? '+' : ''}¥${accountStats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
              </p>
              <p className={`text-sm font-bold font-mono mt-1 ${accountStats.totalProfitRate >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                {showAssets ? `${accountStats.totalProfitRate >= 0 ? '+' : ''}${accountStats.totalProfitRate.toFixed(2)}%` : '****'}
              </p>
            </div>
            <div className="flex-1 text-right">
              <button
                onClick={onOpenAnalysis}
                className="px-4 py-2 rounded-lg bg-[#00D4AA]/10 border border-[#00D4AA]/20 text-[10px] font-black text-[#00D4AA] hover:bg-[#00D4AA]/20 transition-all"
              >
                详细分析 →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 持仓列表 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-primary)]">
            我的持仓
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase">
              {account.holdings.length} 只标的
            </span>
            {/* 排序控制 */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[var(--color-text-muted)]">排序:</span>
              <button 
                onClick={() => toggleSort('marketValue')}
                className={`px-2 py-1 rounded ${sortField === 'marketValue' ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : 'text-[var(--color-text-secondary)] hover:bg-white/5'}`}
              >
                市值 <SortIcon field="marketValue" />
              </button>
              <button 
                onClick={() => toggleSort('profitRate')}
                className={`px-2 py-1 rounded ${sortField === 'profitRate' ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : 'text-[var(--color-text-secondary)] hover:bg-white/5'}`}
              >
                盈亏 <SortIcon field="profitRate" />
              </button>
            </div>
          </div>
        </div>

        {account.holdings.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px] galaxy-card">
            当前暂无持仓标的
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHoldings.map((holding: Holding) => (
              <div 
                key={holding.symbol} 
                className={`galaxy-card p-4 animate-slide-up hover:border-[var(--color-primary)]/40 transition-all cursor-pointer group relative ${
                  holding.isForcedSell ? 'border-red-500/50 bg-red-500/5' : ''
                }`}
                onClick={() => navigate(`/client/stock/${holding.symbol}`)}
              >
                {/* 强制平仓警告横幅 */}
                {holding.isForcedSell && (
                  <div className="absolute top-0 left-0 right-0 bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest py-1 text-center rounded-t-lg">
                    此持仓已被强制平仓
                  </div>
                )}

                <div className={`flex justify-between items-start ${holding.isForcedSell ? 'mt-4' : ''}`}>
                  <div className="flex items-center gap-3">
                    <StockIcon name={holding.name} logoUrl={holding.logoUrl} size="md" />
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
                      {(holding.profit || 0) >= 0 ? '+' : ''}{(holding.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[10px] font-bold font-mono opacity-80 ${(holding.profit || 0) >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                      {(holding.profitRate || 0) >= 0 ? '+' : ''}{(holding.profitRate || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 border-t border-[var(--color-border)] mt-3 pt-3">
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">持仓</p>
                    <p className="text-xs font-black font-mono text-[var(--color-text-primary)]">
                      {holding.quantity}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">成本价</p>
                    <p className="text-xs font-black font-mono text-[var(--color-text-secondary)]">
                      {holding.averagePrice.toFixed(3)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">现价</p>
                    <p className={`text-xs font-black font-mono ${holding.currentPrice >= holding.averagePrice ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                      {holding.currentPrice.toFixed(3)}
                    </p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter">市值</p>
                    <p className="text-xs font-black font-mono text-[var(--color-text-primary)]">
                      ¥{(holding.marketValue || holding.quantity * holding.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* 强制平仓原因 */}
                {holding.isForcedSell && holding.forcedSellReason && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-[9px] font-black text-red-400 uppercase">平仓原因</p>
                    <p className="text-xs text-red-300 mt-0.5">{holding.forcedSellReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快速操作入口 */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/client/trade')}
          className="galaxy-card p-4 text-center hover:border-[#00D4AA]/40 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#00D4AA]/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#00D4AA]/20 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <p className="text-[10px] font-black text-[var(--color-text-primary)]">买入</p>
        </button>
        <button
          onClick={onOpenConditional}
          className="galaxy-card p-4 text-center hover:border-[#00D4AA]/40 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#3B82F6]/20 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
              <path d="M12 2v20M2 12h20"/>
              <path d="M12 6l4 4-4 4"/>
            </svg>
          </div>
          <p className="text-[10px] font-black text-[var(--color-text-primary)]">条件单</p>
        </button>
        <button
          onClick={() => navigate('/client/ipo')}
          className="galaxy-card p-4 text-center hover:border-[#00D4AA]/40 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#8B5CF6]/20 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
              <path d="M12 2v20M2 12h20"/>
              <circle cx="12" cy="12" r="4"/>
            </svg>
          </div>
          <p className="text-[10px] font-black text-[var(--color-text-primary)]">新股申购</p>
        </button>
      </div>
    </div>
  );
};

export default ProfileOverview;
