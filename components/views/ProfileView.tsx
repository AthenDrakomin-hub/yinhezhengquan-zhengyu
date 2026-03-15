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
import { UserAccount } from '../../lib/types';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { PullToRefreshWrapper } from '../shared/WithPullToRefresh';

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
    } else {
      setIsLoadingSettings(false);
    }
  }, [isLoggedIn]);

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
      await loadNotificationSettings();
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

  // VIP权益点击
  const handleVipBenefitsClick = () => {
    navigate('/client/vip-benefits');
  };

  // 盯盘点击
  const handleWatchlistClick = () => {
    navigate('/client/watchlist-alerts');
  };

  // 预约打新点击
  const handleIPOReserveClick = () => {
    navigate('/client/ipo-reserve');
  };

  // 综合账户点击
  const handleComprehensiveAccountClick = () => {
    navigate('/client/comprehensive-account');
  };

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh} className="bg-[#F5F5F5]">
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
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
        <div className="bg-white mx-4 -mt-2 rounded-xl shadow-sm p-4">
          {/* 用户信息 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E63946] to-[#0066CC] flex items-center justify-center text-white text-lg font-bold">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-[#333333]">{displayName}</p>
              <p className="text-xs text-[#999999]">ID: {displayId}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-[#E5F9EF] text-[#22C55E] rounded">正常</span>
          </div>
          
          {/* 资产展示 */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#333333]">
                  {showAssets ? `¥${accountStats.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
                </span>
                <button onClick={() => setShowAssets(!showAssets)} className="text-[#999999]">
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
                <p className={`text-sm font-medium ${accountStats.todayPnL >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                  {showAssets ? `${accountStats.todayPnL >= 0 ? '+' : ''}${accountStats.todayPnL.toFixed(2)}` : '--'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#999999]">持仓盈亏</p>
                <p className={`text-sm font-medium ${accountStats.totalProfit >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                  {showAssets ? `${accountStats.totalProfit >= 0 ? '+' : ''}${accountStats.totalProfit.toFixed(2)}` : '--'}
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-3 border-2 border-[#0066CC] rounded-lg text-[#0066CC] font-medium bg-white hover:bg-[#0066CC] hover:text-white transition-colors mt-2"
          >
            登录交易
          </button>
        </div>
      ) : (
        /* 已登录状态 - 资产展示 */
        <div className="bg-white mx-4 -mt-2 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#333333]">
                  {showAssets ? `¥${accountStats?.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
                </span>
                <button onClick={() => setShowAssets(!showAssets)} className="text-[#999999]">
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
                <p className="text-xs text-[#999999]">持仓盈亏</p>
                <p className={`text-sm font-medium ${(accountStats?.totalProfit || 0) >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                  {showAssets ? `${(accountStats?.totalProfit || 0) >= 0 ? '+' : ''}${accountStats?.totalProfit.toFixed(2)}` : '--'}
                </p>
              </div>
            </div>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#F0F0F0]">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E63946] to-[#0066CC] flex items-center justify-center text-white text-lg font-bold">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-[#333333]">{displayName}</p>
              <p className="text-xs text-[#999999]">ID: {displayId}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-[#E5F9EF] text-[#22C55E] rounded">正常</span>
          </div>
        </div>
      )}

      {/* 三个基础功能入口 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={onOpenAnalysis}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
              <div className="w-7 h-7 bg-[#E63946] rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">¥</span>
              </div>
            </div>
            <span className="text-xs text-[#333333]">资产全景</span>
          </button>
          <button 
            onClick={handleMonthlyBillClick}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">月度账单</span>
          </button>
          <button 
            onClick={handleCalendarClick}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center relative">
              <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="absolute top-1 right-1 w-5 h-5 bg-[#E63946] rounded-full text-white text-[10px] flex items-center justify-center font-bold">10</span>
            </div>
            <span className="text-xs text-[#333333]">财富日历</span>
          </button>
        </div>
      </div>

      {/* 我的综合账户入口 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
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
            <span className="text-sm font-medium text-[#333333]">我的综合账户</span>
          </div>
          <span className="text-xs text-[#999999]">同名账户资金划转 ›</span>
        </button>
      </div>

      {/* 智能交易VIP专区 */}
      <div className="mx-4 mt-3">
        <div className="bg-[#2D2D2D] rounded-xl overflow-hidden">
          {/* 标题栏 */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <span className="text-white text-sm font-medium">智能交易 VIP</span>
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
              onClick={onOpenConditional}
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
          {isLoggedIn && (
            <span className="text-xs text-[#999999]">共3项</span>
          )}
        </div>
        
        {isLoggedIn ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 bg-[#FFF7ED] rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#F97316] flex items-center justify-center text-white text-xs font-bold">1</div>
              <div className="flex-1">
                <p className="text-sm text-[#333333]">风险测评即将过期</p>
                <p className="text-xs text-[#999999]">请及时更新风险承受能力评估</p>
              </div>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex items-center gap-3 p-2 bg-[#FEF3C7] rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#EAB308] flex items-center justify-center text-white text-xs font-bold">2</div>
              <div className="flex-1">
                <p className="text-sm text-[#333333]">新股申购提醒</p>
                <p className="text-xs text-[#999999]">今日有2只新股可申购</p>
              </div>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
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
        <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-medium text-[#333333] mb-4">通知设置</h3>
          <div className="space-y-3">
            {[
              { id: 'tradeAlerts', label: '成交回报', checked: notifications.tradeAlerts },
              { id: 'priceAlerts', label: '价格预警', checked: notifications.priceAlerts },
              { id: 'systemNews', label: '系统公告', checked: notifications.systemNews },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm text-[#333333]">{item.label}</span>
                <button
                  onClick={() => handleNotificationChange(item.id as keyof typeof notifications)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                    item.checked ? 'bg-[#0066CC]' : 'bg-[#E5E5E5]'
                  }`}
                >
                  <span 
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      item.checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 深色模式切换 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#333333]">深色模式</span>
          <button
            onClick={toggleTheme}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
              isDarkMode ? 'bg-[#0066CC]' : 'bg-[#E5E5E5]'
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
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-medium text-[#333333] mb-3">法律条款</h3>
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/client/legal/user-agreement')}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-[#333333]">用户服务协议</span>
              </div>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button 
              onClick={() => navigate('/client/legal/privacy-policy')}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm text-[#333333]">隐私政策</span>
              </div>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 底部版权信息 */}
        <div className="mt-6 text-center pb-4">
          <p className="text-xs text-[#999999]">© 2024 银河证券股份有限公司</p>
          <p className="text-xs text-[#999999] mt-1">投资有风险，入市需谨慎</p>
        </div>
      </div>
    </div>
    </PullToRefreshWrapper>
  );
};

export default ProfileView;
