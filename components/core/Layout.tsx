/**
 * 客户端主布局
 * 按银河证券官方App风格还原
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ICONS } from '../../lib/constants';
import { imageConfig } from '../../lib/imageConfig';
import { UserAccount } from '../../lib/types';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import SmartAssistant from '../client/SmartAssistant';
import SmartStockPicker from '../client/analysis/SmartStockPicker';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenSettings: () => void;
  account: UserAccount | null;
  userRole?: string;
}

const Layout: React.FC<LayoutProps> = React.memo(({ activeTab, setActiveTab, isDarkMode, toggleTheme, onOpenSettings, account, userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user } = useAuth();

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [loadingChatCount, setLoadingChatCount] = useState(false);
  const [showSmartAssistant, setShowSmartAssistant] = useState(false);
  const [showSmartPicker, setShowSmartPicker] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? saved === 'true' : false;
  });

  const LOGO_URL = imageConfig.logo.clientHeader;
  const notificationUnreadCount = account?.notifications?.filter(n => !n.isRead).length || 0;

  // 判断是否在首页
  const isDashboard = location.pathname === '/client/dashboard' || location.pathname === '/client';

  // 银河证券官方底部导航：首页、行情、交易、财富、我的
  const tabs = React.useMemo(() => [
    { id: 'dashboard', label: '首页', icon: ICONS.Home, path: '/client/dashboard', tourId: 'overview-tab' },
    { id: 'market', label: '行情', icon: ICONS.Market, path: '/client/market', tourId: 'quotes-tab' },
    { id: 'trade', label: '交易', icon: ICONS.Trade, path: '/client/trade', tourId: 'trade-tab' },
    { id: 'wealth', label: '财富', icon: ICONS.Wallet, path: '/client/wealth', tourId: 'wealth-tab' },
    { id: 'profile', label: '我的', icon: ICONS.User, path: '/client/profile', tourId: 'profile-tab' },
  ], []);

  const isTabActive = React.useCallback((path: string) => location.pathname === path || location.pathname.startsWith(path + '/'), [location.pathname]);

  // 当前页面标题
  const currentPageTitle = React.useMemo(() => {
    return tabs.find(t => isTabActive(t.path))?.label || '控制面板';
  }, [tabs, isTabActive]);

  // 处理搜索
  const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchText.trim()) {
      navigate(`/client/stock/${searchText.trim()}`);
    }
  }, [navigate, searchText]);

  // 加载未读消息计数
  useEffect(() => {
    if (!session || !user) {
      setUnreadChatCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      setLoadingChatCount(true);
      try {
        const activeTicket = await chatService.getOrCreateActiveTicket(user.id);
        const allTickets = await chatService.getAllTicketsForAdmin();
        const foundTicket = allTickets.find(t => t.id === activeTicket.id);
        
        if (foundTicket) {
          setUnreadChatCount(foundTicket.unreadCountUser || 0);
        }
      } catch (error) {
        console.error('加载未读消息计数失败:', error);
      } finally {
        setLoadingChatCount(false);
      }
    };

    loadUnreadCount();
    const unsubscribe = chatService.subscribeToTickets(() => {
      loadUnreadCount();
    });

    return () => {
      unsubscribe();
    };
  }, [session, user]);

  const handleChatClick = React.useCallback(() => {
    setShowSmartAssistant(true);
  }, []);

  const handleSwitchToHuman = React.useCallback(() => {
    setShowSmartAssistant(false);
    navigate('/client/chat');
  }, [navigate]);

  // 切换侧边栏折叠状态
  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F5] text-[#333333]">
      
      {/* --- PC 端侧边导航栏 - 可折叠 --- */}
      <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-[#E5E5E5] h-screen z-40 transition-all duration-300`}>
        {/* Logo 区域 - 已移除logo */}
        <div className={`p-4 border-b border-[#E5E5E5] flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <button 
            onClick={toggleSidebar}
            className={`p-2 rounded-lg hover:bg-[#F5F5F5] transition-all text-[#666666] ${sidebarCollapsed ? 'mx-auto' : ''}`}
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}>
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.path);
            return (
              <button
                key={tab.id}
                data-tour={tab.tourId}
                onClick={() => navigate(tab.path)}
                title={sidebarCollapsed ? tab.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#E63946] to-[#C62836] text-white shadow-sm' 
                    : 'text-[#666666] hover:bg-[#FFF5F5] hover:text-[#E63946]'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Icon size={18} className={`shrink-0 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {!sidebarCollapsed && (
                  <span className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>{tab.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 底部状态区 */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-[#E5E5E5]">
            <div className="bg-[#F5F5F5] rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#999999]">连接状态</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[#22C55E] rounded-full" />
                  <span className="text-xs text-[#22C55E] font-medium">在线</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* --- 主容器 --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        
        {/* 待激活状态横幅 */}
        {account?.status === 'PENDING' && (
          <div className="bg-[#F97316] py-2 px-6 flex items-center justify-between z-[60]">
            <div className="flex items-center gap-3">
              <ICONS.Shield size={14} className="text-white" />
              <span className="text-xs font-medium text-white">账户合规审核中：部分交易指令受限</span>
            </div>
          </div>
        )}

        {/* 顶部标题栏 - 首页显示搜索框，其他页面显示标题 */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-3">
            {/* 移动端 Logo 已移除 */}
            
            {/* 首页显示搜索框，其他页面显示标题 */}
            {isDashboard ? (
              <div className="flex-1 flex items-center gap-2 bg-[#F5F5F5] rounded-full px-3 py-2 max-w-md">
                <svg className="w-4 h-4 text-[#999999] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="大家都在搜索：中国电建"
                  className="flex-1 text-sm text-[#333333] placeholder:text-[#999999] bg-transparent outline-none min-w-0"
                />
                {searchText && (
                  <button 
                    onClick={() => setSearchText('')}
                    className="text-[#999999] hover:text-[#666666] shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <h2 className="text-base font-semibold text-[#333333] hidden md:block">
                {currentPageTitle}
              </h2>
            )}
            
            {/* 弹性空白，推送右侧按钮到最右边 */}
            <div className="flex-1" />
            
            {/* 右侧按钮组 */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            
            {/* 管理后台入口 */}
            {userRole === 'admin' && (
              <Link 
                to="/admin/dashboard"
                className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center text-[#666666] hover:text-[#E63946] hover:bg-[#FFEBEE] transition-all"
                title="管理后台"
              >
                <ICONS.Shield size={18} />
              </Link>
            )}
            
            {/* 客服按钮 */}
            <button 
              onClick={handleChatClick}
              className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center relative text-[#666666] hover:text-[#E63946] hover:bg-[#FFEBEE] transition-all"
              disabled={loadingChatCount}
            >
              {loadingChatCount ? (
                <div className="w-4 h-4 border-2 border-[#999999] border-t-transparent rounded-full animate-spin" />
              ) : (
                <ICONS.Headset size={18} />
              )}
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E63946] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </button>
            
            {/* 设置按钮 */}
            <button 
              data-tour="settings-tab"
              onClick={onOpenSettings}
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center text-[#666666] hover:text-[#E63946] hover:bg-[#FFEBEE] transition-all"
            >
              <ICONS.Settings size={18} />
            </button>
            </div>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-4 w-full min-h-0">
          <div className="max-w-md mx-auto md:max-w-7xl md:px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* 智能客服 */}
        {showSmartAssistant && (
          <SmartAssistant
            onClose={() => setShowSmartAssistant(false)}
            onSwitchToHuman={handleSwitchToHuman}
          />
        )}

        {/* 智能选股弹窗 */}
        <SmartStockPicker
          isOpen={showSmartPicker}
          onClose={() => setShowSmartPicker(false)}
        />

        {/* --- 移动端底部导航 - 深色背景 --- */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a2e] flex justify-around items-center z-40 py-2 safe-area-inset-bottom">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.path);
            return (
              <button
                key={tab.id}
                data-tour={tab.tourId}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center py-2 px-3 transition-all ${
                  isActive ? 'text-[#4DA6FF]' : 'text-white/70'
                }`}
              >
                <Icon size={22} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className={`text-[11px] mt-1 font-medium ${isActive ? 'text-[#4DA6FF]' : 'text-white/70'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
});

export default Layout;
