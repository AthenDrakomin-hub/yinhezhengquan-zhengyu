import React, { useState, useEffect } from 'react';
import { TradeType } from '../types';
import { tradeService } from '../services/tradeService';
import { ICONS } from '../constants';

interface Transaction {
  id: string;
  symbol: string;
  name: string;
  type: TradeType;
  price: number;
  quantity: number;
  amount: number;
  timestamp: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'MATCHING' | 'PARTIAL' | 'CANCELLED';
  metadata?: Record<string, any>;
}

interface TransactionHistoryProps {
  userId?: string;
  limit?: number;
  showAll?: boolean;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  userId,
  limit = 20,
  showAll = false
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState<string | null>(null);

  // 撤单
  const handleCancel = async (tradeId: string) => {
    if (!confirm('确定要撤销该订单吗？')) return;
    
    try {
      setCancelling(tradeId);
      const { cancelService } = await import('../services/cancelService');
      const result = await cancelService.cancelOrder(tradeId, '用户主动撤单');
      
      alert(`撤单成功，退款金额：¥${result.refundAmount.toFixed(2)}`);
      loadTransactions();
    } catch (err: any) {
      alert(`撤单失败: ${err.message}`);
    } finally {
      setCancelling(null);
    }
  };

  // 加载交易记录
  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tradeService.getTransactions(userId, limit);
      setTransactions(data || []);
    } catch (err: any) {
      console.error('加载交易记录失败:', err);
      setError('加载交易记录失败，请稍后重试');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [userId, limit]);

  // 获取交易类型显示文本
  const getTradeTypeText = (type: TradeType) => {
    switch (type) {
      case TradeType.IPO: return '新股申购';
      case TradeType.BLOCK: return '大宗交易';
      case TradeType.LIMIT_UP: return '涨停打板';
      case TradeType.BUY: return '买入';
      case TradeType.SELL: return '卖出';
      default: return type;
    }
  };

  // 获取交易类型样式类
  const getTradeTypeClass = (type: TradeType) => {
    switch (type) {
      case TradeType.IPO: return 'bg-purple-500/20 text-purple-500';
      case TradeType.BLOCK: return 'bg-blue-500/20 text-blue-500';
      case TradeType.LIMIT_UP: return 'bg-red-500/20 text-red-500';
      case TradeType.BUY: return 'bg-green-500/20 text-green-500';
      case TradeType.SELL: return 'bg-orange-500/20 text-orange-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  // 获取状态样式类
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500/20 text-green-500';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-500';
      case 'FAILED': return 'bg-red-500/20 text-red-500';
      case 'MATCHING': return 'bg-blue-500/20 text-blue-500';
      case 'PARTIAL': return 'bg-orange-500/20 text-orange-500';
      case 'CANCELLED': return 'bg-gray-500/20 text-gray-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '成交';
      case 'PENDING': return '待处理';
      case 'FAILED': return '失败';
      case 'MATCHING': return '撮合中';
      case 'PARTIAL': return '部分成交';
      case 'CANCELLED': return '已撤销';
      default: return status;
    }
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 渲染交易详情
  const renderTransactionDetails = (transaction: Transaction) => {
    const { type, metadata } = transaction;
    
    if (!metadata) return null;

    switch (type) {
      case TradeType.IPO:
        return (
          <div className="mt-2 text-xs text-[var(--color-text-muted)] space-y-1">
            {metadata.issuePrice && (
              <div>发行价: ¥{metadata.issuePrice.toFixed(2)}</div>
            )}
            {metadata.listingDate && (
              <div>上市日期: {metadata.listingDate}</div>
            )}
            {metadata.ipoStatus && (
              <div>申购状态: {metadata.ipoStatus === 'ONGOING' ? '申购中' : 
                metadata.ipoStatus === 'UPCOMING' ? '待申购' : '已上市'}</div>
            )}
          </div>
        );

      case TradeType.BLOCK:
        return (
          <div className="mt-2 text-xs text-[var(--color-text-muted)] space-y-1">
            {metadata.blockDiscount && (
              <div>大宗折扣: {((1 - metadata.blockDiscount) * 100).toFixed(1)}%</div>
            )}
            {metadata.minBlockSize && (
              <div>最小交易量: {metadata.minBlockSize.toLocaleString()}手</div>
            )}
            {metadata.originalPrice && (
              <div>原始价格: ¥{metadata.originalPrice.toFixed(2)}</div>
            )}
          </div>
        );

      case TradeType.LIMIT_UP:
        return (
          <div className="mt-2 text-xs text-[var(--color-text-muted)] space-y-1">
            {metadata.limitUpPrice && (
              <div>涨停价: ¥{metadata.limitUpPrice.toFixed(2)}</div>
            )}
            {metadata.limitDownPrice && (
              <div>跌停价: ¥{metadata.limitDownPrice.toFixed(2)}</div>
            )}
            {metadata.buyOneVolume && (
              <div>买一封单: {(metadata.buyOneVolume / 10000).toFixed(1)}万手</div>
            )}
            {metadata.timestamp && (
              <div>数据时间: {new Date(metadata.timestamp).toLocaleTimeString()}</div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D4AA]"></div>
        <p className="mt-4 text-[var(--color-text-muted)]">正在加载交易记录...</p>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <ICONS.AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={loadTransactions}
          className="px-6 py-3 bg-[#00D4AA] text-[#0A1628] font-black rounded-xl hover:opacity-90 transition-opacity"
        >
          重试
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <ICONS.History className="w-16 h-16 text-[var(--color-text-muted)] mb-4" />
        <p className="text-[var(--color-text-muted)]">暂无交易记录</p>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">开始您的第一笔交易吧</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black">交易记录</h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            查看您的所有交易记录
          </p>
        </div>
        <button
          onClick={loadTransactions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
        >
          <ICONS.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">时间</th>
                <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">代码/名称</th>
                <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">类型</th>
                <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">价格/数量</th>
                <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">金额</th>
                <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">状态</th>
                <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-[var(--color-surface)] transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-mono">{formatTime(transaction.timestamp)}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold">{transaction.symbol}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">{transaction.name}</div>
                    {renderTransactionDetails(transaction)}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase ${getTradeTypeClass(transaction.type)}`}>
                      {getTradeTypeText(transaction.type)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-mono font-bold">¥{transaction.price.toFixed(2)}</div>
                    <div className="text-sm text-[var(--color-text-muted)] mt-1">{transaction.quantity.toLocaleString()}股</div>
                  </td>
                  <td className="p-4">
                    <div className="font-mono font-bold">{formatAmount(transaction.amount)}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase ${getStatusClass(transaction.status)}`}>
                      {getStatusText(transaction.status)}
                    </span>
                  </td>
                  <td className="p-4">
                    {['MATCHING', 'PARTIAL'].includes(transaction.status) && (
                      <button
                        onClick={() => handleCancel(transaction.id)}
                        disabled={cancelling === transaction.id}
                        className="px-3 py-1 bg-red-500/20 text-red-500 rounded-lg text-xs font-black hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {cancelling === transaction.id ? '撤单中...' : '撤单'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!showAll && transactions.length >= limit && (
          <div className="mt-4 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              仅显示最近 {limit} 条记录
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
