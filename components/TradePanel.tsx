
import React, { useState, useEffect, useMemo } from 'react';
import { TradeType, OrderStrategy, UserAccount, Stock } from '../types';
import { ICONS } from '../constants';
import { validateTradeRisk, getMarketList } from '../services/marketService';
import StockIcon from './StockIcon';

interface TradePanelProps {
  account: UserAccount;
  onExecute: (type: TradeType, symbol: string, name: string, price: number, quantity: number, logoUrl?: string) => boolean;
  initialStock?: Stock | null;
}

const TradePanel: React.FC<TradePanelProps> = ({ account, onExecute, initialStock }) => {
  const [assetCategory, setAssetCategory] = useState('股票');
  const [stocksList, setStocksList] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock>(initialStock || {
    symbol: '600519',
    name: '贵州茅台',
    price: 1750.00,
    change: 15.00,
    changePercent: 0.87,
    market: 'CN',
    sparkline: []
  });
  const [tradeType, setTradeType] = useState<TradeType>(TradeType.BUY);
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState(selectedStock.price.toString());
  const [showStockSelector, setShowStockSelector] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [leverage, setLeverage] = useState('10');

  const ipoQuota = 25000;
  const currentHolding = useMemo(() => account.holdings.find(h => h.symbol === selectedStock.symbol), [account.holdings, selectedStock.symbol]);

  // 加载股票数据
  useEffect(() => {
    const loadStocks = async () => {
      try {
        setLoading(true);
        const data = await getMarketList('CN'); // 默认加载A股
        if (data && data.length > 0) {
          setStocksList(data);
          // 如果没有初始股票，选择第一个
          if (!initialStock) {
            setSelectedStock(data[0]);
            setPrice(data[0].price.toString());
          }
        }
      } catch (error) {
        console.error('加载股票数据失败:', error);
        setStocksList([]);
      } finally {
        setLoading(false);
      }
    };

    loadStocks();
  }, [initialStock]);

  // 处理分类切换逻辑
  useEffect(() => {
    if (assetCategory === '新股申购') {
      // 新股申购使用模拟数据（通常没有免费公开API）
      const ipoStock: Stock = {
        symbol: '780123',
        name: '银河量子',
        price: 18.50,
        change: 0,
        changePercent: 0,
        market: 'CN',
        sparkline: []
      };
      setSelectedStock(ipoStock);
      setPrice(ipoStock.price.toString());
      setTradeType(TradeType.IPO);
    } else if (assetCategory === '大宗交易') {
      setTradeType(TradeType.BLOCK);
      setPrice((selectedStock.price * 0.9).toFixed(2)); // 大宗交易通常 9 折
    } else if (assetCategory === '涨停打板') {
      setTradeType(TradeType.LIMIT_UP);
      setPrice((selectedStock.price * 1.1).toFixed(2)); // 涨停价格
    } else if (assetCategory === '衍生品') {
      // 衍生品使用模拟数据
      const derivStock: Stock = {
        symbol: 'IF2506',
        name: '沪深300指数期货2506',
        price: 3624.5,
        change: 12.4,
        changePercent: 0.34,
        market: 'FUTURES',
        sparkline: []
      };
      setSelectedStock(derivStock);
      setPrice(derivStock.price.toString());
      setTradeType(TradeType.BUY);
    } else {
      setTradeType(TradeType.BUY);
      setPrice(selectedStock.price.toString());
    }
  }, [assetCategory, selectedStock]);

  const maxQty = useMemo(() => {
    const p = parseFloat(price);
    const lev = assetCategory === '衍生品' ? parseFloat(leverage) : 1;
    if (isNaN(p) || p <= 0) return 0;
    if (assetCategory === '新股申购') return ipoQuota;
    if (tradeType === TradeType.SELL) return currentHolding ? currentHolding.availableQuantity : 0;
    return Math.floor((account.balance * lev) / p);
  }, [price, tradeType, account.balance, currentHolding, assetCategory, leverage]);

  const updateAmount = (qty: string, prc: string) => {
    const q = parseFloat(qty);
    const p = parseFloat(prc);
    if (!isNaN(q) && !isNaN(p)) setAmount((q * p).toFixed(2));
    else setAmount('');
  };

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    updateAmount(val, price);
  };

  const handlePreTrade = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return alert("请输入有效数量");
    if (assetCategory === '大宗交易' && qty < 50000) return alert("大宗交易最低起买 50,000 股");
    
    setIsValidating(true);
    await validateTradeRisk(selectedStock.name, parseFloat(amount));
    setIsValidating(false);
    
    const success = onExecute(
      tradeType,
      selectedStock.symbol,
      selectedStock.name,
      parseFloat(price),
      qty,
      selectedStock.logoUrl
    );
    if (success) {
      setQuantity('');
      setAmount('');
      alert(`${assetCategory} 交易指令已发送至云端撮合引擎，请在“持仓-委托”中查看撮合进度。`);
    }
  };

  const filteredStocks = useMemo(() => {
    if (assetCategory === '新股申购') {
      // 新股申购模拟数据
      const ipoStocks: Stock[] = [{
        symbol: '780123',
        name: '银河量子',
        price: 18.50,
        change: 0,
        changePercent: 0,
        market: 'CN',
        sparkline: []
      }];
      return searchTerm ? ipoStocks.filter(s => s.name.includes(searchTerm) || s.symbol.includes(searchTerm)) : ipoStocks;
    } else if (assetCategory === '衍生品') {
      // 衍生品模拟数据
      const derivStocks: Stock[] = [{
        symbol: 'IF2506',
        name: '沪深300指数期货2506',
        price: 3624.5,
        change: 12.4,
        changePercent: 0.34,
        market: 'FUTURES',
        sparkline: []
      }];
      return searchTerm ? derivStocks.filter(s => s.name.includes(searchTerm) || s.symbol.includes(searchTerm)) : derivStocks;
    } else {
      // 股票使用真实数据
      return searchTerm ? stocksList.filter(s => s.name.includes(searchTerm) || s.symbol.includes(searchTerm)) : stocksList;
    }
  }, [searchTerm, assetCategory, stocksList]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] animate-slide-up pb-4 pt-4 px-4 gap-6">
      
      {/* 1. 交易模式切换 */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {['股票', '新股申购', '大宗交易', '涨停打板', '衍生品'].map(cat => (
          <button
            key={cat}
            onClick={() => setAssetCategory(cat)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all border ${
              assetCategory === cat ? 'bg-[#00D4AA] text-[#0A1628] border-transparent shadow-xl' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
        {/* 左侧：输入与选择 */}
        <div className="md:col-span-8 flex flex-col gap-6">
          
          <div 
            onClick={() => assetCategory !== '新股申购' && setShowStockSelector(true)}
            className={`glass-card p-6 flex items-center justify-between border-[#00D4AA]/20 rounded-[32px] group ${assetCategory !== '新股申购' ? 'cursor-pointer hover:border-[#00D4AA]' : ''}`}
          >
            <div className="flex items-center gap-6">
              <StockIcon name={selectedStock.name} logoUrl={selectedStock.logoUrl} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-black">{selectedStock.name}</h4>
                  {assetCategory !== '新股申购' && <ICONS.ArrowRight size={14} className="text-[var(--color-text-muted)]" />}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] font-mono font-bold">{selectedStock.symbol}</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">可用资金 (CNY)</p>
               <p className="text-2xl font-black font-mono text-[#00D4AA]">¥{account.balance.toLocaleString()}</p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[40px] flex flex-col gap-8 shadow-2xl relative overflow-hidden">
            {/* 特殊模式标识 */}
            {assetCategory !== '股票' && (
              <div className="absolute top-0 right-0 px-6 py-2 bg-[#00D4AA] text-[#0A1628] text-[9px] font-black uppercase tracking-widest rounded-bl-2xl shadow-lg">
                {assetCategory}模式
              </div>
            )}

            <div className="flex gap-2 bg-[var(--color-bg)] p-1.5 rounded-2xl border border-[var(--color-border)]">
                <button 
                  onClick={() => setTradeType(TradeType.BUY)} 
                  className={`flex-1 py-4 rounded-xl font-black text-xs tracking-[0.2em] transition-all uppercase ${tradeType !== TradeType.SELL ? 'bg-[#00D4AA] text-[#0A1628] shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                >指令买入</button>
                <button 
                  disabled={assetCategory === '新股申购'}
                  onClick={() => setTradeType(TradeType.SELL)} 
                  className={`flex-1 py-4 rounded-xl font-black text-xs tracking-[0.2em] transition-all uppercase disabled:opacity-30 ${tradeType === TradeType.SELL ? 'bg-[#FF6B6B] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                >指令卖出</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] px-2">委托价 (CNY)</label>
                <div className="flex items-center bg-[var(--color-bg)] h-16 rounded-[24px] border border-[var(--color-border)] px-6">
                  <input 
                    type="number" 
                    disabled={assetCategory === '涨停打板' || assetCategory === '新股申购'}
                    value={price} 
                    onChange={(e) => { setPrice(e.target.value); updateAmount(quantity, e.target.value); }} 
                    className="flex-1 bg-transparent text-xl font-black font-mono text-[var(--color-text-primary)] outline-none disabled:opacity-50" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between px-2">
                  <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">数量 ({assetCategory === '衍生品' ? '手' : '股'})</label>
                  <span className="text-[10px] font-black text-[#00D4AA] opacity-60">限额: {maxQty.toLocaleString()}</span>
                </div>
                <div className="flex items-center bg-[var(--color-bg)] h-16 rounded-[24px] border border-[var(--color-border)] px-6">
                  <input type="number" value={quantity} onChange={(e) => handleQuantityChange(e.target.value)} className="flex-1 bg-transparent text-xl font-black font-mono text-[var(--color-text-primary)] outline-none" placeholder="0" />
                </div>
              </div>
            </div>

            {assetCategory === '衍生品' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] px-2">风险杠杆 (Leverage)</label>
                <div className="flex gap-2">
                  {['5', '10', '20', '50'].map(l => (
                    <button key={l} onClick={() => setLeverage(l)} className={`flex-1 py-3 rounded-xl font-mono font-black text-xs border ${leverage === l ? 'bg-blue-600 border-transparent text-white' : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                      {l}X
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6 bg-[var(--color-bg)] rounded-[24px] border border-[var(--color-border)] flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">预估结算总值</p>
                <p className="text-3xl font-black font-mono text-[#00D4AA] mt-1">¥{parseFloat(amount || '0').toLocaleString()}</p>
              </div>
              <ICONS.Zap size={24} className="text-[#00D4AA] animate-pulse" />
            </div>

            <button 
              onClick={handlePreTrade} 
              disabled={isValidating}
              className={`w-full py-6 rounded-[32px] font-black text-sm tracking-[0.4em] uppercase shadow-2xl transition-all active:scale-[0.97]
                ${tradeType === TradeType.SELL ? 'bg-[#FF6B6B] text-white shadow-[#FF6B6B]/20' : 'bg-[#00D4AA] text-[#0A1628] shadow-[#00D4AA]/20'}
              `}
            >
              {isValidating ? '核验中...' : `${tradeType} 委托执行`}
            </button>
          </div>
        </div>

        {/* 右侧：盘口 */}
        <div className="md:col-span-4 flex flex-col">
          <div className="glass-card p-8 rounded-[40px] flex-1 bg-[var(--color-surface)]/20 shadow-xl border-white/5 h-full">
            <div className="flex flex-col h-full gap-6">
              <div className="flex justify-between items-center text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-border)] pb-4">
                <span>盘口 L1 极速</span>
                <span>价格 / 量</span>
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map(lvl => (
                    <div key={`ask-${lvl}`} onClick={() => setPrice((selectedStock.price + lvl * 0.05).toFixed(2))} className="flex justify-between items-center py-2 px-4 rounded-xl hover:bg-[#FF6B6B]/10 cursor-pointer">
                      <span className="text-[11px] font-black text-[#FF6B6B] opacity-60">卖 {lvl}</span>
                      <span className="text-sm font-mono font-black text-[#FF6B6B]">{(selectedStock.price + lvl * 0.05).toFixed(2)}</span>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{Math.floor(Math.random() * 80) + 1}</span>
                    </div>
                  ))}
                </div>

                <div className="py-6 px-4 flex flex-col items-center bg-[var(--color-bg)] rounded-[24px] border border-[var(--color-border)] my-4">
                  <span className="text-[10px] font-black text-[var(--color-text-muted)] mb-1">成交中位</span>
                  <span className="text-2xl font-black font-mono text-[var(--color-text-primary)]">{selectedStock.price.toFixed(2)}</span>
                </div>

                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <div key={`bid-${lvl}`} onClick={() => setPrice((selectedStock.price - lvl * 0.05).toFixed(2))} className="flex justify-between items-center py-2 px-4 rounded-xl hover:bg-[#00D4AA]/10 cursor-pointer">
                      <span className="text-[11px] font-black text-[#00D4AA] opacity-60">买 {lvl}</span>
                      <span className="text-sm font-mono font-black text-[#00D4AA]">{(selectedStock.price - lvl * 0.05).toFixed(2)}</span>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{Math.floor(Math.random() * 80) + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 标的选择器 */}
      {showStockSelector && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
           <div className="glass-card w-full max-w-2xl h-[85vh] flex flex-col animate-slide-up overflow-hidden rounded-[48px] border-[#00D4AA]/30">
              <div className="p-8 border-b border-[var(--color-border)] flex justify-between items-center shrink-0">
                 <h3 className="text-xl font-black uppercase tracking-[0.2em] text-[#00D4AA]">标的市场库</h3>
                 <button onClick={() => { setShowStockSelector(false); setSearchTerm(''); }} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center"><ICONS.Plus className="rotate-45" size={24} /></button>
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
                 {filteredStocks.map(stock => (
                    <div key={stock.symbol} onClick={() => { setSelectedStock(stock); setPrice(stock.price.toString()); setShowStockSelector(false); }} className="flex items-center gap-6 p-6 rounded-[32px] hover:bg-[var(--color-surface)] cursor-pointer group border border-transparent hover:border-[#00D4AA]/20">
                        <StockIcon name={stock.name} logoUrl={stock.logoUrl} size="md" />
                        <div className="flex-1">
                          <h4 className="text-lg font-black">{stock.name}</h4>
                          <p className="text-[11px] text-[var(--color-text-muted)] font-mono font-bold">{stock.symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-mono font-black">{stock.price.toFixed(2)}</p>
                          <p className={`text-xs font-black ${stock.change >= 0 ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>{stock.changePercent}%</p>
                        </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TradePanel;
