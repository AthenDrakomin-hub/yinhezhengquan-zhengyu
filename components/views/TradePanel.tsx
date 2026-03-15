/**
 * 交易页面
 * 按银河证券官方App交易页面截图还原
 * 深色模式
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TradeType, UserAccount, Stock } from '../../lib/types';
import { ICONS } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { usePosition } from '../../contexts/PositionContext';
import { marketApi } from '../../services/marketApi';
import { tradeService } from '../../services/tradeService';
import TradeResultModal from '../shared/TradeResultModal';

// TradeType 是枚举，定义快捷引用
const BUY = TradeType.BUY;
const SELL = TradeType.SELL;

// ===================== 组件Props =====================
interface TradePanelProps {
  account: UserAccount | null;
  onExecute: (type: TradeType, symbol: string, name: string, price: number, quantity: number, logoUrl?: string, marketType?: string) => Promise<boolean>;
  initialStock?: Stock | null;
}

// ===================== 主组件 =====================
const TradePanel: React.FC<TradePanelProps> = ({ account, onExecute, initialStock }) => {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { refreshPositions } = usePosition();
  const [searchParams] = useSearchParams();
  
  // 交易模式
  const [tradeMode, setTradeMode] = useState<'normal' | 'margin' | 'option'>('normal');
  
  // 股票搜索
  const [stockCode, setStockCode] = useState('');
  const [stockName, setStockName] = useState('');
  const [stockPrice, setStockPrice] = useState(0);
  const [stockInfo, setStockInfo] = useState<Stock | null>(null);
  const [searching, setSearching] = useState(false);
  
  // 买卖切换
  const [tradeType, setTradeType] = useState<TradeType>(BUY);
  
  // 价格类型
  const [priceType, setPriceType] = useState<'limit' | 'market'>('limit');
  const [price, setPrice] = useState('');
  
  // 数量
  const [quantity, setQuantity] = useState('');
  
  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  
  // 弹窗
  const [showConfirm, setShowConfirm] = useState(false);
  
  // 交易结果
  const [tradeResult, setTradeResult] = useState<{
    visible: boolean;
    status: 'success' | 'failed' | 'pending';
    errorMessage?: string;
    orderNo?: string;
  }>({ visible: false, status: 'pending' });

  // 可用资金
  const availableFunds = account?.balance || 0;
  
  // 是否已登录
  const isLoggedIn = !!session && !!user;

  // 核心交易功能矩阵
  const tradeFunctions = [
    { id: 'buy', label: '买入', icon: '买', color: 'text-[#E63946]', bg: 'bg-[#FFE5E5]' },
    { id: 'sell', label: '卖出', icon: '卖', color: 'text-[#3B82F6]', bg: 'bg-[#E5EDFF]' },
    { id: 'cancel', label: '撤单', icon: '撤', color: 'text-[#F97316]', bg: 'bg-[#FFF3E5]' },
    { id: 'position', label: '持仓', icon: '持', color: 'text-[#22C55E]', bg: 'bg-[#E5F9EF]' },
  ];

  const moreFunctions = [
    { id: 'condition', label: '条件单', icon: '📋' },
    { id: 'order', label: '委托查询', icon: '📝' },
    { id: 'deal', label: '成交查询', icon: '✅' },
    { id: 'ipo', label: '新股申购', icon: '🎯' },
    { id: 'transfer', label: '银证转账', icon: '💳' },
    { id: 'fund-buy', label: '基金购买', icon: '📊' },
    { id: 'fund-sell', label: '基金赎回', icon: '💰' },
    { id: 'wealth', label: '理财持仓', icon: '🏦' },
  ];

  // 特色服务
  const specialServices = [
    { id: 'condition', title: '条件单', desc: '随时随地 为您盯盘下单', icon: '⏰', color: 'from-[#E63946] to-[#C62836]' },
    { id: 'wealth-star', title: '财富星', desc: '银河财富星 专业好投顾', icon: '⭐', color: 'from-[#F97316] to-[#EA580C]' },
    { id: 'etf', title: 'ETF专区', desc: '一站式ETF 投资服务平台', icon: '📈', color: 'from-[#3B82F6] to-[#2563EB]' },
  ];

  // 处理功能点击
  const handleFunctionClick = (id: string) => {
    switch (id) {
      case 'buy':
        setTradeType(BUY);
        break;
      case 'sell':
        setTradeType(SELL);
        break;
      case 'cancel':
        navigate('/client/cancel-orders');
        break;
      case 'position':
        navigate('/client/holdings');
        break;
      case 'ipo':
        navigate('/client/ipo');
        break;
      case 'condition':
        navigate('/client/conditional-orders');
        break;
      case 'order':
        navigate('/client/order-query');
        break;
      case 'deal':
        navigate('/client/transaction-history');
        break;
      case 'transfer':
        navigate('/client/bank-transfer');
        break;
      case 'fund-buy':
        navigate('/client/fund-purchase');
        break;
      case 'fund-sell':
        navigate('/client/fund-redeem');
        break;
      case 'wealth':
        navigate('/client/wealth-holdings');
        break;
      default:
        console.log('Function:', id);
    }
  };

  // 搜索股票
  const handleSearchStock = async () => {
    if (!stockCode.trim()) return;
    setSearching(true);
    try {
      // 根据股票代码长度判断市场：6位为A股，5位为港股
      const code = stockCode.toUpperCase();
      const market = code.length === 5 ? 'HK' : 'CN';
      const stock = await marketApi.getRealtimeStock(code, market);
      if (stock) {
        setStockInfo({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
          market: stock.market,
          sparkline: stock.sparkline || []
        });
        setStockName(stock.name);
        setStockPrice(stock.price);
        setPrice(stock.price.toString());
      }
    } catch (error) {
      console.error('搜索股票失败:', error);
    } finally {
      setSearching(false);
    }
  };

  // 计算最大可买
  const maxQuantity = useMemo(() => {
    if (!stockPrice || !availableFunds) return 0;
    return Math.floor(availableFunds / stockPrice / 100) * 100;
  }, [stockPrice, availableFunds]);

  // 提交交易
  const handleSubmit = async () => {
    if (!stockInfo || !price || !quantity) return;
    
    setSubmitting(true);
    setShowConfirm(false);
    setTradeResult({ visible: true, status: 'pending' });
    
    try {
      const success = await onExecute(
        tradeType,
        stockInfo.symbol,
        stockInfo.name,
        parseFloat(price),
        parseInt(quantity),
        undefined,
        stockInfo.market
      );
      
      if (success) {
        // 生成模拟委托编号
        const orderNo = `WT${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        setTradeResult({
          visible: true,
          status: 'success',
          orderNo,
        });
        // 刷新持仓数据
        refreshPositions();
        // 重置表单
        setQuantity('');
      } else {
        setTradeResult({
          visible: true,
          status: 'failed',
          errorMessage: '委托提交失败，请稍后重试',
        });
      }
    } catch (error: any) {
      console.error('交易失败:', error);
      setTradeResult({
        visible: true,
        status: 'failed',
        errorMessage: error?.message || '网络异常，请检查网络连接后重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 处理交易模式切换
  const handleTradeModeChange = (mode: 'normal' | 'margin' | 'option') => {
    if (mode === 'margin') {
      // 切换到两融模式，跳转到融资融券页面
      navigate('/client/margin');
      return;
    }
    if (mode === 'option') {
      // 切换到期权模式，跳转到期权页面（如果存在）或显示提示
      alert('期权交易功能即将上线，敬请期待！');
      return;
    }
    setTradeMode(mode);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      {/* 顶部深蓝色导航栏 */}
      <div className="bg-[#1a365d] px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 模式切换 */}
          <div className="flex items-center gap-4">
            {[
              { key: 'normal', label: '普通' },
              { key: 'margin', label: '两融' },
              { key: 'option', label: '期权' },
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => handleTradeModeChange(mode.key as any)}
                className={`relative text-sm font-medium transition-colors ${
                  tradeMode === mode.key ? 'text-white' : 'text-white/60'
                }`}
              >
                {mode.label}
                {tradeMode === mode.key && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>
          
          {/* 右侧功能 */}
          <div className="flex items-center gap-3">
            <button className="text-white/80 text-sm">定制</button>
            <button className="relative">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E63946] text-white text-[10px] rounded-full flex items-center justify-center">
                33
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 未登录状态 */}
      {!isLoggedIn && (
        <div className="bg-white px-4 py-5 border-b border-[#E5E5E5]">
          <h2 className="text-lg font-semibold text-[#333333] mb-3">欢迎来到银河证券</h2>
          <button 
            onClick={() => navigate('/auth/login')}
            className="w-full py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB] transition-colors"
          >
            登录/开户
          </button>
        </div>
      )}

      {/* 核心交易功能区 */}
      <div className="bg-white px-4 py-4 mt-2">
        <div className="grid grid-cols-4 gap-4">
          {tradeFunctions.map((func) => (
            <button
              key={func.id}
              onClick={() => handleFunctionClick(func.id)}
              className="flex flex-col items-center gap-2"
            >
              <div className={`w-12 h-12 rounded-xl ${func.bg} flex items-center justify-center`}>
                <span className={`text-lg font-bold ${func.color}`}>{func.icon}</span>
              </div>
              <span className="text-sm text-[#333333]">{func.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 更多功能 */}
      <div className="bg-white px-4 py-4 mt-2">
        <div className="grid grid-cols-4 gap-4">
          {moreFunctions.map((func) => (
            <button
              key={func.id}
              onClick={() => handleFunctionClick(func.id)}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center text-lg">
                {func.icon}
              </div>
              <span className="text-xs text-[#666666]">{func.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 营销资讯横幅 */}
      <div className="mx-4 mt-3 bg-gradient-to-r from-[#1a365d] to-[#2d4a7c] rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="inline-block bg-[#E63946] text-white text-[10px] px-1.5 py-0.5 rounded font-medium mb-1">HOT</span>
          <p className="text-white text-sm font-medium">三驾马车齐头并进，港股配置价值显现！</p>
        </div>
        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* 特色服务卡片 */}
      <div className="px-4 mt-3 space-y-3">
        {specialServices.map((service) => (
          <div
            key={service.id}
            onClick={() => {
              if (service.id === 'wealth-star') {
                navigate('/client/education');
              } else if (service.id === 'condition') {
                navigate('/client/conditional-orders');
              } else if (service.id === 'etf') {
                navigate('/client/etf');
              }
            }}
            className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:bg-[#FAFAFA] transition-colors"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl`}>
              {service.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#333333]">{service.title}</p>
              <p className="text-xs text-[#999999] mt-0.5">{service.desc}</p>
            </div>
            <svg className="w-5 h-5 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>

      {/* 股票交易区域（已登录状态显示） */}
      {isLoggedIn && (
        <div className="mx-4 mt-4 bg-white rounded-xl shadow-sm overflow-hidden">
          {/* 买卖切换 */}
          <div className="flex border-b border-[#E5E5E5]">
            <button
              onClick={() => setTradeType(BUY)}
              className={`flex-1 py-3 text-center font-semibold transition-colors ${
                tradeType === BUY 
                  ? 'text-[#E63946] bg-[#FFE5E5]' 
                  : 'text-[#666666]'
              }`}
            >
              买入
            </button>
            <button
              onClick={() => setTradeType(SELL)}
              className={`flex-1 py-3 text-center font-semibold transition-colors ${
                tradeType === SELL 
                  ? 'text-[#3B82F6] bg-[#E5EDFF]' 
                  : 'text-[#666666]'
              }`}
            >
              卖出
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* 股票代码输入 */}
            <div>
              <label className="text-xs text-[#999999] block mb-1.5">股票代码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stockCode}
                  onChange={(e) => setStockCode(e.target.value.toUpperCase())}
                  placeholder="输入股票代码"
                  className="flex-1 h-11 px-4 border border-[#E5E5E5] rounded-lg text-[15px] text-[#333333]"
                />
                <button
                  onClick={handleSearchStock}
                  disabled={searching}
                  className="px-4 bg-[#3B82F6] text-white rounded-lg text-sm font-medium"
                >
                  {searching ? '搜索中' : '查询'}
                </button>
              </div>
            </div>

            {/* 股票信息 */}
            {stockInfo && (
              <>
                <div className="flex items-center justify-between py-2 px-3 bg-[#F5F5F5] rounded-lg">
                  <div>
                    <span className="text-sm font-semibold text-[#333333]">{stockName}</span>
                    <span className="text-xs text-[#999999] ml-2">{stockCode}</span>
                  </div>
                  <span className={`text-lg font-bold ${stockInfo.change >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                    {stockPrice.toFixed(2)}
                  </span>
                </div>

                {/* 价格类型 */}
                <div>
                  <label className="text-xs text-[#999999] block mb-1.5">价格类型</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPriceType('limit')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        priceType === 'limit' 
                          ? 'bg-[#3B82F6] text-white' 
                          : 'bg-[#F5F5F5] text-[#666666]'
                      }`}
                    >
                      限价
                    </button>
                    <button
                      onClick={() => setPriceType('market')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        priceType === 'market' 
                          ? 'bg-[#3B82F6] text-white' 
                          : 'bg-[#F5F5F5] text-[#666666]'
                      }`}
                    >
                      市价
                    </button>
                  </div>
                </div>

                {/* 价格输入 */}
                {priceType === 'limit' && (
                  <div>
                    <label className="text-xs text-[#999999] block mb-1.5">委托价格</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="输入价格"
                      step="0.01"
                      className="w-full h-11 px-4 border border-[#E5E5E5] rounded-lg text-[15px] text-[#333333]"
                    />
                  </div>
                )}

                {/* 数量输入 */}
                <div>
                  <label className="text-xs text-[#999999] block mb-1.5">委托数量（股）</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="输入数量"
                    step="100"
                    className="w-full h-11 px-4 border border-[#E5E5E5] rounded-lg text-[15px] text-[#333333]"
                  />
                  <p className="text-xs text-[#999999] mt-1">
                    可用资金: ¥{availableFunds.toFixed(2)} | 最大可买: {maxQuantity}股
                  </p>
                </div>

                {/* 提交按钮 */}
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!price || !quantity}
                  className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
                    tradeType === BUY
                      ? 'bg-[#E63946] hover:bg-[#C62836]'
                      : 'bg-[#3B82F6] hover:bg-[#2563EB]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {tradeType === BUY ? '买入' : '卖出'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 交易确认弹窗 */}
      {showConfirm && stockInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-5">
              <h3 className="text-base font-semibold text-[#333333] text-center mb-4">
                确认{tradeType === BUY ? '买入' : '卖出'}
              </h3>
              <div className="space-y-3 py-3 border-y border-[#F0F0F0]">
                <div className="flex justify-between">
                  <span className="text-sm text-[#999999]">股票名称</span>
                  <span className="text-sm text-[#333333]">{stockName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#999999]">股票代码</span>
                  <span className="text-sm text-[#333333]">{stockCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#999999]">委托价格</span>
                  <span className="text-sm text-[#333333]">¥{price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#999999]">委托数量</span>
                  <span className="text-sm text-[#333333]">{quantity}股</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#999999]">委托金额</span>
                  <span className="text-sm font-semibold text-[#333333]">
                    ¥{(parseFloat(price) * parseInt(quantity)).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 border border-[#E5E5E5] rounded-xl text-sm text-[#666666]"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white ${
                    tradeType === BUY ? 'bg-[#E63946]' : 'bg-[#3B82F6]'
                  }`}
                >
                  {submitting ? '提交中...' : '确认'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 交易结果弹窗 */}
      <TradeResultModal
        visible={tradeResult.visible}
        status={tradeResult.status}
        tradeType={tradeType === BUY ? 'buy' : 'sell'}
        stockName={stockName}
        stockCode={stockCode.toUpperCase()}
        price={parseFloat(price) || 0}
        quantity={parseInt(quantity) || 0}
        amount={(parseFloat(price) || 0) * (parseInt(quantity) || 0)}
        errorMessage={tradeResult.errorMessage}
        orderNo={tradeResult.orderNo}
        onClose={() => setTradeResult({ visible: false, status: 'pending' })}
        onContinue={() => {
          setTradeResult({ visible: false, status: 'pending' });
          setQuantity('');
        }}
        onViewOrder={() => {
          setTradeResult({ visible: false, status: 'pending' });
          navigate('/client/order-query');
        }}
      />
    </div>
  );
};

export default TradePanel;
