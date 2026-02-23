
import React, { useState, useMemo } from 'react';
import { ICONS } from '../constants';
import { Holding, UserAccount } from '../types';
import StockIcon from './StockIcon';
import ComplianceCenter from './ComplianceCenter';
import ServiceCenter from './ServiceCenter';
import EducationCenter from './EducationCenter';

interface ProfileViewProps {
  account: UserAccount;
  onOpenAnalysis: () => void;
  onOpenConditional: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ account, onOpenAnalysis, onOpenConditional, isDarkMode, toggleTheme }) => {
  const [showAssets, setShowAssets] = useState(true);
  const [activeMenu, setActiveMenu] = useState('HOLDING');
  const [notifications, setNotifications] = useState({
    tradeAlerts: true,
    priceAlerts: true,
    systemNews: false
  });

  const menus = [
    { id: 'HOLDING', label: '我的持仓' },
    { id: 'CONDITIONAL', label: '智能条件单' },
    { id: 'SAFE', label: '风控审计' },
    { id: 'SERVICE', label: '客服辅助' },
    { id: 'SETTINGS', label: '个性化' }
  ];

  const totalEquity = useMemo(() => {
    const stockValue = account.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    return account.balance + stockValue;
  }, [account.balance, account.holdings]);

  const totalProfit = useMemo(() => {
    return account.holdings.reduce((sum, h) => sum + h.profit, 0);
  }, [account.holdings]);

  return (
    <div className="animate-slide-up p-4 space-y-6 pb-24">
      {/* 2025 证裕 Nexus 资产看板 */}
      <section className="bg-gradient-to-br from-[#00D4AA] to-[#00B894] rounded-[32px] p-8 text-[#0A1628] shadow-[0_20px_60px_-15px_rgba(0,212,170,0.4)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
        <div className="flex justify-between items-center mb-10 relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#0A1628] rounded-2xl flex items-center justify-center text-[#00D4AA] shadow-xl">
               <ICONS.User size={24} />
             </div>
             <div>
                <span className="font-black uppercase text-[10px] tracking-[0.2em] opacity-60">证裕实盘账户</span>
                <p className="font-black text-sm tracking-tight">Nexus_Invest_2025</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onOpenAnalysis} className="p-2 bg-black/5 hover:bg-black/10 rounded-xl transition-all">
              <ICONS.Chart size={22} />
            </button>
            <button onClick={() => setShowAssets(!showAssets)} className="p-2 hover:bg-black/5 rounded-xl transition-all">
              <ICONS.Eye size={22} className={showAssets ? 'opacity-100' : 'opacity-40'} />
            </button>
          </div>
        </div>
        
        <div className="space-y-1 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">总资产 (元)</p>
          <h2 className="text-4xl font-black font-mono tracking-tighter">
            {showAssets ? totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '******.**'}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-12 relative z-10">
           <div className="bg-[#0A1628]/10 p-5 rounded-[24px] border border-white/10 backdrop-blur-md">
             <p className="text-[9px] font-black uppercase opacity-60">当日盈亏</p>
             <p className={`text-xl font-black font-mono tracking-tight ${totalProfit >= 0 ? 'text-[#0A1628]' : 'text-[#FF6B6B]'}`}>
               {totalProfit >= 0 ? '+' : ''}{showAssets ? totalProfit.toLocaleString() : '****'}
             </p>
           </div>
           <div className="bg-[#0A1628]/10 p-5 rounded-[24px] border border-white/10 backdrop-blur-md">
             <p className="text-[9px] font-black uppercase opacity-60">可用余额</p>
             <p className="text-xl font-black font-mono tracking-tight">
               {showAssets ? account.balance.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '****'}
             </p>
           </div>
        </div>
      </section>

      {/* 模块化菜单导航 */}
      <div className="flex bg-[var(--color-surface)] p-1 rounded-2xl border border-[var(--color-border)] sticky top-0 z-20 gap-1 overflow-x-auto no-scrollbar">
        {menus.map(menu => (
          <button 
            key={menu.id} 
            onClick={() => setActiveMenu(menu.id)} 
            className={`flex-1 whitespace-nowrap px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeMenu === menu.id ? 'bg-[#00D4AA] text-[#0A1628] shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {menu.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeMenu === 'HOLDING' && (
          account.holdings.length === 0 ? (
            <div className="p-12 text-center text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px]">当前暂无持仓标的</div>
          ) : (
            account.holdings.map((holding: Holding) => (
              <div key={holding.symbol} className="glass-card p-5 animate-slide-up hover:border-[#00D4AA]/40 transition-all cursor-pointer group">
                {/* 标的头部信息：Logo, 名称, 盈亏汇总 */}
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

                {/* 详细数据网格：持仓, 成本, 现价, 市值 */}
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
            ))
          )
        )}

        {activeMenu === 'CONDITIONAL' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">运行中的智能条件单</h3>
                <button onClick={onOpenConditional} className="text-[9px] font-black text-[#00D4AA] uppercase tracking-widest">+ 新增策略</button>
             </div>
             {account.conditionalOrders.length === 0 ? (
               <div className="p-12 text-center text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px]">暂无策略在运行</div>
             ) : (
               account.conditionalOrders.map(order => (
                 <div key={order.id} className="glass-card p-5 border-l-4 border-yellow-500/50">
                    <div className="flex justify-between items-center mb-4">
                       <div className="flex items-center gap-3">
                          <StockIcon name={order.name} size="sm" />
                          <div>
                            <h4 className="text-xs font-black">{order.name}</h4>
                            <p className="text-[9px] font-black text-yellow-500 uppercase">{order.type === 'TP_SL' ? '止盈止损' : '网格交易'}</p>
                          </div>
                       </div>
                       <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 uppercase tracking-tighter">运行中 (Sync)</span>
                    </div>
                    <div className="bg-[var(--color-bg)] p-3 rounded-xl text-[10px] font-mono text-[var(--color-text-muted)]">
                       {order.type === 'TP_SL' ? (
                         <>触发条件：止损 {order.config.stopLoss} | 止盈 {order.config.takeProfit}</>
                       ) : (
                         <>网格设置：{order.config.gridLower} - {order.config.gridUpper} | 密度 {order.config.gridCount}</>
                       )}
                    </div>
                 </div>
               ))
             )}
          </div>
        )}

        {activeMenu === 'SAFE' && <ComplianceCenter />}
        {activeMenu === 'SERVICE' && <ServiceCenter />}
        
        {activeMenu === 'SETTINGS' && (
          <div className="space-y-6 animate-slide-up">
            <section className="space-y-3">
              <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">显示偏好</h3>
              <div className="glass-card overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-primary)]">
                      {isDarkMode ? <ICONS.Moon size={16} /> : <ICONS.Sun size={16} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-primary)]">深色模式</p>
                      <p className="text-[9px] text-[var(--color-text-muted)]">优化夜间交易体验，降低视觉疲劳</p>
                    </div>
                  </div>
                  <div 
                    onClick={toggleTheme}
                    className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${isDarkMode ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">通知设置</h3>
              <div className="glass-card divide-y divide-[var(--color-border)] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">成交回报提醒</p>
                    <p className="text-[9px] text-[var(--color-text-muted)]">当委托单成交或撤单成功时发送通知</p>
                  </div>
                  <div 
                    onClick={() => setNotifications(prev => ({ ...prev, tradeAlerts: !prev.tradeAlerts }))}
                    className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${notifications.tradeAlerts ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${notifications.tradeAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">价格预警推送</p>
                    <p className="text-[9px] text-[var(--color-text-muted)]">自选股达到预设价格触发即时提醒</p>
                  </div>
                  <div 
                    onClick={() => setNotifications(prev => ({ ...prev, priceAlerts: !prev.priceAlerts }))}
                    className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${notifications.priceAlerts ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${notifications.priceAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">系统公告与研报</p>
                    <p className="text-[9px] text-[var(--color-text-muted)]">接收最新的市场研报及系统功能更新</p>
                  </div>
                  <div 
                    onClick={() => setNotifications(prev => ({ ...prev, systemNews: !prev.systemNews }))}
                    className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${notifications.systemNews ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${notifications.systemNews ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </section>

            <div className="p-4 glass-card bg-blue-500/5 border-blue-500/20">
              <div className="flex gap-3">
                <ICONS.Shield size={16} className="text-blue-500 shrink-0" />
                <p className="text-[9px] text-blue-500 font-bold leading-relaxed">
                  证裕 Nexus 交易单元采用端到端加密技术保护您的个性化设置。所有偏好均存储于本地安全沙箱，确保您的交易习惯不被第三方追踪。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
