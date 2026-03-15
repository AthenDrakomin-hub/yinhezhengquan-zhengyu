/**
 * 新股申购页面
 * 支持查看IPO列表和一键申购
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIPOList } from '../../../services/ipoService';
import { ICONS } from '../../../lib/constants';

interface IPOViewProps {
  onBack?: () => void;
}

const IPOView: React.FC<IPOViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
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
    if (ipo.status !== 'ONGOING') {
      alert(`新股 ${ipo.name} 当前状态不可申购（${ipo.status === 'UPCOMING' ? '待申购' : ipo.status}）`);
      return;
    }
    if (!ipo.ipo_price || ipo.ipo_price <= 0) {
      alert('发行价无效，无法申购');
      return;
    }
    
    // 根据股票代码判断申购单位
    const unit = ipo.symbol.startsWith('60') ? 1000 : 500;
    const marketName = ipo.symbol.startsWith('60') ? '沪市主板' : 
                       ipo.symbol.startsWith('688') ? '科创板' :
                       ipo.symbol.startsWith('00') ? '深市主板' :
                       ipo.symbol.startsWith('30') ? '创业板' : ipo.market;
    
    const quantity = unit;
    const amount = ipo.ipo_price * quantity;
    if (!window.confirm(`确认申购 ${ipo.name}(${ipo.symbol}) ${quantity}股，总金额 ¥${amount.toFixed(2)}？\n\n${marketName}最低申购${unit}股`)) {
      return;
    }
    try {
      setExecuting(ipo.symbol);
      
      const { supabase } = await import('../../../lib/supabase');
      const { data, error } = await supabase.functions.invoke('create-ipo-order', {
        body: {
          market_type: 'A股',
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

  // 获取状态标签样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ONGOING':
        return { bg: 'bg-[#E63946]', text: 'text-white', label: '申购中' };
      case 'UPCOMING':
        return { bg: 'bg-[#F97316]', text: 'text-white', label: '待申购' };
      case 'LISTED':
        return { bg: 'bg-[#22C55E]', text: 'text-white', label: '已上市' };
      case 'CANCELLED':
        return { bg: 'bg-[#6B7280]', text: 'text-white', label: '已取消' };
      default:
        return { bg: 'bg-[#6B7280]', text: 'text-white', label: status };
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-[#0066CC] px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onBack?.() || navigate(-1)}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-semibold">新股申购</h1>
            <p className="text-white/70 text-xs">实时获取A股新股发行信息</p>
          </div>
          <button
            onClick={loadIPOData}
            disabled={loading}
            className="px-3 py-1.5 bg-white/20 text-white text-xs rounded-lg flex items-center gap-1"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新
          </button>
        </div>
      </header>

      {/* 筛选标签 */}
      <div className="bg-white px-4 py-3 border-b border-[#E5E5E5]">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'ALL', label: '全部' },
            { key: 'ONGOING', label: '申购中' },
            { key: 'UPCOMING', label: '待申购' },
            { key: 'LISTED', label: '已上市' },
            { key: 'CANCELLED', label: '已取消' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterStatus(item.key as any)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filterStatus === item.key
                  ? 'bg-[#E63946] text-white'
                  : 'bg-[#F5F5F5] text-[#666666]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 pb-20">
        {/* 加载中 */}
        {loading && ipoList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0066CC] border-t-transparent"></div>
            <p className="text-sm text-[#999999] mt-3">加载中...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && ipoList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-16 h-16 text-[#CCCCCC] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[#999999] text-sm mb-4">{error}</p>
            <button
              onClick={loadIPOData}
              className="px-6 py-2 bg-[#0066CC] text-white text-sm rounded-lg"
            >
              重试
            </button>
          </div>
        )}

        {/* 空数据 */}
        {!loading && ipoList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-16 h-16 text-[#CCCCCC] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-[#999999] text-sm">暂无新股数据</p>
          </div>
        )}

        {/* IPO卡片列表 */}
        <div className="space-y-3">
          {ipoList.map((ipo, index) => {
            const statusStyle = getStatusStyle(ipo.status);
            const unit = ipo.symbol?.startsWith('60') ? 1000 : 500;
            const marketName = ipo.symbol?.startsWith('60') ? '沪市' : 
                              ipo.symbol?.startsWith('688') ? '科创板' :
                              ipo.symbol?.startsWith('00') ? '深市' :
                              ipo.symbol?.startsWith('30') ? '创业板' : '';
            
            return (
              <div key={`${ipo.symbol}-${index}`} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* 卡片头部 */}
                <div className="flex items-center justify-between p-4 border-b border-[#F0F0F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#004C99] flex items-center justify-center text-white text-lg font-bold">
                      {ipo.name?.charAt(0) || 'N'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#333333]">{ipo.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#999999]">
                        <span>{ipo.symbol}</span>
                        <span>·</span>
                        <span>{marketName}</span>
                        {ipo.subscription_code && (
                          <>
                            <span>·</span>
                            <span className="text-[#E63946]">申购码 {ipo.subscription_code}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 详细信息 */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* 发行价 */}
                    <div>
                      <p className="text-xs text-[#999999] mb-1">发行价格</p>
                      <p className="text-lg font-bold text-[#333333]">
                        {ipo.ipo_price && ipo.ipo_price > 0 ? `¥${ipo.ipo_price.toFixed(2)}` : '待定'}
                      </p>
                    </div>
                    {/* 市盈率 */}
                    <div>
                      <p className="text-xs text-[#999999] mb-1">市盈率</p>
                      <p className="text-lg font-bold text-[#333333]">
                        {ipo.pe_ratio ? ipo.pe_ratio.toFixed(2) : '-'}
                      </p>
                    </div>
                    {/* 发行日期 */}
                    <div>
                      <p className="text-xs text-[#999999] mb-1">申购日期</p>
                      <p className="text-sm font-medium text-[#333333]">
                        {formatDate(ipo.issue_date)}
                      </p>
                    </div>
                    {/* 上市日期 */}
                    <div>
                      <p className="text-xs text-[#999999] mb-1">上市日期</p>
                      <p className="text-sm font-medium text-[#333333]">
                        {formatDate(ipo.listing_date) || '待上市'}
                      </p>
                    </div>
                    {/* 发行数量 */}
                    <div>
                      <p className="text-xs text-[#999999] mb-1">发行数量</p>
                      <p className="text-sm font-medium text-[#333333]">
                        {ipo.issue_volume ? `${ipo.issue_volume.toLocaleString()}万股` : '-'}
                      </p>
                    </div>
                    {/* 网上发行 */}
                    <div>
                      <p className="text-xs text-[#999999] mb-1">网上发行</p>
                      <p className="text-sm font-medium text-[#333333]">
                        {ipo.online_issue_volume ? `${ipo.online_issue_volume.toLocaleString()}万股` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* 申购提示 */}
                  {ipo.status === 'ONGOING' && (
                    <div className="mt-3 p-3 bg-[#FFF7ED] rounded-lg">
                      <p className="text-xs text-[#F97316]">
                        💡 {marketName}最低申购 {unit} 股，需资金 ¥{((ipo.ipo_price || 0) * unit).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleApply(ipo)}
                    disabled={(ipo.status !== 'ONGOING' && ipo.status !== 'UPCOMING') || executing === ipo.symbol}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                      ipo.status === 'ONGOING'
                        ? 'bg-[#E63946] text-white hover:bg-[#D62828]'
                        : ipo.status === 'UPCOMING'
                        ? 'bg-[#F97316] text-white hover:bg-[#EA580C]'
                        : 'bg-[#E5E5E5] text-[#999999]'
                    } disabled:opacity-50`}
                  >
                    {executing === ipo.symbol 
                      ? '申购中...' 
                      : ipo.status === 'ONGOING' 
                      ? '立即申购' 
                      : ipo.status === 'UPCOMING'
                      ? '预约申购'
                      : '暂不可申购'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部提示 */}
        {ipoList.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-[#999999]">
              数据仅供参考，请以交易所公告为准
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IPOView;
