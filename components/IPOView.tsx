import React, { useState, useEffect } from 'react';
import { TradeType } from '../types';
import { tradeService } from '../services/tradeService';
import { fetchSinaIPOData, type IPOData } from '../services/adapters/sinaIPOAdapter';
import { ICONS } from '../constants';

const IPOView: React.FC = () => {
  const [ipoList, setIpoList] = useState<IPOData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  // 加载IPO数据
  const loadIPOData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSinaIPOData();
      setIpoList(data);
    } catch (err) {
      console.error('加载IPO数据失败:', err);
      setError('加载IPO数据失败，请稍后重试');
      setIpoList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIPOData();
  }, []);

  // 处理申购操作
  const handleApply = async (ipo: IPOData) => {
    if (ipo.status !== 'ONGOING') {
      alert(`新股 ${ipo.symbol} 当前状态为 ${getStatusText(ipo.status)}，不可申购`);
      return;
    }

    if (ipo.issuePrice <= 0) {
      alert('发行价无效，无法申购');
      return;
    }

    const quantity = 500; // 默认申购数量，可根据业务调整
    const amount = ipo.issuePrice * quantity;

    if (!confirm(`确认申购 ${ipo.name}(${ipo.symbol}) ${quantity}股，发行价 ¥${ipo.issuePrice}，总金额 ¥${amount.toFixed(2)}？`)) {
      return;
    }

    try {
      setExecuting(ipo.symbol);
      const result = await tradeService.executeTrade({
        userId: '', // 需要从上下文中获取
        type: TradeType.IPO,
        symbol: ipo.symbol,
        name: ipo.name,
        price: ipo.issuePrice,
        quantity,
        marketType: 'A_SHARE',
        logoUrl: undefined
      });

      if (result && !result.error) {
        alert('申购指令已提交，请等待配售结果');
        // 刷新数据
        loadIPOData();
      } else {
        alert(`申购失败: ${result?.error || '未知错误'}`);
      }
    } catch (err: any) {
      console.error('申购执行失败:', err);
      alert(`申购失败: ${err.message || '未知错误'}`);
    } finally {
      setExecuting(null);
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'UPCOMING': return '待申购';
      case 'ONGOING': return '申购中';
      case 'LISTED': return '已上市';
      default: return status;
    }
  };

  // 获取状态样式类
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-yellow-500/20 text-yellow-500';
      case 'ONGOING': return 'bg-green-500/20 text-green-500';
      case 'LISTED': return 'bg-gray-500/20 text-gray-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    loadIPOData();
  };

  if (loading && ipoList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D4AA]"></div>
        <p className="mt-4 text-[var(--color-text-muted)]">正在加载IPO数据...</p>
      </div>
    );
  }

  if (error && ipoList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <ICONS.AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-6 py-3 bg-[#00D4AA] text-[#0A1628] font-black rounded-xl hover:opacity-90 transition-opacity"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black">新股申购</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            实时获取A股市场新股发行信息，支持一键申购
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
        >
          <ICONS.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      {ipoList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <ICONS.AlertCircle className="w-16 h-16 text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-muted)]">暂无IPO数据</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">可能是数据源暂时不可用</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">股票代码</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">名称</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">发行价 (CNY)</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">上市日期</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">状态</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {ipoList.map((ipo) => (
                  <tr key={ipo.symbol} className="hover:bg-[var(--color-surface)] transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold">{ipo.symbol}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold">{ipo.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">{ipo.market || 'A股'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono font-bold">¥{ipo.issuePrice.toFixed(2)}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono">{ipo.listingDate || '待定'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase ${getStatusClass(ipo.status)}`}>
                        {getStatusText(ipo.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleApply(ipo)}
                        disabled={ipo.status !== 'ONGOING' || executing === ipo.symbol}
                        className={`px-4 py-2 rounded-xl font-black text-xs tracking-widest uppercase transition-all ${ipo.status === 'ONGOING'
                            ? 'bg-[#00D4AA] text-[#0A1628] hover:opacity-90'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
                          } ${executing === ipo.symbol ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {executing === ipo.symbol ? '申购中...' : '申购'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
            <p>数据来源: 新浪财经 • 更新时间: {new Date().toLocaleTimeString()}</p>
            <p className="mt-1">提示: 仅"申购中"状态的新股可进行申购操作</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPOView;