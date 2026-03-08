import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TradeType, UserAccount, Stock } from '../../lib/types';
import { IPOData } from '../../services/adapters/sinaIPOAdapter';

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
}

// 适配器函数：将 SinaIPOAdapter 返回的数据转换为 TradePanel 期望的格式
function convertIpoData(ipoList: IPOData[]): TradeIPOData[] {
  return ipoList.map(ipo => ({
    证券代码: ipo.symbol,
    申购代码: ipo.symbol, // 申购代码通常与股票代码相同
    证券简称: ipo.name,
    发行价格: ipo.issuePrice,
    市盈率: ipo.peRatio || undefined, // 使用适配器提供的市盈率，如果有的话
    个人申购上限: Math.floor(1000000 / (ipo.issuePrice || 1)), // 临时计算：100万资金对应的股数（万股）
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
  onExecute: (type: TradeType, symbol: string, name: string, price: number, quantity: number, logoUrl?: string) => Promise<boolean>;
  initialStock?: Stock | null;
}

// ===================== 主组件 =====================
const TradePanel: React.FC<TradePanelProps> = React.memo(({ account, onExecute, initialStock }) => {
  // ===================== URL参数处理 =====================
  const [searchParams] = useSearchParams();
  const modeFromUrl = searchParams.get('mode');
  
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
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [price, setPrice] = useState(selectedStock.price.toString());
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

  // 盘口数据（缓存，仅股票切换时更新，杜绝闪烁）
  const orderBook = useMemo(() => {
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
  }, [selectedStock.price]);

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
    // 防止重复加载
    if (initRef.current.normalLoaded && market === selectedStock.market) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const { getMarketList } = await import('../../services/marketService');
      const data = await getMarketList(market);
      if (data && data.length > 0) {
        setStockList(data);
        // 仅无初始股票时设置默认值
        if (!initialStock) {
          setSelectedStock(data[0]);
          setPrice(data[0].price.toString());
        }
        initRef.current.normalLoaded = true;
      }
    } catch (err) {
      console.error(`加载${market}股票列表失败:`, err);
      setErrorMsg(`加载${market}市场数据失败`);
    } finally {
      setLoading(false);
    }
  }, [initialStock, selectedStock.market]);

  // 加载新股列表
  const loadIpoList = useCallback(async () => {
    if (initRef.current.ipoLoaded) return;
    try {
      setIpoLoading(true);
      const { fetchSinaIPOData } = await import('../../services/adapters/sinaIPOAdapter');
      const data: IPOData[] = await fetchSinaIPOData();
      //为 TradePanel 期望的格式
      const convertedData = convertIpoData(data);
      // 仅保留当日可申购的新股（这里简化处理，显示所有数据）
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
      const { getMarketList } = await import('../../services/marketService');
      const marketData = await getMarketList('CN');
      // 过滤涨停个股（涨跌幅≥9.8%）
      const limitUpStocks = marketData.filter((stock: any) => stock.changePercent >= 9.8).slice(0, 20);
      setLimitUpList(limitUpStocks);
      initRef.current.limitUpLoaded = true;
    } catch (err) {
      console.error('加载涨停个股失败:', err);
    } finally {
      setLimitUpLoading(false);
    }
  }, []);

  // 交易输入验证
  const validateTradeInput = (price: number, quantity: number, tradeType: TradeType) => {
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
      // 新股申购验证
      if (quantity < 500) {
        errors.push('新股申购数量不得少于500股');
      }
      if (quantity % 500 !== 0) {
        errors.push('新股申购数量必须为500的整数倍');
      }
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
    // 输入验证
    const validationErrors = validateTradeInput(price, quantity, tradeType);
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
      
      const success = await onExecute(tradeType, symbol, name, price, quantity, logoUrl);
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
  }, [onExecute, safeAccount.balance]);

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

  // 股票切换时同步价格
  useEffect(() => {
    setPrice(selectedStock.price.toString());
  }, [selectedStock]);

  // 组件挂载仅执行一次初始化
  useEffect(() => {
    loadMarketList('CN');
    return () => {
      initRef.current = { normalLoaded: false, ipoLoaded: false, limitUpLoaded: false };
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
          className="glass-card p-6 flex items-center justify-between border-[#00D4AA]/20 rounded-[32px] cursor-pointer hover:border-[#00D4AA] transition-all"
        >
          <div className="flex items-center gap-6">
            <SafeStockIcon name={selectedStock.name} logoUrl={selectedStock.logoUrl} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-black">{selectedStock.name}</h4>
                <SafeIcon.ArrowRight size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] font-mono font-bold">{selectedStock.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">可用资金</p>
            <p className="text-2xl font-black font-mono text-[#00D4AA]">¥{safeAccount.balance.toLocaleString()}</p>
          </div>
        </div>

        {/* 买卖方向切换 */}
        <div className="flex gap-2 bg-[var(--color-bg)] p-1.5 rounded-2xl border border-[var(--color-border)]">
          <button 
            onClick={() => setTradeSide('BUY')} 
            className={`flex-1 py-4 rounded-xl font-black text-xs tracking-[0.2em] transition-all uppercase ${
              tradeSide === 'BUY' ? 'bg-[#00D4AA] text-[#0A1628] shadow-lg' : 'text-[var(--color-text-muted)]'
            }`}
          >
            买入
          </button>
          <button 
            onClick={() => setTradeSide('SELL')} 
            className={`flex-1 py-4 rounded-xl font-black text-xs tracking-[0.2em] transition-all uppercase ${
              tradeSide === 'SELL' ? 'bg-[#FF6B6B] text-white shadow-lg' : 'text-[var(--color-text-muted)]'
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
        <div className="glass-card p-8 rounded-[40px] flex flex-col gap-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] px-2">
                委托价格 (CNY)
              </label>
              <div className="flex items-center bg-[var(--color-bg)] h-16 rounded-[24px] border border-[var(--color-border)] px-6">
                <input 
                  type="number" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  className="flex-1 bg-transparent text-xl font-black font-mono text-[var(--color-text-primary)] outline-none" 
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between px-2">
                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">委托数量 (股)</label>
                <span className="text-[10px] font-black text-[#00D4AA] opacity-60">最大: {maxTradeQty.toLocaleString()}</span>
              </div>
              <div className="flex items-center bg-[var(--color-bg)] h-16 rounded-[24px] border border-[var(--color-border)] px-6">
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  className="flex-1 bg-transparent text-xl font-black font-mono text-[var(--color-text-primary)] outline-none" 
                  placeholder="0"
                  min="100"
                  step="100"
                />
              </div>
            </div>
          </div>

          {/* 快捷仓位按钮 */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '1/4', ratio: 0.25 },
              { label: '半仓', ratio: 0.5 },
              { label: '3/4', ratio: 0.75 },
              { label: '全仓', ratio: 1 },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => setQuantity(Math.floor(maxTradeQty * btn.ratio).toString())}
                className="py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-black hover:border-[#00D4AA] hover:text-[#00D4AA] transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 预估金额 */}
          <div className="p-6 bg-[var(--color-bg)] rounded-[24px] border border-[var(--color-border)] flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">预估成交金额</p>
              <p className="text-3xl font-black font-mono text-[#00D4AA] mt-1">¥{estimatedAmount}</p>
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
            className={`w-full py-6 rounded-[32px] font-black text-sm tracking-[0.4em] uppercase shadow-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
              tradeSide === 'BUY' 
                ? 'bg-[#00D4AA] text-[#0A1628] shadow-[#00D4AA]/20' 
                : 'bg-[#FF6B6B] text-white shadow-[#FF6B6B]/20'
            }`}
          >
            {isSubmitting ? '提交中...' : `确认${tradeSide === 'BUY' ? '买入' : '卖出'}`}
          </button>
        </div>
      </div>

      {/* 右侧五档盘口 */}
      <div className="md:col-span-4 flex flex-col">
        <div className="glass-card p-8 rounded-[40px] flex-1 bg-[var(--color-surface)]/20 shadow-xl border-white/5 h-full">
          <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-border)] pb-4">
              <span>盘口五档</span>
              <span>价格 / 量</span>
            </div>
            
            {/* 卖盘 */}
            <div className="space-y-1.5">
              {orderBook.asks.map(ask => (
                <div key={`ask-${ask.level}`} className="flex justify-between items-center py-2 px-4 rounded-xl hover:bg-[#FF6B6B]/10 cursor-pointer" onClick={() => setPrice(ask.price.toFixed(2))}>
                  <span className="text-[11px] font-black text-[#FF6B6B] opacity-60 w-8">卖{ask.level}</span>
                  <span className="text-sm font-mono font-black text-[#FF6B6B] flex-1 text-center">{ask.price.toFixed(2)}</span>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] w-12 text-right">{ask.volume}</span>
                </div>
              ))}
            </div>

            {/* 最新价 */}
            <div className="py-6 px-4 flex flex-col items-center bg-[var(--color-bg)] rounded-[24px] border border-[var(--color-border)] my-4">
              <span className="text-[10px] font-black text-[var(--color-text-muted)] mb-1">最新价</span>
              <span className="text-2xl font-black font-mono text-[var(--color-text-primary)]">
                {selectedStock.price.toFixed(2)}
              </span>
              <span className={`text-xs font-black mt-1 ${selectedStock.change >= 0 ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>
                {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change} ({selectedStock.changePercent}%)
              </span>
            </div>

            {/* 买盘 */}
            <div className="space-y-1.5">
              {orderBook.bids.map(bid => (
                <div key={`bid-${bid.level}`} className="flex justify-between items-center py-2 px-4 rounded-xl hover:bg-[#00D4AA]/10 cursor-pointer" onClick={() => setPrice(bid.price.toFixed(2))}>
                  <span className="text-[11px] font-black text-[#00D4AA] opacity-60 w-8">买{bid.level}</span>
                  <span className="text-sm font-mono font-black text-[#00D4AA] flex-1 text-center">{bid.price.toFixed(2)}</span>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] w-12 text-right">{bid.volume}</span>
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
        <h3 className="text-lg font-black uppercase tracking-wider">今日可申购新股</h3>
        <span className="text-xs text-[var(--color-text-muted)] font-black">
          申购日期：{today} | T日申购 | T+1日配号 | T+2日中签
        </span>
      </div>

      {ipoLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4AA]"></div>
        </div>
      ) : ipoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
          <SafeIcon.Calendar size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-black">今日暂无可申购新股</p>
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
                <th className="text-center py-4 px-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {ipoList.map(ipo => (
                <tr 
                  key={ipo.证券代码} 
                  className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-all ${
                    selectedIpo?.证券代码 === ipo.证券代码 ? 'bg-[#00D4AA]/5' : ''
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <SafeStockIcon name={ipo.证券简称} size="md" />
                      <p className="text-base font-black truncate max-w-[120px]">{ipo.证券简称}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-sm">{ipo.证券代码}</td>
                  <td className="py-4 px-4 text-center font-mono text-sm font-black text-[#00D4AA]">{ipo.申购代码}</td>
                  <td className="py-4 px-4 text-center font-mono text-sm font-black">¥{ipo.发行价格?.toFixed(2) || '-'}</td>
                  <td className="py-4 px-4 text-center font-mono text-sm">-</td>
                  <td className="py-4 px-4 text-center font-mono text-sm">{ipo.个人申购上限 || '-'}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="w-32 mx-auto">
                      <button 
                        onClick={() => {
                          // 计算实际申购数量，不超过个人上限和账户资金可购买的最大数量
                          const maxQtyByFund = Math.floor(safeAccount.balance / ipo.发行价格);
                          const actualQuantity = Math.min(ipo.个人申购上限 * 10000, maxQtyByFund);
                          
                          if (actualQuantity <= 0) {
                            alert('可用资金不足，无法申购');
                            return;
                          }
                          
                          handleTrade(
                            TradeType.IPO,
                            ipo.申购代码,
                            ipo.证券简称,
                            ipo.发行价格,
                            actualQuantity
                          );
                        }}
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-xl bg-[#00D4AA] text-[#0A1628] font-black text-xs uppercase tracking-wider hover:bg-[#00b88f] transition-all disabled:opacity-50"
                      >
                        {isSubmitting && selectedIpo?.证券代码 === ipo.证券代码 ? '提交中' : '一键申购'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* 标的选择 */}
          <div 
            onClick={() => setShowStockSelector(true)}
            className="glass-card p-6 flex items-center justify-between border-[#00D4AA]/20 rounded-[32px] cursor-pointer hover:border-[#00D4AA] transition-all"
          >
            <div className="flex items-center gap-6">
              <SafeStockIcon name={selectedStock.name} logoUrl={selectedStock.logoUrl} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-black">{selectedStock.name}</h4>
                  <SafeIcon.ArrowRight size={14} className="text-[var(--color-text-muted)]" />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] font-mono font-bold">{selectedStock.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">二级市场现价</p>
              <p className="text-2xl font-black font-mono text-[var(--color-text-primary)]">¥{selectedStock.price.toFixed(2)}</p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[40px] flex flex-col gap-8 shadow-2xl">
            {/* 折价率设置 */}
            <div className="space-y-2">
              <div className="flex justify-between px-2">
                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">折价率</label>
                <span className="text-[10px] font-black text-[#00D4AA]">{(blockDiscount * 100).toFixed(1)}%</span>
              </div>
              <input 
                type="range" 
                min="0.7" 
                max="0.99" 
                step="0.01" 
                value={blockDiscount} 
                onChange={(e) => setBlockDiscount(parseFloat(e.target.value))} 
                className="w-full h-2 bg-[var(--color-bg)] rounded-lg appearance-none cursor-pointer accent-[#00D4AA]"
              />
              <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] font-black px-2">
                <span>7折</span>
                <span>9折</span>
                <span>平价</span>
              </div>
            </div>

            {/* 价格/数量 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] px-2">
                  大宗交易成交价
                </label>
                <div className="flex items-center bg-[var(--color-bg)] h-16 rounded-[24px] border border-[var(--color-border)] px-6">
                  <input 
                    type="number" 
                    disabled 
                    value={blockPrice.toFixed(2)} 
                    className="flex-1 bg-transparent text-xl font-black font-mono text-[var(--color-text-primary)] outline-none opacity-70" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between px-2">
                  <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">申报数量 (股)</label>
                  <span className="text-[10px] font-black text-[#FF6B6B]">最低: 30万股</span>
                </div>
                <div className="flex items-center bg-[var(--color-bg)] h-16 rounded-[24px] border border-[var(--color-border)] px-6">
                  <input 
                    type="number" 
                    value={blockQuantity} 
                    onChange={(e) => setBlockQuantity(e.target.value)} 
                    className="flex-1 bg-transparent text-xl font-black font-mono text-[var(--color-text-primary)] outline-none" 
                    placeholder="≥300000"
                    min={minQuantity}
                  />
                </div>
              </div>
            </div>

            {/* 交易规则提示 */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
              <p className="text-xs text-yellow-400 font-black leading-relaxed">
                ⚠️ 大宗交易规则：A股单笔申报数量不低于30万股，或交易金额不低于200万元人民币，申报时间为交易日9:30-15:30，收盘后统一撮合。
              </p>
            </div>

            {/* 预估金额 */}
            <div className="p-6 bg-[var(--color-bg)] rounded-[24px] border border-[var(--color-border)] flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">预估交易总金额</p>
                <p className="text-3xl font-black font-mono text-[#00D4AA] mt-1">
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
              className="w-full py-6 rounded-[32px] font-black text-sm tracking-[0.4em] uppercase shadow-2xl transition-all active:scale-[0.97] bg-[#00D4AA] text-[#0A1628] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '提交中...' : '确认大宗交易申报'}
            </button>
          </div>
        </div>

        {/* 右侧信息栏 */}
        <div className="md:col-span-4 flex flex-col">
          <div className="glass-card p-8 rounded-[40px] flex-1 bg-[var(--color-surface)]/20 shadow-xl border-white/5 h-full">
            <h4 className="text-sm font-black uppercase tracking-wider mb-6 text-center">大宗交易信息</h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-black uppercase">标的证券</span>
                <span className="text-sm font-black truncate max-w-[150px]">{selectedStock.name}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-black uppercase">证券代码</span>
                <span className="text-sm font-mono font-black">{selectedStock.symbol}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-black uppercase">二级市场现价</span>
                <span className="text-sm font-mono font-black">¥{selectedStock.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-black uppercase">折价率</span>
                <span className="text-sm font-black text-[#00D4AA]">{((1 - blockDiscount) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] font-black uppercase">大宗成交价</span>
                <span className="text-sm font-mono font-black text-[#00D4AA]">¥{blockPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-muted)] font-black uppercase">最大可买</span>
                <span className="text-sm font-mono font-black">{maxQty.toLocaleString()}股</span>
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
        <h3 className="text-lg font-black uppercase tracking-wider">今日涨停个股</h3>
        <span className="text-xs text-[var(--color-text-muted)] font-black">按涨停价委托，进入排单队列</span>
      </div>

      {limitUpLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B6B]"></div>
        </div>
      ) : limitUpList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
          <SafeIcon.TrendingUp size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-black">暂无涨停个股数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto no-scrollbar">
          {limitUpList.map(stock => {
            const limitUpPrice = stock.price;
            const maxQty = Math.floor(safeAccount.balance / limitUpPrice);
            return (
              <div 
                key={stock.symbol} 
                className="glass-card p-6 rounded-[32px] border border-[#FF6B6B]/30 hover:border-[#FF6B6B] transition-all"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* 个股信息 */}
                  <div className="col-span-3 flex items-center gap-4">
                    <SafeStockIcon name={stock.name} logoUrl={stock.logoUrl} size="md" />
                    <div>
                      <h4 className="text-lg font-black truncate">{stock.name}</h4>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono">{stock.symbol}</p>
                    </div>
                  </div>

                  {/* 涨停信息 */}
                  <div className="col-span-2 text-center">
                    <p className="text-xs text-[var(--color-text-muted)] font-black uppercase">涨停价</p>
                    <p className="text-xl font-black font-mono mt-1 text-[#FF6B6B]">¥{limitUpPrice.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-xs text-[var(--color-text-muted)] font-black uppercase">涨跌幅</p>
                    <p className="text-xl font-black font-mono mt-1 text-[#FF6B6B]">+{stock.changePercent?.toFixed(2)}%</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-xs text-[var(--color-text-muted)] font-black uppercase">可买数量</p>
                    <p className="text-xl font-black font-mono mt-1">{maxQty.toLocaleString()}</p>
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
                      className="w-full py-3 rounded-xl bg-[#FF6B6B] text-white font-black text-xs uppercase tracking-wider hover:bg-[#FF5252] transition-all disabled:opacity-50"
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
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
      <div className="glass-card w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden rounded-[48px] border-[#00D4AA]/30">
        <div className="p-8 border-b border-[var(--color-border)] flex justify-between items-center shrink-0">
          <h3 className="text-xl font-black uppercase tracking-[0.2em] text-[#00D4AA]">选择标的</h3>
          <button 
            onClick={() => { setShowStockSelector(false); setSearchTerm(''); }} 
            className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center"
          >
            <SafeIcon.Plus className="rotate-45" size={24} />
          </button>
        </div>
        <div className="p-8 border-b border-[var(--color-border)] bg-[var(--color-surface)]/20">
          <input 
            type="text" 
            placeholder="搜索代码或简称..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-16 bg-[var(--color-bg)] px-8 rounded-2xl border border-[var(--color-border)] text-sm font-black outline-none focus:border-[#00D4AA]"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4AA]"></div>
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
                className="flex items-center gap-6 p-6 rounded-[32px] hover:bg-[var(--color-surface)] cursor-pointer group border border-transparent hover:border-[#00D4AA]/20"
              >
                <SafeStockIcon name={stock.name} logoUrl={stock.logoUrl} size="md" />
                <div className="flex-1">
                  <h4 className="text-lg font-black">{stock.name}</h4>
                  <p className="text-[11px] text-[var(--color-text-muted)] font-mono">{stock.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-black">{stock.price.toFixed(2)}</p>
                  <p className={`text-xs font-black ${stock.change >= 0 ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>
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
    <div className="flex flex-col h-full bg-[var(--color-bg)] animate-slide-up pb-4 pt-4 px-4 gap-6">
      {/* 顶部交易模式切换 */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {TRADE_MODES.map(mode => (
          <button
            key={mode.key}
            onClick={() => setCurrentMode(mode.key)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all border ${
              currentMode === mode.key 
                ? 'bg-[#00D4AA] text-[#0A1628] border-transparent shadow-xl' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
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