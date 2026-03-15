import React, { lazy, Suspense, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, useRouteTheme } from '../contexts/ThemeContext';
import { useUserSettings, triggerHaptic } from '../contexts/UserSettingsContext';
import { PositionProvider } from '../contexts/PositionContext';
import { supabase } from '../lib/supabase';
import { soundLibrary } from '../lib/sound';
import { marketApi } from '../services/marketApi';
import Layout from '../components/core/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import TradeConfirmModal from '../components/shared/TradeConfirmModal';
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
const HotspotView = lazy(() => import('../components/client/hotspot/HotspotView'));

// 诊断工具
const ImageDiagnosticPage = lazy(() => import('../components/client/ImageDiagnosticPage'));

// 修复无法懒加载的组件
const BatchIPOPanel = lazy(() => import('../components/shared/WrappedBatchIPOPanel'));
const ConditionalOrderPanel = lazy(() => import('../components/client/trading/ConditionalOrderPanel'));
const ProfileDetailView = lazy(() => import('../components/client/profile/ProfileDetailView'));
const WealthView = lazy(() => import('../components/views/WealthView'));

const LimitUpView = lazy(() => import('../components/client/LimitUpView'));

// 新增页面
const VideoZoneView = lazy(() => import('../components/client/video/VideoZoneView'));
const ETFZoneView = lazy(() => import('../components/client/etf/ETFZoneView'));
const MarginTradingView = lazy(() => import('../components/client/margin/MarginTradingView'));
const WealthFinanceView = lazy(() => import('../components/client/wealth/WealthFinanceView'));

// 第二、三阶段新增页面
const GeneralSettings = lazy(() => import('../components/client/settings/GeneralSettings'));
const MarketSettings = lazy(() => import('../components/client/settings/MarketSettings'));
const ConditionalSettings = lazy(() => import('../components/client/settings/ConditionalSettings'));
const SectorsView = lazy(() => import('../components/client/market/SectorsView'));
const SmartPickView = lazy(() => import('../components/client/market/SmartPickView'));
const SectorDetailView = lazy(() => import('../components/client/market/SectorDetailView'));
const WatchlistManager = lazy(() => import('../components/client/watchlist/WatchlistManager'));
const TradeSiteSettings = lazy(() => import('../components/client/settings/TradeSiteSettings'));
const MarketSiteSettings = lazy(() => import('../components/client/settings/MarketSiteSettings'));
const PermissionSettings = lazy(() => import('../components/client/settings/PermissionSettings'));
const FeedbackView = lazy(() => import('../components/client/settings/FeedbackView'));
const DataCollectionSettings = lazy(() => import('../components/client/settings/DataCollectionSettings'));
const ThirdPartySharingSettings = lazy(() => import('../components/client/settings/ThirdPartySharingSettings'));

// 法律条款页面
const UserAgreementView = lazy(() => import('../components/client/legal/UserAgreementView'));
const PrivacyPolicyView = lazy(() => import('../components/client/legal/PrivacyPolicyView'));

// 交易功能页面
const HoldingsView = lazy(() => import('../components/client/trading/HoldingsView'));
const CancelOrdersView = lazy(() => import('../components/client/trading/CancelOrdersView'));
const OrderQueryView = lazy(() => import('../components/client/trading/OrderQueryView'));
const BankTransferView = lazy(() => import('../components/client/trading/BankTransferView'));
const FundPurchaseView = lazy(() => import('../components/client/trading/FundPurchaseView'));
const FundRedeemView = lazy(() => import('../components/client/trading/FundRedeemView'));
const WealthHoldingsView = lazy(() => import('../components/client/trading/WealthHoldingsView'));

