/**
 * 管理后台 - 系统配置管理
 * 功能：系统参数配置、功能开关、公告管理、维护模式
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

type TabType = 'config' | 'announcements' | 'maintenance';

interface SystemConfig {
  trade: {
    max_single_trade_amount: number;
    max_daily_trade_amount: number;
    min_trade_amount: number;
    trade_fee_rate: number;
    trade_limit_enabled: boolean;
    ipo_enabled: boolean;
    block_trade_enabled: boolean;
    condition_order_enabled: boolean;
  };
  withdrawal: {
    min_withdrawal: number;
    max_withdrawal_daily: number;
    withdrawal_fee_rate: number;
    withdrawal_enabled: boolean;
    withdrawal_review_enabled: boolean;
  };
  vip: {
    vip_enabled: boolean;
    vip_discount_enabled: boolean;
    max_vip_level: number;
  };
  points: {
    points_enabled: boolean;
    checkin_enabled: boolean;
    checkin_points: number;
    consecutive_bonus: number;
    max_exchange_per_day: number;
  };
  system: {
    maintenance_mode: boolean;
    maintenance_message: string;
    register_enabled: boolean;
    sms_enabled: boolean;
    email_enabled: boolean;
    upload_enabled: boolean;
  };
  security: {
    password_min_length: number;
    login_retry_limit: number;
    login_lock_time: number;
    session_timeout: number;
    two_factor_enabled: boolean;
  };
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

const AdminSystemConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 配置状态
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
  
  // 公告状态
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  // 公告表单
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'success',
    start_time: '',
    end_time: ''
  });
  
  // 维护模式状态
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    
    if (activeTab === 'config') {
      await loadConfig();
    } else if (activeTab === 'announcements') {
      await loadAnnouncements();
    } else if (activeTab === 'maintenance') {
      await loadMaintenanceStatus();
    }
    
    setLoading(false);
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('system-config', {
        body: { action: 'get_config' }
      });

      if (data?.success) {
        setConfig(data.config);
        setOriginalConfig(data.config);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('system-config', {
        body: { action: 'get_announcements' }
      });

      if (data?.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('加载公告失败:', error);
    }
  };

  const loadMaintenanceStatus = async () => {
    try {
      const { data } = await supabase.functions.invoke('system-config', {
        body: { action: 'get_system_status' }
      });

      if (data?.success) {
        setMaintenanceMode(data.status.maintenance_mode);
        setMaintenanceMessage(data.status.maintenance_message || '');
      }
    } catch (error) {
      console.error('加载维护状态失败:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('system-config', {
        body: { action: 'admin_update_config', config }
      });

      if (error) {
        alert(`保存失败: ${error.message}`);
      } else {
        alert('配置保存成功');
        setOriginalConfig(config);
      }
    } catch (error: any) {
      alert(`保存失败: ${error.message}`);
    }
    setSaving(false);
  };

  const handleResetConfig = () => {
    if (originalConfig) {
      setConfig(originalConfig);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) {
      alert('请填写完整信息');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('system-config', {
        body: { 
          action: 'admin_create_announcement', 
          ...announcementForm 
        }
      });

      if (error) {
        alert(`创建失败: ${error.message}`);
      } else {
        alert('公告创建成功');
        setShowAnnouncementModal(false);
        resetAnnouncementForm();
        loadAnnouncements();
      }
    } catch (error: any) {
      alert(`创建失败: ${error.message}`);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    try {
      const { error } = await supabase.functions.invoke('system-config', {
        body: { 
          action: 'admin_update_announcement', 
          announcement_id: editingAnnouncement.id,
          ...announcementForm 
        }
      });

      if (error) {
        alert(`更新失败: ${error.message}`);
      } else {
        alert('公告更新成功');
        setShowAnnouncementModal(false);
        setEditingAnnouncement(null);
        resetAnnouncementForm();
        loadAnnouncements();
      }
    } catch (error: any) {
      alert(`更新失败: ${error.message}`);
    }
  };

  const handleToggleAnnouncement = async (announcementId: string, isActive: boolean) => {
    try {
      await supabase.functions.invoke('system-config', {
        body: { 
          action: 'admin_toggle_announcement', 
          announcement_id: announcementId,
          is_active: !isActive 
        }
      });
      loadAnnouncements();
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!window.confirm('确定要删除此公告吗？')) return;

    try {
      await supabase.functions.invoke('system-config', {
        body: { 
          action: 'admin_delete_announcement', 
          announcement_id: announcementId 
        }
      });
      loadAnnouncements();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleSetMaintenance = async () => {
    try {
      const { error } = await supabase.functions.invoke('system-config', {
        body: { 
          action: 'admin_set_maintenance', 
          maintenance_mode: maintenanceMode,
          maintenance_message: maintenanceMessage
        }
      });

      if (error) {
        alert(`设置失败: ${error.message}`);
      } else {
        alert(maintenanceMode ? '维护模式已开启' : '维护模式已关闭');
      }
    } catch (error: any) {
      alert(`设置失败: ${error.message}`);
    }
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: '',
      content: '',
      type: 'info',
      start_time: '',
      end_time: ''
    });
  };

  const openEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      start_time: announcement.start_time.slice(0, 16),
      end_time: announcement.end_time.slice(0, 16)
    });
    setShowAnnouncementModal(true);
  };

  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-600';
      case 'warning': return 'bg-orange-100 text-orange-600';
      case 'error': return 'bg-red-100 text-red-600';
      case 'success': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // 渲染配置面板
  const renderConfigPanel = () => {
    if (!config) return null;

    return (
      <div className="space-y-6">
        {/* 交易配置 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">交易配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">单笔最大交易金额（元）</label>
              <input
                type="number"
                value={config.trade.max_single_trade_amount}
                onChange={(e) => setConfig({
                  ...config,
                  trade: { ...config.trade, max_single_trade_amount: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">日累计最大交易金额（元）</label>
              <input
                type="number"
                value={config.trade.max_daily_trade_amount}
                onChange={(e) => setConfig({
                  ...config,
                  trade: { ...config.trade, max_daily_trade_amount: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">最小交易金额（元）</label>
              <input
                type="number"
                value={config.trade.min_trade_amount}
                onChange={(e) => setConfig({
                  ...config,
                  trade: { ...config.trade, min_trade_amount: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">交易手续费率（%）</label>
              <input
                type="number"
                step="0.0001"
                value={config.trade.trade_fee_rate * 100}
                onChange={(e) => setConfig({
                  ...config,
                  trade: { ...config.trade, trade_fee_rate: Number(e.target.value) / 100 }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.trade.trade_limit_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  trade: { ...config.trade, trade_limit_enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">启用交易限额</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.trade.ipo_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  trade: { ...config.trade, ipo_enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">启用IPO申购</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.trade.block_trade_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  trade: { ...config.trade, block_trade_enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">启用大宗交易</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.trade.condition_order_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  trade: { ...config.trade, condition_order_enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">启用条件单</span>
            </label>
          </div>
        </div>

        {/* 提现配置 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">提现配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">最小提现金额（元）</label>
              <input
                type="number"
                value={config.withdrawal.min_withdrawal}
                onChange={(e) => setConfig({
                  ...config,
                  withdrawal: { ...config.withdrawal, min_withdrawal: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">单日最大提现金额（元）</label>
              <input
                type="number"
                value={config.withdrawal.max_withdrawal_daily}
                onChange={(e) => setConfig({
                  ...config,
                  withdrawal: { ...config.withdrawal, max_withdrawal_daily: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.withdrawal.withdrawal_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  withdrawal: { ...config.withdrawal, withdrawal_enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">启用提现功能</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.withdrawal.withdrawal_review_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  withdrawal: { ...config.withdrawal, withdrawal_review_enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">提现需要人工审核</span>
            </label>
          </div>
        </div>

        {/* VIP与积分配置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">VIP配置</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.vip.vip_enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    vip: { ...config.vip, vip_enabled: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">启用VIP系统</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.vip.vip_discount_enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    vip: { ...config.vip, vip_discount_enabled: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">启用VIP折扣</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">积分配置</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.points.points_enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    points: { ...config.points, points_enabled: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">启用积分系统</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.points.checkin_enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    points: { ...config.points, checkin_enabled: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">启用签到功能</span>
              </label>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleResetConfig}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-6 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#C62F3B] disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    );
  };

  // 渲染公告管理
  const renderAnnouncementsPanel = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => {
              resetAnnouncementForm();
              setEditingAnnouncement(null);
              setShowAnnouncementModal(true);
            }}
            className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#C62F3B]"
          >
            ➕ 发布公告
          </button>
        </div>

        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-400">暂无公告</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getAnnouncementTypeColor(announcement.type)}`}>
                        {announcement.type}
                      </span>
                      <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                      {!announcement.is_active && (
                        <span className="text-xs text-gray-400">(已禁用)</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(announcement.start_time).toLocaleDateString()} - {new Date(announcement.end_time).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAnnouncement(announcement.id, announcement.is_active)}
                      className={`px-3 py-1 text-xs rounded-full ${
                        announcement.is_active
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {announcement.is_active ? '启用' : '禁用'}
                    </button>
                    <button
                      onClick={() => openEditAnnouncement(announcement)}
                      className="px-3 py-1 text-xs text-[#0066CC] hover:underline"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="px-3 py-1 text-xs text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 公告编辑弹窗 */}
        {showAnnouncementModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingAnnouncement ? '编辑公告' : '发布公告'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">标题 *</label>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="输入公告标题"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">内容 *</label>
                  <textarea
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    rows={4}
                    placeholder="输入公告内容"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">类型</label>
                  <select
                    value={announcementForm.type}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="info">信息</option>
                    <option value="warning">警告</option>
                    <option value="error">错误</option>
                    <option value="success">成功</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">开始时间</label>
                    <input
                      type="datetime-local"
                      value={announcementForm.start_time}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">结束时间</label>
                    <input
                      type="datetime-local"
                      value={announcementForm.end_time}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    setEditingAnnouncement(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}
                  className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#C62F3B]"
                >
                  {editingAnnouncement ? '保存' : '发布'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  // 渲染维护模式
  const renderMaintenancePanel = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">维护模式设置</h3>
          
          <div className="mb-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="font-medium text-gray-700">开启维护模式</span>
            </label>
            <p className="text-sm text-gray-500 mt-2 ml-8">
              开启后，用户将无法访问交易系统，仅显示维护公告
            </p>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">维护公告内容</label>
            <textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              rows={4}
              placeholder="系统正在升级维护，预计XX:XX恢复..."
            />
          </div>

          <button
            onClick={handleSetMaintenance}
            className={`px-6 py-2 text-white rounded-lg ${
              maintenanceMode
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {maintenanceMode ? '开启维护模式' : '关闭维护模式'}
          </button>
        </div>

        {/* 系统状态 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">系统状态</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">数据库状态</p>
              <p className="text-lg font-semibold text-green-600 mt-1">正常</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">系统版本</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">系统配置</h1>
        <p className="text-sm text-gray-500 mt-1">管理系统参数、公告和维护模式</p>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'config', label: '系统配置', icon: '⚙️' },
          { key: 'announcements', label: '公告管理', icon: '📢' },
          { key: 'maintenance', label: '维护模式', icon: '🔧' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[#E63946] border-b-2 border-[#E63946]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 内容 */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-400">加载中...</p>
        </div>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {activeTab === 'config' && renderConfigPanel()}
          {activeTab === 'announcements' && renderAnnouncementsPanel()}
          {activeTab === 'maintenance' && renderMaintenancePanel()}
        </motion.div>
      )}
    </div>
  );
};

export default AdminSystemConfig;
