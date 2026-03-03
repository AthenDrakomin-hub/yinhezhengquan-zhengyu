
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { ICONS, COLORS } from '../../lib/constants';
import { UserAccount } from '../../lib/types';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../services/authService';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenSettings: () => void;
  account: UserAccount;
  userRole?: string;
}

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, isDarkMode, toggleTheme, onOpenSettings, account, userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user } = useAuth();

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [loadingChatCount, setLoadingChatCount] = useState(false);

  const tabs = [
    { id: 'dashboard', label: '首页总览', icon: ICONS.Home, path: '/dashboard' },
    { id: 'market', label: '实时行情', icon: ICONS.Market, path: '/market' },
    { id: 'trade', label: '极速交易', icon: ICONS.Trade, path: '/trade' },
    { id: 'profile', label: '资产中心', icon: ICONS.User, path: '/profile' },
  ];

  const LOGO_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png";
  const notificationUnreadCount = account.notifications.filter(n => !n.isRead).length;

  const isTabActive = (path: string) => location.pathname.startsWith(path);

  // 加载未读消息计数
  useEffect(() => {
    if (!session || !user) {
      setUnreadChatCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      setLoadingChatCount(true);
      try {
        // 获取活动工单
        const activeTicket = await chatService.getOrCreateActiveTicket(user.id);
        // 加载工单详情
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

    // 订阅工单变化来更新未读计数
    const unsubscribe = chatService.subscribeToTickets(() => {
      loadUnreadCount();
    });

    return () => {
      unsubscribe();
    };
  }, [session, user]);

  const handleChatClick = () => {
    if (session && user) {
      navigate('/chat');
    } else {
      console.warn('用户未登录，无法访问客服');
      // 可以选择跳转到登录页或显示提示
      // navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-400">
      
      {/* --- PC 端专用：侧边导航栏 (Desktop Sidebar) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--nav-bg)] border-r border-[var(--color-border)] sticky top-0 h-screen z-50">
        <div className="p-6 border-b border-[var(--color-border)] flex flex-col gap-4">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <img src={LOGO_URL} alt="证裕交易单元" className="h-8 object-contain" />
          </div>
          <div className="px-2">
            <p className="text-[10px] font-black text-[#00D4AA] uppercase tracking-[0.2em]">证裕 Nexus 2.0</p>
            <p className="text-[9px] text-[var(--color-text-muted)] font-bold">数字化工作站模式</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-[#00D4AA] text-[#0A1628] shadow-[0_10px_20px_rgba(0,212,170,0.2)]' 
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-[var(--color-border)] space-y-4">
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
             <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] font-black text-[var(--color-text-muted)]">连接状态</span>
               <div className="w-1.5 h-1.5 bg-[#00D4AA] rounded-full animate-pulse shadow-[0_0_5px_#00D4AA]" />
             </div>
             <p className="text-[10px] font-mono text-[var(--color-text-primary)]">Latency: 12ms</p>
          </div>
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-border)] text-xs font-bold"
          >
            <span>{isDarkMode ? '深色模式' : '亮色模式'}</span>
            <span>{isDarkMode ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </aside>

      {/* --- 主容器 (Main Container) --- */}
      <div className="flex-1 flex flex-col relative w-full">
        
        {/* 待激活状态横幅 */}
        {account.status === 'PENDING' && (
          <div className="bg-orange-500 py-2 px-6 flex items-center justify-between z-[60] shadow-lg">
            <div className="flex items-center gap-3">
              <ICONS.Shield size={14} className="text-white" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">账户合规审核中：部分交易指令受限</span>
            </div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        )}

        {/* 顶部标题栏 (Mobile Header / PC Secondary Header) */}
        <header className="sticky top-0 z-40 glass-nav border-b border-[var(--color-border)] p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* 移动端 Logo */}
            <div className="md:hidden flex items-center gap-3" onClick={() => navigate('/dashboard')}>
               <img src={LOGO_URL} alt="Logo" className="h-8 object-contain" />
            </div>
            {/* PC端 标题映射 */}
            <h2 className="hidden md:block text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-primary)]">
              {tabs.find(t => isTabActive(t.path))?.label || '控制面板'}
            </h2>
          </div>
          
          <div className="flex gap-2">
            <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[10px] font-black uppercase text-[var(--color-text-muted)] hover:text-[#00D4AA] transition-all">
              <ICONS.Chart size={14} />
              数据终端
            </button>
            
            {/* 管理后台入口 - 仅对admin用户显示 */}
            {userRole === 'admin' && (
              <Link 
                to="/admin/dashboard"
                className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[#00D4AA] transition-all relative group"
                title="管理后台"
              >
                <ICONS.Shield size={18} />
                {/* 桌面端悬停提示 */}
                <span className="hidden md:group-hover:block absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black uppercase text-[var(--color-text-primary)] px-2 py-1 rounded whitespace-nowrap z-50">
                  管理后台
                </span>
              </Link>
            )}
            
            <button 
              onClick={handleChatClick}
              className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center relative hover:text-[#00D4AA] transition-all"
              disabled={loadingChatCount}
            >
              {loadingChatCount ? (
                <div className="w-4 h-4 border-2 border-[var(--color-text-secondary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <ICONS.Headset size={18} className="text-[var(--color-text-secondary)]" />
              )}
              {unreadChatCount > 0 && (
                <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-[#FF6B6B] border-2 border-[var(--color-bg)] rounded-full text-[7px] font-black flex items-center justify-center">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </button>
            <button 
              onClick={onOpenSettings}
              className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all"
            >
              <ICONS.Settings size={18} />
            </button>
          </div>
        </header>

        {/* 主内容区：根据 PC/Mobile 调整宽度 */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-10 w-full">
          <div className="max-w-md mx-auto md:max-w-7xl md:px-8">
            <Outlet />
          </div>
        </main>

        {/* --- 移动端专用：底部导航 (Mobile Bottom Nav) --- */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav flex justify-around items-center safe-area-bottom z-50 py-1 shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center py-3 px-6 transition-all duration-300 relative ${
                  isActive ? 'text-[#00D4AA]' : 'text-[var(--color-text-muted)]'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#00D4AA]/10' : ''}`}>
                  <Icon size={isActive ? 22 : 20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                </div>
                <span className={`text-[9px] mt-1.5 font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{tab.label.substring(0,2)}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Layout;
