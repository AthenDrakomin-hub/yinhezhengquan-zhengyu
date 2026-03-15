/**
 * 预约打新页面
 * 管理新股申购预约
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface IPOStock {
  id: string;
  symbol: string;
  name: string;
  price: string;
  subscriptionDate: string;
  listingDate: string;
  subscribed: boolean;
}

const IPOReserveView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'available' | 'subscribed'>('available');

  // 模拟新股数据
  const [ipoStocks, setIpoStocks] = useState<IPOStock[]>([
    {
      id: '1',
      symbol: '001234',
      name: '某某科技',
      price: '25.68',
      subscriptionDate: '2025-01-20',
      listingDate: '2025-01-30',
      subscribed: false,
    },
    {
      id: '2',
      symbol: '001235',
      name: '某某新材',
      price: '18.50',
      subscriptionDate: '2025-01-21',
      listingDate: '2025-01-31',
      subscribed: true,
    },
    {
      id: '3',
      symbol: '001236',
      name: '某某医药',
      price: '42.00',
      subscriptionDate: '2025-01-22',
      listingDate: '2025-02-01',
      subscribed: false,
    },
  ]);

  const availableIPOs = ipoStocks.filter(s => !s.subscribed);
  const subscribedIPOs = ipoStocks.filter(s => s.subscribed);

  const handleSubscribe = (id: string) => {
    setIpoStocks(prev => prev.map(s => 
      s.id === id ? { ...s, subscribed: true } : s
    ));
  };

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
          <h1 className="text-lg font-semibold text-[#333333]">预约打新</h1>
        </div>
        <button className="text-[#0066CC] text-sm">设置</button>
      </div>

      {/* VIP提示 */}
      <div className="bg-gradient-to-r from-[#C4956A]/10 to-[#8B7355]/10 mx-4 mt-4 rounded-xl p-4 border border-[#C4956A]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C4956A] flex items-center justify-center">
            <span className="text-white text-lg">👑</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#333333]">VIP专属功能</p>
            <p className="text-xs text-[#999999]">7×24小时自动预约打新，不错过任何机会</p>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex bg-white mx-4 mt-4 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'available' ? 'bg-[#0066CC] text-white' : 'text-[#666666]'
          }`}
        >
          可预约 ({availableIPOs.length})
        </button>
        <button
          onClick={() => setActiveTab('subscribed')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'subscribed' ? 'bg-[#0066CC] text-white' : 'text-[#666666]'
          }`}
        >
          已预约 ({subscribedIPOs.length})
        </button>
      </div>

      {/* 新股列表 */}
      <div className="bg-white mx-4 mt-4 rounded-xl">
        {(activeTab === 'available' ? availableIPOs : subscribedIPOs).map((ipo, index) => (
          <div
            key={ipo.id}
            className={`p-4 ${index > 0 ? 'border-t border-[#F0F0F0]' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-base font-medium text-[#333333]">{ipo.name}</p>
                <p className="text-xs text-[#999999]">{ipo.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-[#E63946]">¥{ipo.price}</p>
                <p className="text-xs text-[#999999]">发行价</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-4 text-[#666666]">
                <span>申购: {ipo.subscriptionDate}</span>
                <span>上市: {ipo.listingDate}</span>
              </div>
              {ipo.subscribed ? (
                <span className="text-xs px-3 py-1 bg-[#E5F9EF] text-[#22C55E] rounded-full">
                  已预约
                </span>
              ) : (
                <button 
                  onClick={() => handleSubscribe(ipo.id)}
                  className="text-xs px-3 py-1 bg-[#0066CC] text-white rounded-full"
                >
                  预约
                </button>
              )}
            </div>
          </div>
        ))}

        {(activeTab === 'available' ? availableIPOs : subscribedIPOs).length === 0 && (
          <div className="py-12 text-center text-[#999999]">
            <svg className="w-12 h-12 mx-auto mb-3 text-[#E5E5E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">暂无{activeTab === 'available' ? '可预约' : '已预约'}的新股</p>
          </div>
        )}
      </div>

      {/* 批量预约按钮 */}
      <div className="mx-4 mt-4">
        <button className="w-full py-3 bg-[#0066CC] text-white rounded-lg font-medium">
          一键预约全部
        </button>
      </div>

      {/* 风险提示 */}
      <div className="mx-4 mt-4 mb-4 p-3 bg-[#FFF7ED] rounded-lg">
        <p className="text-xs text-[#F97316]">
          ⚠️ 新股申购存在中签率风险，预约不等于一定能中签
        </p>
      </div>
    </div>
  );
};

export default IPOReserveView;
