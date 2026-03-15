/**
 * 通知设置页面
 * 提供完整的通知偏好设置功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService, { NotificationSetting } from '../../../services/notificationService';

interface NotificationSettingsViewProps {
  onBack?: () => void;
}

// 通知类型配置
const NOTIFICATION_CATEGORIES = [
  {
    id: 'trade',
    title: '交易通知',
    description: '成交、委托、撤单等交易相关提醒',
    icon: '📋',
    settings: [
      { key: 'trade_alerts_enabled', label: '开启通知', default: true },
      { key: 'trade_alerts_push', label: 'APP推送', default: true },
      { key: 'trade_alerts_email', label: '邮件通知', default: false },
      { key: 'trade_alerts_sms', label: '短信通知', default: false },
    ],
  },
  {
    id: 'price',
    title: '价格预警',
    description: '股票价格达到设定目标时提醒',
    icon: '📈',
    settings: [
      { key: 'price_alerts_enabled', label: '开启通知', default: true },
      { key: 'price_alerts_push', label: 'APP推送', default: true },
      { key: 'price_alerts_email', label: '邮件通知', default: false },
    ],
  },
  {
    id: 'system',
    title: '系统公告',
    description: '账户安全、系统更新、重要通知',
    icon: '🔔',
    settings: [
      { key: 'system_news_enabled', label: '开启通知', default: false },
      { key: 'system_news_push', label: 'APP推送', default: false },
      { key: 'system_news_email', label: '邮件通知', default: true },
    ],
  },
  {
    id: 'risk',
    title: '风险通知',
    description: '风险测评过期、持仓风险等提醒',
    icon: '⚠️',
    settings: [
      { key: 'risk_warning_enabled', label: '开启通知', default: true },
      { key: 'risk_warning_push', label: 'APP推送', default: true },
      { key: 'risk_warning_email', label: '邮件通知', default: true },
    ],
  },
  {
    id: 'approval',
    title: '审批通知',
    description: '交易审批、开户审核等流程通知',
    icon: '✅',
    settings: [
      { key: 'approval_enabled', label: '开启通知', default: true },
      { key: 'approval_push', label: 'APP推送', default: true },
      { key: 'approval_email', label: '邮件通知', default: false },
    ],
  },
  {
    id: 'force_sell',
    title: '强平通知',
    description: '强制平仓、风险控制等重要提醒',
    icon: '🚨',
    settings: [
      { key: 'force_sell_enabled', label: '开启通知', default: true },
      { key: 'force_sell_push', label: 'APP推送', default: true },
      { key: 'force_sell_email', label: '邮件通知', default: true },
      { key: 'force_sell_sms', label: '短信通知', default: true },
    ],
  },
];

const NotificationSettingsView: React.FC<NotificationSettingsViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载通知设置
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getNotificationSettings();
      setSettings(data);
    } catch (err) {
      console.error('加载通知设置失败:', err);
      setError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 更新单个设置
  const handleToggle = async (key: keyof NotificationSetting) => {
    if (!settings) return;
    
    try {
      setSaving(key);
      const newValue = !settings[key];
      
      // 乐观更新
      setSettings(prev => prev ? { ...prev, [key]: newValue } : null);
      
      // 保存到后端
      await notificationService.updateNotificationSettings({
        [key]: newValue,
      });
    } catch (err) {
      console.error('更新设置失败:', err);
      // 回滚
      setSettings(prev => prev ? { ...prev, [key]: !prev[key] } : null);
      setError('保存失败，请重试');
    } finally {
      setSaving(null);
    }
  };

  // 一键开启/关闭所有通知
  const handleToggleAll = async (enable: boolean) => {
    if (!settings) return;
    
    try {
      setSaving('all');
      
      const updates: Partial<NotificationSetting> = {};
      NOTIFICATION_CATEGORIES.forEach(category => {
        category.settings.forEach(setting => {
          const key = setting.key as keyof NotificationSetting;
          // 只更新布尔类型的设置
          if (key !== 'quiet_hours_start' && key !== 'quiet_hours_end') {
            updates[key] = enable as boolean & NotificationSetting[typeof key];
          }
        });
      });
      
      // 乐观更新
      setSettings(prev => prev ? { ...prev, ...updates } : null);
      
      // 保存到后端
      await notificationService.updateNotificationSettings(updates);
    } catch (err) {
      console.error('批量更新失败:', err);
      loadSettings(); // 重新加载
      setError('操作失败，请重试');
    } finally {
      setSaving(null);
    }
  };

  // 渲染开关按钮
  const renderToggle = (key: keyof NotificationSetting, enabled: boolean) => {
    const isSaving = saving === key;
    
    return (
      <button
        onClick={() => handleToggle(key)}
        disabled={isSaving || saving === 'all'}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-[#0066CC]' : 'bg-[#E5E5E5]'
        } ${isSaving ? 'opacity-60' : ''}`}
      >
        <span 
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
        {isSaving && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg className="w-3 h-3 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
      </button>
    );
  };

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
            <span className="text-base font-medium">通知设置</span>
          </button>
          <button
            onClick={loadSettings}
            disabled={loading}
            className="text-xs text-[#0066CC] px-2 py-1"
          >
            刷新
          </button>
        </div>
      </header>

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
      ) : settings ? (
        <div className="p-4 space-y-4">
          {/* 快捷操作 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-[#333333] mb-3">快捷操作</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleToggleAll(true)}
                disabled={saving === 'all'}
                className="flex-1 h-10 bg-[#0066CC] text-white text-sm font-medium rounded-lg hover:bg-[#0055AA] transition-colors disabled:opacity-60"
              >
                全部开启
              </button>
              <button
                onClick={() => handleToggleAll(false)}
                disabled={saving === 'all'}
                className="flex-1 h-10 bg-gray-100 text-[#333333] text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                全部关闭
              </button>
            </div>
          </div>

          {/* 通知分类设置 */}
          {NOTIFICATION_CATEGORIES.map((category) => (
            <div key={category.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* 分类标题 */}
              <div className="px-4 py-3 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{category.icon}</span>
                  <div>
                    <h3 className="text-sm font-medium text-[#333333]">{category.title}</h3>
                    <p className="text-xs text-[#999999]">{category.description}</p>
                  </div>
                </div>
              </div>
              
              {/* 设置项 */}
              <div className="divide-y divide-[#F0F0F0]">
                {category.settings.map((setting) => {
                  const value = settings[setting.key as keyof NotificationSetting];
                  const isBoolean = typeof value === 'boolean';
                  
                  if (!isBoolean) return null;
                  
                  return (
                    <div 
                      key={setting.key} 
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <span className="text-sm text-[#666666]">{setting.label}</span>
                      {renderToggle(setting.key as keyof NotificationSetting, value as boolean)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 免打扰时段 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F0F0F0]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#333333]">免打扰时段</h3>
                  <p className="text-xs text-[#999999]">设置时间段内不接收通知</p>
                </div>
                {renderToggle('quiet_hours_enabled', settings.quiet_hours_enabled)}
              </div>
            </div>
            
            {settings.quiet_hours_enabled && (
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#666666] w-16">开始时间</span>
                  <input
                    type="time"
                    value={settings.quiet_hours_start || '22:00'}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setSettings(prev => prev ? { ...prev, quiet_hours_start: value } : null);
                      await notificationService.updateNotificationSettings({
                        quiet_hours_start: value,
                      });
                    }}
                    className="flex-1 h-10 px-3 bg-[#F5F5F5] rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#666666] w-16">结束时间</span>
                  <input
                    type="time"
                    value={settings.quiet_hours_end || '08:00'}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setSettings(prev => prev ? { ...prev, quiet_hours_end: value } : null);
                      await notificationService.updateNotificationSettings({
                        quiet_hours_end: value,
                      });
                    }}
                    className="flex-1 h-10 px-3 bg-[#F5F5F5] rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 说明 */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-[#0066CC] mb-2">说明</h4>
            <ul className="text-xs text-[#666666] space-y-1">
              <li>• 开启通知后，您将收到对应类型的通知推送</li>
              <li>• APP推送需要您允许应用发送通知</li>
              <li>• 邮件和短信通知需要您绑定邮箱和手机号</li>
              <li>• 免打扰时段内，紧急通知仍会发送</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-[#999999]">请先登录</p>
        </div>
      )}
    </div>
  );
};

export default NotificationSettingsView;
