/**
 * 盯盘提醒页面
 * 管理股票盯盘和价格预警
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface WatchAlert {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  targetPrice: number;
  type: 'up' | 'down';
  status: 'active' | 'triggered';
}

const WatchlistAlertsView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'triggered'>('active');

  // 模拟盯盘数据
  const [alerts] = useState<WatchAlert[]>([
    {
      id: '1',
      symbol: '000001',
      name: '平安银行',
      currentPrice: 12.50,
      targetPrice: 13.00,
      type: 'up',
      status: 'active',
    },
    {
      id: '2',
      symbol: '600519',
      name: '贵州茅台',
      currentPrice: 1850.00,
      targetPrice: 1800.00,
      type: 'down',
      status: 'active',
    },
    {
      id: '3',
      symbol: '000858',
      name: '五粮液',
      currentPrice: 165.00,
      targetPrice: 170.00,
      type: 'up',
      status: 'triggered',
    },
  ]);

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const triggeredAlerts = alerts.filter(a => a.status === 'triggered');

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-[#F0F0F0]">
        <div className="flex items-center">
          <button onClick={() => navigate('/client/profile')} className="mr-3">
            <svg className="w-6 h-6 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#333333]">我的盯盘</h1>
        </div>
        <button className="text-[#0066CC] text-sm">+ 添加</button>
      </div>

      {/* 统计信息 */}
      <div className="bg-gradient-to-br from-[#0066CC] to-[#004C99] mx-4 mt-4 rounded-xl p-4 text-white">
        <div className="flex justify-between">
          <div className="text-center">
            <p className="text-2xl font-bold">{activeAlerts.length}</p>
            <p className="text-xs text-white/70">监控中</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{triggeredAlerts.length}</p>
            <p className="text-xs text-white/70">已触发</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">50</p>
            <p className="text-xs text-white/70">VIP上限</p>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex bg-white mx-4 mt-4 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'active' ? 'bg-[#0066CC] text-white' : 'text-[#666666]'
          }`}
        >
          监控中 ({activeAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('triggered')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'triggered' ? 'bg-[#0066CC] text-white' : 'text-[#666666]'
          }`}
        >
          已触发 ({triggeredAlerts.length})
        </button>
      </div>

      {/* 盯盘列表 */}
      <div className="bg-white mx-4 mt-4 rounded-xl">
        {(activeTab === 'active' ? activeAlerts : triggeredAlerts).map((alert, index) => (
          <div
            key={alert.id}
            className={`p-4 ${index > 0 ? 'border-t border-[#F0F0F0]' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium text-[#333333]">{alert.name}</p>
                <p className="text-xs text-[#999999]">{alert.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-[#333333]">¥{alert.currentPrice.toFixed(2)}</p>
                <p className="text-xs text-[#999999]">现价</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  alert.type === 'up' 
                    ? 'bg-[#E5F9EF] text-[#22C55E]' 
                    : 'bg-[#FFE5E5] text-[#E63946]'
                }`}>
                  {alert.type === 'up' ? '上涨到' : '下跌到'} ¥{alert.targetPrice.toFixed(2)}
                </span>
                {alert.status === 'triggered' && (
                  <span className="text-xs px-2 py-0.5 bg-[#FFF7ED] text-[#F97316] rounded">
                    已触发
                  </span>
                )}
              </div>
              <button className="text-xs text-[#0066CC]">编辑</button>
            </div>
          </div>
        ))}

        {(activeTab === 'active' ? activeAlerts : triggeredAlerts).length === 0 && (
          <div className="py-12 text-center text-[#999999]">
            <svg className="w-12 h-12 mx-auto mb-3 text-[#E5E5E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-sm">暂无{activeTab === 'active' ? '监控中' : '已触发'}的盯盘</p>
          </div>
        )}
      </div>

      {/* 添加按钮 */}
      <div className="mx-4 mt-4">
        <button className="w-full py-3 bg-[#0066CC] text-white rounded-lg font-medium">
          添加盯盘提醒
        </button>
      </div>

      {/* 使用说明 */}
      <div className="mx-4 mt-4 mb-4">
        <p className="text-xs text-[#999999] text-center">
          VIP用户最多可设置50个盯盘提醒
        </p>
      </div>
    </div>
  );
};

export default WatchlistAlertsView;
