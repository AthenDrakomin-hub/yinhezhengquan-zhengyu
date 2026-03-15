/**
 * 条件单设置页面
 * 包含默认有效期、触发方式、通知方式设置
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ConditionalSettingsProps {
  onBack?: () => void;
}

const ConditionalSettings: React.FC<ConditionalSettingsProps> = ({ onBack }) => {
  const navigate = useNavigate();
  
  // 本地状态
  const [defaultValidity, setDefaultValidity] = useState<'day' | 'week' | 'month' | 'gtc'>('day');
  const [triggerMode, setTriggerMode] = useState<'once' | 'repeat'>('once');
  const [notificationMode, setNotificationMode] = useState({
    app: true,
    sms: false,
    email: false
  });

  // 有效期选项
  const validityOptions = [
    { value: 'day', label: '当日有效', desc: '当日收盘后自动失效' },
    { value: 'week', label: '一周有效', desc: '本周最后一个交易日收盘后失效' },
    { value: 'month', label: '一月有效', desc: '本月最后一个交易日收盘后失效' },
    { value: 'gtc', label: '撤销前有效', desc: '直到手动撤销或触发后才失效' }
  ];

  // 切换通知方式
  const toggleNotification = (key: keyof typeof notificationMode) => {
    setNotificationMode({
      ...notificationMode,
      [key]: !notificationMode[key]
    });
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
          <h1 className="text-lg font-semibold text-[#333333]">条件单设置</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 默认有效期 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">默认有效期</h3>
            <p className="text-xs text-[#999999] mt-1">创建条件单时的默认有效期设置</p>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            {validityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDefaultValidity(option.value as any)}
                className="w-full px-4 py-3 flex items-center justify-between"
              >
                <div className="text-left">
                  <p className="text-sm text-[#333333]">{option.label}</p>
                  <p className="text-xs text-[#999999]">{option.desc}</p>
                </div>
                {defaultValidity === option.value && (
                  <svg className="w-5 h-5 text-[#E63946]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 触发方式 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">触发方式</h3>
            <p className="text-xs text-[#999999] mt-1">条件触发后的执行方式</p>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            <button
              onClick={() => setTriggerMode('once')}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-[#333333]">单次触发</p>
                <p className="text-xs text-[#999999]">触发后自动撤销条件单</p>
              </div>
              {triggerMode === 'once' && (
                <svg className="w-5 h-5 text-[#E63946]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setTriggerMode('repeat')}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-[#333333]">重复触发</p>
                <p className="text-xs text-[#999999]">触发后条件单继续有效，可多次触发</p>
              </div>
              {triggerMode === 'repeat' && (
                <svg className="w-5 h-5 text-[#E63946]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </section>

        {/* 通知方式 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">通知方式</h3>
            <p className="text-xs text-[#999999] mt-1">条件单触发时的通知渠道</p>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">APP推送</p>
                <p className="text-xs text-[#999999]">通过APP推送消息通知</p>
              </div>
              <button
                onClick={() => toggleNotification('app')}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  notificationMode.app ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notificationMode.app ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">短信通知</p>
                <p className="text-xs text-[#999999]">通过短信发送通知（需开通）</p>
              </div>
              <button
                onClick={() => toggleNotification('sms')}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  notificationMode.sms ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notificationMode.sms ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">邮件通知</p>
                <p className="text-xs text-[#999999]">通过邮件发送通知</p>
              </div>
              <button
                onClick={() => toggleNotification('email')}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  notificationMode.email ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notificationMode.email ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* 高级设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">高级设置</h3>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            <button className="w-full px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">止盈止损预设</p>
                <p className="text-xs text-[#999999]">设置默认的止盈止损比例</p>
              </div>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button className="w-full px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">网格交易参数</p>
                <p className="text-xs text-[#999999]">设置默认的网格交易参数</p>
              </div>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* 使用说明 */}
        <section className="bg-[#FEF3C7] rounded-xl p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#92400E]">使用说明</p>
              <p className="text-xs text-[#92400E] mt-1">
                条件单可以在满足特定条件时自动下单。例如，设置当某股票价格达到指定价位时自动买入或卖出。请注意，条件单触发后可能因市场波动而无法成交。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ConditionalSettings;