// 我的页面功能
const MonthlyBillView = lazy(() => import('../components/client/bill/MonthlyBillView'));
const VipBenefitsView = lazy(() => import('../components/client/vip/VipBenefitsView'));
const WatchlistAlertsView = lazy(() => import('../components/client/alerts/WatchlistAlertsView'));
const IPOReserveView = lazy(() => import('../components/client/ipo/IPOReserveView'));
const ComprehensiveAccountView = lazy(() => import('../components/client/account/ComprehensiveAccountView'));

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
      <PositionProvider>
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
              <Route path="wealth" element={<WealthViewWrapper />} />
              <Route path="profile" element={<ProfileViewWrapper />} />
              
              {/* 高级功能路由 */}
              <Route path="analysis" element={<AnalysisWrapper />} />
              <Route path="compliance" element={<ComplianceCenter onBack={() => navigate('/client/dashboard')} onOpenShield={() => navigate('/client/compliance/shield')} />} />
              <Route path="compliance/shield" element={<ComplianceShieldView onBack={() => navigate('/client/compliance')} />} />
              <Route path="chat" element={<ChatView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="ipo" element={<IPOView />} />
              <Route path="batch-ipo" element={<BatchIPOPanel />} />
              <Route path="block-trade" element={<BlockTradeView />} />
              <Route path="conditional-orders" element={<ConditionalOrderWrapper />} />
              
              {/* 交易功能路由 */}
              <Route path="holdings" element={<HoldingsView />} />
              <Route path="cancel-orders" element={<CancelOrdersView />} />
              <Route path="order-query" element={<OrderQueryView />} />
              <Route path="bank-transfer" element={<BankTransferView />} />
              <Route path="fund-purchase" element={<FundPurchaseView />} />
              <Route path="fund-redeem" element={<FundRedeemView />} />
              <Route path="wealth-holdings" element={<WealthHoldingsView />} />
              
              <Route path="reports" element={<ResearchReportsView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="calendar" element={<InvestmentCalendarView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="limit-up" element={<Navigate to="/client/trade?mode=limitUp" replace />} />
              <Route path="image-diagnostic" element={<ImageDiagnosticPage />} />
              <Route path="education" element={<EducationCenterView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="profile/detail" element={<ProfileDetailView />} />
              <Route path="profile" element={<ProfileViewWrapper />}>
                <Route index element={<ProfileOverviewWrapper />} />
                <Route path="overview" element={<ProfileOverviewWrapper />} />
                <Route path="transactions" element={<TransactionHistoryWrapper />} />
                <Route path="funds" element={<FundFlowsWrapper />} />
                <Route path="compliance" element={<ComplianceCenter onBack={() => navigate('/client/profile')} onOpenShield={() => navigate('/client/compliance/shield')} />} />
                <Route path="education" element={<EducationCenterView onBack={() => navigate('/client/profile')} />} />
              </Route>
              <Route path="trading-preferences" element={<TradingPreferencesView />} />
              <Route path="settings" element={<SettingsWrapper onLogout={handleLogout} />}>
                <Route index element={<SettingsOverview />} />
                <Route path="profile-detail" element={<ProfileDetailSettings />} />
                <Route path="security" element={<SecuritySettings />} />
                <Route path="trading-preferences" element={<TradingPreferencesView />} />
                <Route path="personalized" element={<PersonalizedSettingsView />} />
                <Route path="about" element={<AboutSettings />} />
                {/* 新增设置子页面 */}
                <Route path="general" element={<GeneralSettings />} />
                <Route path="market" element={<MarketSettings />} />
                <Route path="conditional" element={<ConditionalSettings />} />
                <Route path="trade-site" element={<TradeSiteSettings />} />
                <Route path="market-site" element={<MarketSiteSettings />} />
                <Route path="permission" element={<PermissionSettings />} />
                <Route path="feedback" element={<FeedbackView />} />
                <Route path="privacy/data" element={<DataCollectionSettings />} />
                <Route path="privacy/sharing" element={<ThirdPartySharingSettings />} />
              </Route>
              <Route path="news/:newsId" element={<NewsDetailView />} />
              <Route path="hotspot" element={<HotspotView />} />
              
              {/* 新增功能路由 */}
              <Route path="video" element={<VideoZoneView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="etf" element={<ETFZoneView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="margin" element={<MarginTradingView onBack={() => navigate('/client/dashboard')} />} />
              <Route path="wealth-finance" element={<WealthFinanceView onBack={() => navigate('/client/dashboard')} />} />
              
              {/* 我的页面功能路由 */}
              <Route path="monthly-bill" element={<MonthlyBillView />} />
              <Route path="vip-benefits" element={<VipBenefitsView />} />
              <Route path="watchlist-alerts" element={<WatchlistAlertsView />} />
              <Route path="ipo-reserve" element={<IPOReserveView />} />
              <Route path="comprehensive-account" element={<ComprehensiveAccountView />} />
              
              {/* 法律条款路由 */}
              <Route path="legal/user-agreement" element={<UserAgreementView />} />
              <Route path="legal/privacy-policy" element={<PrivacyPolicyView />} />
              
              {/* 行情相关路由 */}
              <Route path="market/sectors" element={<SectorsView onBack={() => navigate('/client/market')} />} />
              <Route path="market/sector/:id" element={<SectorDetailView />} />
              <Route path="market/smart-pick" element={<SmartPickView onBack={() => navigate('/client/market')} />} />
              <Route path="watchlist" element={<WatchlistManager stocks={[]} onRemove={() => {}} onReorder={() => {}} onStockClick={(s) => navigate(`/client/stock/${s}`)} />} />
              
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </UserAccountProvider>
      </PositionProvider>
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
            className="bg-[#1a1f2e] rounded-3xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[#E63946]/30 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部图片 */}
            {selectedBanner.img && (
              <div className="h-48 bg-gradient-to-br from-[#E63946]/20 to-[#1E1E1E] shrink-0">
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
                <span className="text-[10px] font-black text-[#E63946] uppercase tracking-wider bg-[#E63946]/10 px-2 py-1 rounded">
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
                    className="flex-1 py-3 rounded-xl bg-[#E63946] text-[#1E1E1E] font-black hover:bg-[#E63946]/90 transition-colors"
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
  const { isFastOrderMode, isSoundEnabled, isHapticEnabled } = useUserSettings();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{
    type: TradeType;
    symbol: string;
    name: string;
    price: number;
    quantity: number;
    logoUrl?: string;
    marketType?: string;
  } | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
  
  // 实际执行交易
  const executeTrade = useCallback(async (
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
        marketType: marketType || 'A_SHARE',
      });

      if (result && result.success) {
        // 刷新用户账户数据
        await refresh();
        
        // 播放交易成功音效（根据设置）
        if (isSoundEnabled) {
          soundLibrary.playSend();
        }
        
        // 触感反馈（根据设置）
        if (isHapticEnabled) {
          triggerHaptic('medium');
        }
        
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
  }, [user?.id, refresh, isSoundEnabled, isHapticEnabled]);
  
  // 处理交易请求
  const handleExecuteTrade = useCallback(async (
    type: TradeType,
    symbol: string,
    name: string,
    price: number,
    quantity: number,
    logoUrl?: string,
    marketType?: string
  ): Promise<boolean> => {
    // 触感反馈
    if (isHapticEnabled) {
      triggerHaptic('light');
    }
    
    // 如果开启极速模式，直接执行交易
    if (isFastOrderMode) {
      return executeTrade(type, symbol, name, price, quantity, logoUrl, marketType);
    }
    
    // 否则显示确认弹窗
    return new Promise((resolve) => {
      setPendingTrade({ type, symbol, name, price, quantity, logoUrl, marketType });
      setShowConfirmModal(true);
      setResolveRef(() => resolve);
    });
  }, [isFastOrderMode, isHapticEnabled, executeTrade]);
  
  // 确认弹窗确认
  const handleConfirm = useCallback(async () => {
    if (!pendingTrade) return;
    
    const result = await executeTrade(
      pendingTrade.type,
      pendingTrade.symbol,
      pendingTrade.name,
      pendingTrade.price,
      pendingTrade.quantity,
      pendingTrade.logoUrl,
      pendingTrade.marketType
    );
    
    setShowConfirmModal(false);
    setPendingTrade(null);
    if (resolveRef) {
      resolveRef(result);
      setResolveRef(null);
    }
  }, [pendingTrade, executeTrade, resolveRef]);
  
  // 确认弹窗取消
  const handleCancel = useCallback(() => {
    setShowConfirmModal(false);
    setPendingTrade(null);
    if (resolveRef) {
      resolveRef(false);
      setResolveRef(null);
    }
  }, [resolveRef]);
  
  return (
    <>
      <TradePanel
        account={account}
        onExecute={handleExecuteTrade}
        initialStock={null}
      />
      <TradeConfirmModal
        isOpen={showConfirmModal}
        tradeInfo={pendingTrade ? {
          type: pendingTrade.type,
          symbol: pendingTrade.symbol,
          name: pendingTrade.name,
          price: pendingTrade.price,
          quantity: pendingTrade.quantity,
          amount: pendingTrade.price * pendingTrade.quantity
        } : null}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

const WealthViewWrapper: React.FC = () => {
  const { account } = useUserAccount();
  
  return (
    <WealthView account={account} />
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
  const [searchParams] = useSearchParams();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showStockSelector, setShowStockSelector] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);

  // 从 URL 参数获取股票代码
  const symbolFromUrl = searchParams.get('symbol');

  // 初始化：从 URL 参数或持仓中获取股票
  useEffect(() => {
    const initStock = async () => {
      if (symbolFromUrl) {
        // 从 URL 参数获取股票
        try {
          const { marketApi } = await import('@/services/marketApi');
          const stock = await marketApi.getRealtimeStock(symbolFromUrl, 'CN');
          if (stock) {
            setSelectedStock({
              symbol: stock.symbol,
              name: stock.name,
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent,
              market: stock.market,
              sparkline: stock.sparkline || [],
              logoUrl: ''
            });
          }
        } catch (error) {
          console.error('获取股票信息失败:', error);
        }
      } else {
        // 尝试从持仓中获取第一只股票
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: positions } = await supabase
              .from('positions')
              .select('stock_code, stock_name')
              .eq('user_id', user.id)
              .gt('quantity', 0)
              .limit(1);
            
            if (positions && positions.length > 0) {
              const { marketApi } = await import('@/services/marketApi');
              const stock = await marketApi.getRealtimeStock(positions[0].stock_code, 'CN');
              if (stock) {
                setSelectedStock({
                  symbol: stock.symbol,
                  name: stock.name,
                  price: stock.price,
                  change: stock.change,
                  changePercent: stock.changePercent,
                  market: stock.market,
                  sparkline: stock.sparkline || [],
                  logoUrl: ''
                });
              }
            }
          }
        } catch (error) {
          console.error('获取持仓股票失败:', error);
        }
      }
    };
    
    initStock();
  }, [symbolFromUrl]);

  // 搜索股票
  const handleSearchStock = async () => {
    if (!searchCode.trim()) return;
    
    setSearching(true);
    try {
      const { marketApi } = await import('@/services/marketApi');
      const code = searchCode.toUpperCase();
      const market = code.length === 5 ? 'HK' : 'CN';
      const stock = await marketApi.getRealtimeStock(code, market);
      
      if (stock) {
        setSelectedStock({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
          market: stock.market,
          sparkline: stock.sparkline || [],
          logoUrl: ''
        });
        setShowStockSelector(false);
      } else {
        alert('未找到该股票，请检查股票代码');
      }
    } catch (error) {
      console.error('搜索股票失败:', error);
      alert('搜索股票失败，请稍后重试');
    } finally {
      setSearching(false);
    }
  };

  // 如果未选择股票，显示股票选择界面
  if (!selectedStock || showStockSelector) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        {/* 顶部导航 */}
        <div className="bg-[#0066CC] px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button onClick={() => showStockSelector ? setShowStockSelector(false) : navigate('/client/trade')} className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white text-lg font-semibold flex-1">选择股票</h1>
        </div>

        <div className="p-4">
          {/* 搜索框 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              placeholder="输入股票代码（如：600519）"
              className="flex-1 px-4 py-3 bg-white border border-[#E5E5E5] rounded-xl text-sm focus:outline-none focus:border-[#0066CC]"
              onKeyDown={(e) => e.key === 'Enter' && handleSearchStock()}
            />
            <button
              onClick={handleSearchStock}
              disabled={searching || !searchCode.trim()}
              className="px-6 py-3 bg-[#0066CC] text-white rounded-xl font-medium disabled:opacity-50"
            >
              {searching ? '搜索中...' : '搜索'}
            </button>
          </div>

          {/* 提示信息 */}
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-sm text-[#666666]">
              请输入股票代码搜索并选择要设置条件单的股票
            </p>
            <p className="text-xs text-[#999999] mt-2">
              支持A股（6位代码）和港股（5位代码）
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConditionalOrderPanel
      onBack={() => navigate('/client/trade')}
      stock={selectedStock}
      onAddOrder={() => {
        // 可以跳转到条件单列表或显示成功提示
        navigate('/client/conditional-orders');
      }}
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
