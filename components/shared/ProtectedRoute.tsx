import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'user' | 'admin' | 'super_admin'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  // 加载中 - 使用与主题一致的背景色避免闪烁
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'var(--color-bg, #0A1628)',
        color: 'var(--color-text-primary, #F8FAFC)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4AA] mx-auto mb-4"></div>
          <div className="text-sm">加载中...</div>
        </div>
      </div>
    );
  }

  // 未登录，重定向到登录页
  if (!session) {
    return <Navigate to="/auth/login" replace />;
  }

  // 检查用户角色权限
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = profile?.admin_level === 'super_admin' ? 'super_admin' 
                    : profile?.admin_level === 'admin' ? 'admin' 
                    : 'user';
    
    if (!allowedRoles.includes(userRole as any)) {
      // 无权限，重定向到无权限页面或客户端首页
      if (userRole === 'user') {
        return <Navigate to="/client/dashboard" replace />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // 已登录且有权限，渲染子组件
  return <>{children}</>;
}
