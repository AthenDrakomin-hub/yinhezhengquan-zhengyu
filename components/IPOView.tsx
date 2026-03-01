import React, { useState, useEffect } from 'react';
import { getIPOList } from '../services/ipoService';
import { ICONS } from '../constants';

const IPOView: React.FC = () => {
  const [ipoList, setIpoList] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LISTED' | 'UPCOMING' | 'CANCELLED' | 'ONGOING'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  const loadIPOData = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = filterStatus === 'ALL' ? undefined : filterStatus;
      const data = await getIPOList(status as any);
      setIpoList(data || []);
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
  }, [filterStatus]);

  const handleApply = async (ipo: any) => {
    if (ipo.status !== 'ONGOING' && ipo.status !== 'UPCOMING') {
      alert(`新股 ${ipo.name} 当前状态不可申购`);
      return;
    }
    if (!ipo.ipo_price || ipo.ipo_price <= 0) {
      alert('发行价无效，无法申购');
      return;
    }
    const minUnit = 100;
    const quantity = minUnit;
    const amount = ipo.ipo_price * quantity;
    if (!window.confirm(`确认申购 ${ipo.name}(${ipo.symbol}) ${quantity}股，总金额 ¥${amount.toFixed(2)}？`)) {
      return;
    }
    try {
      setExecuting(ipo.symbol);
      
      // 调用 create-trade-order 统一接口
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.functions.invoke('create-trade-order', {
        body: {
          market_type: ipo.market === 'SH' ? 'A_SHARE' : 'A_SHARE',
          trade_type: 'IPO',
          stock_code: ipo.symbol,
          stock_name: ipo.name,
          price: ipo.ipo_price,
          quantity
        }
      });
      
      if (error) {
        throw new Error(error.message || '申购失败');
      }
      
      if (data?.error) {
        alert(`申购失败: ${data.error}`);
      } else {
        alert('申购指令已提交，请等待配售结果');
        loadIPOData();
      }
    } catch (err: any) {
      console.error('申购执行失败:', err);
      alert(`申购失败: ${err.message || '未知错误'}`);
    } finally {
      setExecuting(null);
    }
  };

  // 加载中状态
  if (loading && ipoList.length === 0) {
    return React.createElement('div', { className: 'flex flex-col items-center justify-center h-full p-8' },
      React.createElement('div', { className: 'animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D4AA]' }),
      React.createElement('p', { className: 'mt-4 text-[var(--color-text-muted)]' }, '正在加载IPO数据...')
    );
  }

  // 错误状态
  if (error && ipoList.length === 0) {
    return React.createElement('div', { className: 'flex flex-col items-center justify-center h-full p-8' },
      React.createElement(ICONS.AlertCircle, { className: 'w-16 h-16 text-red-500 mb-4' }),
      React.createElement('p', { className: 'text-red-500 mb-4' }, error),
      React.createElement('button', {
        onClick: () => loadIPOData(),
        className: 'px-6 py-3 bg-[#00D4AA] text-[#0A1628] font-black rounded-xl hover:opacity-90'
      }, '重试')
    );
  }

  // 主渲染
  return React.createElement('div', { className: 'flex flex-col h-full p-6' },
    // 顶部栏
    React.createElement('div', { className: 'flex justify-between items-center mb-6' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'text-2xl font-black' }, '新股申购'),
        React.createElement('p', { className: 'text-[var(--color-text-muted)] text-sm mt-1' }, '从Supabase数据库获取A股新股发行信息，支持一键申购')
      ),
      React.createElement('div', { className: 'flex items-center gap-3' },
        // 筛选按钮
        React.createElement('div', { className: 'flex gap-2' },
          (['ALL', 'ONGOING', 'UPCOMING', 'LISTED', 'CANCELLED'] as const).map(status => 
            React.createElement('button', {
              key: status,
              onClick: () => setFilterStatus(status),
              className: `px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                filterStatus === status
                  ? 'bg-[#00D4AA] text-[#0A1628]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`
            }, status === 'ALL' ? '全部' : 
               status === 'ONGOING' ? '申购中' : 
               status === 'UPCOMING' ? '待申购' : 
               status === 'LISTED' ? '已上市' : '已取消'
            )
          )
        ),
        // 刷新按钮
        React.createElement('button', {
          onClick: () => loadIPOData(),
          disabled: loading,
          className: 'flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-xl hover:bg-[var(--color-surface-hover)] disabled:opacity-50'
        },
          React.createElement(ICONS.RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }),
          loading ? '刷新中...' : '刷新数据'
        )
      )
    ),

    // 空数据
    ipoList.length === 0 ? 
      React.createElement('div', { className: 'flex-1 flex flex-col items-center justify-center' },
        React.createElement(ICONS.AlertCircle, { className: 'w-16 h-16 text-[var(--color-text-muted)] mb-4' }),
        React.createElement('p', { className: 'text-[var(--color-text-muted)]' }, '暂无IPO数据')
      )
    :
    // 表格
    React.createElement('div', { className: 'flex-1 overflow-auto' },
      React.createElement('div', { className: 'glass-card rounded-2xl overflow-hidden' },
        React.createElement('table', { className: 'w-full min-w-[1400px] border-collapse' },
          // 表头
          React.createElement('thead', null,
            React.createElement('tr', { className: 'border-b border-[var(--color-border)]' },
              ['证券代码','申购代码','证券简称','上网发行日期','上市日期','发行数量(万股)','上网发行数量(万股)','发行价格(元)','市盈率','申购操作'].map(text => 
                React.createElement('th', {
                  className: 'text-left py-4 px-3 text-[12px] font-black text-[var(--color-text-primary)] tracking-wider'
                }, text)
              )
            )
          ),
          // 表体
          React.createElement('tbody', null,
            ipoList.map((ipo, index) => 
              React.createElement('tr', {
                key: `${ipo.symbol}-${index}`,
                className: 'border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-all'
              },
                // 证券代码
                React.createElement('td', { className: 'py-4 px-3 text-left font-mono text-sm font-black' }, ipo.symbol),
                // 申购代码
                React.createElement('td', { className: 'py-4 px-3 text-center font-mono text-sm font-black text-[#00D4AA]' }, ipo.subscription_code || '-'),
                // 证券简称
                React.createElement('td', { className: 'py-4 px-3 text-left' },
                  React.createElement('div', { className: 'font-bold' }, ipo.name),
                  React.createElement('div', { className: 'text-xs text-[var(--color-text-muted)] mt-1' },
                    ipo.market === 'SH' ? '沪市' : ipo.market === 'SZ' ? '深市' : ipo.market
                  )
                ),
                // 发行日期
                React.createElement('td', { className: 'py-4 px-3 text-center font-mono text-sm' },
                  ipo.issue_date ? new Date(ipo.issue_date).toLocaleDateString() : '-'
                ),
                // 上市日期
                React.createElement('td', { className: 'py-4 px-3 text-center font-mono text-sm' },
                  ipo.listing_date ? new Date(ipo.listing_date).toLocaleDateString() : '待上市'
                ),
                // 发行数量
                React.createElement('td', { className: 'py-4 px-3 text-center font-mono text-sm' },
                  ipo.issue_volume ? ipo.issue_volume.toLocaleString() : '-'
                ),
                // 网上发行数量
                React.createElement('td', { className: 'py-4 px-3 text-center font-mono text-sm' },
                  ipo.online_issue_volume ? ipo.online_issue_volume.toLocaleString() : '-'
                ),
                // 发行价格
                React.createElement('td', { className: 'py-4 px-3 text-center font-mono text-sm font-black' },
                  ipo.ipo_price && ipo.ipo_price > 0 ? `¥${ipo.ipo_price.toFixed(2)}` : '待定'
                ),
                // 市盈率
                React.createElement('td', { className: 'py-4 px-3 text-center font-mono text-sm' },
                  ipo.pe_ratio ? ipo.pe_ratio.toFixed(2) : '-'
                ),
                // 申购操作
                React.createElement('td', { className: 'py-4 px-3 text-center' },
                  React.createElement('div', { className: 'w-28 mx-auto' },
                    React.createElement('button', {
                      onClick: () => handleApply(ipo),
                      disabled: ipo.status !== 'ONGOING' && ipo.status !== 'UPCOMING' || executing === ipo.symbol,
                      className: 'w-full py-2.5 rounded-xl bg-[#00D4AA] text-[#0A1628] font-black text-xs uppercase hover:bg-[#00b88f] disabled:opacity-50'
                    }, executing === ipo.symbol ? '申购中...' : '申购')
                  )
                )
              )
            )
          )
        )
      )
    )
  );
};

export default IPOView;