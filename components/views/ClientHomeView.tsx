"use strict";

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../lib/constants';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonListItem } from '../shared/Skeleton';
import { PieChart, DonutChart, Sparkline, BarChart, ProgressRing } from '../shared/Charts';
import { OperationFeedback, UndoAction, useSuccessAnimation } from '../shared/OperationFeedback';
import PullToRefresh from '../shared/PullToRefresh';
import { SmartSearchInput } from '../shared/SmartSearch';
import { VirtualList } from '../shared/VirtualList';
import { HotkeyHint } from '../shared/Hotkeys';
import { notify } from '../../lib/notification';

interface ClientHomeViewProps {
  user: {
    name: string;
    account: string;
    availableBalance: number;
    totalAssets: number;
    totalProfit: number;
    totalProfitPercent: number;
    positions?: Array<{
      code: string;
      name: string;
      shares: number;
      avgPrice: number;
      currentPrice: number;
      profit: number;
      profitPercent: number;
    }>;
  };
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

const ClientHomeView: React.FC<ClientHomeViewProps> = ({ 
  user, 
  onRefresh,
  isLoading = false 
}) => {
  const navigate = useNavigate();
  const { settings } = useUserSettings();
  const animation = useSuccessAnimation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 模拟持仓数据
  const positions = user.positions || [
    { code: '600519', name: '贵州茅台', shares: 100, avgPrice: 1800, currentPrice: 1850, profit: 5000, profitPercent: 2.78 },
    { code: '000858', name: '五粮液', shares: 200, avgPrice: 160, currentPrice: 165, profit: 1000, profitPercent: 3.13 },
    { code: '300750', name: '宁德时代', shares: 150, avgPrice: 200, currentPrice: 195, profit: -750, profitPercent: -2.5 },
  ];

  // 资产分布数据（用于饼图）
  const assetDistribution = useMemo(() => [
    { label: '股票', value: user.totalAssets * 0.65, color: '#3B82F6' },
    { label: '现金', value: user.availableBalance, color: '#10B981' },
    { label: '基金', value: user.totalAssets * 0.15, color: '#F59E0B' },
    { label: '债券', value: user.totalAssets * 0.05, color: '#8B5CF6' },
  ].filter(d => d.value > 0), [user]);

  // 收益趋势数据（用于迷你折线图）
  const profitTrend = [12000, 13500, 12800, 14200, 15000, 14800, 16200, 17500, 18000, 17800, 18500, 19200];

  // 处理刷新
  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      animation.showSuccess('刷新成功');
    } catch (error) {
      animation.showError('刷新失败');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      {/* 操作反馈动画 */}
      <OperationFeedback
        isOpen={animation.isOpen}
        type={animation.type}
        message={animation.message}
        onClose={animation.hide}
      />

      {/* 头部 */}
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">资产概览</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">欢迎回来，{user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <HotkeyHint keys={['Ctrl', 'K']} />
        </div>
      </header>

      {/* 智能搜索 */}
      <div className="px-4 pt-4">
        <SmartSearchInput
          options={[
            { id: '1', name: '贵州茅台', code: '600519', tags: ['白酒', '龙头'] },
            { id: '2', name: '五粮液', code: '000858', tags: ['白酒'] },
            { id: '3', name: '宁德时代', code: '300750', tags: ['新能源'] },
            { id: '4', name: '比亚迪', code: '002594', tags: ['新能源', '汽车'] },
          ]}
          hotItems={['贵州茅台', '宁德时代', '比亚迪']}
          placeholder="搜索股票代码或名称（支持拼音）"
          onSelect={(opt) => {
            notify.success(`已选择 ${opt.name}`);
          }}
        />
      </div>

      {/* 主内容区域 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* 资产卡片 */}
        <div className="bg-gradient-to-br from-[#E63946] to-[#C62836] rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm opacity-80">总资产</p>
              <h2 className="text-3xl font-black mt-1">
                ¥{user.totalAssets.toLocaleString()}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">今日盈亏</p>
              <p className={`text-xl font-bold mt-1 ${user.totalProfit >= 0 ? '' : 'text-red-200'}`}>
                {user.totalProfit >= 0 ? '+' : ''}{user.totalProfit.toLocaleString()} 
                <span className="text-sm ml-1">
                  ({user.totalProfitPercent >= 0 ? '+' : ''}{user.totalProfitPercent.toFixed(2)}%)
                </span>
              </p>
            </div>
          </div>
          
          {/* 迷你趋势图 */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-xs opacity-70">近30日收益趋势</p>
            </div>
            <Sparkline
              data={profitTrend}
              width={150}
              height={40}
              color="white"
              fillOpacity={0.2}
            />
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: '📈', label: '行情', path: '/client/quotes' },
            { icon: '💹', label: '交易', path: '/client/trade' },
            { icon: '📊', label: '资产', path: '/client/wealth' },
            { icon: '⚙️', label: '设置', path: '/client/settings' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all active:scale-95"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-bold text-[var(--color-text-primary)]">{item.label}</span>
            </button>
          ))}
        </div>

        {/* 资产分布与持仓 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 资产分布饼图 */}
          <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">资产分布</h3>
            <DonutChart
              data={assetDistribution}
              size={150}
              innerRadius={50}
              centerContent={
                <div className="text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">总计</p>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    ¥{(user.totalAssets / 10000).toFixed(0)}万
                  </p>
                </div>
              }
            />
            <div className="mt-4 space-y-2">
              {assetDistribution.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[var(--color-text-secondary)]">{d.label}</span>
                  </div>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    ¥{d.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 收益统计 */}
          <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">收益统计</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--color-text-muted)]">本月收益目标</span>
                  <span className="text-xs font-bold text-[var(--color-primary)]">75%</span>
                </div>
                <ProgressRing progress={75} size={60} strokeWidth={6} />
              </div>

              <div className="pt-4 border-t border-[var(--color-border)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">盈利股票</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">12</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">亏损股票</p>
                    <p className="text-lg font-bold text-[var(--color-error)]">5</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 持仓列表 */}
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">持仓明细</h3>
            <button
              onClick={() => navigate('/client/wealth')}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              查看全部 →
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <SkeletonListItem key={i} />
              ))}
            </div>
          ) : (
            <VirtualList
              items={positions}
              itemHeight={72}
              containerHeight={300}
              renderItem={(pos, i) => (
                <div
                  key={pos.code}
                  className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0"
                >
                  <div>
                    <p className="font-bold text-[var(--color-text-primary)]">{pos.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{pos.code} · {pos.shares}股</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: pos.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                      ¥{pos.currentPrice.toFixed(2)}
                    </p>
                    <p 
                      className="text-xs"
                      style={{ color: pos.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}
                    >
                      {pos.profit >= 0 ? '+' : ''}{pos.profitPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </PullToRefresh>
    </div>
  );
};

export default ClientHomeView;
