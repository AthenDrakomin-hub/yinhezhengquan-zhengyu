import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { authService } from './services/authService';
import { tradeService } from './services/tradeService';
import { MOCK_STOCKS, MOCK_ASSET_HISTORY, BANNER_MOCK } from './lib/constants';
import { TradeType, UserAccount } from './lib/types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LoginView from './components/LoginView';
import LandingView from './components/LandingView';
import QuickOpenView from './components/auth/QuickOpenView';
import ErrorBoundary from './components/common/ErrorBoundary';

const MarketView = lazy(() => import('./components/MarketView'));
const TradePanel = lazy(() => import('./components/TradePanel'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const SettingsView = lazy(() => import('./components/SettingsView'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const ClientApp: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<UserAccount>({
    id: 'ZY-USER-001',
    email: '',
    username: '证裕用户',
    status: 'ACTIVE',
    balance: 0,
    holdings: [],
    transactions: [],
    conditionalOrders: [],
    history: MOCK_ASSET_HISTORY,
    notifications: []
  });
  const navigate = useNavigate();

  const syncAccountData = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const holdings = await tradeService.getHoldings(userId);
      const transactions = await tradeService.getTransactions(userId, 50);

      setAccount(prev => ({
        ...prev,
        id: profile.id,
        username: profile.username || prev.username,
        email: profile.email || prev.email,
        balance: assets ? parseFloat(assets.available_balance) : 0,
        holdings: holdings || [],
        transactions: transactions || []
      }));
    } catch (err) {
      console.error('同步账户数据失败:', err);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('profiles')
          .select('role, status')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role === 'admin') {
              // 管理员重定向到管理端
              window.location.href = '/#/admin';
              return;
            }
            if (data?.status === 'ACTIVE') {
              setSession(session);
              syncAccountData(session.user.id);
            } else {
              supabase.auth.signOut();
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        supabase
          .from('profiles')
          .select('role, status')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role !== 'admin' && data?.status === 'ACTIVE') {
              setSession(session);
              syncAccountData(session.user.id);
            } else {
              setSession(null);
              supabase.auth.signOut();
            }
          });
      } else {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncAccountData]);

  const handleLoginSuccess = async (userData: any) => {
    navigate('/client/dashboard');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<LandingView onEnter={() => navigate('/login')} onQuickOpen={() => navigate('/auth/quick-open')} />} />
        <Route path="/login" element={<LoginView onLoginSuccess={handleLoginSuccess} onBackToHome={() => navigate('/')} />} />
        <Route path="/auth/quick-open" element={<QuickOpenView onComplete={() => navigate('/login')} onBack={() => navigate('/')} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout activeTab="dashboard" setActiveTab={(tab) => navigate(`/${tab}`)} isDarkMode={false} toggleTheme={() => {}} onOpenSettings={() => {}} account={account} userRole="user" />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard transactions={account.transactions} onOpenBanner={() => {}} onOpenCalendar={() => {}} onOpenReports={() => {}} onOpenEducation={() => {}} onOpenCompliance={() => {}} />} />
          <Route path="market" element={<Suspense fallback={<LoadingSpinner />}><MarketView onSelectStock={() => {}} /></Suspense>} />
          <Route path="trade" element={<Suspense fallback={<LoadingSpinner />}><TradePanel account={account} onExecute={async () => true} initialStock={null} /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<LoadingSpinner />}><ProfileView account={account} onOpenAnalysis={() => {}} onOpenConditional={() => {}} isDarkMode={false} toggleTheme={() => {}} /></Suspense>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default ClientApp;
