import React, { lazy, Suspense, createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, useRouteTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { soundLibrary } from '../lib/sound';
import { marketApi } from '../services/marketApi';
import Layout from '../components/core/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import type { UserAccount, Stock } from '../lib/types';
import { TradeType } from '../lib/types';
import { tradeService } from '../services/tradeService';

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
const ProfileDetailSettings = lazy(() => import('../components/client/settings/ProfileDetailSettings'));
const SecuritySettings = lazy(() => import('../components/client/settings/SecuritySettings'));
const AboutSettings = lazy(() => import('../components/client/settings/AboutSettings'));
const EducationCenterView = lazy(() => import('../components/client/education/EducationCenterView'));
const NewsDetailView = lazy(() => import('../components/client/news/NewsDetailView'));
const StockDetailView = lazy(() => import('../components/client/market/StockDetailView'));

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
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (assetsError && assetsError.code !== 'PGRST116') {
        console.warn('获取资产失败:', assetsError.message);
      }

      // 获取用户持仓
      const { data: positions, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id);
      
      if (positionsError) {
        console.warn('获取持仓失败:', positionsError.message);
      }

      // 获取当前价格（从市场数据）
      const stockSymbols = (positions || []).map(p => p.symbol || p.stock_code).filter(Boolean);
      let stockPrices: Record<string, number> = {};
      
      if (stockSymbols.length > 0) {
        try {
          // 分别处理A股和港股
          const cnSymbols = stockSymbols.filter(s => s.length === 6);
          const hkSymbols = stockSymbols.filter(s => s.length === 5);
          
          const allStocks: { symbol: string; price: number }[] = [];
          
          if (cnSymbols.length > 0) {
            const cnStocks = await marketApi.getBatchStocks(cnSymbols, 'CN');
            allStocks.push(...cnStocks);
          }
          
          if (hkSymbols.length > 0) {
            const hkStocks = await marketApi.getBatchStocks(hkSymbols, 'HK');
            allStocks.push(...hkStocks);
          }
          
          allStocks.forEach((s: { symbol: string; price: number }) => {
            stockPrices[s.symbol] = s.price;
          });
        } catch (e) {
          console.warn('获取实时价格失败，使用数据库价格');
        }
      }

      // 获取最近交易
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (tradesError) {
        console.warn('获取交易记录失败:', tradesError.message);
      }

      // 获取条件单
      const { data: conditionalOrders, error: conditionalError } = await supabase
        .from('conditional_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');
      
      if (conditionalError) {
        console.warn('获取条件单失败:', conditionalError.message);
      }

      // 构建用户账户对象
      const userAccount: UserAccount = {
        id: user.id,
        email: user.email || '',
        username: user.user_metadata?.username || user.email?.split('@')[0] || '用户',
        status: 'ACTIVE',
        balance: Number(assets?.available_balance) || 0,
        holdings: (positions || []).map(p => {
          const symbol = p.symbol || p.stock_code;
          const currentPrice = stockPrices[symbol] || Number(p.current_price || p.average_price);
          const avgPrice = Number(p.average_price);
          const quantity = Number(p.quantity);
          const cost = avgPrice * quantity;
          const marketValue = currentPrice * quantity;
          const profit = marketValue - cost;
          const profitRate = cost > 0 ? (profit / cost) * 100 : 0;
          
          return {
            symbol,
            name: p.name || p.stock_name,
            quantity,
            availableQuantity: Number(p.available_quantity),
            averagePrice: avgPrice,
            avgPrice,
            currentPrice,
            marketValue,
            profit,
            profitRate,
            category: 'STOCK' as const,
          };
        }),
        transactions: (trades || []).map(t => ({
          id: t.id,
          type: t.trade_type as any,
          symbol: t.stock_code,
          name: t.stock_name || '',
          quantity: Number(t.quantity),
          price: Number(t.price),
          amount: Number(t.amount || (t.price * t.quantity)),
          status: t.status as any,
          timestamp: t.created_at,
        })),
        conditionalOrders: (conditionalOrders || []).map(o => ({
          id: o.id,
          type: o.order_type as any,
          symbol: o.symbol,
          name: o.stock_name,
          triggerPrice: Number(o.trigger_price) || Number(o.stop_loss_price) || Number(o.take_profit_price) || 0,
          quantity: Number(o.quantity) || 0,
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
  
  // 使用统一主题管理 - 客户端区域默认浅色，用户可切换
  const { theme, isDarkMode, toggleTheme } = useTheme();
  useRouteTheme('client');

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
              <Route path="market" element={<MarketView onSelectStock={(symbol) => navigate(`/client/stock/${symbol}`)} />} />
              <Route path="stock/:symbol" element={<StockDetailView />} />
              <Route path="trade" element={<TradePanelWrapper />} />
              <Route path="profile" element={<ProfileViewWrapper />} />
              
              {/* 高级功能路由 */}
              <Route path="analysis" element={<AnalysisWrapper />} />
              <Route path="compliance" element={<ComplianceCenter onBack={() => navigate('/client/dashboard')} onOpenShield={() => navigate('/client/compliance/shield')} />} />
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
              <Route path="education" element={<EducationCenterView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="profile/detail" element={<ProfileDetailView />} />
              <Route path="profile" element={<ProfileViewWrapper />}>
                <Route index element={<ProfileOverviewWrapper />} />
                <Route path="overview" element={<ProfileOverviewWrapper />} />
                <Route path="compliance" element={<ComplianceCenter onBack={() => navigate('/client/profile')} onOpenShield={() => navigate('/client/compliance/shield')} />} />
                <Route path="education" element={<EducationCenterView onBack={() => navigate('/client/profile')} />} />
              </Route>
              <Route path="transactions" element={<TransactionHistoryWrapper />} />
              <Route path="funds" element={<FundFlowsWrapper />} />
              <Route path="trading-preferences" element={<TradingPreferencesView />} />
              <Route path="settings" element={<SettingsWrapper onLogout={handleLogout} />}>
                <Route index element={<SettingsOverview />} />
                <Route path="profile-detail" element={<ProfileDetailSettings />} />
                <Route path="security" element={<SecuritySettings />} />
                <Route path="trading-preferences" element={<TradingPreferencesView />} />
                <Route path="personalized" element={<PersonalizedSettingsView />} />
                <Route path="about" element={<AboutSettings />} />
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
  const [selectedBanner, setSelectedBanner] = React.useState<any | null>(null);
  
  return (
    <>
      <Dashboard
        transactions={account?.transactions || []}
        onOpenBanner={(banner) => setSelectedBanner(banner)}
        onOpenCalendar={() => navigate('/client/calendar')}
        onOpenReports={() => navigate('/client/reports')}
        onOpenEducation={() => navigate('/client/education')}
        onOpenCompliance={() => navigate('/client/compliance/shield')}
        onOpenNews={(newsId) => navigate(`/client/news/${newsId}`)}
      />
      
      {/* 横幅详情弹窗 */}
      {selectedBanner && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedBanner(null)}
        >
          <div 
            className="bg-[#1a1f2e] rounded-3xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[#00D4AA]/30 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部图片 */}
            {selectedBanner.img && (
              <div className="h-48 bg-gradient-to-br from-[#00D4AA]/20 to-[#0A1628] shrink-0">
                <img 
                  src={selectedBanner.img} 
                  alt={selectedBanner.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* 内容 */}
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black text-[#00D4AA] uppercase tracking-wider bg-[#00D4AA]/10 px-2 py-1 rounded">
                  {selectedBanner.category || '公告'}
                </span>
                {selectedBanner.date && (
                  <span className="text-[10px] text-gray-500">{selectedBanner.date}</span>
                )}
              </div>
              <h3 className="text-xl font-black text-white mb-3">{selectedBanner.title}</h3>
              <div className="text-gray-400 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                {selectedBanner.content || selectedBanner.desc || selectedBanner.subtitle || '暂无详情'}
              </div>
              
              {/* 操作按钮 */}
              <div className="flex gap-3 sticky bottom-0 pt-4 bg-[#1a1f2e]">
                <button
                  onClick={() => setSelectedBanner(null)}
                  className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-300 font-semibold hover:bg-gray-600 transition-colors"
                >
                  关闭
                </button>
                {selectedBanner.linkUrl && (
                  <button
                    onClick={() => {
                      window.open(selectedBanner.linkUrl, '_blank');
                      setSelectedBanner(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#00D4AA] text-[#0A1628] font-black hover:bg-[#00D4AA]/90 transition-colors"
                  >
                    查看详情
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
    logoUrl?: string,
    marketType?: string
  ): Promise<boolean> => {
    if (!user?.id) {
      alert('请先登录');
      return false;
    }

    try {
      // 使用 tradeService 调用 Edge Function
      const result = await tradeService.executeTrade({
        userId: user.id,
        type,
        symbol,
        name,
        price,
        quantity,
        logoUrl,
        marketType: marketType || 'A_SHARE', // 使用传入的市场类型，默认A股
      });

      if (result && result.success) {
        // 刷新用户账户数据
        await refresh();
        
        // 播放交易成功音效
        soundLibrary.playSend();
        
        // 显示结果
        if (result.status === 'PENDING_APPROVAL') {
          alert('订单已提交，等待管理员审核');
        } else {
          alert('订单已进入撮合池');
        }
        return true;
      } else if (result && result.error) {
        alert('交易失败: ' + result.error);
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.error('交易执行异常:', error);
      alert('交易执行失败: ' + (error.message || '请重试'));
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
  const navigate = useNavigate();
  return <TransactionHistory userId={account?.id || ''} onBack={() => navigate('/client/profile')} />;
};

const FundFlowsWrapper: React.FC = () => {
  const { account } = useUserAccount();
  const navigate = useNavigate();
  return <FundFlowsView userId={account?.id || ''} onBack={() => navigate('/client/profile')} />;
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
