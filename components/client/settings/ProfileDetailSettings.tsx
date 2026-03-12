"use strict";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';
import { userService } from '../../../services/userService';

interface ProfileData {
  username: string;
  phone: string;
  email: string;
  nickname: string;
  risk_level: string;
}

// 编辑弹窗组件
interface EditModalProps {
  title: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ title, value, onSave, onClose }) => {
  const [inputValue, setInputValue] = useState(value);
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(inputValue);
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-[var(--color-surface)] rounded-2xl w-[90%] max-w-md p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">编辑{title}</h3>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          className="w-full h-12 px-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-primary)] transition-all"
          autoFocus
          disabled={saving}
        />
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 bg-[var(--color-bg)] rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-all"
            disabled={saving}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!inputValue.trim() || saving}
            className="flex-1 h-11 bg-[var(--color-primary)] rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 成功提示
const SuccessToast: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] bg-[var(--color-positive)] text-white px-4 py-2 rounded-lg text-sm animate-slide-up">
    {message}
  </div>
);

const ProfileDetailSettings: React.FC = () => {
  const navigate = useNavigate();
  
  // 用户信息状态
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '银河投资者',
    phone: '',
    email: '',
    nickname: '',
    risk_level: 'C3',
  });
  
  const [loading, setLoading] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // 编辑弹窗状态
  const [editModal, setEditModal] = useState<{ show: boolean; title: string; value: string; key: string }>({
    show: false,
    title: '',
    value: '',
    key: ''
  });
  
  // 加载用户资料
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await userService.getCurrentUserProfile();
      setProfileData({
        username: profile.username || '银河投资者',
        phone: profile.phone || '未绑定',
        email: profile.email || '未设置',
        nickname: profile.username || 'Invest_ZY_2026',
        risk_level: profile.risk_level || 'C3',
      });
    } catch (error) {
      console.error('加载用户资料失败:', error);
      // 使用默认值
      setProfileData({
        username: '银河投资者',
        phone: '138****8888',
        email: 'nexus_user@galaxy.com',
        nickname: 'Invest_ZY_2026',
        risk_level: 'C3',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 处理编辑
  const handleEdit = (key: string, title: string) => {
    setEditModal({
      show: true,
      title,
      value: profileData[key as keyof ProfileData] || '',
      key
    });
  };
  
  // 保存编辑
  const handleSave = async (key: string, value: string) => {
    // 调用 API 保存数据
    await userService.updateCurrentUserProfile({
      username: key === 'username' || key === 'nickname' ? value : undefined,
      phone: key === 'phone' ? value : undefined,
      email: key === 'email' ? value : undefined,
    });
    
    // 更新本地状态
    setProfileData(prev => ({
      ...prev,
      [key]: value
    }));
    
    setSuccessToast('保存成功');
    setTimeout(() => setSuccessToast(null), 2000);
  };
  
  if (loading) {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="animate-slide-up space-y-6">
      <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center">
            <ICONS.User size={28} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">个人资料</h3>
            <p className="text-xs text-[var(--color-text-muted)]">管理您的账户信息和实名认证</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* 用户名 - 可编辑 */}
          <div 
            className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)]/30 transition-all"
            onClick={() => handleEdit('username', '用户名')}
          >
            <div>
              <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">用户名</label>
              <p className="text-sm font-bold text-[var(--color-text-primary)] mt-1">{profileData.username}</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </div>
          
          {/* 昵称 - 可编辑 */}
          <div 
            className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)]/30 transition-all"
            onClick={() => handleEdit('nickname', '昵称')}
          >
            <div>
              <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">昵称</label>
              <p className="text-sm font-bold text-[var(--color-text-primary)] mt-1">{profileData.nickname}</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </div>
          
          {/* 手机号 - 可编辑 */}
          <div 
            className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)]/30 transition-all"
            onClick={() => handleEdit('phone', '绑定手机')}
          >
            <div>
              <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">绑定手机</label>
              <p className="text-sm font-bold text-[var(--color-text-primary)] mt-1">{profileData.phone}</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </div>
          
          {/* 邮箱 - 可编辑 */}
          <div 
            className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)]/30 transition-all"
            onClick={() => handleEdit('email', '电子邮箱')}
          >
            <div>
              <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">电子邮箱</label>
              <p className="text-sm font-bold text-[var(--color-text-primary)] mt-1">{profileData.email}</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </div>
          
          {/* 实名认证 - 不可编辑 */}
          <div className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">实名认证</label>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">已认证</p>
              <span className="text-xs font-bold text-[var(--color-positive)] bg-[var(--color-positive)]/10 px-2 py-1 rounded-lg">已通过</span>
            </div>
          </div>
          
          {/* 风险等级 - 不可编辑 */}
          <div className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">风险等级</label>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{profileData.risk_level} - 稳健型</p>
              <span className="text-xs font-bold text-[var(--color-text-muted)]">2025-01-01 认定</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 编辑弹窗 */}
      {editModal.show && (
        <EditModal
          title={editModal.title}
          value={editModal.value}
          onClose={() => setEditModal({ show: false, title: '', value: '', key: '' })}
          onSave={(value) => handleSave(editModal.key, value)}
        />
      )}
      
      {/* 成功提示 */}
      {successToast && <SuccessToast message={successToast} />}
    </div>
  );
};

export default ProfileDetailSettings;
