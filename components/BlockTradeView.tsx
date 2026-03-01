import React, { useState, useEffect } from 'react';
import { getBlockTradeProducts, type BlockTradeProduct } from '../services/blockTradeService';
import { ICONS } from '../constants';

const BlockTradeView: React.FC = () => {
  const [products, setProducts] = useState<BlockTradeProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<BlockTradeProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [executing, setExecuting] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBlockTradeProducts('ACTIVE');
      setProducts(data);
      if (data.length > 0 && !selectedProduct) {
        setSelectedProduct(data[0]);
      }
    } catch (err: any) {
      console.error('加载产品失败:', err);
      setError(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleTrade = async () => {
    if (!selectedProduct) {
      alert('请选择交易产品');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert('请输入有效的交易数量');
      return;
    }

    const discountedPrice = selectedProduct.current_price * selectedProduct.block_discount;
    const amount = discountedPrice * qty;

    if (!confirm(
      `确认大宗交易 ${selectedProduct.name}(${selectedProduct.symbol}) ${qty.toLocaleString()}手\n` +
      `市场价格: ¥${selectedProduct.current_price.toFixed(2)}/手\n` +
      `大宗折扣: ${((1 - selectedProduct.block_discount) * 100).toFixed(1)}%\n` +
      `交易价格: ¥${discountedPrice.toFixed(2)}/手\n` +
      `总金额: ¥${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    )) {
      return;
    }

    try {
      setExecuting(true);
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.functions.invoke('create-trade-order', {
        body: { 
          market_type: selectedProduct.market,
          trade_type: 'BLOCK_TRADE',
          stock_code: selectedProduct.symbol,
          stock_name: selectedProduct.name,
          price: discountedPrice,
          quantity: qty
        }
      });
      
      if (error || data?.error) {
        alert(`交易失败: ${error?.message || data?.error}`);
      } else {
        alert('大宗交易指令已提交');
        setQuantity('');
        loadProducts();
      }
    } catch (err: any) {
      alert(`交易失败: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleRefresh = () => {
    loadProducts();
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black">大宗交易</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            专业大宗交易通道，享受专属折扣价格
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || !selectedProduct}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
        >
          <ICONS.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '刷新中...' : '刷新行情'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* 左侧：产品选择和信息 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-black mb-4">交易产品</h2>
            <div className="flex flex-wrap gap-3">
              {products.map(product => (
                <button
                  key={product.symbol}
                  onClick={() => setSelectedProduct(product)}
                  className={`px-6 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all ${selectedProduct?.symbol === product.symbol
                      ? 'bg-[#00D4AA] text-[#0A1628] shadow-lg'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    }`}
                >
                  {product.name}
                  <span className="ml-2 text-xs font-normal">{product.symbol}</span>
                </button>
              ))}
            </div>

            {products.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-500 text-sm">
                  <ICONS.AlertCircle className="inline w-4 h-4 mr-2" />
                  未配置大宗交易产品，请在环境变量VITE_QOS_PRODUCTS中配置
                </p>
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-lg font-black mb-4">实时行情</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--color-bg)] p-4 rounded-xl">
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">当前价格</p>
                  <p className="text-2xl font-black font-mono">¥{selectedProduct.current_price.toFixed(2)}</p>
                </div>
                <div className="bg-[var(--color-bg)] p-4 rounded-xl">
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">涨跌幅</p>
                  <p className={`text-2xl font-black font-mono ${selectedProduct.change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedProduct.change_percent >= 0 ? '+' : ''}{selectedProduct.change_percent.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-[var(--color-bg)] p-4 rounded-xl">
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">大宗折扣</p>
                  <p className="text-2xl font-black font-mono text-[#00D4AA]">
                    {((1 - selectedProduct.block_discount) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[var(--color-bg)] p-4 rounded-xl">
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">最小交易量</p>
                  <p className="text-2xl font-black font-mono">
                    {selectedProduct.min_block_size.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-[var(--color-bg)] rounded-xl">
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-2">大宗交易详情</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">折扣价格</p>
                    <p className="text-lg font-black font-mono">
                      ¥{(selectedProduct.current_price * selectedProduct.block_discount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">最后更新</p>
                    <p className="text-sm font-mono">
                      {new Date(selectedProduct.update_time).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="glass-card p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-3">
                <ICONS.AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-red-500 font-bold">数据加载失败</p>
                  <p className="text-sm text-red-500/80 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：交易面板 */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-black mb-4">交易指令</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
                  交易数量 (手)
                </label>
                <div className="flex items-center bg-[var(--color-bg)] h-14 rounded-xl border border-[var(--color-border)] px-4">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="flex-1 bg-transparent text-lg font-black font-mono text-[var(--color-text-primary)] outline-none"
                    placeholder="0"
                    min={tradeData?.blockTradeInfo?.minBlockSize || 100000}
                  />
                  <span className="text-sm text-[var(--color-text-muted)] font-mono">手</span>
                </div>
                {tradeData?.blockTradeInfo?.minBlockSize && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    最小交易量: {tradeData.blockTradeInfo.minBlockSize.toLocaleString()} 手
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
                  预估金额 (CNY)
                </label>
                <div className="bg-[var(--color-bg)] p-4 rounded-xl">
                  <p className="text-2xl font-black font-mono text-[#00D4AA]">
                    {selectedProduct && quantity
                      ? `¥${(selectedProduct.current_price * selectedProduct.block_discount * parseFloat(quantity) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '¥0.00'
                    }
                  </p>
                  {selectedProduct && selectedProduct.block_discount < 1 && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      已享受{(1 - selectedProduct.block_discount) * 100}%大宗折扣
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleTrade}
                disabled={!selectedProduct || !tradeData || !quantity || executing || loading}
                className="w-full py-4 bg-[#00D4AA] text-[#0A1628] font-black text-sm tracking-widest uppercase rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? '执行中...' : '提交大宗交易'}
              </button>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-black mb-4">交易说明</h2>
            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <li className="flex items-start gap-2">
                <ICONS.CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>大宗交易享受专属折扣价格</span>
              </li>
              <li className="flex items-start gap-2">
                <ICONS.CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>交易数量需达到最低门槛要求</span>
              </li>
              <li className="flex items-start gap-2">
                <ICONS.CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>交易指令提交后进入撮合池</span>
              </li>
              <li className="flex items-start gap-2">
                <ICONS.CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>成交结果将在持仓中显示</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockTradeView;