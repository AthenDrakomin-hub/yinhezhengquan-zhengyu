import React, { useState, useEffect } from 'react';
import { cancelService } from '../../../services/cancelService';
import { ICONS } from '../../../lib/constants';

interface FundFlow {
  id: string;
  flow_type: string;
  amount: number;
  balance_after: number;
  remark: string;
  created_at: string;
}

interface FundFlowsViewProps {
  userId: string;
  onBack?: () => void;
}

const FundFlowsView: React.FC<FundFlowsViewProps> = ({ userId, onBack }) => {
  const [flows, setFlows] = useState<FundFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlows();
  }, [userId]);

  const loadFlows = async () => {
    setLoading(true);
    const data = await cancelService.getFundFlows(userId);
    setFlows(data);
    setLoading(false);
  };

  const getFlowTypeText = (type: string) => {
    const map: Record<string, string> = {
      'BUY_DEDUCT': '买入扣款',
      'SELL_INCOME': '卖出收入',
      'CANCEL_REFUND': '撤单退款',
      'DEPOSIT': '充值',
      'WITHDRAW': '提现'
    };
    return map[type] || type;
  };

  if (loading) {
    return <div className="text-center p-8">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}
        <h3 className="text-lg font-bold">资金流水</h3>
      </div>
      <div className="galaxy-card rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-surface)]">
            <tr>
              <th className="text-left p-4 text-xs">时间</th>
              <th className="text-left p-4 text-xs">类型</th>
              <th className="text-right p-4 text-xs">金额</th>
              <th className="text-right p-4 text-xs">余额</th>
              <th className="text-left p-4 text-xs">备注</th>
            </tr>
          </thead>
          <tbody>
            {flows.map(flow => (
              <tr key={flow.id} className="border-t border-[var(--color-border)]">
                <td className="p-4 text-sm">{new Date(flow.created_at).toLocaleString()}</td>
                <td className="p-4 text-sm">{getFlowTypeText(flow.flow_type)}</td>
                <td className={`p-4 text-sm text-right font-mono ${flow.amount > 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                  {flow.amount > 0 ? '+' : ''}{flow.amount.toFixed(2)}
                </td>
                <td className="p-4 text-sm text-right font-mono">{flow.balance_after.toFixed(2)}</td>
                <td className="p-4 text-sm text-[var(--color-text-muted)]">{flow.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FundFlowsView;
