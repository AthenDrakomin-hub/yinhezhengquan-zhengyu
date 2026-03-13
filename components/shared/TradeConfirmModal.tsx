"use strict";

import React, { useState } from 'react';
import { TradeType } from '../../lib/types';
import { ICONS } from '../../lib/constants';

interface TradeConfirmModalProps {
  isOpen: boolean;
  tradeInfo: {
    type: TradeType;
    symbol: string;
    name: string;
    price: number;
    quantity: number;
    amount: number;
  } | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const TradeConfirmModal: React.FC<TradeConfirmModalProps> = ({
  isOpen,
  tradeInfo,
  onConfirm,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  if (!isOpen || !tradeInfo) return null;

  const getTypeInfo = (type: TradeType) => {
    switch (type) {
      case TradeType.BUY:
        return { label: '买入', color: 'text-[#DC2626]', bg: 'bg-red-500/10' };
      case TradeType.SELL:
        return { label: '卖出', color: 'text-[#059669]', bg: 'bg-green-500/10' };
      case TradeType.IPO:
        return { label: '新股申购', color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case TradeType.BLOCK:
        return { label: '大宗交易', color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case TradeType.LIMIT_UP:
        return { label: '涨停打板', color: 'text-red-500', bg: 'bg-red-500/10' };
      default:
        return { label: type, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const typeInfo = getTypeInfo(tradeInfo.type);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[var(--color-surface)] rounded-2xl w-[90%] max-w-md p-6 animate-slide-up shadow-2xl border border-[var(--color-border)]"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${typeInfo.bg} flex items-center justify-center`}>
              <ICONS.TrendingUp size={24} className={typeInfo.color} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--color-text-primary)]">
                交易确认
              </h3>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                请核实以下交易信息
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* 交易详情 */}
        <div className="space-y-3 mb-6">
          {/* 股票信息 */}
          <div className="p-4 bg-[var(--color-bg)] rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-black text-[var(--color-text-primary)]">{tradeInfo.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] font-mono">{tradeInfo.symbol}</p>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${typeInfo.bg} ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
            </div>
          </div>

          {/* 交易详情 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[var(--color-bg)] rounded-xl">
              <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">委托价格</p>
              <p className="text-lg font-black font-mono text-[var(--color-text-primary)] mt-1">
                ¥{tradeInfo.price.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-[var(--color-bg)] rounded-xl">
              <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">委托数量</p>
              <p className="text-lg font-black font-mono text-[var(--color-text-primary)] mt-1">
                {tradeInfo.quantity}股
              </p>
            </div>
          </div>

          {/* 总金额 */}
          <div className="p-4 bg-gradient-to-r from-[#00D4AA]/10 to-transparent rounded-xl border border-[#00D4AA]/20">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[var(--color-text-secondary)]">委托金额</p>
              <p className="text-xl font-black font-mono text-[#00D4AA]">
                ¥{tradeInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* 风险提示 */}
        <div className="mb-6 p-3 bg-red-500/5 rounded-xl border border-red-500/20">
          <div className="flex items-start gap-2">
            <ICONS.AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
            <div className="text-[10px] text-red-400 leading-relaxed">
              <p className="font-bold mb-1">风险提示</p>
              <p>证券投资有风险，请根据自身风险承受能力谨慎投资。本系统仅为模拟交易环境。</p>
            </div>
          </div>
        </div>

        {/* 确认勾选 */}
        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <div 
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              checked ? 'bg-[#00D4AA] border-[#00D4AA]' : 'border-[var(--color-border)]'
            }`}
            onClick={() => setChecked(!checked)}
          >
            {checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
          </div>
          <span className="text-xs text-[var(--color-text-secondary)]">
            我已了解相关风险，确认提交此订单
          </span>
        </label>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-12 bg-[var(--color-bg)] rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-all disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!checked || loading}
            className="flex-1 h-12 bg-[#00D4AA] rounded-xl text-sm font-bold text-[#0A1628] hover:bg-[#00D4AA]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '提交中...' : '确认提交'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeConfirmModal;
