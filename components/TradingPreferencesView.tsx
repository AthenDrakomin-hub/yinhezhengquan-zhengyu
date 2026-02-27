"use strict";

import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ICONS } from '../constants';
import { OrderStrategy, TradingSettings } from '../types';

interface TradingPreferencesViewProps {
  settings: TradingSettings;
  onUpdateSettings: (settings: Partial<TradingSettings>) => void;
}

const TradingPreferencesView: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{
    tradingSettings: TradingSettings;
    onUpdateTradingSettings: (settings: Partial<TradingSettings>) => void;
  }>();
  
  const settings = context?.tradingSettings || {
    fastOrderMode: true,
    defaultStrategy: 'NORMAL' as OrderStrategy,
    defaultLeverage: 10,
    autoStopLoss: false
  };
  
  const onUpdateSettings = context?.onUpdateTradingSettings || (() => {});

  const strategies = Object.values(OrderStrategy);
  const leverageOptions = [5, 10, 20, 50, 100];

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">交易偏好设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-10">
        {/* Fast Order Section */}
        <section className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">自动化与效率</h3>
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">极速报单模式</p>
                  <p className="text-[9px] text-[var(--color-text-muted)]">开启后，下单将跳过二次风险合规确认弹窗</p>
                </div>
                <div 
                  onClick={() => onUpdateSettings({ fastOrderMode: !settings.fastOrderMode })}
                  className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${settings.fastOrderMode ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.fastOrderMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[var(--color-text-primary)]">自动止损预设</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">开仓后自动按默认比例挂出止损单</p>
              </div>
              <div 
                onClick={() => onUpdateSettings({ autoStopLoss: !settings.autoStopLoss })}
                className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${settings.autoStopLoss ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.autoStopLoss ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </section>

        {/* Default Strategy */}
        <section className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">默认委托策略</h3>
          <div className="grid grid-cols-1 gap-2">
            {strategies.map((strategy) => (
              <div 
                key={strategy}
                onClick={() => onUpdateSettings({ defaultStrategy: strategy })}
                className={`glass-card p-4 flex items-center justify-between cursor-pointer border-2 transition-all ${
                  settings.defaultStrategy === strategy ? 'border-[#00D4AA] bg-[#00D4AA]/5' : 'border-transparent hover:border-[var(--color-border)]'
                }`}
              >
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">{strategy}</p>
                  <p className="text-[8px] text-[var(--color-text-muted)] uppercase tracking-widest font-mono">
                    {strategy === OrderStrategy.NORMAL ? 'STANDARD EXECUTION' : 
                     strategy === OrderStrategy.GRID ? 'ALGORITHMIC REBALANCING' : 
                     strategy === OrderStrategy.TP_SL ? 'PROTECTIVE TRIGGER' : 
                     'ADVANCED LOGIC'}
                  </p>
                </div>
                {settings.defaultStrategy === strategy && (
                  <div className="w-5 h-5 rounded-full bg-[#00D4AA] flex items-center justify-center text-[#0A1628]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Derivative Leverage */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">衍生品默认杠杆</h3>
            <span className="text-xs font-black text-[#00D4AA] font-mono">{settings.defaultLeverage}x</span>
          </div>
          <div className="glass-card p-6 space-y-6">
            <div className="flex justify-between gap-1">
              {leverageOptions.map((lv) => (
                <button 
                  key={lv}
                  onClick={() => onUpdateSettings({ defaultLeverage: lv })}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black font-mono transition-all border ${
                    settings.defaultLeverage === lv 
                      ? 'bg-[#00D4AA] text-[#0A1628] border-transparent shadow-[0_0_15px_rgba(0,212,170,0.3)]' 
                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                  }`}
                >
                  {lv}x
                </button>
              ))}
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
               <p className="text-[8px] text-red-400 font-bold leading-relaxed uppercase tracking-widest">
                 ⚠️ 风险提示：杠杆超过 20x 属于极高风险操作，请确保您已具备足够的风险抵御能力。
               </p>
            </div>
          </div>
        </section>

        <div className="pt-4 flex flex-col items-center gap-2">
           <ICONS.Shield size={24} className="text-[var(--color-text-muted)] opacity-20" />
           <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">Galaxy Nexus Security Protocol v3.0</p>
        </div>
      </div>
    </div>
  );
};

export default TradingPreferencesView;
