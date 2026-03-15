/**
 * 股票数据同步管理组件
 * 用于管理后台手动触发数据同步
 */
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SyncResult {
  success: boolean;
  results?: {
    total: number;
    success: number;
    failed: number;
    details: string[];
  };
  error?: string;
}

const StockSyncManager: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  // 同步单只股票
  const syncSingleStock = async (symbol: string) => {
    setSyncing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-stock-data', {
        method: 'POST',
        body: { action: 'sync_info', symbol },
      });

      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // 同步活跃股票（自选股+持仓+热门50）
  const syncActiveStocks = async (includeKline = false) => {
    setSyncing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-stock-data', {
        method: 'POST',
        body: { action: 'sync_active', kline: includeKline },
      });

      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="galaxy-card p-6 rounded-2xl border border-[var(--color-border)]">
      <h3 className="text-lg font-black text-[var(--color-text-primary)] mb-4">
        股票数据同步
      </h3>

      {/* 操作按钮 */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <button
            onClick={() => syncActiveStocks(false)}
            disabled={syncing}
            className="flex-1 py-3 px-4 bg-[#E63946] text-[#1E1E1E] font-bold rounded-xl
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:bg-[#00E5BB] transition-colors"
          >
            {syncing ? '同步中...' : '同步活跃股票行情'}
          </button>
          
          <button
            onClick={() => syncActiveStocks(true)}
            disabled={syncing}
            className="flex-1 py-3 px-4 bg-[var(--color-surface)] text-[var(--color-text-primary)] 
                       font-bold rounded-xl border border-[var(--color-border)]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {syncing ? '同步中...' : '同步行情+K线'}
          </button>
        </div>

        {/* 单只股票同步 */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入股票代码，如 600519"
            className="flex-1 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)]
                       rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
                       focus:outline-none focus:border-[#E63946]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                syncSingleStock((e.target as HTMLInputElement).value);
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              syncSingleStock(input.value);
            }}
            disabled={syncing}
            className="px-6 py-2 bg-[var(--color-surface)] border border-[var(--color-border)]
                       rounded-xl font-bold text-[var(--color-text-primary)]
                       hover:bg-[var(--color-surface-hover)] transition-colors
                       disabled:opacity-50"
          >
            同步
          </button>
        </div>
      </div>

      {/* 同步结果 */}
      {result && (
        <div className={`mt-4 p-4 rounded-xl ${
          result.success 
            ? 'bg-[#E63946]/10 border border-[#E63946]/30' 
            : 'bg-[#FF6B6B]/10 border border-[#FF6B6B]/30'
        }`}>
          {result.success ? (
            <div>
              <p className="font-bold text-[#E63946] mb-2">
                ✅ 同步成功
              </p>
              {result.results && (
                <div className="text-sm text-[var(--color-text-secondary)]">
                  <p>总计: {result.results.total} 只股票</p>
                  <p>成功: {result.results.success}，失败: {result.results.failed}</p>
                  {result.results.details.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">查看详情</summary>
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs font-mono">
                        {result.results.details.map((d, i) => (
                          <div key={i}>{d}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#FF6B6B]">❌ 同步失败: {result.error}</p>
          )}
        </div>
      )}

      {/* 提示信息 */}
      <div className="mt-4 text-xs text-[var(--color-text-muted)]">
        <p>💡 提示：</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>同步范围：用户自选股 + 持仓股 + 热门50只</li>
          <li>定时同步：可在 Supabase 配置 pg_cron 自动执行</li>
          <li>按需同步：用户访问个股详情时自动缓存到数据库</li>
        </ul>
      </div>
    </div>
  );
};

export default StockSyncManager;
