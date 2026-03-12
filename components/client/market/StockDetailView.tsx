/**
 * 个股详情页面
 * 展示股票详细信息、K线图、五档行情、成交明细、公司资料等
 * 数据来源：银禾数据 API、Edge Functions、Supabase 数据库
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ICONS } from '@/lib/constants';
import InteractiveChart from '@/components/shared/InteractiveChart';
import StockIcon from '@/components/shared/StockIcon';
import stockDetailService, { 
  type StockQuote, 
  type OrderBook, 
  type TradeTick, 
  type KLineData,
  type MoneyFlow,
  type FinancialData,
  type CompanyInfo 
} from '@/services/stockDetailService';
import type { Stock } from '@/lib/types';

interface StockDetailViewProps {
  onTrade?: (symbol: string) => void;
}

// 五档数据接口
interface OrderBookItem {
  level: number;
  price: number;
  volume: number;
}

// 成交明细接口
interface TradeRecord {
  time: string;
  price: number;
  volume: number;
  direction: 'BUY' | 'SELL';
}

const StockDetailView: React.FC<StockDetailViewProps> = ({ onTrade }) => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  
  // 基础状态
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState<Stock | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'info' | 'flow'>('chart');
  const [inWatchlist, setInWatchlist] = useState(false);
  const [market, setMarket] = useState<'CN' | 'HK'>('CN');
  
  // 真实数据状态
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [tradeTicks, setTradeTicks] = useState<TradeTick[]>([]);
  const [klineData, setKlineData] = useState<KLineData[]>([]);
  const [moneyFlow, setMoneyFlow] = useState<MoneyFlow | null>(null);
  const [financial, setFinancial] = useState<FinancialData | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  // 判断市场
  const detectMarket = useCallback((sym: string): 'CN' | 'HK' => {
    // 港股代码通常是5位数字，以0开头
    if (sym.length === 5 && /^[0-9]+$/.test(sym)) {
      return 'HK';
    }
    // A股代码：6开头是沪市，0/3开头是深市
    if (sym.startsWith('6') || sym.startsWith('0') || sym.startsWith('3')) {
      return 'CN';
    }
    // 默认港股
    return 'HK';
  }, []);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    if (!symbol) return;

    const detectedMarket = detectMarket(symbol);
    setMarket(detectedMarket);
    setLoading(true);

    // 港股默认名称映射
    const hkStockNames: Record<string, string> = {
      '00700': '腾讯控股',
      '09988': '阿里巴巴-SW',
      '03690': '美团-W',
      '09999': '网易-S',
      '01810': '小米集团-W',
      '02318': '中国平安',
      '00005': '汇丰控股',
      '00941': '中国移动',
      '03988': '中国银行',
      '01398': '工商银行',
    };

    try {
      // 并行获取所有数据
      const [
        quoteData,
        orderBookData,
        ticksData,
        kline,
        flowData,
        financialData,
        companyData
      ] = await Promise.all([
        stockDetailService.getStockQuote(symbol, detectedMarket),
        stockDetailService.getOrderBook(symbol),
        stockDetailService.getTradeTicks(symbol),
        stockDetailService.getKLineData(symbol, 'day', 100),
        stockDetailService.getMoneyFlow(symbol),
        stockDetailService.getFinancialData(symbol, ''),
        stockDetailService.getCompanyInfo(symbol, ''),
      ]);

      // 设置行情数据
      if (quoteData) {
        setQuote(quoteData);
        setStock({
          symbol: quoteData.symbol,
          name: quoteData.name,
          price: quoteData.price,
          change: quoteData.change,
          changePercent: quoteData.changePercent,
          market: quoteData.market,
          sparkline: [],
        });
      } else {
        // 没有获取到行情数据时，使用兜底数据
        const defaultName = detectedMarket === 'HK' 
          ? (hkStockNames[symbol] || `港股 ${symbol}`) 
          : `股票 ${symbol}`;
        setStock({
          symbol: symbol,
          name: defaultName,
          price: 10.00,
          change: 0,
          changePercent: 0,
          market: detectedMarket,
          sparkline: [],
        });
      }

      // 设置五档数据
      if (orderBookData) {
        setOrderBook(orderBookData);
      }

      // 设置成交明细
      if (ticksData.length > 0) {
        setTradeTicks(ticksData);
      }

      // 设置K线数据
      if (kline.length > 0) {
        setKlineData(kline);
      }

      // 设置资金流向
      if (flowData) {
        setMoneyFlow(flowData);
      }

      // 设置财务数据
      if (financialData) {
        setFinancial(financialData);
      }

      // 设置公司资料
      if (companyData) {
        setCompany(companyData);
      }

      // 检查是否在自选股中
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: watchlistData } = await supabase
          .from('watchlist')
          .select('id')
          .eq('symbol', symbol)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setInWatchlist(!!watchlistData);
      } else {
        setInWatchlist(false);
      }

    } catch (error) {
      console.error('加载股票数据失败:', error);
      // 使用兜底数据
      const defaultName = detectedMarket === 'HK' 
        ? (hkStockNames[symbol] || `港股 ${symbol}`) 
        : `股票 ${symbol}`;
      setStock({
        symbol: symbol,
        name: defaultName,
        price: 10.00,
        change: 0,
        changePercent: 0,
        market: detectedMarket,
        sparkline: [],
      });
    } finally {
      setLoading(false);
    }
  }, [symbol, detectMarket]);

  useEffect(() => {
    loadAllData();
    
    // 设置定时刷新（每30秒刷新行情）
    const interval = setInterval(() => {
      if (symbol) {
        stockDetailService.getStockQuote(symbol, market).then(setQuote);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [symbol, market, loadAllData]);

  // 生成五档数据（如果没有真实数据）
  const displayOrderBook = useMemo<{
    asks: OrderBookItem[];
    bids: OrderBookItem[];
  }>(() => {
    if (orderBook) return orderBook;
    
    // 基于当前价格生成模拟五档
    const basePrice = stock?.price || 10;
    return {
      asks: Array.from({ length: 5 }, (_, i) => ({
        level: 5 - i,
        price: basePrice + (5 - i) * 0.01,
        volume: Math.floor(Math.random() * 10000) + 1000,
      })),
      bids: Array.from({ length: 5 }, (_, i) => ({
        level: i + 1,
        price: basePrice - (i + 1) * 0.01,
        volume: Math.floor(Math.random() * 10000) + 1000,
      })),
    };
  }, [orderBook, stock]);

  // 生成成交明细（如果没有真实数据）
  const displayTradeTicks = useMemo<TradeRecord[]>(() => {
    if (tradeTicks.length > 0) {
      return tradeTicks.map(tick => ({
        time: tick.time,
        price: tick.price,
        volume: tick.volume,
        direction: tick.direction,
      }));
    }

    // 生成模拟成交明细
    if (!stock) return [];
    return Array.from({ length: 20 }, (_, i) => {
      const time = new Date();
      time.setMinutes(time.getMinutes() - i);
      return {
        time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        price: stock.price + (Math.random() - 0.5) * 0.1,
        volume: Math.floor(Math.random() * 500) + 100,
        direction: Math.random() > 0.5 ? 'BUY' : 'SELL',
      };
    });
  }, [tradeTicks, stock]);

  // 点击五档价格，跳转到交易页面并填入价格
  const handlePriceClick = (price: number, side: 'BUY' | 'SELL') => {
    if (symbol) {
      navigate(`/client/trade?symbol=${symbol}&price=${price.toFixed(2)}&side=${side}`);
    }
  };

  // 添加/移除自选股
  const toggleWatchlist = async () => {
    if (!stock || !symbol) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('请先登录');
        return;
      }
      
      if (inWatchlist) {
        await supabase.from('watchlist').delete().eq('symbol', symbol).eq('user_id', user.id);
        setInWatchlist(false);
      } else {
        await supabase.from('watchlist').insert({
          user_id: user.id,
          symbol,
          name: stock.name,
        });
        setInWatchlist(true);
      }
    } catch (error) {
      console.error('操作自选股失败:', error);
    }
  };

  // 跳转到交易页面
  const handleTrade = () => {
    if (onTrade && symbol) {
      onTrade(symbol);
    } else {
      navigate(`/client/trade?symbol=${symbol}`);
    }
  };

  // 格式化金额
  const formatAmount = (amount: number): string => {
    if (Math.abs(amount) >= 100000000) {
      return (amount / 100000000).toFixed(2) + '亿';
    }
    if (Math.abs(amount) >= 10000) {
      return (amount / 10000).toFixed(2) + '万';
    }
    return amount.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
        <p className="mt-4 text-[var(--color-text-muted)]">加载中...</p>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg)]">
        <ICONS.AlertCircle className="w-16 h-16 text-[var(--color-text-muted)] mb-4" />
        <p className="text-[var(--color-text-muted)]">未找到股票信息</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white font-bold rounded-xl"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* 顶部导航 */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <StockIcon name={stock.name} logoUrl={stock.logoUrl} size="md" />
            <div>
              <h1 className="text-lg font-black text-[var(--color-text-primary)]">{stock.name}</h1>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">{stock.symbol}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleWatchlist}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              inWatchlist 
                ? 'bg-[var(--color-positive)]/20 text-[var(--color-positive)]' 
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
          <button
            onClick={handleTrade}
            className="px-6 py-2 bg-[var(--color-primary)] text-white font-bold rounded-xl text-sm hover:bg-[var(--color-primary)]/90 transition-colors"
          >
            交易
          </button>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* 价格信息卡片 */}
        <div className="galaxy-card p-6 rounded-2xl border border-[var(--color-border)]">
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-3xl font-bold font-mono ${stock.change >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                {quote?.price.toFixed(2) || stock.price.toFixed(2)}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-sm font-bold ${stock.change >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                  {stock.change >= 0 ? '+' : ''}{quote?.change.toFixed(2) || stock.change.toFixed(2)}
                </span>
                <span className={`text-sm font-bold ${stock.change >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                  {stock.change >= 0 ? '+' : ''}{quote?.changePercent.toFixed(2) || stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-[var(--color-text-muted)] grid grid-cols-2 gap-x-4 gap-y-1">
              <span>今开:</span><span className="text-[var(--color-text-secondary)] font-mono">{quote?.open.toFixed(2) || '-'}</span>
              <span>最高:</span><span className="text-[var(--color-text-secondary)] font-mono">{quote?.high.toFixed(2) || '-'}</span>
              <span>最低:</span><span className="text-[var(--color-text-secondary)] font-mono">{quote?.low.toFixed(2) || '-'}</span>
              <span>昨收:</span><span className="text-[var(--color-text-secondary)] font-mono">{quote?.prevClose.toFixed(2) || '-'}</span>
            </div>
          </div>
          
          {/* 成交量和成交额 */}
          {(quote?.volume || quote?.amount) && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex gap-6 text-xs">
              {quote.volume > 0 && (
                <div>
                  <span className="text-[var(--color-text-muted)]">成交量</span>
                  <span className="ml-2 text-[var(--color-text-primary)] font-bold">{formatAmount(quote.volume)}手</span>
                </div>
              )}
              {quote.amount > 0 && (
                <div>
                  <span className="text-[var(--color-text-muted)]">成交额</span>
                  <span className="ml-2 text-[var(--color-text-primary)] font-bold">{formatAmount(quote.amount)}元</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          {[
            { key: 'chart', label: 'K线图' },
            { key: 'info', label: '公司资料' },
            { key: 'flow', label: '资金流向' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* K线图区域 */}
        {activeTab === 'chart' && (
          <div className="space-y-4">
            <InteractiveChart
              symbol={stock.symbol}
              basePrice={stock.price}
              changePercent={stock.changePercent}
            />
            
            {/* 五档行情和成交明细 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 五档行情 */}
              <div className="galaxy-card p-4 rounded-2xl border border-[var(--color-border)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                    五档行情
                  </h3>
                  {orderBook && <span className="text-[8px] text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded">实时</span>}
                </div>
                <div className="space-y-2">
                  {displayOrderBook.asks.map(ask => (
                    <div 
                      key={`ask-${ask.level}`} 
                      className="flex justify-between items-center py-1 cursor-pointer hover:bg-[var(--color-surface-hover)] rounded transition-colors"
                      onClick={() => handlePriceClick(ask.price, 'SELL')}
                      title="点击卖出"
                    >
                      <span className="text-xs font-bold text-[var(--color-negative)] w-8">卖{ask.level}</span>
                      <span className="text-sm font-mono text-[var(--color-negative)] flex-1 text-center">{ask.price.toFixed(2)}</span>
                      <span className="text-xs font-mono text-[var(--color-text-muted)] w-16 text-right">{ask.volume}</span>
                    </div>
                  ))}
                  <div className="py-2 text-center border-y border-[var(--color-border)]">
                    <span className={`text-lg font-bold font-mono ${stock.change >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                      {quote?.price.toFixed(2) || stock.price.toFixed(2)}
                    </span>
                  </div>
                  {displayOrderBook.bids.map(bid => (
                    <div 
                      key={`bid-${bid.level}`} 
                      className="flex justify-between items-center py-1 cursor-pointer hover:bg-[var(--color-surface-hover)] rounded transition-colors"
                      onClick={() => handlePriceClick(bid.price, 'BUY')}
                      title="点击买入"
                    >
                      <span className="text-xs font-bold text-[var(--color-positive)] w-8">买{bid.level}</span>
                      <span className="text-sm font-mono text-[var(--color-positive)] flex-1 text-center">{bid.price.toFixed(2)}</span>
                      <span className="text-xs font-mono text-[var(--color-text-muted)] w-16 text-right">{bid.volume}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 成交明细 */}
              <div className="galaxy-card p-4 rounded-2xl border border-[var(--color-border)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                    成交明细
                  </h3>
                  {tradeTicks.length > 0 && <span className="text-[8px] text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded">实时</span>}
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {displayTradeTicks.map((record, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 text-xs">
                      <span className="font-mono text-[var(--color-text-muted)]">{record.time}</span>
                      <span className={`font-mono ${record.direction === 'BUY' ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                        {record.price.toFixed(2)}
                      </span>
                      <span className="font-mono text-[var(--color-text-secondary)]">{record.volume}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 公司资料 */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="galaxy-card p-6 rounded-2xl border border-[var(--color-border)]">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">基本信息</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[var(--color-text-muted)]">股票代码</p>
                  <p className="font-mono font-bold text-[var(--color-text-primary)]">{company?.symbol || stock.symbol}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">所属行业</p>
                  <p className="font-bold text-[var(--color-text-primary)]">{company?.industry || '-'}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">所属板块</p>
                  <p className="font-bold text-[var(--color-text-primary)]">{company?.sector || '-'}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">上市日期</p>
                  <p className="font-bold text-[var(--color-text-primary)]">{company?.listingDate || '-'}</p>
                </div>
              </div>
            </div>

            {/* 财务指标 */}
            <div className="galaxy-card p-6 rounded-2xl border border-[var(--color-border)]">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">财务指标</h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center p-4 bg-[var(--color-surface)] rounded-xl">
                  <p className="text-2xl font-bold text-[var(--color-primary)]">{financial?.pe.toFixed(1) || '-'}</p>
                  <p className="text-[var(--color-text-muted)] mt-1">市盈率(PE)</p>
                </div>
                <div className="text-center p-4 bg-[var(--color-surface)] rounded-xl">
                  <p className="text-2xl font-bold text-[var(--color-primary)]">{financial?.pb.toFixed(2) || '-'}</p>
                  <p className="text-[var(--color-text-muted)] mt-1">市净率(PB)</p>
                </div>
                <div className="text-center p-4 bg-[var(--color-surface)] rounded-xl">
                  <p className="text-2xl font-bold text-[var(--color-primary)]">{financial?.dividendYield || '-'}</p>
                  <p className="text-[var(--color-text-muted)] mt-1">股息率</p>
                </div>
              </div>
              
              {(financial?.marketCap || financial?.totalShares) && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-4 text-xs">
                  {financial.marketCap && (
                    <div>
                      <span className="text-[var(--color-text-muted)]">总市值：</span>
                      <span className="text-[var(--color-text-primary)] font-bold">{financial.marketCap}</span>
                    </div>
                  )}
                  {financial.totalShares && (
                    <div>
                      <span className="text-[var(--color-text-muted)]">总股本：</span>
                      <span className="text-[var(--color-text-primary)] font-bold">{financial.totalShares}</span>
                    </div>
                  )}
                  {financial.floatShares && (
                    <div>
                      <span className="text-[var(--color-text-muted)]">流通股：</span>
                      <span className="text-[var(--color-text-primary)] font-bold">{financial.floatShares}</span>
                    </div>
                  )}
                  {financial.roe && (
                    <div>
                      <span className="text-[var(--color-text-muted)]">ROE：</span>
                      <span className="text-[var(--color-text-primary)] font-bold">{financial.roe}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 公司简介 */}
            {company?.description && (
              <div className="galaxy-card p-6 rounded-2xl border border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">公司简介</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {company.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 资金流向 */}
        {activeTab === 'flow' && (
          <div className="space-y-4">
            {moneyFlow ? (
              <>
                {/* 主力资金 */}
                <div className="galaxy-card p-6 rounded-2xl border border-[var(--color-border)]">
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">主力资金</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-xl bg-[var(--color-surface)]">
                      <p className={`text-2xl font-bold ${moneyFlow.mainNetInflow >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                        {moneyFlow.mainNetInflow >= 0 ? '+' : ''}{formatAmount(moneyFlow.mainNetInflow)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">主力净流入</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-[var(--color-surface)]">
                      <p className={`text-2xl font-bold ${moneyFlow.retailNetInflow >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                        {moneyFlow.retailNetInflow >= 0 ? '+' : ''}{formatAmount(moneyFlow.retailNetInflow)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">散户净流入</p>
                    </div>
                  </div>
                </div>

                {/* 详细资金流向 */}
                <div className="galaxy-card p-6 rounded-2xl border border-[var(--color-border)]">
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">资金流向详情</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-muted)]">超大单</span>
                      <span className={`font-mono font-bold ${moneyFlow.superLargeNetInflow >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                        {moneyFlow.superLargeNetInflow >= 0 ? '+' : ''}{formatAmount(moneyFlow.superLargeNetInflow)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-muted)]">大单</span>
                      <span className={`font-mono font-bold ${moneyFlow.largeNetInflow >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                        {moneyFlow.largeNetInflow >= 0 ? '+' : ''}{formatAmount(moneyFlow.largeNetInflow)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-muted)]">中单</span>
                      <span className={`font-mono font-bold ${moneyFlow.mediumNetInflow >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                        {moneyFlow.mediumNetInflow >= 0 ? '+' : ''}{formatAmount(moneyFlow.mediumNetInflow)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-[var(--color-text-muted)]">小单</span>
                      <span className={`font-mono font-bold ${moneyFlow.smallNetInflow >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                        {moneyFlow.smallNetInflow >= 0 ? '+' : ''}{formatAmount(moneyFlow.smallNetInflow)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="galaxy-card p-8 rounded-2xl border border-[var(--color-border)] text-center">
                <ICONS.AlertCircle className="w-12 h-12 mx-auto mb-2 text-[var(--color-text-muted)] opacity-30" />
                <p className="text-[var(--color-text-muted)]">暂无资金流向数据</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部交易按钮 */}
      <div className="sticky bottom-0 p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/client/trade?symbol=${symbol}&side=SELL`)}
            className="flex-1 py-4 rounded-2xl bg-[var(--color-negative)] text-white font-bold text-sm tracking-wider shadow-lg"
          >
            卖出
          </button>
          <button
            onClick={() => navigate(`/client/trade?symbol=${symbol}&side=BUY`)}
            className="flex-1 py-4 rounded-2xl bg-[var(--color-positive)] text-white font-bold text-sm tracking-wider shadow-lg"
          >
            买入
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailView;
