/**
 * 行情设置页面
 * 包含K线周期设置、分时图设置、涨跌颜色设置
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { userService } from '../../../services/userService';

interface MarketSettingsProps {
  onBack?: () => void;
}

const MarketSettings: React.FC<MarketSettingsProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { settings } = useUserSettings();
  
  // 本地状态
  const [klinePeriod, setKlinePeriod] = useState<'day' | 'week' | 'month' | 'min5' | 'min15' | 'min30' | 'min60'>('day');
  const [minutePeriod, setMinutePeriod] = useState<'1' | '5' | '15' | '30' | '60'>('5');
  const [upColor, setUpColor] = useState<'red' | 'green'>('red');
  const [showAvgLine, setShowAvgLine] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<'3' | '5' | '10' | '30'>('5');

  // K线周期选项
  const klinePeriodOptions = [
    { value: 'min5', label: '5分钟' },
    { value: 'min15', label: '15分钟' },
    { value: 'min30', label: '30分钟' },
    { value: 'min60', label: '60分钟' },
    { value: 'day', label: '日K' },
    { value: 'week', label: '周K' },
    { value: 'month', label: '月K' }
  ];

  // 分时周期选项
  const minutePeriodOptions = [
    { value: '1', label: '1分钟' },
    { value: '5', label: '5分钟' },
    { value: '15', label: '15分钟' },
    { value: '30', label: '30分钟' },
    { value: '60', label: '60分钟' }
  ];

  // 刷新间隔选项
  const refreshIntervalOptions = [
    { value: '3', label: '3秒' },
    { value: '5', label: '5秒' },
    { value: '10', label: '10秒' },
    { value: '30', label: '30秒' }
  ];

  // 保存设置
  const saveSettings = async () => {
    try {
      // 可以保存到后端
      console.log('保存行情设置');
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5]">
      {/* 顶部标题栏 */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onBack?.() || navigate('/client/settings')}
            className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#333333]">行情设置</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* K线周期设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">默认K线周期</h3>
            <p className="text-xs text-[#999999] mt-1">进入股票详情页时显示的默认K线周期</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-2">
              {klinePeriodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setKlinePeriod(option.value as any)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    klinePeriod === option.value 
                      ? 'bg-[#E63946] text-white' 
                      : 'bg-[#F5F5F5] text-[#666666]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 分时图设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">分时图周期</h3>
            <p className="text-xs text-[#999999] mt-1">分时图的默认时间周期</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {minutePeriodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMinutePeriod(option.value as any)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    minutePeriod === option.value 
                      ? 'bg-[#E63946] text-white' 
                      : 'bg-[#F5F5F5] text-[#666666]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 涨跌颜色设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">涨跌颜色</h3>
            <p className="text-xs text-[#999999] mt-1">设置涨跌颜色显示方式</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setUpColor('red')}
                className={`p-4 rounded-xl border-2 transition-colors ${
                  upColor === 'red' 
                    ? 'border-[#E63946] bg-[#FEF2F2]' 
                    : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded bg-[#E63946]" />
                    <div className="w-6 h-6 rounded bg-[#10B981]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#333333]">红涨绿跌</p>
                    <p className="text-xs text-[#999999]">中国市场惯例</p>
                  </div>
                </div>
                {upColor === 'red' && (
                  <svg className="w-5 h-5 text-[#E63946] mt-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setUpColor('green')}
                className={`p-4 rounded-xl border-2 transition-colors ${
                  upColor === 'green' 
                    ? 'border-[#10B981] bg-[#F0FDF4]' 
                    : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded bg-[#10B981]" />
                    <div className="w-6 h-6 rounded bg-[#E63946]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#333333]">绿涨红跌</p>
                    <p className="text-xs text-[#999999]">国际市场惯例</p>
                  </div>
                </div>
                {upColor === 'green' && (
                  <svg className="w-5 h-5 text-[#10B981] mt-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 图表设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">图表设置</h3>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">显示均线</p>
                <p className="text-xs text-[#999999]">在K线图上显示均线指标</p>
              </div>
              <button
                onClick={() => setShowAvgLine(!showAvgLine)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  showAvgLine ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  showAvgLine ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">显示成交量</p>
                <p className="text-xs text-[#999999]">在图表下方显示成交量柱</p>
              </div>
              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  showVolume ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  showVolume ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* 行情刷新设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">行情刷新</h3>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">自动刷新</p>
                <p className="text-xs text-[#999999]">行情数据自动更新</p>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  autoRefresh ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            {autoRefresh && (
              <div className="px-4 py-3">
                <p className="text-sm text-[#333333] mb-2">刷新间隔</p>
                <div className="grid grid-cols-4 gap-2">
                  {refreshIntervalOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRefreshInterval(option.value as any)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        refreshInterval === option.value 
                          ? 'bg-[#E63946] text-white' 
                          : 'bg-[#F5F5F5] text-[#666666]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MarketSettings;
