import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ICONS } from '@/lib/constants';
import { useAdmin } from '../../contexts/AdminContext';
import { useRouteTheme } from '../../contexts/ThemeContext';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLevel, loading } = useAdmin();
  
  // 使用统一主题管理 - 管理端使用浅色主题（当前强制浅色基准）
  useRouteTheme('admin');
  
  const [connectionStatus, setConnectionStatus] = useState<string>('检查中...');
  const [isConnectionOk, setIsConnectionOk] = useState<boolean | null>(null);

  // Hooks 必须在所有条件返回之前
  useEffect(() => {
    if (import.meta.env.DEV) {
      const checkConnection = async () => {
        try {
          const { supabase } = await import('../../lib/supabase');
          const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
          
          if (!error) {
            setConnectionStatus('正常');
            setIsConnectionOk(true);
          } else {
            setConnectionStatus('异常');
            setIsConnectionOk(false);
          }
        } catch (error) {
          setConnectionStatus('错误');
          setIsConnectionOk(false);
        }
      };
      checkConnection();
    }
  }, []);

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <div>加载中...</div>
        </div>
      </div>
    );
  }

  // 未授权 - 直接重定向到登录
  if (!adminLevel) {
    console.log('[AdminLayout] 无权限，重定向到登录');
    window.location.href = '/admin/login';
    return null;
  }

  const menuItems = [
    { id: 'dashboard', label: '总览', icon: ICONS.Home, path: '/admin/dashboard', minLevel: 'admin' },
    { id: 'users', label: '用户管理', icon: ICONS.User, path: '/admin/users', minLevel: 'admin' },
    { id: 'trades', label: '交易管理', icon: ICONS.Trade, path: '/admin/trades', minLevel: 'admin' },
    { id: 'conditional-orders', label: '条件单管理', icon: ICONS.Zap, path: '/admin/conditional-orders', minLevel: 'admin' },
    { id: 'notifications', label: '通知管理', icon: ICONS.Bell, path: '/admin/notifications', minLevel: 'admin' },
    { id: 'match', label: '撮合干预', icon: ICONS.Zap, path: '/admin/match', minLevel: 'super_admin' },
    { id: 'rules', label: '规则管理', icon: ICONS.Shield, path: '/admin/rules', minLevel: 'super_admin' },
    { id: 'tickets', label: '工单管理', icon: ICONS.MessageCircle, path: '/admin/tickets', minLevel: 'admin' },
    { id: 'content', label: '内容管理', icon: ICONS.Book, path: '/admin/content', minLevel: 'admin' },
    { id: 'audit-logs', label: '审计日志', icon: ICONS.FileText, path: '/admin/audit-logs', minLevel: 'super_admin' },
    { id: 'data-export', label: '数据导出', icon: ICONS.Download, path: '/admin/data-export', minLevel: 'super_admin' },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.minLevel === 'super_admin') return adminLevel === 'super_admin';
    return true;
  });

  return (
    <div className="flex h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--color-surface)] flex flex-col border-r border-[var(--color-border)]">
        <div className="p-6 border-b border-[var(--color-border)] flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--color-accent)] rounded flex items-center justify-center font-bold text-white">ZY</div>
          <div>
            <h1 className="text-sm font-bold">银河证券</h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">管理系统</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium mb-1 transition-all
                  ${isActive 
                    ? 'bg-[var(--color-accent)] text-white' 
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                  }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          {import.meta.env.DEV && (
            <div className="flex items-center justify-center gap-2 text-[10px] p-2 rounded bg-[var(--color-surface-hover)] mb-2">
              <div className={`w-2 h-2 rounded-full ${isConnectionOk ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-[var(--color-text-muted)]">DB: {connectionStatus}</span>
            </div>
          )}
          
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-all"
          >
            ← 返回客户端
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-8">
          <h2 className="text-lg font-bold">
            {menuItems.find(m => m.path === location.pathname)?.label || '管理后台'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-medium">
                {adminLevel === 'super_admin' ? '超级管理员' : '管理员'}
              </p>
            </div>
            <div className="w-10 h-10 bg-[var(--color-surface-hover)] rounded-full flex items-center justify-center">
              <ICONS.User size={20} className="text-[var(--color-text-muted)]" />
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
