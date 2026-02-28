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
      alert(`新股 ${ipo.name} 当前状态为 ${getStatusText(ipo.status)}，不可申购`);
      return;
    }

    if (ipo.issuePrice <= 0) {
      alert('发行价无效，无法申购');
      return;
    }

    // 使用IPO数据中的最小申购单位或默认值
    const minUnit = ipo.minSubscriptionUnit || 500;
    const maxQuantity = ipo.maxSubscriptionQuantity || minUnit; // 如果没有最大申购量，就使用最小单位
    
    // 计算申购数量（可以考虑使用最大申购量或用户输入）
    const quantity = Math.min(maxQuantity, minUnit); // 使用最小单位或最大可申购数量
    const amount = ipo.issuePrice * quantity;

    if (!confirm(`确认申购 ${ipo.name}(${ipo.symbol}) ${quantity}股，发行价 ¥${ipo.issuePrice}，总金额 ¥${amount.toFixed(2)}？\n\n最小申购单位: ${minUnit}股`)) {
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
            {/* 严格对齐新浪表头的表格 */}
            <table className="w-full min-w-[1400px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">证券代码</th>
                  <th className="text-center py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">申购代码</th>
                  <th className="text-left py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">证券简称</th>
                  <th className="text-center py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">
                    上网发行日期 ↓
                  </th>
                  <th className="text-center py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">上市日期</th>
                  <th className="text-center py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">发行数量(万股)</th>
                  <th className="text-center py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">上网发行数量(万股)</th>
                  <th className="text-center py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">发行价格(元)</th>
                  <th className="text-center py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">市盈率</th>
                  <th className="text-center py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider">申购操作</th>
                </tr>
              </thead>
              <tbody>
                {ipoList.map((ipo, index) => (
                  <tr 
                    key={`${ipo.symbol}-${index}`} 
                    className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-all`}
                  >
                    {/* 证券代码 */}
                    <td className="py-4 px-3 text-left font-mono text-sm font-black">
                      {ipo.symbol}
                    </td>
                    {/* 申购代码 */}
                    <td className="py-4 px-3 text-center font-mono text-sm font-black text-[#00D4AA]">
                      {ipo.subscriptionCode || ipo.symbol}
                    </td>
                    {/* 证券简称 */}
                    <td className="py-4 px-3 text-left">
                      <div className="font-bold">{ipo.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">{ipo.market || 'A股'}</div>
                    </td>
                    {/* 上网发行日期 */}
                    <td className="py-4 px-3 text-center font-mono text-sm">
                      {ipo.onlineIssueDate || '-'}
                    </td>
                    {/* 上市日期 */}
                    <td className="py-4 px-3 text-center font-mono text-sm">
                      {ipo.listingDate || '待上市'}
                    </td>
                    {/* 发行数量(万股) */}
                    <td className="py-4 px-3 text-center font-mono text-sm">
                      {ipo.issueVolume ? ipo.issueVolume.toLocaleString() : '-'}
                    </td>
                    {/* 上网发行数量(万股) */}
                    <td className="py-4 px-3 text-center font-mono text-sm">
                      {ipo.onlineIssueVolume ? ipo.onlineIssueVolume.toLocaleString() : '-'}
                    </td>
                    {/* 发行价格(元) */}
                    <td className="py-4 px-3 text-center font-mono text-sm font-black">
                      {ipo.issuePrice > 0 ? `¥${ipo.issuePrice.toFixed(2)}` : '待定'}
                    </td>
                    {/* 市盈率 */}
                    <td className="py-4 px-3 text-center font-mono text-sm">
                      {ipo.peRatio ? ipo.peRatio.toFixed(2) : '-'}
                    </td>
                    {/* 申购操作 */}
                    <td className="py-4 px-3 text-center">
                      <div className="w-28 mx-auto">
                        <button 
                          onClick={() => handleApply(ipo)}
                          disabled={ipo.status !== 'ONGOING' || executing === ipo.symbol}
                          className="w-full py-2.5 rounded-xl bg-[#00D4AA] text-[#0A1628] font-black text-xs uppercase tracking-wider hover:bg-[#00b88f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {executing === ipo.symbol ? '申购中...' : '申购'}
                        </button>
                        <p className="text-[9px] text-[var(--color-text-muted)] mt-1">
                          {ipo.maxSubscriptionQuantity ? `上限：${(ipo.maxSubscriptionQuantity/10000).toFixed(0)}万股` : ''}
                        </p>
                      </div>
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