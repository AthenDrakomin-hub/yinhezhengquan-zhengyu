import React, { lazy, Suspense, createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/core/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import type { UserAccount, Stock } from '../lib/types';

// 懒加载客户端组件
const Dashboard = lazy(() => import('../components/views/Dashboard'));
const MarketView = lazy(() => import('../components/views/MarketView'));
const TradePanel = lazy(() => import('../components/views/TradePanel'));
const ProfileView = lazy(() => import('../components/views/ProfileView'));
const SettingsView = lazy(() => import('../components/views/SettingsView'));

// 高级功能组件
const AssetAnalysisView = lazy(() => import('../components/client/analysis/AssetAnalysisView'));
const ComplianceCenter = lazy(() => import('../components/client/compliance/ComplianceCenter'));
const ComplianceShieldView = lazy(() => import('../components/client/compliance/ComplianceShieldView'));
const ChatView = lazy(() => import('../components/client/ChatView'));
const IPOView = lazy(() => import('../components/client/trading/IPOView'));
const BlockTradeView = lazy(() => import('../components/client/trading/BlockTradeView'));
const ResearchReportsView = lazy(() => import('../components/client/reports/ResearchReportsView'));
const InvestmentCalendarView = lazy(() => import('../components/client/calendar/InvestmentCalendarView'));
const ProfileOverview = lazy(() => import('../components/client/profile/ProfileOverview'));
const TransactionHistory = lazy(() => import('../components/client/orders/TransactionHistory'));
const FundFlowsView = lazy(() => import('../components/client/analysis/FundFlowsView'));
const TradingPreferencesView = lazy(() => import('../components/client/settings/TradingPreferencesView'));
const PersonalizedSettingsView = lazy(() => import('../components/client/settings/PersonalizedSettingsView'));
const EducationCenterView = lazy(() => import('../components/client/education/EducationCenterView'));

// 修复无法懒加载的组件
const BatchIPOPanel = lazy(() => import('../components/shared/WrappedBatchIPOPanel'));
const ConditionalOrderPanel = lazy(() => import('../components/client/trading/ConditionalOrderPanel'));
const ProfileDetailView = lazy(() => import('../components/client/profile/ProfileDetailView'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// 用户账户上下文
interface UserAccountContextType {
  account: UserAccount | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserAccountContext = createContext<UserAccountContextType>({
  account: null,
  loading: true,
  refresh: async () => {},
});

export const useUserAccount = () => useContext(UserAccountContext);

// 用户账户提供者
const UserAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccount = async () => {
    if (!user) {
      setAccount(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 获取用户资产
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // 获取用户持仓
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id);

      // 获取最近交易
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // 获取条件单
      const { data: conditionalOrders } = await supabase
        .from('conditional_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');

      // 构建用户账户对象
      const userAccount: UserAccount = {
        id: user.id,
        email: user.email || '',
        username: user.user_metadata?.username || user.email?.split('@')[0] || '用户',
        status: 'ACTIVE',
        balance: assets?.available_balance || 0,
        holdings: (positions || []).map(p => ({
          symbol: p.symbol || p.stock_code,
          name: p.name || p.stock_name,
          quantity: Number(p.quantity),
          availableQuantity: Number(p.available_quantity),
          averagePrice: Number(p.average_price),
          avgPrice: Number(p.average_price),
          currentPrice: Number(p.current_price || p.average_price),
          marketValue: Number(p.quantity) * Number(p.current_price || p.average_price),
          profit: 0,
          profitRate: 0,
          category: 'STOCK' as const,
        })),
        transactions: (trades || []).map(t => ({
          id: t.id,
          type: t.trade_type as any,
          symbol: t.stock_code,
          name: t.stock_name || '',
          quantity: Number(t.quantity),
          price: Number(t.price),
          amount: Number(t.amount),
          status: t.status as any,
          timestamp: t.created_at,
        })),
        conditionalOrders: (conditionalOrders || []).map(o => ({
          id: o.id,
          type: o.order_type as any,
          symbol: o.stock_code,
          triggerPrice: Number(o.trigger_price),
          quantity: Number(o.quantity),
          status: o.status as any,
        })),
        history: [],
        notifications: [],
      };

      setAccount(userAccount);
    } catch (error) {
      console.error('获取用户账户信息失败:', error);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, [user]);

  return (
    <UserAccountContext.Provider value={{ account, loading, refresh: fetchAccount }}>
      {children}
    </UserAccountContext.Provider>
  );
};

// 默认股票数据（用于条件单等需要默认股票的场景）
const defaultStock: Stock = {
  symbol: '000001',
  name: '平安银行',
  price: 12.5,
  change: 0.25,
  changePercent: 2.04,
  market: 'CN',
  sparkline: [],
  logoUrl: '',
};

const ClientRoutes: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <ErrorBoundary>
      <UserAccountProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route
              path="/"
              element={
                <Layout
                  activeTab="dashboard"
                  setActiveTab={(tab) => navigate(`/client/${tab}`)}
                  isDarkMode={false}
                  toggleTheme={() => {}}
                  onOpenSettings={() => navigate('/client/settings')}
                  account={null}
                  userRole="user"
                />
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardWrapper />} />
              <Route path="market" element={<MarketView onSelectStock={(symbol) => console.log('选择股票:', symbol)} />} />
              <Route path="trade" element={<TradePanelWrapper />} />
              <Route path="profile" element={<ProfileViewWrapper />} />
              
              {/* 高级功能路由 */}
              <Route path="analysis" element={<AnalysisWrapper />} />
              <Route path="compliance" element={<ComplianceCenter />} />
              <Route path="compliance/shield" element={<ComplianceShieldView onBack={() => navigate('/client/compliance')} />} />
              <Route path="chat" element={<ChatView onBack={() => navigate('/client/support')} />} />
              <Route path="ipo" element={<IPOView />} />
              <Route path="batch-ipo" element={<BatchIPOPanel />} />
              <Route path="block-trade" element={<BlockTradeView />} />
              <Route path="conditional-orders" element={<ConditionalOrderWrapper />} />
              <Route path="reports" element={<ResearchReportsView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="calendar" element={<InvestmentCalendarView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="education" element={<EducationCenterView />} />
              <Route path="profile/detail" element={<ProfileDetailView />} />
              <Route path="profile/overview" element={<ProfileOverviewWrapper />} />
              <Route path="transactions" element={<TransactionHistoryWrapper />} />
              <Route path="funds" element={<FundFlowsWrapper />} />
              <Route path="trading-preferences" element={<TradingPreferencesView />} />
              <Route path="settings" element={<SettingsWrapper onLogout={handleLogout} />} />
              <Route path="settings/personalized" element={<PersonalizedSettingsView />} />
              
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </UserAccountProvider>
    </ErrorBoundary>
  );
};

// 包装组件 - 使用用户账户上下文
const DashboardWrapper: React.FC = () => {
  const { account } = useUserAccount();
  const navigate = useNavigate();
  
  return (
    <Dashboard
      transactions={account?.transactions || []}
      onOpenBanner={(banner) => console.log('打开横幅:', banner.title)}
      onOpenCalendar={() => navigate('/client/calendar')}
      onOpenReports={() => navigate('/client/reports')}
      onOpenEducation={() => navigate('/client/education')}
      onOpenCompliance={() => navigate('/client/compliance')}
    />
  );
};

const TradePanelWrapper: React.FC = () => {
  const { account } = useUserAccount();
  
  return (
    <TradePanel
      account={account}
      onExecute={async () => true}
      initialStock={null}
    />
  );
};

const ProfileViewWrapper: React.FC = () => {
  const { account } = useUserAccount();
  const navigate = useNavigate();
  
  return (
    <ProfileView
      account={account}
      onOpenAnalysis={() => navigate('/client/analysis')}
      onOpenConditional={() => navigate('/client/conditional-orders')}
      isDarkMode={false}
      toggleTheme={() => {}}
    />
  );
};

const AnalysisWrapper: React.FC = () => {
  const { account } = useUserAccount();
  const navigate = useNavigate();
  
  return (
    <AssetAnalysisView
      account={account}
      onBack={() => navigate('/client/profile')}
    />
  );
};

const ConditionalOrderWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <ConditionalOrderPanel
      onBack={() => navigate('/client/trade')}
      stock={defaultStock}
      onAddOrder={() => {}}
    />
  );
};

const ProfileOverviewWrapper: React.FC = () => {
  const { account } = useUserAccount();
  const navigate = useNavigate();
  
  return (
    <ProfileOverview
      account={account}
      onOpenAnalysis={() => navigate('/client/analysis')}
      onOpenConditional={() => navigate('/client/conditional-orders')}
    />
  );
};

const TransactionHistoryWrapper: React.FC = () => {
  const { account } = useUserAccount();
  return <TransactionHistory userId={account?.id || ''} />;
};

const FundFlowsWrapper: React.FC = () => {
  const { account } = useUserAccount();
  return <FundFlowsView userId={account?.id || ''} />;
};

const SettingsWrapper: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  
  return (
    <SettingsView
      onBack={() => navigate('/client/dashboard')}
      isDarkMode={false}
      toggleTheme={() => {}}
      riskLevel="C3"
      onLogout={onLogout}
    />
  );
};

export default ClientRoutes;
