import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // 从本地存储读取折叠状态，默认展开
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? saved === 'true' : false;
  });

  const LOGO_URL = imageConfig.logo.fullUrl;
  const notificationUnreadCount = account?.notifications?.filter(n => !n.isRead).length || 0;

  const tabs = React.useMemo(() => [
    { id: 'dashboard', label: '首页总览', icon: ICONS.Home, path: '/client/dashboard' },
    { id: 'market', label: '实时行情', icon: ICONS.Market, path: '/client/market' },
    { id: 'trade', label: '极速交易', icon: ICONS.Trade, path: '/client/trade' },
    { id: 'profile', label: '资产中心', icon: ICONS.User, path: '/client/profile' },
  ], []);

  const isTabActive = React.useCallback((path: string) => location.pathname === path || location.pathname.startsWith(path + '/'), [location.pathname]);

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

  // 切换侧边栏折叠状态并保存到本地存储
  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      
      {/* --- PC 端侧边导航栏 - 可折叠 --- */}
      <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-[var(--color-surface)] border-r border-[var(--color-border)] sticky top-0 h-screen z-40 transition-all duration-300`}>
        {/* Logo 区域 */}
        <div className={`p-4 border-b border-[var(--color-border)] flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          {!sidebarCollapsed && (
            <>
              <img src={LOGO_URL} alt="日斗投资单元" className="h-10 object-contain" />
            </>
          )}
          <button 
            onClick={toggleSidebar}
            className={`p-2 rounded-lg hover:bg-[var(--color-bg)] transition-all ${sidebarCollapsed ? 'mx-auto' : ''}`}
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}>
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="px-4 pb-2 pt-2">
            <p className="text-xs font-semibold text-[var(--color-primary)]">日斗投资单元</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">专业数字化交易平台</p>
          </div>
        )}

        {/* 导航菜单 */}
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                title={sidebarCollapsed ? tab.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#2563EB] text-white shadow-sm' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
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
          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="bg-[var(--color-bg)] rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-muted)]">连接状态</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600 font-medium">在线</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* --- 主容器 --- */}
      <div className="flex-1 flex flex-col relative w-full min-w-0">
        
        {/* 待激活状态横幅 */}
        {account?.status === 'PENDING' && (
          <div className="bg-orange-500 py-2 px-6 flex items-center justify-between z-[60]">
            <div className="flex items-center gap-3">
              <ICONS.Shield size={14} className="text-white" />
              <span className="text-xs font-medium text-white">账户合规审核中：部分交易指令受限</span>
            </div>
          </div>
        )}

        {/* 顶部标题栏 */}
        <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 md:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* 移动端 Logo */}
            <div className="md:hidden flex items-center gap-2" onClick={() => navigate('/client/dashboard')}>
              <img src={LOGO_URL} alt="Logo" className="h-8 object-contain" />
            </div>
            {/* PC端标题 */}
            <h2 className="hidden md:block text-base font-semibold text-[var(--color-text-primary)]">
              {tabs.find(t => isTabActive(t.path))?.label || '控制面板'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 智能选股按钮 */}
            <button 
              onClick={() => setShowSmartPicker(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-lg text-sm font-medium hover:bg-blue-100 transition-all"
            >
              <ICONS.Brain size={16} />
              智能选股
            </button>
            
            {/* 管理后台入口 */}
            {userRole === 'admin' && (
              <Link 
                to="/admin/dashboard"
                className="w-9 h-9 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all"
                title="管理后台"
              >
                <ICONS.Shield size={18} />
              </Link>
            )}
            
            {/* 客服按钮 */}
            <button 
              onClick={handleChatClick}
              className="w-9 h-9 rounded-lg bg-[var(--color-bg)] flex items-center justify-center relative text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all"
              disabled={loadingChatCount}
            >
              {loadingChatCount ? (
                <div className="w-4 h-4 border-2 border-[var(--color-text-muted)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <ICONS.Headset size={18} />
              )}
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-accent)] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </button>
            
            {/* 设置按钮 */}
            <button 
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all"
            >
              <ICONS.Settings size={18} />
            </button>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-8 w-full">
          <div className="max-w-md mx-auto md:max-w-7xl md:px-6">
            <Outlet />
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

        {/* --- 移动端底部导航 --- */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-around items-center z-40 py-2 safe-area-inset-bottom">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center py-2 px-4 transition-all ${
                  isActive ? 'text-[#2563EB]' : 'text-[#9CA3AF]'
                }`}
              >
                <Icon size={22} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>
                  {tab.label.substring(0, 2)}
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
