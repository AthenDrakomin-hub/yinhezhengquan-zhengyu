/**
 * "我的"页面
 * 按银河证券官方App风格还原
 * 移动端优先设计
 * 
 * 功能模块：
 * 1. 账户信息 - 手机号登录、总资产、今日盈亏、持仓盈亏、用户信息
 * 2. 功能入口 - 资产全景、月度账单、财富日历、综合账户
 * 3. 智能交易VIP - 条件单、盯盘、预约打新、VIP权益
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '../../lib/constants';
import StockIcon from '../shared/StockIcon';
import { UserAccount, UserTodo, TodoStats } from '../../lib/types';
import notificationService from '../../services/notificationService';
import { getUserTodos, getTodoStats, markInProgress, completeTodo, dismissTodo, TODO_TYPE_CONFIG } from '../../services/todoService';
import { useVipPermission } from '../../services/vipPermissionService';
import { useAuth } from '../../contexts/AuthContext';
import { PullToRefreshWrapper } from '../shared/WithPullToRefresh';
import VipUpgradeModal from '../shared/VipUpgradeModal';

interface ProfileViewProps {
  account: UserAccount | null;
  onOpenAnalysis: () => void;
  onOpenConditional: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
  account, 
  onOpenAnalysis, 
  onOpenConditional, 
  isDarkMode, 
  toggleTheme 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showAssets, setShowAssets] = useState(true);
  const [notifications, setNotifications] = useState({
    tradeAlerts: true,
    priceAlerts: true,
    systemNews: false
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  // 待办事项状态
  const [todos, setTodos] = useState<UserTodo[]>([]);
  const [todoStats, setTodoStats] = useState<TodoStats>({
    total_count: 0,
    pending_count: 0,
    high_priority_count: 0,
    expired_count: 0,
  });
  const [isLoadingTodos, setIsLoadingTodos] = useState(false);
  
  // VIP权限状态
  const vipPermission = useVipPermission();
  const [showVipUpgradeModal, setShowVipUpgradeModal] = useState(false);
  const [vipFeatureName, setVipFeatureName] = useState('该功能');

  // 是否已登录
  const isLoggedIn = !!account;

  // 计算账户统计
  const accountStats = useMemo(() => {
    if (!account) {
      // 未登录时显示默认数据
      return {
        totalAssets: 1000000,
        availableCash: 1000000,
        holdingsValue: 0,
        totalProfit: 0,
        totalProfitRate: 0,
        todayPnL: 0,
      };
    }
    
    const holdingsValue = account.holdings.reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0);
    const totalProfit = account.holdings.reduce((sum, h) => sum + (h.profit || 0), 0);
    const totalCost = account.holdings.reduce((sum, h) => sum + (h.quantity * h.averagePrice), 0);
    const totalAssets = account.balance + holdingsValue;
    
    return {
      totalAssets,
      availableCash: account.balance,
      holdingsValue,
      totalProfit,
      totalProfitRate: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
      todayPnL: 0, // 今日盈亏默认为0
    };
  }, [account]);

  // 获取用户显示名称
  const displayName = useMemo(() => {
    if (!account) return '张三'; // 默认显示张三
    return account.username || account.email?.split('@')[0] || '张三';
  }, [account]);

  // 获取用户ID
  const displayId = useMemo(() => {
    if (!account) return '88888888'; // 默认ID
    return account.id.slice(0, 8);
  }, [account]);

  // 加载通知设置
  useEffect(() => {
    if (isLoggedIn) {
      loadNotificationSettings();
      loadTodos();
    } else {
      setIsLoadingSettings(false);
      setTodos([]);
      setTodoStats({ total_count: 0, pending_count: 0, high_priority_count: 0, expired_count: 0 });
    }
  }, [isLoggedIn]);

  // 加载待办事项
  const loadTodos = async () => {
    try {
      setIsLoadingTodos(true);
      const [todosData, statsData] = await Promise.all([
        getUserTodos({ status: 'PENDING', limit: 5 }),
        getTodoStats(),
      ]);
      setTodos(todosData);
      setTodoStats(statsData);
    } catch (error) {
      console.error('加载待办事项失败:', error);
    } finally {
      setIsLoadingTodos(false);
    }
  };

  // 处理待办事项点击
  const handleTodoClick = async (todo: UserTodo) => {
    // 标记为处理中
    await markInProgress(todo.id);
    
    // 如果有跳转链接，执行跳转
    if (todo.action_url) {
      navigate(todo.action_url);
    }
  };

  // 处理待办事项完成
  const handleTodoComplete = async (todoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const success = await completeTodo(todoId);
    if (success) {
      // 重新加载待办事项
      loadTodos();
    }
  };

  // 处理待办事项忽略
  const handleTodoDismiss = async (todoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const success = await dismissTodo(todoId);
    if (success) {
      loadTodos();
    }
  };

  const loadNotificationSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const settings = await notificationService.getNotificationSettings();
      setNotifications({
        tradeAlerts: settings.trade_alerts_enabled,
        priceAlerts: settings.price_alerts_enabled,
        systemNews: settings.system_news_enabled
      });
    } catch (error) {
      console.error('加载通知设置失败:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // 下拉刷新处理
  const handleRefresh = useCallback(async () => {
    if (isLoggedIn) {
      await Promise.all([
        loadNotificationSettings(),
        loadTodos(),
      ]);
    }
    // 刷新账户数据（通过重新加载页面数据）
    // 这里可以添加更多刷新逻辑
  }, [isLoggedIn]);

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const newValue = !notifications[key];
    setNotifications(prev => ({ ...prev, [key]: newValue }));
    
    try {
      const mapping: Record<string, string> = {
        tradeAlerts: 'trade_alerts_enabled',
        priceAlerts: 'price_alerts_enabled',
        systemNews: 'system_news_enabled'
      };
      await notificationService.updateNotificationSettings({
        [mapping[key]]: newValue
      });
    } catch (error) {
      console.error('保存通知设置失败:', error);
      setNotifications(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  // 财富日历点击
  const handleCalendarClick = () => {
    navigate('/client/calendar');
  };

  // 月度账单点击
  const handleMonthlyBillClick = () => {
    navigate('/client/monthly-bill');
  };

  // VIP权限检查
  const checkVipAccess = (featureName: string): boolean => {
    if (!vipPermission.canUseVipFeatures) {
      setVipFeatureName(featureName);
      setShowVipUpgradeModal(true);
      return false;
    }
    return true;
  };

  // VIP权益点击
  const handleVipBenefitsClick = () => {
    navigate('/client/vip-benefits');
  };

  // 条件单点击（VIP功能）
  const handleConditionalClick = () => {
    if (!checkVipAccess('条件单')) return;
    onOpenConditional();
  };

  // 盯盘点击（VIP功能）
  const handleWatchlistClick = () => {
    if (!checkVipAccess('智能盯盘')) return;
    navigate('/client/watchlist-alerts');
  };

  // 预约打新点击（VIP功能）
  const handleIPOReserveClick = () => {
    if (!checkVipAccess('预约打新')) return;
    navigate('/client/ipo-reserve');
  };

  // 综合账户点击
  const handleComprehensiveAccountClick = () => {
    navigate('/client/comprehensive-account');
  };

  // 检查是否在子路由中（需要全屏显示的页面：交易记录、资金流水、合规中心、投教中心、待办列表）
  const isFullScreenChildRoute = location.pathname.includes('/profile/transactions') || 
                                  location.pathname.includes('/profile/funds') ||
                                  location.pathname.includes('/profile/compliance') ||
                                  location.pathname.includes('/profile/education') ||
                                  location.pathname.includes('/profile/todos');

  // 如果在全屏子路由中，只渲染 Outlet
  if (isFullScreenChildRoute) {
    return (
      <>
        <div className="min-h-screen bg-[var(--color-bg)]">
          <Outlet />
        </div>
        <VipUpgradeModal
          isOpen={showVipUpgradeModal}
          onClose={() => setShowVipUpgradeModal(false)}
          featureName={vipFeatureName}
        />
      </>
    );
  }

  return (
    <>
    <PullToRefreshWrapper onRefresh={handleRefresh} className="bg-[var(--color-bg)]">
    <div className="min-h-screen bg-[var(--color-bg)] pb-20">
      {/* 顶部蓝色导航栏 */}
      <div className="bg-[#0066CC] px-4 py-3 flex items-center justify-end">
        <div className="flex items-center gap-3">
          {/* 客服 */}
          <button className="text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
          {/* 行情自选 */}
          <button className="text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          {/* 消息 - 带未读数字 */}
          <button className="text-white relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-[#E63946] rounded-full text-[10px] text-white flex items-center justify-center font-medium">
              33
            </span>
          </button>
          {/* 设置 */}
          <button onClick={() => navigate('/client/settings')} className="text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 红色标题栏 - 总资产 */}
      <div className="bg-[#E63946] px-4 py-3 flex items-center justify-between">
        <span className="text-white text-sm">总资产(元)</span>
        <button className="text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* 未登录状态 - 登录提示 */}
      {!isLoggedIn ? (
        <div className="bg-[var(--color-surface)] mx-4 -mt-2 rounded-xl shadow-sm p-4">
          {/* 用户信息 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E63946] to-[#0066CC] flex items-center justify-center text-white text-lg font-bold">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">{displayName}</p>
              <p className="text-xs text-[var(--color-text-muted)]">ID: {displayId}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-[#E5F9EF] text-[#22C55E] rounded">正常</span>
          </div>
          
          {/* 资产展示 */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {showAssets ? `¥${accountStats.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
                </span>
                <button onClick={() => setShowAssets(!showAssets)} className="text-[var(--color-text-muted)]">
                  {showAssets ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-[var(--color-text-muted)]">今日盈亏</p>
                <p className={`text-sm font-medium ${accountStats.todayPnL >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                  {showAssets ? `${accountStats.todayPnL >= 0 ? '+' : ''}${accountStats.todayPnL.toFixed(2)}` : '--'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--color-text-muted)]">持仓盈亏</p>
                <p className={`text-sm font-medium ${accountStats.totalProfit >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                  {showAssets ? `${accountStats.totalProfit >= 0 ? '+' : ''}${accountStats.totalProfit.toFixed(2)}` : '--'}
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-3 border-2 border-[var(--color-secondary)] rounded-lg text-[var(--color-secondary)] font-medium bg-[var(--color-surface)] hover:bg-[var(--color-secondary)] hover:text-white transition-colors mt-2"
          >
            登录交易
          </button>
        </div>
      ) : (
        /* 已登录状态 - 资产展示 */
        <div className="bg-[var(--color-surface)] mx-4 -mt-2 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {showAssets ? `¥${accountStats?.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
                </span>
                <button onClick={() => setShowAssets(!showAssets)} className="text-[var(--color-text-muted)]">
                  {showAssets ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-[#999999]">今日盈亏</p>
                <p className={`text-sm font-medium ${(accountStats?.todayPnL || 0) >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                  {showAssets ? `${(accountStats?.todayPnL || 0) >= 0 ? '+' : ''}${accountStats?.todayPnL.toFixed(2)}` : '--'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--color-text-muted)]">持仓盈亏</p>
                <p className={`text-sm font-medium ${(accountStats?.totalProfit || 0) >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                  {showAssets ? `${(accountStats?.totalProfit || 0) >= 0 ? '+' : ''}${accountStats?.totalProfit.toFixed(2)}` : '--'}
                </p>
              </div>
            </div>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-3 pt-3 border-t border-[var(--color-border-light)]">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E63946] to-[#0066CC] flex items-center justify-center text-white text-lg font-bold">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">{displayName}</p>
              <p className="text-xs text-[var(--color-text-muted)]">ID: {displayId}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-[#E5F9EF] text-[#22C55E] rounded">正常</span>
          </div>
        </div>
      )}

      {/* 三个基础功能入口 */}
      <div className="bg-[var(--color-surface)] mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={onOpenAnalysis}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--color-bg)] flex items-center justify-center">
              <div className="w-7 h-7 bg-[#E63946] rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">¥</span>
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-primary)]">资产全景</span>
          </button>
          <button 
            onClick={handleMonthlyBillClick}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--color-bg)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--color-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs text-[var(--color-text-primary)]">月度账单</span>
          </button>
          <button 
            onClick={handleCalendarClick}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--color-bg)] flex items-center justify-center relative">
              <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="absolute top-1 right-1 w-5 h-5 bg-[#E63946] rounded-full text-white text-[10px] flex items-center justify-center font-bold">10</span>
            </div>
            <span className="text-xs text-[var(--color-text-primary)]">财富日历</span>
          </button>
        </div>
      </div>

      {/* 我的综合账户入口 */}
      <div className="bg-[var(--color-surface)] mx-4 mt-3 rounded-xl shadow-sm p-4">
        <button 
          onClick={handleComprehensiveAccountClick}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E63946] to-[#0066CC] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">我的综合账户</span>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">同名账户资金划转 ›</span>
        </button>
      </div>

      {/* 智能交易VIP专区 */}
      <div className="mx-4 mt-3">
        <div className="bg-[#2D2D2D] rounded-xl overflow-hidden">
          {/* 标题栏 */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">智能交易 VIP</span>
              {/* 用户VIP状态标签 */}
              {vipPermission.loading ? (
                <span className="text-[10px] px-2 py-0.5 bg-gray-600 text-gray-300 rounded">加载中</span>
              ) : vipPermission.isAdmin ? (
                <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white rounded font-medium">管理员</span>
              ) : vipPermission.isVip ? (
                <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white rounded font-medium">
                  {vipPermission.levelName}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 bg-gray-600 text-gray-300 rounded">普通用户</span>
              )}
            </div>
            <button 
              onClick={handleVipBenefitsClick}
              className="text-white/60 text-xs flex items-center gap-1 hover:text-white/80 transition-colors"
            >
              查看我的VIP权益
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* VIP功能模块 */}
          <div className="p-4 grid grid-cols-3 gap-3">
            {/* 我的条件单 */}
            <button 
              onClick={handleConditionalClick}
              className="bg-[#3D3D3D] rounded-lg p-3 text-left"
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 bg-[#C4956A] text-white rounded font-medium">VIP</span>
              </div>
              <p className="text-white text-sm font-medium mb-1">我的条件单</p>
              <p className="text-white/50 text-xs mb-3">预设条件 自动委托</p>
              
              {/* 条件单示意图 */}
              <div className="h-12 mb-3 relative">
                <svg className="w-full h-full" viewBox="0 0 80 40">
                  {/* 曲线 */}
                  <path 
                    d="M 5 20 Q 20 30, 35 15 T 75 20" 
                    fill="none" 
                    stroke="#6B7280" 
                    strokeWidth="1.5"
                  />
                  {/* 定价买入标记 */}
                  <circle cx="20" cy="25" r="3" fill="#E63946"/>
                  <text x="20" y="38" fontSize="6" fill="#E63946" textAnchor="middle">定价买入</text>
                  {/* 反弹买入标记 */}
                  <circle cx="40" cy="12" r="3" fill="#4DA6FF"/>
                  <text x="40" y="8" fontSize="6" fill="#4DA6FF" textAnchor="middle">反弹买入</text>
                  {/* 定价卖出标记 */}
                  <circle cx="60" cy="18" r="3" fill="#22C55E"/>
                  <text x="60" y="38" fontSize="6" fill="#22C55E" textAnchor="middle">定价卖出</text>
                </svg>
              </div>
              
              <div className="w-full py-2 bg-[#8B7355] text-white text-xs rounded font-medium text-center hover:bg-[#9B8365] transition-colors">
                去创建条件单
              </div>
            </button>

            {/* 我的盯盘 */}
            <button 
              onClick={handleWatchlistClick}
              className="bg-[#3D3D3D] rounded-lg p-3 text-left"
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 bg-[#C4956A] text-white rounded font-medium">VIP</span>
              </div>
              <p className="text-white text-sm font-medium mb-1">我的盯盘</p>
              <p className="text-white/50 text-xs mb-3">系统盯盘 到价提醒</p>
              <div className="h-12 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="text-white/50 text-xs text-center mt-1">点击查看</div>
            </button>

            {/* 预约打新 */}
            <button 
              onClick={handleIPOReserveClick}
              className="bg-[#3D3D3D] rounded-lg p-3 text-left"
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 bg-[#C4956A] text-white rounded font-medium">VIP</span>
              </div>
              <p className="text-white text-sm font-medium mb-1">预约打新</p>
              <p className="text-white/50 text-xs mb-3">7*24小时批量打新</p>
              <div className="h-12 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-white/50 text-xs text-center mt-1">点击预约</div>
            </button>
          </div>
        </div>
      </div>

      {/* 市场资讯栏 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <button className="w-full flex items-center gap-3">
          <span className="text-sm text-[#333333] flex-1 text-left">三驾马车齐头并进，港股配置价值显现!</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-[#E63946] text-white rounded font-medium">HOT</span>
          <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 我的待办 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#333333]">我的待办</span>
          {isLoggedIn && todoStats.pending_count > 0 && (
            <span className="text-xs text-[#999999]">共{todoStats.pending_count}项</span>
          )}
        </div>
        
        {isLoggedIn ? (
          isLoadingTodos ? (
            <div className="py-6 text-center">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#0066CC] border-t-transparent"></div>
              <p className="text-[#999999] text-sm mt-2">加载中...</p>
            </div>
          ) : todos.length > 0 ? (
            <div className="space-y-2">
              {todos.map((todo, index) => {
                const typeConfig = TODO_TYPE_CONFIG[todo.todo_type];
                return (
                  <button
                    key={todo.id}
                    onClick={() => handleTodoClick(todo)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-gray-50"
                    style={{ backgroundColor: typeConfig.bgColor }}
                  >
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: typeConfig.color }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-[#333333]">{todo.title}</p>
                      {todo.description && (
                        <p className="text-xs text-[#999999]">{todo.description}</p>
                      )}
                    </div>
                    {todo.action_text && (
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: typeConfig.color, backgroundColor: 'rgba(255,255,255,0.8)' }}
                      >
                        {todo.action_text}
                      </span>
                    )}
                  </button>
                );
              })}
              {todoStats.pending_count > 5 && (
                <button 
                  onClick={() => navigate('/client/profile/todos')}
                  className="w-full text-center text-sm text-[#0066CC] py-2"
                >
                  查看全部待办 ({todoStats.pending_count}项)
                </button>
              )}
            </div>
          ) : (
            <div className="py-6 text-center">
              <svg className="w-12 h-12 mx-auto text-[#CCCCCC] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[#999999] text-sm">暂无待办事项</p>
            </div>
          )
        ) : (
          <div className="py-6 text-center">
            <p className="text-[#999999] text-sm">登录后查看待办事项</p>
          </div>
        )}
      </div>

      {/* 常用功能 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-medium text-[#333333] mb-4">常用功能</h3>
        <div className="grid grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/client/profile/transactions')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">交易记录</span>
          </button>
          <button 
            onClick={() => navigate('/client/profile/funds')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">资金流水</span>
          </button>
          <button 
            onClick={() => navigate('/client/profile/compliance')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">合规中心</span>
          </button>
          <button 
            onClick={() => navigate('/client/profile/education')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">投教中心</span>
          </button>
        </div>
      </div>

      {/* 通知设置（已登录时显示） */}
      {isLoggedIn && !isLoadingSettings && (
        <div className="bg-[var(--color-surface)] mx-4 mt-3 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">通知设置</h3>
            <button 
              onClick={() => navigate('/client/settings/notification')}
              className="text-xs text-[var(--color-secondary)] flex items-center gap-1"
            >
              更多设置
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            {/* 成交回报 */}
            <button 
              onClick={() => navigate('/client/trade-alerts')}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] dark:bg-[#E63946]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#E63946]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-sm text-[var(--color-text-primary)]">成交回报</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${notifications.tradeAlerts ? 'bg-[#22C55E]' : 'bg-[var(--color-border)]'}`} />
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            
            {/* 价格预警 */}
            <button 
              onClick={() => navigate('/client/price-alerts')}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FEF3E2] dark:bg-[#F97316]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <span className="text-sm text-[var(--color-text-primary)]">价格预警</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white rounded">VIP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${notifications.priceAlerts ? 'bg-[#22C55E]' : 'bg-[var(--color-border)]'}`} />
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            
            {/* 系统公告 */}
            <button 
              onClick={() => navigate('/client/system-announcements')}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-[var(--color-secondary)]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--color-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <span className="text-sm text-[var(--color-text-primary)]">系统公告</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${notifications.systemNews ? 'bg-[#22C55E]' : 'bg-[var(--color-border)]'}`} />
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 深色模式切换 */}
      <div className="bg-[var(--color-surface)] mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center">
              {isDarkMode ? (
                <svg className="w-4 h-4 text-[var(--color-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <span className="text-sm text-[var(--color-text-primary)]">深色模式</span>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
              isDarkMode ? 'bg-[var(--color-secondary)]' : 'bg-[var(--color-border)]'
            }`}
          >
            <span 
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isDarkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 法律条款 */}
      <div className="mx-4 mt-3 mb-4">
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">法律条款</h3>
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/client/legal/user-agreement')}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[var(--color-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-[var(--color-text-primary)]">用户服务协议</span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button 
              onClick={() => navigate('/client/legal/privacy-policy')}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[var(--color-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm text-[var(--color-text-primary)]">隐私政策</span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 底部版权信息 */}
        <div className="mt-6 text-center pb-4">
          <p className="text-xs text-[var(--color-text-muted)]">© 2024 银河证券股份有限公司</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">投资有风险，入市需谨慎</p>
        </div>
      </div>
    </div>
    </PullToRefreshWrapper>
    
    {/* VIP升级提示弹窗 */}
    <VipUpgradeModal
      isOpen={showVipUpgradeModal}
      onClose={() => setShowVipUpgradeModal(false)}
      featureName={vipFeatureName}
    />
    </>
  );
};

export default ProfileView;
