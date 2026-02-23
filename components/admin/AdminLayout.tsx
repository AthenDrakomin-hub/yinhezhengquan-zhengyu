import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '@/constants';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: '总览', icon: ICONS.Home, path: '/admin/dashboard' },
    { id: 'rules', label: '交易规则管理', icon: ICONS.Shield, path: '/admin/rules' },
    { id: 'match', label: '撮合干预面板', icon: ICONS.Zap, path: '/admin/match' },
    { id: 'customers', label: '客户管理', icon: ICONS.User, path: '/admin/customers' },
    { id: 'trades', label: '交易管理', icon: ICONS.Trade, path: '/admin/trades' },
    { id: 'users', label: '用户管理', icon: ICONS.Shield, path: '/admin/users' },
    { id: 'integration', label: '接入面板', icon: ICONS.Zap, path: '/admin/integration' },
    { id: 'settings', label: '系统设置', icon: ICONS.Settings, path: '/admin/settings' },
  ];

  return (
    <div className="flex h-screen bg-industrial-50 text-industrial-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-industrial-900 text-white flex flex-col">
        <div className="p-6 border-b border-industrial-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-red rounded flex items-center justify-center text-white font-black">ZY</div>
          <div>
            <h1 className="text-sm font-black tracking-tighter">银河证券</h1>
            <p className="text-[10px] text-industrial-400 font-bold uppercase tracking-widest">虚拟管理系统</p>
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
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
