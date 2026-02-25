"use strict";

import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MarketView from './components/MarketView';
import TradePanel from './components/TradePanel';
import ProfileView from './components/ProfileView';
import StockDetailView from './components/StockDetailView';
import SettingsView from './components/SettingsView';
import AssetAnalysisView from './components/AssetAnalysisView';
import ConditionalOrderPanel from './components/ConditionalOrderPanel';
import LoginView from './components/LoginView';
import LandingView from './components/LandingView';
import ChatView from './components/ChatView';
import QuickOpenView from './components/QuickOpenView';
import BannerDetailView from './components/BannerDetailView';
import InvestmentCalendarView from './components/InvestmentCalendarView';
import ResearchReportsView from './components/ResearchReportsView';
import EducationBaseView from './components/EducationBaseView';
import ComplianceShieldView from './components/ComplianceShieldView';
import SupabaseConnectionCheck from './components/SupabaseConnectionCheck';
import { supabase, isDemoMode } from './lib/supabase';
import { MOCK_STOCKS, MOCK_ASSET_HISTORY, BANNER_MOCK } from './constants';
import { authService } from './services/authService';
import { tradeService } from './services/tradeService';
import { TradeType, Holding, Transaction, UserAccount, Stock, Banner } from './types';

import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUserManagement from './components/admin/AdminUserManagement';
import AdminTradeManagement from './components/admin/AdminTradeManagement';
import AdminIntegrationPanel from './components/admin/AdminIntegrationPanel';
import AdminRuleManagement from './components/admin/AdminRuleManagement';
import AdminMatchIntervention from './components/admin/AdminMatchIntervention';
import AdminReports from './components/admin/AdminReports';
import AdminEducation from './components/admin/AdminEducation';
import AdminCalendar from './components/admin/AdminCalendar';
import AdminIPOs from './components/admin/AdminIPOs';
import AdminDerivatives from './components/admin/AdminDerivatives';
import AdminBanners from './components/admin/AdminBanners';
import AdminTickets from './components/admin/AdminTickets';
import AdminTicketDetail from './components/admin/AdminTicketDetail';

