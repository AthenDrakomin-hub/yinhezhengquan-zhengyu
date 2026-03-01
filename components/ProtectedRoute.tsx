import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, manualInitAuth } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireLogin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requireLogin = true 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('guest');

  // 手动初始化认证并检查会话
  useEffect(() => {
    const initializeAndCheckAuth = async () => {
      try {
        // 1. 手动初始化认证
        await manualInitAuth();
        
        // 2. 获取当前会话
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('获取会话失败:', sessionError);
          setIsLoading(false);
          return;
        }
        
        if (currentSession) {
          setSession(currentSession);
          
          // 3. 获取用户角色
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentSession.user.id)
            .single();
            
          if (profileError) {
            console.error('获取用户角色失败:', profileError);
            setUserRole('guest');
          } else {
            setUserRole(profile.role || 'user');
          }
        }
      } catch (error) {
        console.error('认证初始化失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndCheckAuth();
  }, []);

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">安全检查中...</p>
        </div>
      </div>
    );
  }

  // 检查是否需要登录
  if (requireLogin && !session) {
    console.log('ProtectedRoute: 未登录，重定向到登录页');
    return <Navigate to="/login" replace />;
  }

  // 检查管理员权限
  if (requireAdmin && userRole !== 'admin') {
    console.log('ProtectedRoute: 非管理员访问管理员路由，重定向到首页');
    return <Navigate to="/" replace />;
  }

  // 允许访问
  return <>{children}</>;
};

export default ProtectedRoute;