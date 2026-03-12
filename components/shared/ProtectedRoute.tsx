import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'user' | 'admin' | 'super_admin'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  // 加载中 - 使用 CSS 变量，跟随主题
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
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
