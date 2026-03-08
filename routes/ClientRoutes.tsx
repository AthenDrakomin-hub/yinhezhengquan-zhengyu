import React, { lazy, Suspense, createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { soundLibrary } from '../lib/sound';
import Layout from '../components/core/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import type { UserAccount, Stock } from '../lib/types';
import { TradeType } from '../lib/types';

// 懒加载客户端组件
const Dashboard = lazy(() => import('../components/views/Dashboard'));
const MarketView = lazy(() => import('../components/views/MarketView'));
const TradePanel = lazy(() => import('../components/views/TradePanel'));
const ProfileView = lazy(() => import('../components/views/ProfileView'));
const SettingsView = lazy(() => import('../components/views/SettingsView'));
const SettingsOverview = lazy(() => import('../components/client/settings/SettingsOverview'));

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
const NewsDetailView = lazy(() => import('../components/client/news/NewsDetailView'));

// 诊断工具
const ImageDiagnosticPage = lazy(() => import('../components/client/ImageDiagnosticPage'));

// 修复无法懒加载的组件
const BatchIPOPanel = lazy(() => import('../components/shared/WrappedBatchIPOPanel'));
const ConditionalOrderPanel = lazy(() => import('../components/client/trading/ConditionalOrderPanel'));
const ProfileDetailView = lazy(() => import('../components/client/profile/ProfileDetailView'));

const LimitUpView = lazy(() => import('../components/client/LimitUpView'));

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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 从 localStorage 读取主题设置，默认为深色
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  // 切换主题
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      // 切换 body class
      if (newMode) {
        document.body.classList.remove('light-mode');
      } else {
        document.body.classList.add('light-mode');
      }
      return newMode;
    });
  };

  // 初始化时应用主题
  useEffect(() => {
    if (!isDarkMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [isDarkMode]);

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
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                  onOpenSettings={() => navigate('/client/settings')}
                  account={null}
                  userRole="user"
                />
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardWrapper />} />
              <Route path="market" element={<MarketView onSelectStock={(symbol) => navigate(`/client/trade?symbol=${symbol}`)} />} />
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
              <Route path="limit-up" element={<Navigate to="/client/trade?mode=limitUp" replace />} />
              <Route path="image-diagnostic" element={<ImageDiagnosticPage />} />
              <Route path="education" element={<EducationCenterView />} />
              <Route path="profile/detail" element={<ProfileDetailView />} />
              <Route path="profile/overview" element={<ProfileOverviewWrapper />} />
              <Route path="transactions" element={<TransactionHistoryWrapper />} />
              <Route path="funds" element={<FundFlowsWrapper />} />
              <Route path="trading-preferences" element={<TradingPreferencesView />} />
              <Route path="settings" element={<SettingsWrapper onLogout={handleLogout} />}>
                <Route index element={<SettingsOverview />} />
                <Route path="personalized" element={<PersonalizedSettingsView />} />
              </Route>
              <Route path="news/:newsId" element={<NewsDetailView />} />
              
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
      onOpenNews={(newsId) => navigate(`/client/news/${newsId}`)}
    />
  );
};

const TradePanelWrapper: React.FC = () => {
  const { account, refresh } = useUserAccount();
  const { user } = useAuth();
  
  const handleExecuteTrade = async (
    type: TradeType,
    symbol: string,
    name: string,
    price: number,
    quantity: number,
    logoUrl?: string
  ): Promise<boolean> => {
    if (!user?.id) {
      alert('请先登录');
      return false;
    }

    try {
      const tradeType = type === TradeType.BUY ? 'BUY' : 
                        type === TradeType.SELL ? 'SELL' : 
                        type === TradeType.IPO ? 'IPO' : 
                        type === TradeType.BLOCK ? 'BLOCK' : 'LIMIT_UP';
      
      const amount = price * quantity;
      
      // 1. 创建交易记录
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          stock_code: symbol,
          stock_name: name,
          trade_type: tradeType,
          quantity: quantity,
          price: price,
          amount: amount,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (tradeError) {
        console.error('创建交易记录失败:', tradeError);
        alert('交易提交失败: ' + tradeError.message);
        return false;
      }

      // 2. 更新用户资产（扣除资金或添加持仓）
      if (type === TradeType.BUY || type === TradeType.IPO || type === TradeType.BLOCK || type === TradeType.LIMIT_UP) {
        // 买入：扣除可用资金
        const { error: assetError } = await supabase.rpc('deduct_balance', {
          p_user_id: user.id,
          p_amount: amount
        });
        
        if (assetError) {
          console.error('扣除资金失败:', assetError);
          // 回滚交易状态
          await supabase.from('trades').update({ status: 'FAILED' }).eq('id', tradeData.id);
          alert('资金不足或扣除失败');
          return false;
        }

        // 添加或更新持仓
        const { data: existingPosition } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('stock_code', symbol)
          .single();

        if (existingPosition) {
          // 更新现有持仓
          const newQuantity = Number(existingPosition.quantity) + quantity;
          const newAvgPrice = (Number(existingPosition.average_price) * Number(existingPosition.quantity) + amount) / newQuantity;
          
          const { error: updateError } = await supabase
            .from('positions')
            .update({
              quantity: newQuantity,
              available_quantity: Number(existingPosition.available_quantity) + quantity,
              average_price: newAvgPrice,
              current_price: price,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPosition.id);

          if (updateError) {
            console.error('更新持仓失败:', updateError);
          }
        } else {
          // 创建新持仓
          const { error: positionError } = await supabase
            .from('positions')
            .insert({
              user_id: user.id,
              stock_code: symbol,
              stock_name: name,
              quantity: quantity,
              available_quantity: quantity,
              average_price: price,
              current_price: price,
              logo_url: logoUrl,
              created_at: new Date().toISOString(),
            });

          if (positionError) {
            console.error('创建持仓失败:', positionError);
          }
        }
      } else if (type === TradeType.SELL) {
        // 卖出：增加资金，减少持仓
        const { error: assetError } = await supabase.rpc('add_balance', {
          p_user_id: user.id,
          p_amount: amount
        });
        
        if (assetError) {
          console.error('增加资金失败:', assetError);
        }

        // 减少持仓
        const { data: existingPosition } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('stock_code', symbol)
          .single();

        if (existingPosition) {
          const newQuantity = Number(existingPosition.quantity) - quantity;
          if (newQuantity <= 0) {
            // 删除持仓
            await supabase.from('positions').delete().eq('id', existingPosition.id);
          } else {
            // 更新持仓
            await supabase
              .from('positions')
              .update({
                quantity: newQuantity,
                available_quantity: Math.max(0, Number(existingPosition.available_quantity) - quantity),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingPosition.id);
          }
        }
      }

      // 3. 更新交易状态为成功
      await supabase
        .from('trades')
        .update({ 
          status: 'SUCCESS',
          executed_at: new Date().toISOString()
        })
        .eq('id', tradeData.id);

      // 4. 刷新用户账户数据
      await refresh();
      
      // 5. 播放交易成功音效
      soundLibrary.playSend();
      
      return true;
    } catch (error) {
      console.error('交易执行异常:', error);
      alert('交易执行失败，请重试');
      return false;
    }
  };
  
  return (
    <TradePanel
      account={account}
      onExecute={handleExecuteTrade}
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
