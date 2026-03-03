import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;  // 新增 children 属性
  /** 允许访问的角色列表，不传则仅需登录 */
  allowedRoles?: Array<'user' | 'admin' | 'super_admin'>;
  /** 是否需要超级管理员 */
  requireSuperAdmin?: boolean;
  /** 登录页面路径 */
  loginPath?: string;
  /** 无权限页面路径 */
  unauthorizedPath?: string;
}

/**
 * 统一路由守卫组件
 * 
 * 使用示例:
 * ```tsx
 * // 仅需登录
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * // 需要管理员
 * <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
 *   <UserManagement />
 * </ProtectedRoute>
 * 
 * // 仅超级管理员
 * <ProtectedRoute requireSuperAdmin>
 *   <Settings />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,  // 接收 children
  allowedRoles,
  requireSuperAdmin = false,
  loginPath = '/auth/login',
  unauthorizedPath = '/unauthorized',
}: ProtectedRouteProps) {
  const { session, profile, loading, isAdmin, isSuperAdmin } = useAuth();

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4AA]"></div>
      </div>
    );
  }

  // 未登录，重定向到登录页
  if (!session) {
    return <Navigate to={loginPath} replace state={{ from: window.location.pathname }} />;
  }

  // 检查账户状态
  if (profile?.status === 'PENDING') {
    return (
      <div className="text-center p-8 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4 text-amber-600">账户审核中</h2>
        <p className="text-slate-600">您的账户正在等待管理员审批，请稍后再试。</p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
        >
          返回上一页
        </button>
      </div>
    );
  }

  if (profile?.status === 'BANNED') {
    return (
      <div className="text-center p-8 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4 text-red-600">账户已被禁用</h2>
        <p className="text-slate-600">如有疑问，请联系客服：95551</p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
        >
          返回上一页
        </button>
      </div>
    );
  }

  // 需要超级管理员
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to={unauthorizedPath} replace />;
  }

  // 检查角色权限
  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role as any))) {
    return <Navigate to={unauthorizedPath} replace />;
  }

  // 通过所有检查，渲染子组件
  return <>{children}</>;  // 使用 Fragment 包裹 children，避免不必要的额外元素
}
