/**
 * 通用设置页面
 * 包含语言切换、字体大小、通知设置、缓存清理等功能
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserSettings } from '../../../contexts/UserSettingsContext';

interface GeneralSettingsProps {
  onBack?: () => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { settings, updatePersonalSettings } = useUserSettings();
  
  // 本地状态
  const [language, setLanguage] = useState<'zh-CN' | 'zh-HK' | 'en-US'>(settings.personal.language || 'zh-CN');
  const [fontSize, setFontSize] = useState<'standard' | 'large'>(settings.personal.fontSize || 'standard');
  const [notifications, setNotifications] = useState({
    trade: true,
    system: true,
    news: false,
    activity: true
  });
  const [cacheSize, setCacheSize] = useState('23.5 MB');
  const [clearing, setClearing] = useState(false);

  // 语言选项
  const languageOptions = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'zh-HK', label: '繁體中文' },
    { value: 'en-US', label: 'English' }
  ];

  // 保存设置
  const saveSettings = async (updates: Partial<typeof settings.personal>) => {
    try {
      await updatePersonalSettings(updates);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  // 更改语言
  const handleLanguageChange = async (lang: 'zh-CN' | 'zh-HK' | 'en-US') => {
    setLanguage(lang);
    await saveSettings({ language: lang });
  };

  // 更改字体大小
  const handleFontSizeChange = async (size: 'standard' | 'large') => {
    setFontSize(size);
    await saveSettings({ fontSize: size });
  };

  // 切换通知
  const toggleNotification = async (key: keyof typeof notifications) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);
    // 可以保存到后端
  };

  // 清理缓存
  const handleClearCache = async () => {
    if (!window.confirm('确定要清理缓存吗？这将清除本地存储的所有临时数据。')) {
      return;
    }
    
    try {
      setClearing(true);
      
      // 模拟清理缓存
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 清理 localStorage 中的缓存数据（保留用户登录信息）
      const keysToKeep = ['sb-access-token', 'sb-refresh-token', 'user'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.some(k => key.includes(k))) {
          localStorage.removeItem(key);
        }
      });
      
      // 清理 sessionStorage
      sessionStorage.clear();
      
      setCacheSize('0 MB');
      alert('缓存清理成功！');
    } catch (error) {
      console.error('清理缓存失败:', error);
      alert('清理缓存失败，请稍后重试');
    } finally {
      setClearing(false);
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
          <h1 className="text-lg font-semibold text-[#333333]">通用设置</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 语言设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">语言设置</h3>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleLanguageChange(option.value as any)}
                className="w-full px-4 py-3 flex items-center justify-between"
              >
                <span className="text-sm text-[#333333]">{option.label}</span>
                {language === option.value && (
                  <svg className="w-5 h-5 text-[#E63946]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 字体大小 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">字体大小</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleFontSizeChange('standard')}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                  fontSize === 'standard' 
                    ? 'bg-[#E63946] text-white' 
                    : 'bg-[#F5F5F5] text-[#666666]'
                }`}
              >
                标准
              </button>
              <button
                onClick={() => handleFontSizeChange('large')}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                  fontSize === 'large' 
                    ? 'bg-[#E63946] text-white' 
                    : 'bg-[#F5F5F5] text-[#666666]'
                }`}
              >
                大号
              </button>
            </div>
            <p className="text-xs text-[#999999] mt-3 text-center">
              当前: {fontSize === 'standard' ? '标准字体' : '大号字体'}
            </p>
          </div>
        </section>

        {/* 通知设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">通知设置</h3>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">交易通知</p>
                <p className="text-xs text-[#999999]">成交、委托、撤单等提醒</p>
              </div>
              <button
                onClick={() => toggleNotification('trade')}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  notifications.trade ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications.trade ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">系统通知</p>
                <p className="text-xs text-[#999999]">账户安全、系统更新等</p>
              </div>
              <button
                onClick={() => toggleNotification('system')}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  notifications.system ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications.system ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">资讯推送</p>
                <p className="text-xs text-[#999999]">热点新闻、研究报告等</p>
              </div>
              <button
                onClick={() => toggleNotification('news')}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  notifications.news ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications.news ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">活动通知</p>
                <p className="text-xs text-[#999999]">优惠活动、新股申购等</p>
              </div>
              <button
                onClick={() => toggleNotification('activity')}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  notifications.activity ? 'bg-[#E63946]' : 'bg-[#E5E5E5]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications.activity ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* 缓存管理 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">缓存管理</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#333333]">缓存大小</p>
                <p className="text-xs text-[#999999]">{cacheSize}</p>
              </div>
              <button
                onClick={handleClearCache}
                disabled={clearing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  clearing 
                    ? 'bg-[#E5E5E5] text-[#999999]' 
                    : 'bg-[#F5F5F5] text-[#333333] hover:bg-[#E5E5E5]'
                }`}
              >
                {clearing ? '清理中...' : '清理缓存'}
              </button>
            </div>
          </div>
        </section>

        {/* 其他设置 */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <h3 className="text-sm font-semibold text-[#333333]">其他</h3>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            <button className="w-full px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[#333333]">关于我们</span>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button className="w-full px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[#333333]">用户协议</span>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button className="w-full px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[#333333]">隐私政策</span>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GeneralSettings;
