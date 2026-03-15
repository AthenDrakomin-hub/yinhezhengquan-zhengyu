/**
 * VIP权益页面
 * 展示VIP用户的专属权益和特权
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VipBenefitsView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'benefits' | 'privileges'>('benefits');

  const vipBenefits = [
    {
      id: 1,
      name: '条件单免费',
      description: '无限使用条件单功能，自动盯盘委托',
      icon: '🎯',
    },
    {
      id: 2,
      name: '智能盯盘',
      description: '同时盯盘数量提升至50只',
      icon: '👁️',
    },
    {
      id: 3,
      name: '预约打新',
      description: '7×24小时批量预约打新',
      icon: '📅',
    },
    {
      id: 4,
      name: '专属客服',
      description: 'VIP专属客服通道，优先响应',
      icon: '🎧',
    },
    {
      id: 5,
      name: '研报优先',
      description: '优先获取券商研报和投资建议',
      icon: '📊',
    },
    {
      id: 6,
      name: '低佣金',
      description: '享受更低的交易佣金费率',
      icon: '💰',
    },
  ];

  const privileges = [
    {
      level: '普通用户',
      conditions: '免费注册',
      benefits: ['基础交易', '行情查看', '条件单(3个)', '盯盘(10只)'],
    },
    {
      level: 'VIP用户',
      conditions: '资产≥50万 或 年交易额≥500万',
      benefits: ['全部基础功能', '条件单(无限)', '盯盘(50只)', '预约打新', '专属客服', '研报优先'],
    },
    {
      level: 'SVIP用户',
      conditions: '资产≥200万 或 年交易额≥2000万',
      benefits: ['全部VIP功能', '条件单(无限)', '盯盘(100只)', '极速通道', '专属投顾', '线下活动'],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <div className="bg-gradient-to-br from-[#C4956A] to-[#8B7355] px-4 py-3 flex items-center">
        <button onClick={() => navigate('/client/profile')} className="mr-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white">VIP权益中心</h1>
      </div>

      {/* VIP卡 */}
      <div className="bg-gradient-to-br from-[#2D2D2D] to-[#1A1A1A] mx-4 mt-4 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[#C4956A] text-sm">当前等级</p>
            <p className="text-xl font-bold">VIP用户</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C4956A] to-[#8B7355] flex items-center justify-center">
            <span className="text-xl">👑</span>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">有效期至 2025-12-31</span>
          <span className="text-[#C4956A]">升级SVIP ›</span>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex bg-white mx-4 mt-4 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('benefits')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'benefits' ? 'bg-[#0066CC] text-white' : 'text-[#666666]'
          }`}
        >
          我的权益
        </button>
        <button
          onClick={() => setActiveTab('privileges')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'privileges' ? 'bg-[#0066CC] text-white' : 'text-[#666666]'
          }`}
        >
          权益说明
        </button>
      </div>

      {activeTab === 'benefits' ? (
        /* 权益列表 */
        <div className="bg-white mx-4 mt-4 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#333333] mb-4">已开通权益</h3>
          <div className="grid grid-cols-2 gap-3">
            {vipBenefits.map((benefit) => (
              <div key={benefit.id} className="bg-[#F5F5F5] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{benefit.icon}</span>
                  <span className="text-sm font-medium text-[#333333]">{benefit.name}</span>
                </div>
                <p className="text-xs text-[#999999]">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 权益说明 */
        <div className="bg-white mx-4 mt-4 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#333333] mb-4">等级权益说明</h3>
          <div className="space-y-4">
            {privileges.map((priv, index) => (
              <div key={index} className={`p-4 rounded-lg ${index === 1 ? 'bg-[#FFF7ED] border border-[#C4956A]' : 'bg-[#F5F5F5]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#333333]">{priv.level}</span>
                  {index === 1 && (
                    <span className="text-xs px-2 py-0.5 bg-[#C4956A] text-white rounded">当前</span>
                  )}
                </div>
                <p className="text-xs text-[#999999] mb-2">{priv.conditions}</p>
                <div className="flex flex-wrap gap-1">
                  {priv.benefits.map((b, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-white rounded text-[#666666]">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 底部提示 */}
      <div className="mx-4 mt-4 mb-4 text-center">
        <p className="text-xs text-[#999999]">
          VIP权益以实际开通为准，如有疑问请联系客服
        </p>
      </div>
    </div>
  );
};

export default VipBenefitsView;
