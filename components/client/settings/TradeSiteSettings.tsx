/**
 * 交易站点选择页面
 * 用于选择最优的交易服务器站点
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Site {
  id: string;
  name: string;
  location: string;
  latency: number | null;
  status: 'optimal' | 'good' | 'normal' | 'offline';
  isDefault?: boolean;
}

const TradeSiteSettings: React.FC = () => {
  const navigate = useNavigate();
  const [testing, setTesting] = useState(false);
  const [selectedSite, setSelectedSite] = useState('bj-dx');
  const [sites, setSites] = useState<Site[]>([
    { id: 'bj-dx', name: '北京电信', location: '北京', latency: null, status: 'normal', isDefault: true },
    { id: 'sh-ct', name: '上海联通', location: '上海', latency: null, status: 'normal' },
    { id: 'sz-cm', name: '深圳移动', location: '深圳', latency: null, status: 'normal' },
    { id: 'gz-ct', name: '广州联通', location: '广州', latency: null, status: 'normal' },
    { id: 'hz-al', name: '杭州阿里云', location: '杭州', latency: null, status: 'normal' },
  ]);

  // 模拟延迟测试
  const testLatency = async () => {
    setTesting(true);
    
    // 重置所有延迟
    setSites(prev => prev.map(s => ({ ...s, latency: null, status: 'normal' as const })));
    
    for (let i = 0; i < sites.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const latency = Math.floor(Math.random() * 100) + 10;
      const status = latency < 30 ? 'optimal' : latency < 60 ? 'good' : latency < 100 ? 'normal' : 'offline';
      
      setSites(prev => prev.map((s, idx) => 
        idx === i ? { ...s, latency, status } : s
      ));
    }
    
    setTesting(false);
  };

  // 选择站点
  const handleSelectSite = (siteId: string) => {
    setSelectedSite(siteId);
    setSites(prev => prev.map(s => ({
      ...s,
      isDefault: s.id === siteId
    })));
  };

  // 状态颜色
  const getStatusColor = (status: Site['status']) => {
    switch (status) {
      case 'optimal': return 'text-[#22C55E]';
      case 'good': return 'text-[#3B82F6]';
      case 'normal': return 'text-[#F97316]';
      case 'offline': return 'text-[#E63946]';
    }
  };

  // 状态文字
  const getStatusText = (status: Site['status']) => {
    switch (status) {
      case 'optimal': return '极佳';
      case 'good': return '良好';
      case 'normal': return '一般';
      case 'offline': return '离线';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 说明 */}
      <div className="bg-[#FFF7ED] px-4 py-3 mx-4 mt-4 rounded-lg">
        <p className="text-sm text-[#F97316]">
          💡 建议选择延迟最低的站点以获得最佳交易体验
        </p>
      </div>

      {/* 测试按钮 */}
      <div className="px-4 mt-4">
        <button
          onClick={testLatency}
          disabled={testing}
          className={`w-full py-3 rounded-lg font-medium ${
            testing 
              ? 'bg-[#E5E5E5] text-[#999999]' 
              : 'bg-[#0066CC] text-white'
          }`}
        >
          {testing ? '测试中...' : '开始测速'}
        </button>
      </div>

      {/* 站点列表 */}
      <div className="bg-white mx-4 mt-4 rounded-xl">
        {sites.map((site, index) => (
          <div
            key={site.id}
            onClick={() => handleSelectSite(site.id)}
            className={`flex items-center px-4 py-4 ${
              index > 0 ? 'border-t border-[#F0F0F0]' : ''
            } ${selectedSite === site.id ? 'bg-[#F0F7FF]' : ''}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-[#333333]">{site.name}</span>
                {site.isDefault && (
                  <span className="text-xs px-1.5 py-0.5 bg-[#0066CC] text-white rounded">
                    当前
                  </span>
                )}
              </div>
              <span className="text-sm text-[#999999]">{site.location}</span>
            </div>

            {/* 延迟信息 */}
            <div className="text-right">
              {site.latency !== null ? (
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${getStatusColor(site.status)}`}>
                    {site.latency}ms
                  </span>
                  <span className={`text-xs ${getStatusColor(site.status)}`}>
                    {getStatusText(site.status)}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-[#CCCCCC]">未测速</span>
              )}
            </div>

            {/* 选中标记 */}
            {selectedSite === site.id && (
              <div className="ml-3">
                <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 自动选择 */}
      <div className="bg-white mx-4 mt-4 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#333333]">自动选择最优站点</p>
            <p className="text-xs text-[#999999] mt-1">启动时自动测试并选择延迟最低的站点</p>
          </div>
          <div className="w-10 h-5 bg-[#0066CC] rounded-full relative">
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeSiteSettings;
