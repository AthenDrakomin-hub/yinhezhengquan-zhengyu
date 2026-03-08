import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ICONS } from '@/lib/constants';
import { useAdmin } from '../../contexts/AdminContext';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLevel, loading } = useAdmin();
  
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
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
    <div className="admin-dark" style={{ display: 'flex', height: '100vh', background: '#0f172a', color: 'white' }}>
      {/* Sidebar */}
      <aside style={{ width: '256px', background: '#1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#ef4444', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>ZY</div>
          <div>
            <h1 style={{ fontSize: '14px', fontWeight: 'bold' }}>银河证券</h1>
            <p style={{ fontSize: '10px', color: '#94a3b8' }}>管理系统</p>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '16px' }}>
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: isActive ? '#ef4444' : 'transparent',
                  color: isActive ? 'white' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '4px'
                }}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
          {import.meta.env.DEV && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '10px', padding: '8px', borderRadius: '4px', background: '#334155', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnectionOk ? '#22c55e' : '#ef4444' }}></div>
              <span>DB: {connectionStatus}</span>
            </div>
          )}
          
          <button 
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ← 返回客户端
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: '64px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {menuItems.find(m => m.path === location.pathname)?.label || '管理后台'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {adminLevel === 'super_admin' ? '超级管理员' : '管理员'}
              </p>
            </div>
            <div style={{ width: '40px', height: '40px', background: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ICONS.User size={20} />
            </div>
          </div>
        </header>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
