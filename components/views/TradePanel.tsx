import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TradeType, UserAccount, Stock } from '../../lib/types';
import { IPOData } from '../../services/adapters/sinaIPOAdapter';
import { marketApi } from '../../services/marketApi';

// ===================== 【必看】组件导入容错 =====================
// 如果ICONS/StockIcon报错，直接注释掉对应行，代码会自动降级显示
import { ICONS } from '../../lib/constants';
import StockIcon from '../shared/StockIcon';
// 降级兜底：如果导入失败，使用默认占位
const SafeIcon = ICONS || {
  ArrowRight: () => <span>→</span>,
  Calendar: () => <span>📅</span>,
  TrendingUp: () => <span>📈</span>,
  Plus: () => <span>+</span>,
};
const SafeStockIcon = StockIcon || (({ name }: { name: string }) => (
  <div className="w-10 h-10 rounded-full bg-[#00D4AA]/10 flex items-center justify-center text-[#00D4AA] font-black">
    {name.slice(0, 2)}
  </div>
));

// ===================== 新股申购数据适配器 =====================
// TradePanel 期望的中文字段接口
interface TradeIPOData {
  证券代码: string;
  申购代码: string;
  证券简称: string;
  发行价格: number;
  市盈率?: number;
  个人申购上限: number;
  市场: string; // SH: 上海, SZ: 深圳
  状态: 'ONGOING' | 'UPCOMING' | 'LISTED' | 'CANCELLED'; // 申购状态
  申购日期?: string; // 申购日期
  上市日期?: string; // 上市日期
}

/**
 * 根据股票代码判断申购单位
 * - 沪市主板（60开头）：1000股
 * - 深市主板（00开头）：500股
 * - 创业板（30开头）：500股
 * - 科创板（688开头）：500股
 */
function getIPOUnit(symbol: string): number {
  if (symbol.startsWith('688')) return 500; // 科创板
  if (symbol.startsWith('60')) return 1000; // 沪市主板
  if (symbol.startsWith('00') || symbol.startsWith('30')) return 500; // 深市主板、创业板
  return 500; // 默认
}

/**
 * 判断新股是否可申购
 * - ONGOING: 申购中，可申购
 * - UPCOMING: 待申购，不可申购
 * - LISTED: 已上市，不可申购
 * - CANCELLED: 已取消，不可申购
 */
function canSubscribe(status: string): boolean {
  return status === 'ONGOING';
}

// 适配器函数：将数据库返回的数据转换为 TradePanel 期望的格式
function convertIpoData(ipoList: any[]): TradeIPOData[] {
  return ipoList.map(ipo => ({
    证券代码: ipo.symbol,
    申购代码: ipo.subscription_code || ipo.symbol,
    证券简称: ipo.name,
    发行价格: ipo.ipo_price || 0,
    市盈率: ipo.pe_ratio || undefined,
    个人申购上限: Math.floor(1000000 / (ipo.ipo_price || 1)), // 临时计算
    市场: ipo.market || 'SZ',
    状态: ipo.status || 'UPCOMING',
    申购日期: ipo.issue_date,
    上市日期: ipo.listing_date,
  }));
}

// ===================== 常量配置 =====================
const TRADE_MODES = [
  { key: 'A股', label: 'A股', market: 'CN', type: 'normal' },
  { key: '港股', label: '港股', market: 'HK', type: 'normal' },
  { key: '新股申购', label: '新股申购', type: 'ipo' },
  { key: '大宗交易', label: '大宗交易', type: 'block' },
  { key: '涨停打板', label: '涨停打板', type: 'limitUp' },
] as const;

type TradeModeKey = typeof TRADE_MODES[number]['key'];



// ===================== 组件Props =====================
interface TradePanelProps {
  account: UserAccount | null;
  onExecute: (type: TradeType, symbol: string, name: string, price: number, quantity: number, logoUrl?: string, marketType?: string) => Promise<boolean>;
  initialStock?: Stock | null;
}

// ===================== 主组件 =====================
const TradePanel: React.FC<TradePanelProps> = React.memo(({ account, onExecute, initialStock }) => {
  // ===================== URL参数处理 =====================
  const [searchParams] = useSearchParams();
  const modeFromUrl = searchParams.get('mode');
  const symbolFromUrl = searchParams.get('symbol');
  const priceFromUrl = searchParams.get('price');
  const sideFromUrl = searchParams.get('side');
  
  // ===================== 核心状态 =====================
  const [currentMode, setCurrentMode] = useState<TradeModeKey>(() => {
    // 如果 URL 中有 mode 参数，尝试匹配
    if (modeFromUrl === 'limitUp') return '涨停打板';
    return 'A股';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- 普通交易（A股/港股）状态 ---
  const [selectedStock, setSelectedStock] = useState<Stock>(() => 
    initialStock || {
      symbol: '600519',
      name: '贵州茅台',
      price: 1750.00,
      change: 15.00,
      changePercent: 0.87,
      market: 'CN',
      sparkline: []
    }
  );
  
  // --- 五档盘口状态（真实数据）---
  const [orderBookData, setOrderBookData] = useState<{ asks: { price: number; volume: number }[]; bids: { price: number; volume: number }[] } | null>(null);
  
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>(() => {
    if (sideFromUrl === 'SELL') return 'SELL';
    return 'BUY';
  });
  const [price, setPrice] = useState(() => {
    if (priceFromUrl) return priceFromUrl;
    return '1750.00'; // 默认价格，会在股票加载后更新
  });
  const [quantity, setQuantity] = useState('');
  const [stockList, setStockList] = useState<Stock[]>([]);
  const [showStockSelector, setShowStockSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- 新股申购状态 ---
  const [ipoList, setIpoList] = useState<TradeIPOData[]>([]);
  const [ipoLoading, setIpoLoading] = useState(false);
  const [selectedIpo, setSelectedIpo] = useState<TradeIPOData | null>(null);

  // --- 大宗交易状态 ---
  const [blockDiscount, setBlockDiscount] = useState(0.9);
  const [blockQuantity, setBlockQuantity] = useState('');

  // --- 涨停打板状态 ---
  const [limitUpList, setLimitUpList] = useState<Stock[]>([]);
  const [limitUpLoading, setLimitUpLoading] = useState(false);

  // ===================== 【关键】防无限循环控制 =====================
  const initRef = useRef({
    normalLoaded: false,
    ipoLoaded: false,
    limitUpLoaded: false,
    urlSymbolLoaded: false, // 追踪URL股票是否已加载
  });
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // ===================== 账户为空时的默认值 =====================
  const safeAccount = account || {
    balance: 0,
    holdings: [],
    transactions: [],
    conditionalOrders: [],
  };

  // ===================== 通用计算 =====================
  // 当前持仓
  const currentHolding = useMemo(() => 
    safeAccount.holdings.find(h => h.symbol === selectedStock.symbol),
  [safeAccount.holdings, selectedStock.symbol]);

  // 最大可交易数量
  const maxTradeQty = useMemo(() => {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return 0;
    // 卖出：取可用持仓
    if (tradeSide === 'SELL') return currentHolding?.availableQuantity || 0;
    // 买入：取可用资金可买数量
    return Math.floor(safeAccount.balance / p);
  }, [price, tradeSide, safeAccount.balance, currentHolding]);

  // ===================== 预估成交金额 =====================
  const estimatedAmount = useMemo(() => {
    const qty = parseInt(quantity) || 0;
    const p = parseFloat(price) || 0;
    return (qty * p).toLocaleString();
  }, [quantity, price]);

  // ===================== 条件单列表 =====================
  const activeConditionalOrders = useMemo(() => 
    safeAccount.conditionalOrders.filter(o => o.status === 'ACTIVE' || o.status === 'RUNNING'),
  [safeAccount.conditionalOrders]);

  // ===================== 获取五档盘口数据 =====================
  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        const market = selectedStock.symbol.length === 5 ? 'HK' : 'CN';
        const data = await marketApi.getOrderBook(selectedStock.symbol, market);
        if (data) {
          setOrderBookData(data);
        }
      } catch (error) {
        console.warn('获取五档数据失败:', error);
      }
    };
    
    fetchOrderBook();
    
    // 每5秒刷新一次五档数据
    const interval = setInterval(fetchOrderBook, 5000);
    return () => clearInterval(interval);
  }, [selectedStock.symbol]);

  // 盘口数据（优先真实数据，无数据时使用模拟）
  const orderBook = useMemo(() => {
    if (orderBookData) {
      return {
        asks: orderBookData.asks.map((item, index) => ({
          level: 5 - index,
          price: item.price,
          volume: item.volume,
        })).slice(0, 5),
        bids: orderBookData.bids.map((item, index) => ({
          level: index + 1,
          price: item.price,
          volume: item.volume,
        })).slice(0, 5),
      };
    }
    
    // 无真实数据时使用模拟数据
    const basePrice = selectedStock.price;
    return {
      asks: Array.from({ length: 5 }, (_, i) => {
        const level = 5 - i;
        return { level, price: basePrice + level * 0.05, volume: Math.floor(Math.random() * 1000) + 100 };
      }),
      bids: Array.from({ length: 5 }, (_, i) => {
        const level = i + 1;
        return { level, price: basePrice - level * 0.05, volume: Math.floor(Math.random() * 1000) + 100 };
      }),
    };
  }, [orderBookData, selectedStock.price]);

  // 过滤股票列表
  const filteredStockList = useMemo(() => {
    if (!searchTerm) return stockList;
    return stockList.filter(s => 
      s.name.includes(searchTerm) || s.symbol.includes(searchTerm)
    );
  }, [searchTerm, stockList]);

  // ===================== 接口方法（useCallback包裹，稳定无循环）=====================
  // 加载市场股票列表
  const loadMarketList = useCallback(async (market: 'CN' | 'HK') => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { getMarketList } = await import('../../services/marketService');
      const data = await getMarketList(market);
      // 处理返回结果（可能是数组或分页对象）
      const stocks = Array.isArray(data) ? data : (data as any).stocks || [];
      if (stocks && stocks.length > 0) {
        setStockList(stocks);
        // 仅无初始股票时设置默认值
        if (!initialStock) {
          setSelectedStock(stocks[0]);
          setPrice(stocks[0].price.toString());
        }
      }
    } catch (err) {
      console.error(`加载${market}股票列表失败:`, err);
      setErrorMsg(`加载${market}市场数据失败`);
    } finally {
      setLoading(false);
    }
  }, [initialStock]);

  // 加载新股列表
  const loadIpoList = useCallback(async () => {
    if (initRef.current.ipoLoaded) return;
    try {
      setIpoLoading(true);
      // 使用 ipoService 从数据库获取数据
      const { getIPOList } = await import('../../services/ipoService');
      // 获取申购中和待申购的新股
      const [ongoingData, upcomingData] = await Promise.all([
        getIPOList('ONGOING'),
        getIPOList('UPCOMING'),
      ]);
      const data = [...ongoingData, ...upcomingData];
      // 转换为 TradePanel 期望的格式
      const convertedData = convertIpoData(data);
      setIpoList(convertedData);
      if (convertedData.length > 0) setSelectedIpo(convertedData[0]);
      initRef.current.ipoLoaded = true;
    } catch (err) {
      console.error('加载新股列表失败:', err);
    } finally {
      setIpoLoading(false);
    }
  }, []);

  // 加载涨停个股列表
  const loadLimitUpList = useCallback(async () => {
    if (initRef.current.limitUpLoaded) return;
    try {
      setLimitUpLoading(true);
      // 直接使用 limitUpService 获取涨停数据
      const { getLimitUpList } = await import('../../services/limitUpService');
      const limitUpData = await getLimitUpList();
      
      // 转换数据格式为 Stock 类型
      const limitUpStocks = limitUpData.map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        price: item.currentPrice || item.price,
        change: item.change || 0,
        changePercent: item.changePercent || item.change_percent || 0,
        market: item.market === 'SH' ? 'CN' : item.market === 'SZ' ? 'CN' : item.market,
        sparkline: []
      })).filter((stock: any) => stock.changePercent >= 9.5); // 涨停股：涨幅>=9.5%（主板10%，创业板/科创板20%）
      
      setLimitUpList(limitUpStocks);
      initRef.current.limitUpLoaded = true;
    } catch (err) {
      console.error('加载涨停个股失败:', err);
    } finally {
      setLimitUpLoading(false);
    }
  }, []);

  // 交易输入验证
  const validateTradeInput = (price: number, quantity: number, tradeType: TradeType, symbol?: string) => {
    const errors: string[] = [];
    
    // 基础数值验证
    if (price <= 0) {
      errors.push('价格必须大于0');
    }
    
    if (quantity <= 0) {
      errors.push('数量必须大于0');
    }
    
    // 数值范围验证
    if (price > 999999) {
      errors.push('价格超出合理范围（最大999999）');
    }
    
    if (quantity > 1000000) {
      errors.push('数量超出合理范围（最大1000000）');
    }
    
    // 整数验证（股票数量）
    if (quantity % 1 !== 0) {
      errors.push('交易数量必须为整数');
    }
    
    // 交易类型特定验证
    if (tradeType === TradeType.IPO) {
      // 新股申购验证 - 只检查最小申购单位，不需要整数倍
      // 实际申购：中签即全仓配额，无需额外限制
      const unit = symbol ? getIPOUnit(symbol) : 500; // 默认500股
      const marketName = symbol?.startsWith('60') ? '沪市主板' : 
                         symbol?.startsWith('688') ? '科创板' :
                         symbol?.startsWith('00') ? '深市主板' :
                         symbol?.startsWith('30') ? '创业板' : '市场';
      
      if (quantity < unit) {
        errors.push(`${marketName}新股申购数量不得少于${unit}股`);
      }
      // 移除整数倍验证 - 新股申购按实际配额，无需整数倍限制
    } else if (tradeType === TradeType.BLOCK) {
      // 大宗交易验证
      if (quantity < 100000) {
        errors.push('大宗交易数量不得少于10万股');
      }
    } else if (tradeType === TradeType.LIMIT_UP) {
      // 涨停打板验证
      if (quantity < 100) {
        errors.push('涨停打板数量不得少于100股');
      }
    }
    
    // 金额验证
    const totalAmount = price * quantity;
    if (totalAmount > 10000000) {
      errors.push('交易金额超出单笔限制（最大1000万）');
    }
    
    // 恶意输入检测
    if (price.toString().includes('e') || quantity.toString().includes('e')) {
      errors.push('检测到异常数值格式');
    }
    
    return errors;
  };

  // 通用交易执行
  const handleTrade = useCallback(async (
    tradeType: TradeType,
    symbol: string,
    name: string,
    price: number,
    quantity: number,
    logoUrl?: string
  ) => {
    // 输入验证 - 传入 symbol 用于判断申购单位
    const validationErrors = validateTradeInput(price, quantity, tradeType, symbol);
    if (validationErrors.length > 0) {
      alert(`输入验证失败: ${validationErrors.join(', ')}`);
      return false;
    }
    
    if (quantity <= 0 || price <= 0) {
      alert('请输入有效的价格和数量');
      return false;
    }
    
    // 额外验证：检查交易金额是否超过账户余额
    const totalAmount = price * quantity;
    if (tradeType === TradeType.BUY && totalAmount > safeAccount.balance) {
      alert('交易金额超出可用资金');
      return false;
    }
    
    // 根据当前模式确定市场类型
    const marketType = currentMode === '港股' ? 'HK_SHARE' : 'A_SHARE';
    
    setIsSubmitting(true);
    try {
      const { validateTradeRisk } = await import('../../services/marketService');
      const riskValidation = await validateTradeRisk(name, totalAmount);
      
      if (!riskValidation.isAppropriate) {
        const confirm = window.confirm(`${riskValidation.riskWarning}\n\n是否继续交易？`);
        if (!confirm) {
          return false;
        }
      }
      
      const success = await onExecute(tradeType, symbol, name, price, quantity, logoUrl, marketType);
      if (success) {
        setQuantity('');
        setBlockQuantity('');
        alert('交易委托已提交，可在持仓中查看进度');
      }
      return success;
    } catch (err) {
      console.error('交易执行失败:', err);
      alert('交易执行失败，请重试');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [onExecute, safeAccount.balance, currentMode]);

  // ===================== 生命周期控制（无循环）=====================
  // 模式切换时加载对应数据
  useEffect(() => {
    // 重置状态
    setErrorMsg(null);
    setQuantity('');
    setBlockQuantity('');

    // 按模式加载数据
    switch (currentMode) {
      case 'A股':
        loadMarketList('CN');
        break;
      case '港股':
        loadMarketList('HK');
        break;
      case '新股申购':
        loadIpoList();
        break;
      case '涨停打板':
        loadLimitUpList();
        break;
    }
  }, [currentMode, loadMarketList, loadIpoList, loadLimitUpList]);

  // 股票切换时同步价格（仅当没有URL价格参数时）
  useEffect(() => {
    // 如果URL中有价格参数，优先使用URL价格
    if (!priceFromUrl) {
      setPrice(selectedStock.price.toString());
    }
  }, [selectedStock, priceFromUrl]);

  // 当股票列表加载完成后，根据URL参数选择股票（作为备选方案）
  useEffect(() => {
    if (symbolFromUrl && stockList.length > 0) {
      const stockFromUrl = stockList.find(s => s.symbol === symbolFromUrl);
      if (stockFromUrl) {
        setSelectedStock(stockFromUrl);
        // 如果URL中有价格，使用URL价格；否则使用股票当前价格
        if (priceFromUrl) {
          setPrice(priceFromUrl);
        } else {
          setPrice(stockFromUrl.price.toString());
        }
      }
    }
  }, [symbolFromUrl, stockList, priceFromUrl]);

  // 【核心修复】URL参数中有股票代码时，直接获取该股票数据
  useEffect(() => {
    if (!symbolFromUrl) return;
    
    // 使用ref追踪是否已加载，避免重复加载和依赖警告
    if (initRef.current.urlSymbolLoaded) return;
    
    const fetchStockFromUrl = async () => {
      try {
        setLoading(true);
        const { getRealtimeStock } = await import('../../services/marketService');
        // 根据股票代码判断市场：A股6位，港股5位
        const market = symbolFromUrl.length === 5 ? 'HK' : 'CN';
        const stock = await getRealtimeStock(symbolFromUrl, market);
        
        if (stock) {
          setSelectedStock(stock);
          // 如果URL中有价格，使用URL价格；否则使用股票当前价格
          if (priceFromUrl) {
            setPrice(priceFromUrl);
          } else {
            setPrice(stock.price.toString());
          }
          initRef.current.urlSymbolLoaded = true;
        }
      } catch (error) {
        console.error('从URL参数加载股票失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStockFromUrl();
  }, [symbolFromUrl, priceFromUrl]); // 只依赖 symbolFromUrl 和 priceFromUrl

  // 组件挂载仅执行一次初始化
  useEffect(() => {
    loadMarketList('CN');
    return () => {
      initRef.current = { normalLoaded: false, ipoLoaded: false, limitUpLoaded: false, urlSymbolLoaded: false };
    };
  }, [loadMarketList]);

  // ===================== 分模式渲染 =====================
  // 1. A股/港股普通交易渲染
  const renderNormalTrade = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
      {/* 左侧交易区 */}
      <div className="md:col-span-8 flex flex-col gap-6">
        {/* 标的选择 */}
        <div 
          onClick={() => setShowStockSelector(true)}
          className="galaxy-card p-6 flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)] transition-all"
        >
          <div className="flex items-center gap-6">
            <SafeStockIcon name={selectedStock.name} logoUrl={selectedStock.logoUrl} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedStock.name}</h4>
                <SafeIcon.ArrowRight size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] font-mono font-medium">{selectedStock.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">可用资金</p>
            <p className="text-2xl font-bold font-mono text-[var(--color-primary)]">¥{safeAccount.balance.toLocaleString()}</p>
          </div>
        </div>

        {/* 买卖方向切换 */}
        <div className="flex gap-2 bg-[var(--color-bg)] p-1.5 rounded-xl border border-[var(--color-border)]">
          <button 
            onClick={() => setTradeSide('BUY')} 
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
              tradeSide === 'BUY' ? 'bg-[var(--color-positive)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            买入
          </button>
          <button 
            onClick={() => setTradeSide('SELL')} 
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
              tradeSide === 'SELL' ? 'bg-[var(--color-negative)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            卖出
          </button>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
            <p className="text-sm text-red-500 font-black">{errorMsg}</p>
          </div>
        )}

        {/* 价格/数量输入 */}
        <div className="galaxy-card p-6 rounded-xl flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--color-text-muted)] px-2">
                委托价格 (CNY)
              </label>
              <div className="flex items-center bg-[var(--color-bg)] h-12 rounded-lg border border-[var(--color-border)] px-4 focus-within:border-[var(--color-primary)] transition-all">
                <input 
                  type="number" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  className="flex-1 bg-transparent text-lg font-bold font-mono text-[var(--color-text-primary)] outline-none" 
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between px-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">委托数量 (股)</label>
                <span className="text-xs font-medium text-[var(--color-primary)]">最大: {maxTradeQty.toLocaleString()}</span>
              </div>
              <div className="flex items-center bg-[var(--color-bg)] h-12 rounded-lg border border-[var(--color-border)] px-4 focus-within:border-[var(--color-primary)] transition-all">
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  className="flex-1 bg-transparent text-lg font-bold font-mono text-[var(--color-text-primary)] outline-none" 
                  placeholder="0"
                  min="100"
                  step="100"
                />
              </div>
            </div>
          </div>

          {/* 快捷仓位按钮 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '1/4', ratio: 0.25 },
              { label: '半仓', ratio: 0.5 },
              { label: '3/4', ratio: 0.75 },
              { label: '全仓', ratio: 1 },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => setQuantity(Math.floor(maxTradeQty * btn.ratio).toString())}
                className="py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-medium hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 预估金额 */}
          <div className="p-4 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)]">预估成交金额</p>
              <p className="text-2xl font-bold font-mono text-[var(--color-primary)] mt-1">¥{estimatedAmount}</p>
            </div>
          </div>

          {/* 交易按钮 */}
          <button 
            onClick={() => {
              const qty = parseInt(quantity) || 0;
              const p = parseFloat(price) || 0;
              
              if (qty <= 0 || p <= 0) {
                alert('请输入有效的价格和数量');
                return;
              }
              
              if (tradeSide === 'BUY') {
                const totalAmount = p * qty;
                if (totalAmount > safeAccount.balance) {
                  alert('交易金额超出可用资金');
                  return;
                }
              } else if (tradeSide === 'SELL') {
                if (!currentHolding || qty > currentHolding.availableQuantity) {
                  alert('卖出数量超出可用持仓');
                  return;
                }
              }
              
              handleTrade(
                tradeSide === 'BUY' ? TradeType.BUY : TradeType.SELL,
                selectedStock.symbol,
                selectedStock.name,
                p,
                qty
              );
            }}
            disabled={isSubmitting || !quantity || parseInt(quantity) <= 0}
            className={`w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              tradeSide === 'BUY' 
                ? 'bg-[var(--color-positive)] text-white hover:opacity-90' 
                : 'bg-[var(--color-negative)] text-white hover:opacity-90'
            }`}
          >
            {isSubmitting ? '提交中...' : `确认${tradeSide === 'BUY' ? '买入' : '卖出'}`}
          </button>
        </div>
      </div>

      {/* 右侧五档盘口 */}
      <div className="md:col-span-4 flex flex-col">
        <div className="galaxy-card p-6 rounded-xl flex-1 h-full">
          <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between items-center text-xs font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-3">
              <span>盘口五档</span>
              <span>价格 / 量</span>
            </div>
            
            {/* 卖盘 */}
            <div className="space-y-1">
              {orderBook.asks.map(ask => (
                <div key={`ask-${ask.level}`} className="flex justify-between items-center py-1.5 px-3 rounded-lg hover:bg-[var(--color-negative)]/10 cursor-pointer" onClick={() => setPrice(ask.price.toFixed(2))}>
                  <span className="text-xs font-medium text-[var(--color-negative)] opacity-70 w-8">卖{ask.level}</span>
                  <span className="text-sm font-mono font-medium text-[var(--color-negative)] flex-1 text-center">{ask.price.toFixed(2)}</span>
                  <span className="text-xs font-mono text-[var(--color-text-muted)] w-12 text-right">{ask.volume}</span>
                </div>
              ))}
            </div>

            {/* 最新价 */}
            <div className="py-4 px-3 flex flex-col items-center bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
              <span className="text-xs font-medium text-[var(--color-text-muted)] mb-1">最新价</span>
              <span className="text-xl font-bold font-mono text-[var(--color-text-primary)]">
                {selectedStock.price.toFixed(2)}
              </span>
              <span className={`text-xs font-medium mt-1 ${selectedStock.change >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change} ({selectedStock.changePercent}%)
              </span>
            </div>

            {/* 买盘 */}
            <div className="space-y-1">
              {orderBook.bids.map(bid => (
                <div key={`bid-${bid.level}`} className="flex justify-between items-center py-1.5 px-3 rounded-lg hover:bg-[var(--color-positive)]/10 cursor-pointer" onClick={() => setPrice(bid.price.toFixed(2))}>
                  <span className="text-xs font-medium text-[var(--color-positive)] opacity-70 w-8">买{bid.level}</span>
                  <span className="text-sm font-mono font-medium text-[var(--color-positive)] flex-1 text-center">{bid.price.toFixed(2)}</span>
                  <span className="text-xs font-mono text-[var(--color-text-muted)] w-12 text-right">{bid.volume}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. 新股申购渲染（严格匹配新浪数据）
  const renderIpoTrade = () => (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">今日可申购新股</h3>
        <span className="text-xs text-[var(--color-text-muted)] font-medium">
          申购日期：{today} | T日申购 | T+1日配号 | T+2日中签
        </span>
      </div>

      {ipoLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      ) : ipoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
          <SafeIcon.Calendar size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">今日暂无可申购新股</p>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">证券简称</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">证券代码</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">申购代码</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">发行价格</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">发行市盈率</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">申购上限(万股)</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">状态</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {ipoList.map(ipo => {
                // 判断是否可申购
                const canApply = canSubscribe(ipo.状态);
                // 获取申购单位
                const unit = getIPOUnit(ipo.证券代码);
                // 计算市场名称
                const marketName = ipo.证券代码.startsWith('60') ? '沪市主板' : 
                                   ipo.证券代码.startsWith('688') ? '科创板' :
                                   ipo.证券代码.startsWith('00') ? '深市主板' :
                                   ipo.证券代码.startsWith('30') ? '创业板' : ipo.市场;
                
                return (
                <tr 
                  key={ipo.证券代码} 
                  className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-all ${
                    selectedIpo?.证券代码 === ipo.证券代码 ? 'bg-[#00D4AA]/5' : ''
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <SafeStockIcon name={ipo.证券简称} size="md" />
                      <div>
                        <p className="text-base font-medium text-[var(--color-text-primary)] truncate max-w-[120px]">{ipo.证券简称}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{marketName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-sm">{ipo.证券代码}</td>
                  <td className="py-4 px-4 text-center font-mono text-sm font-medium text-[var(--color-primary)]">{ipo.申购代码}</td>
                  <td className="py-4 px-4 text-center font-mono text-sm font-medium">¥{ipo.发行价格?.toFixed(2) || '-'}</td>
                  <td className="py-4 px-4 text-center font-mono text-sm">{ipo.市盈率?.toFixed(2) || '-'}</td>
                  <td className="py-4 px-4 text-center font-mono text-sm">{ipo.个人申购上限 || '-'}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      ipo.状态 === 'ONGOING' ? 'bg-green-500/20 text-green-400' :
                      ipo.状态 === 'UPCOMING' ? 'bg-yellow-500/20 text-yellow-400' :
                      ipo.状态 === 'LISTED' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {ipo.状态 === 'ONGOING' ? '申购中' :
                       ipo.状态 === 'UPCOMING' ? '待申购' :
                       ipo.状态 === 'LISTED' ? '已上市' : '已取消'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="w-32 mx-auto">
                      <button 
                        onClick={() => {
                          // 检查状态
                          if (!canSubscribe(ipo.状态)) {
                            alert(`新股 ${ipo.证券简称} 当前状态不可申购（${ipo.状态 === 'UPCOMING' ? '待申购' : ipo.状态}）`);
                            return;
                          }
                          
                          // 计算实际申购数量，使用正确的申购单位
                          const maxQtyByFund = Math.floor(safeAccount.balance / ipo.发行价格);
                          // 向下取整到申购单位的整数倍
                          const maxQtyByUnit = Math.floor(maxQtyByFund / unit) * unit;
                          const actualQuantity = Math.min(ipo.个人申购上限 * 10000, maxQtyByUnit);
                          
                          if (actualQuantity < unit) {
                            alert(`可用资金不足，${marketName}最低申购${unit}股`);
                            return;
                          }
                          
                          handleTrade(
                            TradeType.IPO,
                            ipo.证券代码,
                            ipo.证券简称,
                            ipo.发行价格,
                            actualQuantity
                          );
                        }}
                        disabled={isSubmitting || !canApply}
                        className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                          canApply 
                            ? 'bg-[var(--color-primary)] text-white hover:opacity-90' 
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
                        } disabled:opacity-50`}
                      >
                        {isSubmitting && selectedIpo?.证券代码 === ipo.证券代码 ? '提交中' : 
                         canApply ? '一键申购' : 
                         ipo.状态 === 'UPCOMING' ? '待开放' : '不可申购'}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // 3. 大宗交易渲染
  const renderBlockTrade = () => {
    const blockPrice = selectedStock.price * blockDiscount;
    const minQuantity = 300000;
    const maxQty = Math.floor(safeAccount.balance / blockPrice);

    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* 标的选择 */}
          <div 
            onClick={() => setShowStockSelector(true)}
            className="galaxy-card p-6 flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)] transition-all"
          >
            <div className="flex items-center gap-6">
              <SafeStockIcon name={selectedStock.name} logoUrl={selectedStock.logoUrl} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedStock.name}</h4>
                  <SafeIcon.ArrowRight size={14} className="text-[var(--color-text-muted)]" />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] font-mono font-medium">{selectedStock.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">二级市场现价</p>
              <p className="text-xl font-bold font-mono text-[var(--color-text-primary)]">¥{selectedStock.price.toFixed(2)}</p>
            </div>
          </div>

          <div className="galaxy-card p-6 rounded-xl flex flex-col gap-6">
            {/* 折价率设置 */}
            <div className="space-y-2">
              <div className="flex justify-between px-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">折价率</label>
                <span className="text-xs font-medium text-[var(--color-primary)]">{(blockDiscount * 100).toFixed(1)}%</span>
              </div>
              <input 
                type="range" 
                min="0.7" 
                max="0.99" 
                step="0.01" 
                value={blockDiscount} 
                onChange={(e) => setBlockDiscount(parseFloat(e.target.value))} 
                className="w-full h-2 bg-[var(--color-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
              />
              <div className="flex justify-between text-xs text-[var(--color-text-muted)] font-medium px-2">
                <span>7折</span>
                <span>9折</span>
                <span>平价</span>
              </div>
            </div>

            {/* 价格/数量 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)] px-2">
                  大宗交易成交价
                </label>
                <div className="flex items-center bg-[var(--color-bg)] h-12 rounded-lg border border-[var(--color-border)] px-4">
                  <input 
                    type="number" 
                    disabled 
                    value={blockPrice.toFixed(2)} 
                    className="flex-1 bg-transparent text-lg font-bold font-mono text-[var(--color-text-primary)] outline-none opacity-70" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between px-2">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">申报数量 (股)</label>
                  <span className="text-xs font-medium text-[var(--color-warning)]">最低: 30万股</span>
                </div>
                <div className="flex items-center bg-[var(--color-bg)] h-12 rounded-lg border border-[var(--color-border)] px-4 focus-within:border-[var(--color-primary)] transition-all">
                  <input 
                    type="number" 
                    value={blockQuantity} 
                    onChange={(e) => setBlockQuantity(e.target.value)} 
                    className="flex-1 bg-transparent text-lg font-bold font-mono text-[var(--color-text-primary)] outline-none" 
                    placeholder="≥300000"
                    min={minQuantity}
                  />
                </div>
              </div>
            </div>

            {/* 交易规则提示 */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 font-medium leading-relaxed">
                ⚠️ 大宗交易规则：A股单笔申报数量不低于30万股，或交易金额不低于200万元人民币，申报时间为交易日9:30-15:30，收盘后统一撮合。
              </p>
            </div>

            {/* 预估金额 */}
            <div className="p-4 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)]">预估交易总金额</p>
                <p className="text-2xl font-bold font-mono text-[var(--color-primary)] mt-1">
                  ¥{(blockPrice * (parseInt(blockQuantity) || 0)).toLocaleString()}
                </p>
              </div>
            </div>

            {/* 提交按钮 */}
            <button 
              onClick={() => {
                const qty = parseInt(blockQuantity) || 0;
                
                if (qty < minQuantity) {
                  alert(`大宗交易数量不得少于${minQuantity}股`);
                  return;
                }
                
                const totalAmount = blockPrice * qty;
                if (totalAmount > safeAccount.balance) {
                  alert('交易金额超出可用资金');
                  return;
                }
                
                handleTrade(
                  TradeType.BLOCK,
                  selectedStock.symbol,
                  selectedStock.name,
                  blockPrice,
                  qty
                );
              }}
              disabled={isSubmitting || (parseInt(blockQuantity) || 0) < minQuantity}
              className="w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] bg-[var(--color-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '提交中...' : '确认大宗交易申报'}
            </button>
          </div>
        </div>

        {/* 右侧信息栏 */}
        <div className="md:col-span-4 flex flex-col">
          <div className="galaxy-card p-6 rounded-xl flex-1 h-full">
            <h4 className="text-sm font-bold mb-4 text-center text-[var(--color-text-primary)]">大宗交易信息</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-medium">标的证券</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[150px]">{selectedStock.name}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-medium">证券代码</span>
                <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">{selectedStock.symbol}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-medium">二级市场现价</span>
                <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">¥{selectedStock.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-medium">折价率</span>
                <span className="text-sm font-medium text-[var(--color-primary)]">{((1 - blockDiscount) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-medium">大宗成交价</span>
                <span className="text-sm font-mono font-medium text-[var(--color-primary)]">¥{blockPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-muted)] font-medium">最大可买</span>
                <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">{maxQty.toLocaleString()}股</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. 涨停打板渲染
  const renderLimitUpTrade = () => (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">今日涨停个股</h3>
        <span className="text-xs text-[var(--color-text-muted)] font-medium">按涨停价委托，进入排单队列</span>
      </div>

      {limitUpLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-positive)]"></div>
        </div>
      ) : limitUpList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
          <SafeIcon.TrendingUp size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">暂无涨停个股数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto no-scrollbar">
          {limitUpList.map(stock => {
            const limitUpPrice = stock.price;
            const maxQty = Math.floor(safeAccount.balance / limitUpPrice);
            return (
              <div 
                key={stock.symbol} 
                className="galaxy-card p-5 rounded-xl border border-[var(--color-positive)]/30 hover:border-[var(--color-positive)] transition-all"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* 个股信息 */}
                  <div className="col-span-3 flex items-center gap-3">
                    <SafeStockIcon name={stock.name} logoUrl={stock.logoUrl} size="md" />
                    <div>
                      <h4 className="text-base font-bold text-[var(--color-text-primary)] truncate">{stock.name}</h4>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono">{stock.symbol}</p>
                    </div>
                  </div>

                  {/* 涨停信息 */}
                  <div className="col-span-2 text-center">
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">涨停价</p>
                    <p className="text-lg font-bold font-mono mt-1 text-[var(--color-positive)]">¥{limitUpPrice.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">涨跌幅</p>
                    <p className="text-lg font-bold font-mono mt-1 text-[var(--color-positive)]">+{stock.changePercent?.toFixed(2)}%</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">可买数量</p>
                    <p className="text-lg font-bold font-mono mt-1 text-[var(--color-text-primary)]">{maxQty.toLocaleString()}</p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="col-span-3 text-right">
                    <button 
                      onClick={() => {
                        if (maxQty <= 0) {
                          alert('可用资金不足，无法买入');
                          return;
                        }
                        
                        handleTrade(
                          TradeType.LIMIT_UP,
                          stock.symbol,
                          stock.name,
                          limitUpPrice,
                          maxQty
                        );
                      }}
                      disabled={isSubmitting || maxQty <= 0}
                      className="w-full py-2.5 rounded-lg bg-[var(--color-positive)] text-white font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? '提交中...' : '一键打板'}
                    </button>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">全额委托，进入排单</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // 股票选择器弹窗
  const renderStockSelector = () => (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="galaxy-card w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden rounded-xl">
        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-[var(--color-primary)]">选择标的</h3>
          <button 
            onClick={() => { setShowStockSelector(false); setSearchTerm(''); }} 
            className="w-10 h-10 rounded-full bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all"
          >
            <SafeIcon.Plus className="rotate-45" size={20} />
          </button>
        </div>
        <div className="p-4 border-b border-[var(--color-border)]">
          <input 
            type="text" 
            placeholder="搜索代码或简称..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-[var(--color-bg)] px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium outline-none focus:border-[var(--color-primary)] transition-all"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          ) : (
            filteredStockList.map(stock => (
              <div 
                key={stock.symbol} 
                onClick={() => {
                  setSelectedStock(stock);
                  setPrice(stock.price.toString());
                  setShowStockSelector(false);
                  setSearchTerm('');
                }} 
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--color-surface-hover)] cursor-pointer group border border-transparent hover:border-[var(--color-border)] transition-all"
              >
                <SafeStockIcon name={stock.name} logoUrl={stock.logoUrl} size="md" />
                <div className="flex-1">
                  <h4 className="text-base font-medium text-[var(--color-text-primary)]">{stock.name}</h4>
                  <p className="text-xs text-[var(--color-text-muted)] font-mono">{stock.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-mono font-medium text-[var(--color-text-primary)]">{stock.price.toFixed(2)}</p>
                  <p className={`text-xs font-medium ${stock.change >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                    {stock.changePercent}%
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // ===================== 主渲染 =====================
  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] pb-4 pt-4 px-4 gap-6">
      {/* 顶部交易模式切换 */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {TRADE_MODES.map(mode => (
          <button
            key={mode.key}
            onClick={() => setCurrentMode(mode.key)}
            className={`whitespace-nowrap px-5 py-2 rounded-lg text-xs font-medium transition-all border ${
              currentMode === mode.key 
                ? 'bg-[var(--color-primary)] text-white border-transparent' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-primary)]'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* 按模式渲染对应内容 */}
      {currentMode === 'A股' || currentMode === '港股'
        ? renderNormalTrade()
        : currentMode === '新股申购'
        ? renderIpoTrade()
        : currentMode === '大宗交易'
        ? renderBlockTrade()
        : currentMode === '涨停打板'
        ? renderLimitUpTrade()
        : null
      }

      {/* 股票选择器弹窗 */}
      {showStockSelector && renderStockSelector()}
    </div>
  );
});

export default TradePanel;