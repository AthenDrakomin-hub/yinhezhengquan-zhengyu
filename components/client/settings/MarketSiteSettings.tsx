/**
 * 行情站点选择页面
 * 用于选择最优的行情数据服务器站点
 */

import React, { useState } from 'react';

interface Site {
  id: string;
  name: string;
  location: string;
  latency: number | null;
  status: 'optimal' | 'good' | 'normal' | 'offline';
  isDefault?: boolean;
}

const MarketSiteSettings: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [selectedSite, setSelectedSite] = useState('yh-a');
  const [sites, setSites] = useState<Site[]>([
    { id: 'yh-a', name: '银河云A', location: '北京', latency: null, status: 'normal', isDefault: true },
    { id: 'yh-b', name: '银河云B', location: '上海', latency: null, status: 'normal' },
    { id: 'tx-cloud', name: '腾讯云', location: '广州', latency: null, status: 'normal' },
    { id: 'ali-cloud', name: '阿里云', location: '杭州', latency: null, status: 'normal' },
  ]);

  // 模拟延迟测试
  const testLatency = async () => {
    setTesting(true);
    setSites(prev => prev.map(s => ({ ...s, latency: null, status: 'normal' as const })));
    
    for (let i = 0; i < sites.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      const latency = Math.floor(Math.random() * 80) + 5;
      const status = latency < 20 ? 'optimal' : latency < 40 ? 'good' : latency < 70 ? 'normal' : 'offline';
      setSites(prev => prev.map((s, idx) => idx === i ? { ...s, latency, status } : s));
    }
    
    setTesting(false);
  };

  const handleSelectSite = (siteId: string) => {
    setSelectedSite(siteId);
    setSites(prev => prev.map(s => ({ ...s, isDefault: s.id === siteId })));
  };

  const getStatusColor = (status: Site['status']) => {
    const colors = {
      optimal: 'text-[#22C55E]',
      good: 'text-[#3B82F6]',
      normal: 'text-[#F97316]',
      offline: 'text-[#E63946]'
    };
    return colors[status];
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#E3F2FD] px-4 py-3 mx-4 mt-4 rounded-lg">
        <p className="text-sm text-[#0066CC]">
          📊 行情站点影响行情数据的刷新速度和稳定性
        </p>
      </div>

      <div className="px-4 mt-4">
        <button
          onClick={testLatency}
          disabled={testing}
          className={`w-full py-3 rounded-lg font-medium ${testing ? 'bg-[#E5E5E5] text-[#999999]' : 'bg-[#0066CC] text-white'}`}
        >
          {testing ? '测速中...' : '一键测速'}
        </button>
      </div>

      <div className="bg-white mx-4 mt-4 rounded-xl">
        {sites.map((site, index) => (
          <div
            key={site.id}
            onClick={() => handleSelectSite(site.id)}
            className={`flex items-center justify-between px-4 py-4 ${index > 0 ? 'border-t border-[#F0F0F0]' : ''} ${selectedSite === site.id ? 'bg-[#F0F7FF]' : ''}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-[#333333]">{site.name}</span>
                {site.isDefault && <span className="text-xs px-1.5 py-0.5 bg-[#0066CC] text-white rounded">当前</span>}
              </div>
              <span className="text-sm text-[#999999]">{site.location}</span>
            </div>
            <div className="flex items-center gap-3">
              {site.latency !== null ? (
                <span className={`text-sm font-medium ${getStatusColor(site.status)}`}>{site.latency}ms</span>
              ) : (
                <span className="text-sm text-[#CCCCCC]">--</span>
              )}
              {selectedSite === site.id && (
                <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white mx-4 mt-4 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#333333]">实时行情自动刷新</p>
            <p className="text-xs text-[#999999] mt-1">每3秒自动刷新行情数据</p>
          </div>
          <div className="w-10 h-5 bg-[#0066CC] rounded-full relative">
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSiteSettings;
