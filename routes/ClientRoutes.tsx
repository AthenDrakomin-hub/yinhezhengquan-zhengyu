import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserAccount, Stock } from '../lib/types';
import Layout from '../components/core/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { MOCK_ASSET_HISTORY } from '../lib/constants';

// 懒加载客户端组件
const Dashboard = lazy(() => import('../components/views/Dashboard'));
const MarketView = lazy(() => import('../components/views/MarketView'));
const TradePanel = lazy(() => import('../components/views/TradePanel'));
const ProfileView = lazy(() => import('../components/views/ProfileView'));
const SettingsView = lazy(() => import('../components/views/SettingsView'));

// 高级功能组件（已重构到新目录）
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

// 修复无法懒加载的组件
const BatchIPOPanel = lazy(() => import('../components/shared/WrappedBatchIPOPanel'));
const ConditionalOrderPanel = lazy(() => import('../components/client/trading/ConditionalOrderPanel'));
const ProfileDetailView = lazy(() => import('../components/client/profile/ProfileDetailView'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Mock user account data
const mockAccount: UserAccount = {
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
};

const ClientRoutes: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  // 注意：父级OptimizedApp.tsx已经用ProtectedRoute包裹了/client/*路由
  // 这里不再需要重复的权限检查，只负责路由定义

  // Mock stock data for conditional orders
  const mockStock: Stock = {
    symbol: 'TEST',
    name: '测试股票',
    price: 10.0,
    change: 0.5,
    changePercent: 5.0,
    market: 'CN',
    sparkline: [9.5, 9.7, 9.8, 10.0, 10.2, 10.1, 10.0],
    logoUrl: ''
  };

  return (
    <ErrorBoundary>
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
                account={mockAccount} 
                userRole="user" 
              />
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={
              <Dashboard 
                transactions={mockAccount.transactions} 
                onOpenBanner={(banner) => console.log('打开横幅:', banner.title)} 
                onOpenCalendar={() => navigate('/client/calendar')} 
                onOpenReports={() => navigate('/client/reports')} 
                onOpenEducation={() => {
                  alert('投教中心功能正在开发中，敬请期待！');
                  console.log('投教中心功能正在开发中');
                }} // 暂时显示提示信息，投教中心路由待创建
                onOpenCompliance={() => navigate('/client/compliance')}
              />
            } />
            <Route path="market" element={<MarketView onSelectStock={(symbol) => {
              console.log('选择股票:', symbol);
              // 可以导航到交易页面或显示股票详情
              // navigate(`/client/trade?symbol=${symbol}`);
            }} />} />
            <Route path="trade" element={
              <TradePanel 
                account={mockAccount} 
                onExecute={async () => true} 
                initialStock={null} 
              />
            } />
            <Route path="profile" element={
              <ProfileView 
                account={mockAccount} 
                onOpenAnalysis={() => navigate('/client/analysis')} 
                onOpenConditional={() => navigate('/client/conditional-orders')} 
                isDarkMode={false} 
                toggleTheme={() => {}} 
              />
            } />
            
            {/* 高级功能路由 */}
            <Route path="analysis" element={
              <AssetAnalysisView 
                account={mockAccount} 
                onBack={() => navigate('/client/profile')} 
              />
            } />
            <Route path="compliance" element={
              <ComplianceCenter />
            } />
            <Route path="compliance/shield" element={
              <ComplianceShieldView 
                onBack={() => navigate('/client/compliance')} 
              />
            } />
            <Route path="chat" element={
              <ChatView 
                onBack={() => navigate('/client/support')} 
              />
            } />
            <Route path="ipo" element={
              <IPOView />
            } />
            <Route path="batch-ipo" element={
              <BatchIPOPanel />
            } />
            <Route path="block-trade" element={
              <BlockTradeView />
            } />
            <Route path="conditional-orders" element={
              <ConditionalOrderPanel 
                onBack={() => navigate('/client/trade')} 
                stock={mockStock}
                onAddOrder={() => {}}
              />
            } />
            <Route path="reports" element={
              <ResearchReportsView 
                onBack={() => navigate('/client/dashboard')} 
              />
            } />
            <Route path="calendar" element={
              <InvestmentCalendarView 
                onBack={() => navigate('/client/dashboard')} 
              />
            } />
            <Route path="profile/detail" element={
              <ProfileDetailView />
            } />
            <Route path="profile/overview" element={
              <ProfileOverview 
                account={mockAccount} 
                onOpenAnalysis={() => navigate('/client/analysis')} 
                onOpenConditional={() => navigate('/client/conditional-orders')} 
              />
            } />
            <Route path="transactions" element={
              <TransactionHistory 
                userId={mockAccount.id} 
              />
            } />
            <Route path="funds" element={
              <FundFlowsView 
                userId={mockAccount.id} 
              />
            } />
            <Route path="trading-preferences" element={<TradingPreferencesView />} />
            <Route path="settings" element={
              <SettingsView 
                onBack={() => navigate('/client/dashboard')} 
                isDarkMode={false} 
                toggleTheme={() => {}} 
                riskLevel="C3" 
                onLogout={handleLogout} 
              />
            } />
            <Route path="settings/personalized" element={
              <PersonalizedSettingsView />
            } />
            
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default ClientRoutes;