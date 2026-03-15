/**
 * 价格预警页面
 * 管理价格预警条件单
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useVipPermission } from '../../../services/vipPermissionService';
import VipUpgradeModal from '../../shared/VipUpgradeModal';

interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  stock_name: string;
  trigger_price: number;
  trigger_condition: 'ABOVE' | 'BELOW';
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  expires_at?: string;
  triggered_at?: string;
  triggered_price?: number;
}

interface PriceAlertViewProps {
  onBack?: () => void;
}

const PriceAlertView: React.FC<PriceAlertViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const vipPermission = useVipPermission();
  
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVipModal, setShowVipModal] = useState(false);
  
  // 创建预警弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    stock_name: '',
    trigger_price: '',
    trigger_condition: 'ABOVE' as 'ABOVE' | 'BELOW',
  });
  const [creating, setCreating] = useState(false);
  const [searchResults, setSearchResults] = useState<{symbol: string; name: string}[]>([]);
  const [searching, setSearching] = useState(false);

  // 加载价格预警列表
  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAlerts([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('conditional_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('order_type', 'PRICE_ALERT')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAlerts((data || []) as PriceAlert[]);
    } catch (err) {
      console.error('加载价格预警失败:', err);
      setError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // 搜索股票
  const handleSearchStock = async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('symbol, name')
        .or(`symbol.ilike.%${keyword}%,name.ilike.%${keyword}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
      }
    } catch {
      // 忽略搜索错误
    } finally {
      setSearching(false);
    }
  };

  // 创建预警
  const handleCreateAlert = async () => {
    // VIP权限检查
    if (!vipPermission.canUseVipFeatures) {
      setShowVipModal(true);
      return;
    }

    if (!newAlert.symbol || !newAlert.trigger_price) {
      setError('请填写完整的预警信息');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登录');

      const { error: insertError } = await supabase
        .from('conditional_orders')
        .insert({
          user_id: user.id,
          symbol: newAlert.symbol,
          stock_name: newAlert.stock_name,
          trigger_price: parseFloat(newAlert.trigger_price),
          trigger_condition: newAlert.trigger_condition,
          order_type: 'PRICE_ALERT',
          status: 'ACTIVE',
        });

      if (insertError) throw insertError;

      // 重置表单并关闭弹窗
      setNewAlert({
        symbol: '',
        stock_name: '',
        trigger_price: '',
        trigger_condition: 'ABOVE',
      });
      setShowCreateModal(false);
      loadAlerts();
    } catch (err) {
      console.error('创建预警失败:', err);
      setError('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  // 取消预警
  const handleCancelAlert = async (alertId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('conditional_orders')
        .update({ status: 'CANCELLED' })
        .eq('id', alertId);

      if (updateError) throw updateError;
      
      setAlerts(prev =>
        prev.map(a => a.id === alertId ? { ...a, status: 'CANCELLED' as const } : a)
      );
    } catch (err) {
      console.error('取消预警失败:', err);
      setError('取消失败，请重试');
    }
  };

  // 删除预警
  const handleDeleteAlert = async (alertId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('conditional_orders')
        .delete()
        .eq('id', alertId);

      if (deleteError) throw deleteError;
      
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('删除预警失败:', err);
      setError('删除失败，请重试');
    }
  };

  // 格式化价格
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 活跃预警数量
  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-12">
          <button 
            onClick={() => onBack ? onBack() : navigate(-1)}
            className="flex items-center text-[#333333]"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-base font-medium">价格预警</span>
          </button>
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="text-xs text-[#0066CC] px-2 py-1"
          >
            刷新
          </button>
        </div>
      </header>

      {/* 统计信息 */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <span className="text-sm text-[#666666]">
          共 {alerts.length} 条预警，{activeCount} 条生效中
        </span>
        <button
          onClick={() => {
            if (!vipPermission.canUseVipFeatures) {
              setShowVipModal(true);
            } else {
              setShowCreateModal(true);
            }
          }}
          className="px-4 py-1.5 bg-[#0066CC] text-white text-sm rounded-lg flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加预警
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 加载中 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0066CC] border-t-transparent"></div>
          <p className="text-[#999999] text-sm mt-3">加载中...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-[#999999] text-sm mt-3">暂无价格预警</p>
          <p className="text-[#CCCCCC] text-xs mt-1">添加预警，股价触及时会通知您</p>
          <button
            onClick={() => {
              if (!vipPermission.canUseVipFeatures) {
                setShowVipModal(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="mt-4 px-6 py-2 bg-[#0066CC] text-white text-sm rounded-lg"
          >
            立即添加
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0F0]">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className="bg-white px-4 py-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-[#333333]">
                      {alert.stock_name || alert.symbol}
                    </span>
                    <span className="text-xs text-[#999999]">{alert.symbol}</span>
                    {alert.status === 'ACTIVE' && (
                      <span className="text-xs px-1.5 py-0.5 bg-[#E5F9EF] text-[#22C55E] rounded">
                        生效中
                      </span>
                    )}
                    {alert.status === 'TRIGGERED' && (
                      <span className="text-xs px-1.5 py-0.5 bg-[#FFF3E0] text-[#F97316] rounded">
                        已触发
                      </span>
                    )}
                    {alert.status === 'CANCELLED' && (
                      <span className="text-xs px-1.5 py-0.5 bg-[#F5F5F5] text-[#999999] rounded">
                        已取消
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`${
                      alert.trigger_condition === 'ABOVE' ? 'text-[#E63946]' : 'text-[#22C55E]'
                    }`}>
                      {alert.trigger_condition === 'ABOVE' ? '涨破' : '跌破'}
                    </span>
                    <span className="text-[#333333] font-medium">
                      ¥{formatPrice(alert.trigger_price)}
                    </span>
                  </div>
                </div>
                
                {alert.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleCancelAlert(alert.id)}
                    className="text-xs text-[#999999] px-2 py-1 border border-[#E5E5E5] rounded"
                  >
                    取消
                  </button>
                )}
                {alert.status !== 'ACTIVE' && (
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="text-xs text-[#E63946] px-2 py-1"
                  >
                    删除
                  </button>
                )}
              </div>
              
              <div className="text-xs text-[#999999]">
                创建于 {formatTime(alert.created_at)}
                {alert.triggered_at && (
                  <span className="ml-2">
                    触发于 {formatTime(alert.triggered_at)}
                    {alert.triggered_price && ` (¥${formatPrice(alert.triggered_price)})`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建预警弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-auto">
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#666666] text-sm"
              >
                取消
              </button>
              <span className="text-base font-medium">添加价格预警</span>
              <button
                onClick={handleCreateAlert}
                disabled={creating || !newAlert.symbol || !newAlert.trigger_price}
                className="text-sm text-[#0066CC] disabled:text-[#CCCCCC]"
              >
                {creating ? '创建中...' : '确定'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* VIP提示 */}
              <div className="bg-[#FFF8E1] rounded-lg p-3 flex items-start gap-2">
                <span className="text-[#F97316] text-sm">⭐</span>
                <div className="text-xs text-[#666666]">
                  <p className="font-medium text-[#333333] mb-1">VIP功能</p>
                  价格预警可帮助您在股价达到目标时及时收到提醒，不错过交易机会。
                </div>
              </div>

              {/* 股票搜索 */}
              <div>
                <label className="text-sm text-[#333333] mb-2 block">股票代码/名称</label>
                <input
                  type="text"
                  placeholder="输入股票代码或名称搜索"
                  value={newAlert.symbol}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewAlert(prev => ({ ...prev, symbol: value }));
                    handleSearchStock(value);
                  }}
                  className="w-full h-10 px-3 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:border-[#0066CC]"
                />
                
                {/* 搜索结果 */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-[#E5E5E5] rounded-lg overflow-hidden">
                    {searchResults.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => {
                          setNewAlert(prev => ({
                            ...prev,
                            symbol: stock.symbol,
                            stock_name: stock.name,
                          }));
                          setSearchResults([]);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#F5F5F5] flex items-center justify-between"
                      >
                        <span className="text-sm text-[#333333]">{stock.name}</span>
                        <span className="text-xs text-[#999999]">{stock.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 触发条件 */}
              <div>
                <label className="text-sm text-[#333333] mb-2 block">触发条件</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewAlert(prev => ({ ...prev, trigger_condition: 'ABOVE' }))}
                    className={`flex-1 h-10 rounded-lg text-sm border ${
                      newAlert.trigger_condition === 'ABOVE'
                        ? 'bg-[#FEF2F2] border-[#E63946] text-[#E63946]'
                        : 'border-[#E5E5E5] text-[#666666]'
                    }`}
                  >
                    涨破 (高于)
                  </button>
                  <button
                    onClick={() => setNewAlert(prev => ({ ...prev, trigger_condition: 'BELOW' }))}
                    className={`flex-1 h-10 rounded-lg text-sm border ${
                      newAlert.trigger_condition === 'BELOW'
                        ? 'bg-[#F0FDF4] border-[#22C55E] text-[#22C55E]'
                        : 'border-[#E5E5E5] text-[#666666]'
                    }`}
                  >
                    跌破 (低于)
                  </button>
                </div>
              </div>

              {/* 目标价格 */}
              <div>
                <label className="text-sm text-[#333333] mb-2 block">目标价格</label>
                <div className="flex items-center">
                  <span className="text-[#333333] mr-2">¥</span>
                  <input
                    type="number"
                    placeholder="输入目标价格"
                    value={newAlert.trigger_price}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, trigger_price: e.target.value }))}
                    className="flex-1 h-10 px-3 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:border-[#0066CC]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIP升级弹窗 */}
      <VipUpgradeModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        featureName="价格预警"
      />
    </div>
  );
};

export default PriceAlertView;
