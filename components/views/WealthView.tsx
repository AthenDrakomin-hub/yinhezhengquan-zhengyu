/**
 * 财富页面
 * 按银河证券官方App风格
 * 包含资产概览、快捷功能、资产分布、理财产品等
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAccount } from '../../lib/types';
import { getWealthProducts, getFunds, WealthProduct, Fund } from '../../services/wealthService';
import { PullToRefreshWrapper } from '../shared/WithPullToRefresh';

interface WealthViewProps {
  account: UserAccount | null;
  onBack?: () => void;
}

const WealthView: React.FC<WealthViewProps> = ({ account, onBack }) => {
  const navigate = useNavigate();
  const [showAssets, setShowAssets] = useState(true);
  const [wealthProducts, setWealthProducts] = useState<WealthProduct[]>([]);
  const [hotFunds, setHotFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);

  // 是否已登录
  const isLoggedIn = !!account;

  // 资金操作处理
  const handleBankTransfer = () => {
    navigate('/client/bank-transfer');
  };

  const handleDeposit = () => {
    // 充值：跳转到银证转账页面（默认转入模式）
    navigate('/client/bank-transfer?mode=in');
  };

  const handleWithdraw = () => {
    // 提现：跳转到银证转账页面（默认转出模式）
    navigate('/client/bank-transfer?mode=out');
  };

  const handleFundFlow = () => {
    navigate('/client/profile/funds');
  };

  // 理财产品点击
  const handleProductClick = (productId: string) => {
    // 跳转到理财产品详情页（目前跳转到理财产品列表）
    navigate(`/client/wealth-finance?id=${productId}`);
  };

  // 基金点击
  const handleFundClick = (fundCode: string) => {
    // 跳转到基金详情页（目前跳转到理财产品列表）
    navigate(`/client/wealth-finance?fund=${fundCode}`);
  };

  // 加载理财产品和基金数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [products, funds] = await Promise.all([
          getWealthProducts(undefined, 5),
          getFunds(undefined, 5),
        ]);
        setWealthProducts(products);
        setHotFunds(funds);
      } catch (error) {
        console.error('加载理财产品数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 下拉刷新处理
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const [products, funds] = await Promise.all([
        getWealthProducts(undefined, 5),
        getFunds(undefined, 5),
      ]);
      setWealthProducts(products);
      setHotFunds(funds);
    } catch (error) {
      console.error('刷新理财产品数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 计算账户统计
  const accountStats = useMemo(() => {
    if (!account) return null;
    
    const holdingsValue = account.holdings.reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0);
    const totalProfit = account.holdings.reduce((sum, h) => sum + (h.profit || 0), 0);
    const totalCost = account.holdings.reduce((sum, h) => sum + (h.quantity * h.averagePrice), 0);
    const totalAssets = account.balance + holdingsValue;
    
    // 资产分布
    const stockValue = account.holdings
      .filter(h => h.category === 'STOCK' || !h.category)
      .reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0);
    const fundValue = account.holdings
      .filter(h => h.category === 'FUND')
      .reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0);
    const bondValue = account.holdings
      .filter(h => h.category === 'BOND')
      .reduce((sum, h) => sum + (h.marketValue || h.quantity * h.currentPrice), 0);
    
    return {
      totalAssets,
      availableCash: account.balance,
      holdingsValue,
      totalProfit,
      totalProfitRate: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
      todayPnL: totalProfit * 0.1, // 模拟今日盈亏
      stockRatio: holdingsValue > 0 ? (stockValue / holdingsValue) * 100 : 0,
      fundRatio: holdingsValue > 0 ? (fundValue / holdingsValue) * 100 : 0,
      bondRatio: holdingsValue > 0 ? (bondValue / holdingsValue) * 100 : 0,
      cashRatio: totalAssets > 0 ? (account.balance / totalAssets) * 100 : 0,
      stockValue,
      fundValue,
      bondValue,
    };
  }, [account]);

  // 资产分布数据
  const assetDistribution = useMemo(() => {
    if (!accountStats) return [];
    
    const total = accountStats.totalAssets;
    if (total === 0) return [];
    
    return [
      { 
        id: 'stock', 
        label: '股票市值', 
        value: accountStats.stockValue, 
        percent: accountStats.stockRatio,
        color: '#E63946' 
      },
      { 
        id: 'fund', 
        label: '基金市值', 
        value: accountStats.fundValue, 
        percent: accountStats.fundRatio,
        color: '#4DA6FF' 
      },
      { 
        id: 'bond', 
        label: '债券市值', 
        value: accountStats.bondValue, 
        percent: accountStats.bondRatio,
        color: '#22C55E' 
      },
      { 
        id: 'cash', 
        label: '可用资金', 
        value: accountStats.availableCash, 
        percent: accountStats.cashRatio,
        color: '#F97316' 
      },
    ].filter(item => item.value > 0);
  }, [accountStats]);

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh} className="bg-[#F5F5F5]">
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      {/* 顶部资产概览卡片 */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] px-5 pt-4 pb-6 text-white">
        {/* 标题行 */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-white/70">总资产(元)</span>
          <button 
            onClick={() => setShowAssets(!showAssets)}
            className="text-white/70"
          >
            {showAssets ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        </div>

        {/* 总资产数值 */}
        <div className="text-3xl font-bold mb-3">
          {isLoggedIn && accountStats 
            ? (showAssets ? `¥${accountStats.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******')
            : '--'
          }
        </div>

        {/* 盈亏信息 */}
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-white/70">今日盈亏</span>
            <span className={`ml-2 ${isLoggedIn && accountStats && accountStats.todayPnL >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
              {isLoggedIn && accountStats 
                ? (showAssets ? `${accountStats.todayPnL >= 0 ? '+' : ''}${accountStats.todayPnL.toFixed(2)}` : '--')
                : '--'
              }
            </span>
          </div>
          <div>
            <span className="text-white/70">持仓盈亏</span>
            <span className={`ml-2 ${isLoggedIn && accountStats && accountStats.totalProfit >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
              {isLoggedIn && accountStats 
                ? (showAssets ? `${accountStats.totalProfit >= 0 ? '+' : ''}${accountStats.totalProfit.toFixed(2)}` : '--')
                : '--'
              }
            </span>
          </div>
        </div>

        {/* 未登录提示 */}
        {!isLoggedIn && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/60 text-sm">登录后查看您的资产详情</p>
          </div>
        )}
      </div>

      {/* 快捷功能 */}
      <div className="bg-white mx-4 -mt-3 rounded-xl shadow-sm p-4 relative z-10">
        <div className="grid grid-cols-4 gap-4">
          <button 
            onClick={handleBankTransfer}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-[#FFF0F0] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#E63946]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">银证转账</span>
          </button>
          <button 
            onClick={handleDeposit}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-[#E3F2FD] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">充值</span>
          </button>
          <button 
            onClick={handleWithdraw}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-[#E5F9EF] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">提现</span>
          </button>
          <button 
            onClick={handleFundFlow}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-[#FFF7ED] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs text-[#333333]">流水</span>
          </button>
        </div>
      </div>

      {/* 资产分布 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-[#333333]">资产分布</h3>
          <button 
            onClick={() => navigate('/client/analysis')}
            className="text-xs text-[#0066CC]"
          >详情</button>
        </div>
        
        {assetDistribution.length > 0 ? (
          <>
            {/* 进度条 */}
            <div className="h-3 rounded-full bg-[#F5F5F5] overflow-hidden flex mb-4">
              {assetDistribution.map((item) => (
                <div 
                  key={item.id}
                  className="h-full transition-all duration-300"
                  style={{ 
                    width: `${item.percent}%`,
                    backgroundColor: item.color 
                  }}
                />
              ))}
            </div>

            {/* 图例 */}
            <div className="grid grid-cols-2 gap-3">
              {assetDistribution.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-[#666666]">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#333333]">
                      {showAssets ? `¥${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '****'}
                    </p>
                    <p className="text-xs text-[#999999]">{item.percent.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-[#999999] text-sm">
            {isLoggedIn ? '暂无资产数据' : '登录后查看资产分布'}
          </div>
        )}
      </div>

      {/* 理财产品 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-[#333333]">稳健理财</h3>
          <button 
            onClick={() => navigate('/client/wealth-finance')}
            className="text-xs text-[#0066CC]"
          >
            查看更多 ›
          </button>
        </div>
        {loading ? (
          <div className="py-8 text-center text-[#999999] text-sm">加载中...</div>
        ) : wealthProducts.length > 0 ? (
          <div className="space-y-3">
            {wealthProducts.slice(0, 3).map((product) => (
              <button 
                key={product.id}
                onClick={() => handleProductClick(product.id)}
                className="w-full flex justify-between items-center py-3 border-b border-[#F0F0F0] last:border-0 last:pb-0"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#333333]">{product.name}</p>
                    {product.tag && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#FFF0F0] text-[#E63946] rounded">{product.tag}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#999999] mt-1">
                    {product.period_days ? `${product.period_days}天` : '活期'} · 风险等级 R{product.risk_level || 2}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-[#E63946]">
                    {product.expected_return ? `${product.expected_return}%` : '--'}
                  </p>
                  <p className="text-xs text-[#999999]">预期收益</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[#999999] text-sm">暂无理财产品</div>
        )}
      </div>

      {/* 热门基金 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-[#333333]">热门基金</h3>
          <button 
            onClick={() => navigate('/client/wealth-finance?tab=fund')}
            className="text-xs text-[#0066CC]"
          >查看更多 ›</button>
        </div>
        {loading ? (
          <div className="py-8 text-center text-[#999999] text-sm">加载中...</div>
        ) : hotFunds.length > 0 ? (
          <div className="space-y-3">
            {hotFunds.slice(0, 3).map((fund) => (
              <button 
                key={fund.code}
                onClick={() => handleFundClick(fund.code)}
                className="w-full flex justify-between items-center py-3 border-b border-[#F0F0F0] last:border-0 last:pb-0"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-[#333333]">{fund.name}</p>
                  <p className="text-xs text-[#999999] mt-1">{fund.code} · {fund.type}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${fund.day_growth && fund.day_growth >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                    {fund.day_growth ? `${fund.day_growth >= 0 ? '+' : ''}${fund.day_growth}%` : '--'}
                  </p>
                  <p className="text-xs text-[#999999]">日涨跌</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[#999999] text-sm">暂无基金数据</div>
        )}
      </div>

      {/* 定投专区 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-[#333333]">定投专区</h3>
          <button 
            onClick={() => navigate('/client/wealth-finance?tab=invest')}
            className="text-xs text-[#0066CC]"
          >我的定投 ›</button>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/client/wealth-finance?tab=invest&type=regular')}
            className="flex-1 p-3 bg-gradient-to-br from-[#E63946]/10 to-[#E63946]/5 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-[#E63946]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-[#333333]">定时定投</span>
            </div>
            <p className="text-xs text-[#666666]">设置周期，自动扣款</p>
          </button>
          <button 
            onClick={() => navigate('/client/wealth-finance?tab=invest&type=smart')}
            className="flex-1 p-3 bg-gradient-to-br from-[#0066CC]/10 to-[#0066CC]/5 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm font-medium text-[#333333]">智能定投</span>
            </div>
            <p className="text-xs text-[#666666]">估值低位多投高位少投</p>
          </button>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="mx-4 mt-3 mb-4 text-center">
        <p className="text-xs text-[#999999]">
          投资有风险，入市需谨慎
        </p>
      </div>
    </div>
    </PullToRefreshWrapper>
  );
};

export default WealthView;