// --- 路由保护组件 ---
const ProtectedRoute: React.FC<{ session: any; role?: string; children: React.ReactNode; isAdmin?: boolean }> = ({ session, role, children, isAdmin }) => {
  if (!session) return <Navigate to="/" replace />;
  if (isAdmin && role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [isDarkMode, setIsDarkMode] = useState(false); 
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

  // 同步账户数据
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

      // 使用 maybeSingle 而不是 single，因为 assets 可能不存在
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (assetsError && assetsError.code !== 'PGRST116') { // PGRST116 表示没有找到记录
        console.error('获取资产数据失败:', assetsError);
      }

      const holdings = await tradeService.getHoldings(userId);
      const transactions = await tradeService.getTransactions(userId, 50);

      setAccount(prev => ({
        ...prev,
        id: profile.id,
        username: profile.username || prev.username,
        email: session?.user?.email || prev.email,
        balance: assets ? parseFloat(assets.available_balance) : prev.balance,
        holdings: holdings || [],
        transactions: transactions || []
      }));
    } catch (err) {
      console.error('同步账户数据失败:', err);
    }
  }, [session]);

  useEffect(() => {
    if (isDemoMode) return;
    
    authService.getSession().then((res) => {
      if (res) {
        setSession(res.session);
        setUserRole(res.role);
        syncAccountData(res.session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        // 直接获取用户profile，避免重复调用getSession
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error('获取用户角色失败:', error);
            setUserRole('user');
          } else {
            setUserRole(profile?.role || 'user');
          }
        } catch (err) {
          console.error('获取用户角色异常:', err);
          setUserRole('user');
        }
        
        syncAccountData(session.user.id);
      } else {
        setUserRole('user');
      }
    });

    return () => subscription.unsubscribe();
  }, [syncAccountData]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLoginSuccess = (userData?: any, role: string = 'user') => {
    const finalUser = userData || { 
      id: 'user-id-001',
      email: 'user@zhengyu.com', 
      username: '证裕用户',
      user_metadata: { username: '证裕用户' }
    };
    
    // 创建完整的session对象，创建Supabase的session结构
    const session = {
      user: {
        id: finalUser.id || 'user-id-001',
        email: finalUser.email || 'user@zhengyu.com',
        user_metadata: finalUser.user_metadata || { username: finalUser.username || '证裕用户' }
      },
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600 * 1000, // 1小时后过期
      expires_in: 3600
    };
    
    setSession(session);
    setUserRole(role);
    
    setAccount(prev => ({
      ...prev,
      id: finalUser.id || prev.id,
      username: finalUser.username || prev.username,
      email: finalUser.email || prev.email
    }));
    
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
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

  const TradeWrapper = () => {
    const [searchParams] = useSearchParams();
    const symbol = searchParams.get('symbol');
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || null;
    return <TradePanel account={account} onExecute={executeTrade} initialStock={stock} />;
  };

  return (
    <>
      <SupabaseConnectionCheck />
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <LandingView onEnterLogin={() => navigate('/login')} onQuickOpen={() => navigate('/quick-open')} />} />
        <Route path="/login" element={<LoginView onLoginSuccess={handleLoginSuccess} onBackToHome={() => navigate('/')} />} />
        <Route path="/quick-open" element={<QuickOpenView onBack={() => navigate('/')} onComplete={(data) => handleLoginSuccess(data)} />} />

        {/* 管理端路由 - 使用嵌套路由模式 */}
        <Route path="/admin/*" element={
          <ProtectedRoute session={session} role={userRole} isAdmin={true}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="rules" element={<AdminRuleManagement />} />
          <Route path="match" element={<AdminMatchIntervention />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route path="trades" element={<AdminTradeManagement />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
          <Route path="integration" element={<AdminIntegrationPanel />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="education" element={<AdminEducation />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="ipos" element={<AdminIPOs />} />
          <Route path="derivatives" element={<AdminDerivatives />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* 聊天路由 */}
        <Route path="/chat" element={<ProtectedRoute session={session} role={userRole}><ChatView /></ProtectedRoute>} />

        {/* 主应用布局路由 - 使用嵌套路由模式 */}
        <Route path="/*" element={
          <ProtectedRoute session={session} role={userRole}>
            <Layout 
              activeTab={location.pathname.split('/')[1] || 'dashboard'} 
              setActiveTab={(tab) => navigate(`/${tab}`)} 
              isDarkMode={isDarkMode} 
              toggleTheme={toggleTheme} 
              onOpenSettings={() => navigate('/settings')}
              account={account}
              userRole={userRole}
            />
          </ProtectedRoute>
        }>
          {/* 嵌套在布局内的子路由 */}
          <Route path="dashboard" element={
            <Dashboard 
              transactions={account.transactions}
              onOpenBanner={(b) => navigate(`/banner/${b.id}`)}
              onOpenCalendar={() => navigate('/calendar')}
              onOpenReports={() => navigate('/reports')}
              onOpenEducation={() => navigate('/education')}
              onOpenCompliance={() => navigate('/compliance')}
            />
          } />
          <Route path="market" element={<MarketView onSelectStock={(symbol) => navigate(`/stock/${symbol}`)} />} />
          <Route path="trade" element={<TradeWrapper />} />
          <Route path="profile" element={<ProfileView account={account} onOpenAnalysis={() => navigate('/analysis')} onOpenConditional={() => navigate('/conditional')} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />} />
        </Route>

        {/* 独立全屏业务页面 */}
        <Route path="/stock/:symbol" element={<ProtectedRoute session={session} role={userRole}><StockDetailWrapper /></ProtectedRoute>} />
        <Route path="/banner/:id" element={<ProtectedRoute session={session} role={userRole}><BannerDetailWrapper /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute session={session} role={userRole}><InvestmentCalendarView onBack={() => navigate(-1)} /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute session={session} role={userRole}><ResearchReportsView onBack={() => navigate(-1)} /></ProtectedRoute>} />
        <Route path="/education" element={<ProtectedRoute session={session} role={userRole}><EducationBaseView onBack={() => navigate(-1)} /></ProtectedRoute>} />
        <Route path="/compliance" element={<ProtectedRoute session={session} role={userRole}><ComplianceShieldView onBack={() => navigate(-1)} /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute session={session} role={userRole}><SettingsView onBack={() => navigate(-1)} isDarkMode={isDarkMode} toggleTheme={toggleTheme} riskLevel="C3-稳健型" onLogout={async () => { await authService.logout(); setSession(null); navigate('/'); }} /></ProtectedRoute>} />
        <Route path="/analysis" element={<ProtectedRoute session={session} role={userRole}><AssetAnalysisView account={account} onBack={() => navigate(-1)} /></ProtectedRoute>} />
        <Route path="/conditional" element={<ProtectedRoute session={session} role={userRole}><ConditionalOrderPanel stock={MOCK_STOCKS[0]} onBack={() => navigate(-1)} onAddOrder={() => {}} /></ProtectedRoute>} />
        
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
