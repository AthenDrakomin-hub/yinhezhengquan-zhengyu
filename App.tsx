"use strict";

import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LoginView from './components/LoginView';
import LandingView from './components/LandingView';
import ChatView from './components/ChatView';
import QuickOpenView from './components/QuickOpenView';
import ForgotPasswordView from './components/ForgotPasswordView';
import BannerDetailView from './components/BannerDetailView';
import InvestmentCalendarView from './components/InvestmentCalendarView';
import ResearchReportsView from './components/ResearchReportsView';
import EducationBaseView from './components/EducationBaseView';
import ComplianceShieldView from './components/ComplianceShieldView';
import SupabaseConnectionCheck from './components/SupabaseConnectionCheck';
import StockDetailView from './components/StockDetailView';
import AssetAnalysisView from './components/AssetAnalysisView';
import ConditionalOrderPanel from './components/ConditionalOrderPanel';
import ErrorBoundary from './components/common/ErrorBoundary';
import { supabase, isDemoMode } from './lib/supabase';
import { MOCK_STOCKS, MOCK_ASSET_HISTORY, BANNER_MOCK } from './constants';
import { initializeStorageCleanup } from './utils/security/clean-storage';
import { authService } from './services/authService';
import { tradeService } from './services/tradeService';
import { TradeType, Holding, Transaction, UserAccount, Stock, Banner } from './types';
import { useSessionMonitor } from './services/sessionMonitor';
import NetworkStatusBar from './components/NetworkStatusBar';

// 懒加载组件
const MarketView = lazy(() => import('./components/MarketView'));
const TradePanel = lazy(() => import('./components/TradePanel'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const SettingsOverview = lazy(() => import('./components/SettingsOverview'));
const ProfileOverview = lazy(() => import('./components/ProfileOverview'));
const ProfileDetailView = lazy(() => import('./components/ProfileDetailView'));
const SecurityCenterView = lazy(() => import('./components/SecurityCenterView'));
const TradingPreferencesView = lazy(() => import('./components/TradingPreferencesView'));
const PersonalizedSettingsView = lazy(() => import('./components/PersonalizedSettingsView'));
const AboutInvestZYView = lazy(() => import('./components/AboutInvestZYView'));
const ComplianceCenter = lazy(() => import('./components/ComplianceCenter'));
const ServiceCenter = lazy(() => import('./components/ServiceCenter'));
const EducationCenter = lazy(() => import('./components/EducationCenter'));
const AppDownloadView = lazy(() => import('./components/AppDownloadView'));

// 懒加载管理员组件
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminUserManagement = lazy(() => import('./components/admin/AdminUserManagement'));
const AdminTradeManagement = lazy(() => import('./components/admin/AdminTradeManagement'));
const AdminRuleManagement = lazy(() => import('./components/admin/AdminRuleManagement'));
const AdminMatchIntervention = lazy(() => import('./components/admin/AdminMatchIntervention'));
const AdminReports = lazy(() => import('./components/admin/AdminReports'));
const AdminEducation = lazy(() => import('./components/admin/AdminEducation'));
const AdminCalendar = lazy(() => import('./components/admin/AdminCalendar'));
const AdminIPOs = lazy(() => import('./components/admin/AdminIPOs'));
const AdminBanners = lazy(() => import('./components/admin/AdminBanners'));
const AdminTickets = lazy(() => import('./components/admin/AdminTickets'));
const AdminTicketDetail = lazy(() => import('./components/admin/AdminTicketDetail'));
const AdminAuditLogs = lazy(() => import('./components/admin/AdminAuditLogs'));
const AdminDataExport = lazy(() => import('./components/admin/AdminDataExport'));

// 加载占位符组件
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">加载中...</p>
    </div>
  </div>
);

// --- 路由保护组件（重构版，添加用户状态检查）---
interface ProtectedRouteProps {
  session: any;
  role?: string;
  userStatus?: string;
  children: React.ReactNode;
  isAdmin?: boolean;
  isLoading?: boolean;
  isDemoMode?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  session, 
  role, 
  userStatus,
  children, 
  isAdmin, 
  isLoading = false, 
  isDemoMode = false 
}) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!session) {
    console.log('ProtectedRoute: 未登录，重定向到登录页');
    return <Navigate to={isDemoMode ? "/login" : "/"} replace />;
  }
  
  // 检查用户状态
  if (userStatus === 'PENDING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="max-w-md w-full p-8 bg-slate-900/60 border border-white/10 rounded-3xl text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">账户审核中</h2>
          <p className="text-slate-400 mb-6">
            您的账户正在审核中，请耐心等待管理员审批。
            <br />
            审批通过后，您将收到通知邮件。
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            返回首页
          </button>
          <p className="mt-4 text-xs text-slate-500">
            如有疑问，请联系客服热线：95551
          </p>
        </div>
      </div>
    );
  }
  
  if (userStatus === 'BANNED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="max-w-md w-full p-8 bg-slate-900/60 border border-red-500/20 rounded-3xl text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">账户已被禁用</h2>
          <p className="text-slate-400 mb-6">
            您的账户已被管理员禁用，无法继续使用系统。
            <br />
            如有疑问，请联系管理员了解详情。
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            返回首页
          </button>
          <p className="mt-4 text-xs text-slate-500">
            客服热线：95551 或 4008-888-888
          </p>
        </div>
      </div>
    );
  }
  
  if (isAdmin && role !== 'admin') {
    console.log('ProtectedRoute: 非管理员访问管理员路由，重定向到仪表板');
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  useSessionMonitor();
  
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>('guest');
  const [userStatus, setUserStatus] = useState<string>('ACTIVE');
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态
  const navigate = useNavigate();
  const location = useLocation();

  // --- 账户核心状态 ---
  const [account, setAccount] = useState<UserAccount>({
    id: 'ZY-USER-001',
    email: '',
    username: '证裕资深用户',
    status: 'ACTIVE', 
    balance: 500000.00, 
    holdings: [],
    transactions: [],
    conditionalOrders: [],
    history: MOCK_ASSET_HISTORY,
    notifications: []
  });

  useEffect(() => {
    document.body.classList.toggle('light-mode', !isDarkMode);
  }, [isDarkMode]);

  // 同步账户数据（移除对 session 的依赖，用入参代替，打破循环）
  const syncAccountData = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('获取用户资料失败:', profileError);
        return;
      }

      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (assetsError && assetsError.code !== 'PGRST116') {
        console.error('获取资产数据失败:', assetsError);
      }

      const holdings = await tradeService.getHoldings(userId);
      const transactions = await tradeService.getTransactions(userId, 50);

      // 【关键】只在数据真正变化时才更新状态，避免无效重渲染
      setAccount(prev => {
        const newAccount = {
          ...prev,
          id: profile.id,
          username: profile.username || prev.username,
          email: prev.email,
          balance: assets ? parseFloat(assets.available_balance) : prev.balance,
          holdings: holdings || [],
          transactions: transactions || []
        };
        // 浅对比，数据不变就不更新状态
        if (JSON.stringify(prev) === JSON.stringify(newAccount)) return prev;
        return newAccount;
      });
    } catch (err) {
      console.error('同步账户数据失败:', err);
    }
  }, []); // 【关键】移除 session 依赖，彻底打破循环

  // 用 ref 标记是否正在执行校验，避免重复执行和竞态条件
  const isValidatingRef = useRef(false);
  const sessionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 改进的认证校验逻辑 - 添加详细时间戳日志用于诊断
  const validateAuthSession = useCallback(async () => {
    console.log('[Auth] validateAuthSession start', Date.now());
    
    if (isValidatingRef.current) {
      console.log('[Auth] already validating, skipping', Date.now());
      return;
    }
      
    isValidatingRef.current = true;
      
    if (sessionCheckTimeoutRef.current) {
      clearTimeout(sessionCheckTimeoutRef.current);
    }
  
    try {
      sessionCheckTimeoutRef.current = setTimeout(() => {
        console.warn('[Auth] validateAuthSession: 执行超时，强制清理', Date.now());
        isValidatingRef.current = false;
        setIsLoading(false);
      }, 30000);
  
      // 获取 session
      console.log('[Auth] calling authService.getSession()', Date.now());
      const result = await authService.getSession();
      console.log('[Auth] getSession returned', Date.now(), result);

      if (result?.session) {
        setSession(result.session);
        console.log('[Auth] session set', Date.now());

        // 获取用户角色
        console.log('[Auth] fetching profile for user', result.session.user.id, Date.now());
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', result.session.user.id)
          .single();
        console.log('[Auth] profile query result', Date.now(), { profile, error });

        if (error) {
          console.error('[Auth] profile fetch error', error, Date.now());
          // 如果profile不存在，自动创建
          if (error.code === 'PGRST116') {
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: result.session.user.id,
                email: result.session.user.email,
                username: result.session.user.email?.split('@')[0] || '用户',
                role: 'user',
                status: 'PENDING'  // 等待审批
              });
            if (!createError) {
              setUserRole('user');
            } else {
              setUserRole('user');
            }
          } else {
            setUserRole('user');
          }
        } else {
          console.log('[Auth] setting userRole to', profile.role, Date.now());
          setUserRole(profile.role);
          setUserStatus(profile.status || 'ACTIVE');
        }

        // 同步账户数据
        console.log('[Auth] calling syncAccountData', Date.now());
        await syncAccountData(result.session.user.id);
        console.log('[Auth] syncAccountData completed', Date.now());
      } else {
        console.log('[Auth] no session', Date.now());
        setSession(null);
        setUserRole('guest');
        setAccount(prev => ({
          ...prev,
          id: 'ZY-USER-001',
          username: '证裕资深用户',
          email: '',
          balance: 500000.00
        }));
      }
    } catch (err) {
      console.error('[Auth] validateAuthSession error', err, Date.now());
      setSession(null);
      setUserRole('guest');
      setAccount(prev => ({
        ...prev,
        id: 'ZY-USER-001',
        username: '证裕资深用户',
        email: '',
        balance: 500000.00
      }));
    } finally {
      console.log('[Auth] validateAuthSession end', Date.now());
      isValidatingRef.current = false;
      if (sessionCheckTimeoutRef.current) {
        clearTimeout(sessionCheckTimeoutRef.current);
        sessionCheckTimeoutRef.current = null;
      }
      setIsLoading(false);
    }
  }, [syncAccountData]);

  // 用 ref 标记是否已经初始化订阅，避免重复订阅
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    // 禁用自动初始化，只设置加载状态为完成
    setIsLoading(false);

    // 应用启动时清理过期token
    initializeStorageCleanup();

    // 【关键】只订阅一次，避免重复创建事件监听
    if (!hasSubscribedRef.current) {
      hasSubscribedRef.current = true;
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('onAuthStateChange:', event);
        
        // 只处理关键事件，避免无关事件触发重渲染
        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession);
          if (newSession.user.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', newSession.user.id)
              .single();
            setUserRole(profile?.role || 'user');
            await syncAccountData(newSession.user.id);
          }
        } else if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setUserRole('guest');
        }
      });

      // 组件卸载时取消订阅
      return () => {
        subscription.unsubscribe();
        hasSubscribedRef.current = false;
      };
    }
  }, [syncAccountData]); // 移除validateAuthSession依赖

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // 修复：处理进入平台按钮点击（强制校验登录状态）
  const handleEnterPlatform = () => {
    console.log('handleEnterPlatform: session=', session, 'userRole=', userRole);
    
    // 演示模式下强制检查session
    if (isDemoMode) {
      if (!session) {
        console.log('演示模式：未登录，跳转到登录页');
        navigate('/login');
        return;
      }
    }

    if (session) {
      // 根据角色跳转
      const dashboardPath = userRole === 'admin' ? '/admin/dashboard' : '/dashboard';
      navigate(dashboardPath);
    } else {
      navigate('/login');
    }
  };

  const handleLoginSuccess = async (userData?: any) => {
    const finalUser = userData || {        
      id: 'user-id-001',
      email: 'user@zhengyu.com',
      username: '证裕用户',
      user_metadata: { username: '证裕用户' },
      role: 'user'
    };
      
    console.log('登录成功，用户数据:', finalUser);
      
    const newSession = {
      user: {
        id: finalUser.id || 'user-id-001',
        email: finalUser.email || 'user@zhengyu.com',
        user_metadata: finalUser.user_metadata || { username: finalUser.username || '证裕用户' }
      },
      access_token: 'access-token-' + Date.now(),
      refresh_token: 'refresh-token-' + Date.now(),
      expires_at: Date.now() + 3600 * 1000,
      expires_in: 3600,
      token_type: 'bearer' as const
    };
      
    setSession(newSession as any);
    
    // 从数据库查询真实角色
    let userRole = 'user';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', finalUser.id)
        .single();
      userRole = profile?.role || 'user';
    } catch (error) {
      console.error('获取用户角色失败:', error);
    }
    
    setUserRole(userRole);
    console.log('设置用户角色:', userRole);
    
    // 先同步账户数据
    if (finalUser.id) {
      await syncAccountData(finalUser.id);
    }
      
    setAccount(prev => ({
      ...prev,
      id: finalUser.id || prev.id,
      username: finalUser.username || prev.username,
      email: finalUser.email || prev.email
    }));
      
    // 登录成功后跳转到仪表盘
    const dashboardPath = userRole === 'admin' ? '/admin/dashboard' : '/dashboard';
    console.log('跳转路径:', dashboardPath);
    navigate(dashboardPath);
  };

  const executeTrade = useCallback(async (
    type: TradeType, 
    symbol: string, 
    name: string, 
    price: number, 
    quantity: number,
    logoUrl?: string
  ) => {
    if (!session?.user?.id) {
      alert("请先登录");
      return false;
    }

    try {
      const result = await tradeService.executeTrade({
        userId: session.user.id,
        type,
        symbol,
        name,
        price,
        quantity,
        logoUrl
      });
      
      if (result && result.error) {
        alert(`交易失败: ${result.error}`);
        return false;
      }

      // 交易成功后同步数据
      await syncAccountData(session.user.id);
      return true;
    } catch (err: any) {
      alert(err.message || "交易失败");
      return false;
    }
  }, [session, syncAccountData]);

  // 包装详情页组件
  const StockDetailWrapper = () => {
    const { symbol } = useParams();
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
    return <StockDetailView stock={stock} onBack={() => navigate(-1)} onTradeClick={() => navigate(`/trade?symbol=${symbol}`)} />;
  };

  const BannerDetailWrapper = () => {
    const { id } = useParams();
    const banner = BANNER_MOCK.find(b => b.id === id) || BANNER_MOCK[0];
    return <BannerDetailView banner={banner} onBack={() => navigate(-1)} onAction={(s) => navigate(`/stock/${s}`)} />;
  };

  // 用 React.memo 包裹，避免父组件重渲染时重复渲染
  const TradeWrapper = React.memo(() => {
    const [searchParams] = useSearchParams();
    const symbol = searchParams.get('symbol');
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || null;

    // 【关键】用 useCallback 包裹，避免每次渲染重新生成函数
    const handleExecute = useCallback(async (
      type: TradeType, 
      symbol: string, 
      name: string, 
      price: number, 
      quantity: number,
      logoUrl?: string
    ) => {
      if (!session?.user?.id) {
        alert("请先登录");
        return false;
      }
      try {
        const result = await tradeService.executeTrade({
          userId: session.user.id,
          type,
        symbol,
          name,
          price,
          quantity,
          logoUrl
        });
        if (result?.error) {
          alert(`交易失败: ${result.error}`);
          return false;
        }
        await syncAccountData(session.user.id);
        return true;
      } catch (err: any) {
        alert(err.message || "交易失败");
        return false;
      }
    }, [session, syncAccountData]);

    return (
      <Suspense fallback={<LoadingSpinner />}>
        <TradePanel 
          account={account} 
          onExecute={handleExecute} 
          initialStock={stock} 
        />
      </Suspense>
    );
  });

  // 登录页包装组件：已登录用户访问时重定向到仪表板
  const LoginWrapper = () => {
    const hasRedirected = useRef(false);
    
    if (isLoading) {
      return <LoadingSpinner />;
    }
    
    useEffect(() => {
      if (session && !hasRedirected.current) {
        hasRedirected.current = true;
        console.log('LoginWrapper: 已登录用户访问登录页，重定向到仪表板');
        const dashboardPath = userRole === 'admin' ? '/admin/dashboard' : '/dashboard';
        navigate(dashboardPath, { replace: true });
      }
    }, [session, userRole, navigate]);
    
    if (session) {
      // 已登录用户，等待 useEffect 重定向，返回空内容
      return null;
    }
    
    return <LoginView onLoginSuccess={handleLoginSuccess} onBackToHome={() => navigate('/')} />;
  };

  return (
    <>
      <NetworkStatusBar />
      <Routes>
        <Route path="/" element={<LandingView onEnter={handleEnterPlatform} onQuickOpen={() => navigate('/quick-open')} />} />
        <Route path="/login" element={<LoginWrapper />} />
        <Route path="/quick-open" element={<QuickOpenView onBack={() => navigate('/')} onComplete={(data) => handleLoginSuccess(data)} />} />
        <Route path="/forgot-password" element={<ForgotPasswordView onBack={() => navigate('/')} onComplete={() => navigate('/')} />} />

        {/* 管理端路由 - 使用嵌套路由模式 */}
        <Route path="/admin/*" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isAdmin={true} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminLayout />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminDashboard />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="rules" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminRuleManagement />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="match" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminMatchIntervention />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="users" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminUserManagement />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="trades" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminTradeManagement />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="tickets" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminTickets />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="tickets/:ticketId" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminTicketDetail />
              </Suspense>
            </ErrorBoundary>
          } />
          
          <Route path="reports" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminReports />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="education" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminEducation />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="calendar" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminCalendar />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="ipos" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminIPOs />
              </Suspense>
            </ErrorBoundary>
          } />

          <Route path="banners" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminBanners />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="audit-logs" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminAuditLogs />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="data-export" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminDataExport />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* 聊天路由 */}
        <Route path="/chat" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <ChatView />
            </ErrorBoundary>
          </ProtectedRoute>
        } />

        {/* 主应用布局路由 - 使用嵌套路由模式 */}
        <Route path="/*" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <Layout 
                activeTab={location.pathname.split('/')[1] || 'dashboard'} 
                setActiveTab={(tab) => navigate(`/${tab}`)} 
                isDarkMode={isDarkMode} 
                toggleTheme={toggleTheme} 
                onOpenSettings={() => navigate('/settings')}
                account={account}
                userRole={userRole}
              />
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          {/* 嵌套在布局内的子路由 */}
          <Route path="dashboard" element={
            <ErrorBoundary resetOnNavigate>
              <Dashboard 
                transactions={account.transactions}
                onOpenBanner={(b) => navigate(`/banner/${b.id}`)}
                onOpenCalendar={() => navigate('/calendar')}
                onOpenReports={() => navigate('/reports')}
                onOpenEducation={() => navigate('/education')}
                onOpenCompliance={() => navigate('/compliance')}
              />
            </ErrorBoundary>
          } />
          <Route path="market" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <MarketView onSelectStock={(symbol) => navigate(`/stock/${symbol}`)} />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="trade" element={
            <ErrorBoundary resetOnNavigate>
              <TradeWrapper />
            </ErrorBoundary>
          } />

        </Route>

        {/* 独立全屏业务页面 */}
        <Route path="/stock/:symbol" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <StockDetailWrapper />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/banner/:id" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <BannerDetailWrapper />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <InvestmentCalendarView onBack={() => navigate(-1)} />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <ResearchReportsView onBack={() => navigate(-1)} />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/education" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <EducationBaseView onBack={() => navigate(-1)} />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/compliance" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <ComplianceShieldView onBack={() => navigate(-1)} />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <SettingsView onBack={() => navigate('/dashboard')} isDarkMode={isDarkMode} toggleTheme={toggleTheme} riskLevel="C3-稳健型" onLogout={async () => { await authService.logout(); setSession(null); navigate('/'); }} />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          <Route index element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <SettingsOverview onNavigate={(path) => navigate(path)} />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="profile-detail" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <ProfileDetailView />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="security" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <SecurityCenterView />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="trading-preferences" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <TradingPreferencesView />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="personalized" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <PersonalizedSettingsView />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="about" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <AboutInvestZYView />
              </Suspense>
            </ErrorBoundary>
          } />
        </Route>
        
        <Route path="/profile" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <ProfileView account={account} onOpenAnalysis={() => navigate('/analysis')} onOpenConditional={() => navigate('/conditional')} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          <Route index element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <ProfileOverview account={account} onOpenAnalysis={() => navigate('/analysis')} onOpenConditional={() => navigate('/conditional')} />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="compliance" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <ComplianceCenter />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="service" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <ServiceCenter />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="education" element={
            <ErrorBoundary resetOnNavigate>
              <Suspense fallback={<LoadingSpinner />}>
                <EducationCenter />
              </Suspense>
            </ErrorBoundary>
          } />
        </Route>
        
        <Route path="/analysis" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <AssetAnalysisView account={account} onBack={() => navigate('/profile')} />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/conditional" element={
          <ProtectedRoute session={session} role={userRole} userStatus={userStatus} isLoading={isLoading} isDemoMode={isDemoMode}>
            <ErrorBoundary resetOnNavigate>
              <ConditionalOrderPanel stock={MOCK_STOCKS[0]} onBack={() => navigate(-1)} onAddOrder={() => {}} />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        
        <Route path="/app-download" element={
          <ErrorBoundary resetOnNavigate>
            <Suspense fallback={<LoadingSpinner />}>
              <AppDownloadView />
            </Suspense>
          </ErrorBoundary>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;