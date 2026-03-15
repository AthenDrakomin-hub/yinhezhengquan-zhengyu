/**
 * 管理后台 - 运营活动管理
 * 功能：创建、编辑、管理运营活动
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { adminCampaignService, CAMPAIGN_TYPES, REWARD_TYPES } from '@/services/campaignService';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  campaign_type: string;
  start_time: string;
  end_time: string;
  rules: Record<string, any>;
  reward_type: string;
  reward_value: number | null;
  max_participants: number;
  vip_only: boolean;
  min_vip_level: number;
  participant_count: number;
  status: string;
  created_at: string;
}

const AdminCampaignManagement: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'TRADE_REWARD',
    start_time: '',
    end_time: '',
    reward_type: 'points',
    reward_value: 100,
    max_participants: -1,
    max_per_user: 1,
    vip_only: false,
    min_vip_level: 1
  });

  useEffect(() => {
    fetchCampaigns();
  }, [filterStatus, filterType]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.type = filterType;

      const data = await adminCampaignService.getCampaigns(params);
      setCampaigns(data);
    } catch (error) {
      console.error('获取活动列表失败:', error);
    }
    setLoading(false);
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.start_time || !formData.end_time) {
      alert('请填写完整信息');
      return;
    }

    try {
      const result = await adminCampaignService.createCampaign({
        ...formData,
        rules: {}
      });

      if (result.success) {
        alert('活动创建成功');
        setShowCreateModal(false);
        resetForm();
        fetchCampaigns();
      } else {
        alert(`创建失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`创建失败: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (campaignId: string, newStatus: string) => {
    if (!window.confirm(`确定要${newStatus === 'active' ? '上线' : newStatus === 'paused' ? '暂停' : '结束'}此活动吗？`)) {
      return;
    }

    try {
      const result = await adminCampaignService.updateCampaign(campaignId, { status: newStatus });
      if (result.success) {
        fetchCampaigns();
      } else {
        alert(`操作失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`操作失败: ${error.message}`);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('确定要删除此活动吗？此操作不可恢复。')) {
      return;
    }

    try {
      const result = await adminCampaignService.deleteCampaign(campaignId);
      if (result.success) {
        fetchCampaigns();
      } else {
        alert(`删除失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`删除失败: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      campaign_type: 'TRADE_REWARD',
      start_time: '',
      end_time: '',
      reward_type: 'points',
      reward_value: 100,
      max_participants: -1,
      max_per_user: 1,
      vip_only: false,
      min_vip_level: 1
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'paused': return '#F97316';
      case 'ended': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'paused': return '已暂停';
      case 'ended': return '已结束';
      case 'draft': return '草稿';
      default: return status;
    }
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">运营活动管理</h1>
          <p className="text-sm text-gray-500 mt-1">创建和管理营销活动、限时活动</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#C62F3B] transition-colors flex items-center gap-2"
        >
          <span>➕</span> 创建活动
        </button>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">活动状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">全部状态</option>
              <option value="active">进行中</option>
              <option value="paused">已暂停</option>
              <option value="ended">已结束</option>
              <option value="draft">草稿</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">活动类型</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">全部类型</option>
              {Object.entries(CAMPAIGN_TYPES).map(([key, value]) => (
                <option key={key} value={key}>{value.icon} {value.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 活动列表 */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-400">加载中...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-400">暂无活动</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">
                      {CAMPAIGN_TYPES[campaign.campaign_type as keyof typeof CAMPAIGN_TYPES]?.icon || '📢'}
                    </span>
                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    <span
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{
                        backgroundColor: `${getStatusColor(campaign.status)}20`,
                        color: getStatusColor(campaign.status)
                      }}
                    >
                      {getStatusLabel(campaign.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{campaign.description || '暂无描述'}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>
                      📅 {new Date(campaign.start_time).toLocaleDateString()} - {new Date(campaign.end_time).toLocaleDateString()}
                    </span>
                    <span>
                      👥 {campaign.participant_count}/{campaign.max_participants === -1 ? '∞' : campaign.max_participants} 人参与
                    </span>
                    <span>
                      🎁 {REWARD_TYPES[campaign.reward_type as keyof typeof REWARD_TYPES] || campaign.reward_type}
                      {campaign.reward_value && ` × ${campaign.reward_value}`}
                    </span>
                    {campaign.vip_only && (
                      <span className="text-amber-600">👑 VIP专享</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleUpdateStatus(campaign.id, 'active')}
                      className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      上线
                    </button>
                  )}
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => handleUpdateStatus(campaign.id, 'paused')}
                      className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                      暂停
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <button
                      onClick={() => handleUpdateStatus(campaign.id, 'active')}
                      className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      恢复
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 创建活动弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">创建新活动</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">活动名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="输入活动名称"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">活动描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  rows={3}
                  placeholder="输入活动描述"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">活动类型 *</label>
                <select
                  value={formData.campaign_type}
                  onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  {Object.entries(CAMPAIGN_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value.icon} {value.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">开始时间 *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">结束时间 *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">奖励类型</label>
                  <select
                    value={formData.reward_type}
                    onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    {Object.entries(REWARD_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">奖励数量</label>
                  <input
                    type="number"
                    value={formData.reward_value}
                    onChange={(e) => setFormData({ ...formData, reward_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">参与人数上限</label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="-1 表示无限制"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">每人参与次数</label>
                  <input
                    type="number"
                    value={formData.max_per_user}
                    onChange={(e) => setFormData({ ...formData, max_per_user: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.vip_only}
                    onChange={(e) => setFormData({ ...formData, vip_only: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">仅VIP可参与</span>
                </label>
                {formData.vip_only && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">最低等级</label>
                    <select
                      value={formData.min_vip_level}
                      onChange={(e) => setFormData({ ...formData, min_vip_level: Number(e.target.value) })}
                      className="px-2 py-1 border border-gray-200 rounded text-sm"
                    >
                      {[1, 2, 3, 4, 5].map(level => (
                        <option key={level} value={level}>VIP{level}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateCampaign}
                className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#C62F3B]"
              >
                创建活动
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminCampaignManagement;
