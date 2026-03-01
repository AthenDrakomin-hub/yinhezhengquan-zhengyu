import React, { useState, useEffect, useCallback } from 'react';
import { getLimitUpStockBySymbol, type LimitUpStock } from '../services/limitUpStockService';
import { ICONS } from '../constants';

interface LimitUpPanelProps {
  symbol: string;
  onUseLimitUpPrice?: (price: number) => void;
  refreshInterval?: number;
}

const LimitUpPanel: React.FC<LimitUpPanelProps> = ({
  symbol,
  onUseLimitUpPrice,
  refreshInterval = 10000
}) => {
  const [data, setData] = useState<LimitUpStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadLimitUpData = useCallback(async () => {
    if (!symbol) {
      setError('股票代码不能为空');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const limitUpData = await getLimitUpStockBySymbol(symbol);
      setData(limitUpData);
    } catch (err: any) {
      console.error('加载涨停数据失败:', err);
      setError(`加载失败: ${err.message || '未知错误'}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;

    loadLimitUpData();

    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(loadLimitUpData, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbol, autoRefresh, refreshInterval, loadLimitUpData]);

  // 手动刷新
  const handleRefresh = () => {
    loadLimitUpData();
  };

  const handleUseLimitUpPrice = async () => {
    if (!data || !data.is_limit_up) return;
    
    try {
      const quantity = 100;
      
      const { supabase } = await import('../lib/supabase');
      const { data: result, error } = await supabase.functions.invoke('create-trade-order', {
        body: { 
          market_type: data.market === 'SH' ? 'A_SHARE' : 'A_SHARE',
          trade_type: 'LIMIT_UP',
          stock_code: data.symbol,
          stock_name: data.name,
          price: data.limit_up_price,
          quantity
        }
      });
      
      if (error || result?.error) {
        alert(`涨停打板失败: ${error?.message || result?.error}`);
      } else {
        alert('涨停打板指令已提交');
      }
    } catch (err: any) {
      alert(`操作失败: ${err.message}`);
    }
  };

  const getLimitUpStatus = () => {
    if (!data) return '未知';
    
    if (data.is_limit_up) {
      return '已涨停';
    } else if (data.current_price >= data.limit_up_price * 0.99) {
      return '接近涨停';
    } else if (data.current_price >= data.limit_up_price * 0.95) {
      return '强势上涨';
    } else {
      return '未涨停';
    }
  };

  const getStatusColor = () => {
    if (!data) return 'text-gray-500';
    
    if (data.is_limit_up) {
      return 'text-red-500';
    } else if (data.current_price >= data.limit_up_price * 0.99) {
      return 'text-orange-500';
    } else if (data.current_price >= data.limit_up_price * 0.95) {
      return 'text-yellow-500';
    } else {
      return 'text-gray-500';
    }
  };

  const getStatusBgColor = () => {
    if (!data) return 'bg-gray-500/10';
    
    if (data.is_limit_up) {
      return 'bg-red-500/10';
    } else if (data.current_price >= data.limit_up_price * 0.99) {
      return 'bg-orange-500/10';
    } else if (data.current_price >= data.limit_up_price * 0.95) {
      return 'bg-yellow-500/10';
    } else {
      return 'bg-gray-500/10';
    }
  };

  if (loading && !data) {
    return (
      <div className="glass-card p-6 rounded-2xl animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-[var(--color-surface)] rounded w-1/3"></div>
          <div className="h-4 bg-[var(--color-surface)] rounded w-1/4"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-[var(--color-surface)] rounded"></div>
          <div className="h-4 bg-[var(--color-surface)] rounded w-2/3"></div>
          <div className="h-4 bg-[var(--color-surface)] rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-3 mb-4">
          <ICONS.AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-red-500 font-bold">涨停数据加载失败</p>
            <p className="text-sm text-red-500/80 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <p className="text-[var(--color-text-muted)] text-center">暂无涨停数据</p>
      </div>
    );
  }

  const isAtLimitUp = data?.is_limit_up || false;
  const statusText = getLimitUpStatus();
  const statusColor = getStatusColor();
  const statusBgColor = getStatusBgColor();

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-black">{data.name}</h3>
          <p className="text-sm text-[var(--color-text-muted)] font-mono">{data.symbol}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg ${autoRefresh ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}
            title={autoRefresh ? '停止自动刷新' : '开启自动刷新'}
          >
            <ICONS.RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
            title="手动刷新"
          >
            <ICONS.RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 涨停状态 */}
      <div className={`${statusBgColor} ${statusColor} p-4 rounded-xl mb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest">涨停状态</p>
            <p className="text-2xl font-black mt-1">{statusText}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest">当前价格</p>
            <p className="text-2xl font-black font-mono mt-1">¥{data.current_price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--color-bg)] p-4 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">涨停价</p>
          <p className="text-xl font-black font-mono text-red-500">¥{data.limit_up_price.toFixed(2)}</p>
        </div>
        <div className="bg-[var(--color-bg)] p-4 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">跌停价</p>
          <p className="text-xl font-black font-mono text-green-500">¥{data.limit_down_price.toFixed(2)}</p>
        </div>
        <div className="bg-[var(--color-bg)] p-4 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">买一封单</p>
          <p className="text-xl font-black font-mono">
            {data.buy_one_volume > 0 ? `${(data.buy_one_volume / 10000).toFixed(1)}万手` : '--'}
          </p>
        </div>
        <div className="bg-[var(--color-bg)] p-4 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">换手率</p>
          <p className="text-xl font-black font-mono">{data.turnover.toFixed(2)}%</p>
        </div>
      </div>

      {/* 价格信息 */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-muted)]">前收盘价</span>
          <span className="font-mono font-bold">¥{data.pre_close.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-muted)]">涨跌额</span>
          <span className={`font-mono font-bold ${data.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-muted)]">涨跌幅</span>
          <span className={`font-mono font-bold ${data.change_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {data.change_percent >= 0 ? '+' : ''}{data.change_percent.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-muted)]">成交量</span>
          <span className="font-mono font-bold">{(data.volume / 10000).toFixed(1)}万手</span>
        </div>
      </div>

      {/* 操作按钮 */}
      {onUseLimitUpPrice && (
        <div className="space-y-3">
          <button
            onClick={handleUseLimitUpPrice}
            disabled={!isAtLimitUp}
            className={`w-full py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all ${isAtLimitUp
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
              }`}
          >
            {isAtLimitUp ? '使用涨停价买入' : '未涨停，无法使用涨停价'}
          </button>
          
          {isAtLimitUp && (
            <div className="text-xs text-[var(--color-text-muted)] text-center">
              <p>涨停价: ¥{data.limit_up_price.toFixed(2)} • 封单: {(data.buy_one_volume / 10000).toFixed(1)}万手</p>
              <p className="mt-1">点击按钮将使用涨停价填充交易面板</p>
            </div>
          )}
        </div>
      )}

      {/* 底部信息 */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
        <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)]">
          <span>数据更新时间</span>
          <span className="font-mono">{new Date(data.update_time).toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] mt-1">
          <span>自动刷新</span>
          <span className={`font-bold ${autoRefresh ? 'text-[#00D4AA]' : 'text-[var(--color-text-muted)]'}`}>
            {autoRefresh ? '开启' : '关闭'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LimitUpPanel;