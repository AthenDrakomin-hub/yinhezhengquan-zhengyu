import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ICONS } from '@/constants';

interface AdminLayoutProps {
  // 不再需要 children prop，使用 Outlet
}

const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: '总览', icon: ICONS.Home, path: '/admin/dashboard' },
    { id: 'rules', label: '交易规则管理', icon: ICONS.Shield, path: '/admin/rules' },
    { id: 'match', label: '撮合干预面板', icon: ICONS.Zap, path: '/admin/match' },
    { id: 'trades', label: '交易管理', icon: ICONS.Trade, path: '/admin/trades' },
    { id: 'users', label: '用户管理', icon: ICONS.Shield, path: '/admin/users' },
    { id: 'tickets', label: '工单管理', icon: ICONS.MessageCircle, path: '/admin/tickets' },
    { id: 'integration', label: '接入面板', icon: ICONS.Zap, path: '/admin/integration' },
    { id: 'reports', label: '研报管理', icon: ICONS.Book, path: '/admin/reports' },
    { id: 'education', label: '投教内容', icon: ICONS.Globe, path: '/admin/education' },
    { id: 'calendar', label: '日历事件', icon: ICONS.Calendar, path: '/admin/calendar' },
    { id: 'ipos', label: '新股管理', icon: ICONS.Chart, path: '/admin/ipos' },
    { id: 'derivatives', label: '衍生品管理', icon: ICONS.Key, path: '/admin/derivatives' },
    { id: 'banners', label: '横幅管理', icon: ICONS.Camera, path: '/admin/banners' },
  ];

  return (
    <div className="flex h-screen bg-industrial-50 text-industrial-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-industrial-900 text-white flex flex-col">
        <div className="p-6 border-b border-industrial-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-red rounded flex items-center justify-center text-white font-black">ZY</div>
          <div>
            <h1 className="text-sm font-black tracking-tighter">银河证券</h1>
            <p className="text-[10px] text-industrial-400 font-bold uppercase tracking-widest">管理系统</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20' 
                    : 'text-industrial-400 hover:bg-industrial-800 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-industrial-800">
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-industrial-400 hover:bg-industrial-800 hover:text-white transition-all"
          >
            <ICONS.ArrowRight size={18} className="rotate-180" />
            返回客户端
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-industrial-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-black text-industrial-800 uppercase tracking-tight">
              {menuItems.find(m => m.path === location.pathname)?.label || '管理后台'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-black text-industrial-800">管理员 (Admin)</p>
              <p className="text-[10px] text-industrial-400 font-bold uppercase">Super User</p>
            </div>
            <div className="w-10 h-10 bg-industrial-100 rounded-full border border-industrial-200 flex items-center justify-center text-industrial-400">
              <ICONS.User size={20} />
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
