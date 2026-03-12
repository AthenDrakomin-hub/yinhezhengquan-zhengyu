"use strict";

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';
import StockIcon from '../../shared/StockIcon';
import { userService } from '../../../services/userService';
import { uploadUserAvatar } from '../../../services/supabaseStorageService';
import { supabase } from '../../../lib/supabase';

interface ProfileData {
  nickname: string;
  phone: string;
  email: string;
  address: string;
  username: string;
  risk_level: string;
  avatar_url?: string;
}

interface ProfileItem {
  label: string;
  value: string;
  key?: string;
  editable?: boolean;
  copyable?: boolean;
  status?: string;
}

interface InfoGroup {
  title: string;
  items: ProfileItem[];
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

// 头像上传弹窗
interface AvatarModalProps {
  currentAvatar?: string;
  onUpload: (file: File) => Promise<void>;
  onClose: () => void;
}

const AvatarModal: React.FC<AvatarModalProps> = ({ currentAvatar, onUpload, onClose }) => {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      alert('请上传 JPEG、PNG、WebP 或 GIF 格式的图片');
      return;
    }
    
    // 验证文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }
    
    setSelectedFile(file);
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      await onUpload(selectedFile);
      onClose();
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-[var(--color-surface)] rounded-2xl w-[90%] max-w-md p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">修改头像</h3>
        
        {/* 预览区域 */}
        <div className="flex justify-center mb-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[var(--color-bg)] border-4 border-[var(--color-border)]">
            {preview ? (
              <img src={preview} alt="头像预览" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ICONS.User size={48} className="text-[var(--color-text-muted)]" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
        
        {/* 选择图片按钮 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-11 bg-[var(--color-bg)] rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-all mb-3"
        >
          选择图片
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 bg-[var(--color-bg)] rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-all"
            disabled={uploading}
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 h-11 bg-[var(--color-primary)] rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
          >
            {uploading ? '上传中...' : '上传'}
          </button>
        </div>
        
        <p className="text-xs text-[var(--color-text-muted)] text-center mt-3">
          支持 JPEG、PNG、WebP、GIF 格式，最大 2MB
        </p>
      </div>
    </div>
  );
};

// 复制成功提示
const Toast: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] bg-[var(--color-text-primary)] text-white px-4 py-2 rounded-lg text-sm animate-slide-up">
    {message}
  </div>
);

// 加载状态
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProfileDetailView: React.FC = () => {
  const navigate = useNavigate();
  
  // 用户信息状态
  const [profileData, setProfileData] = useState<ProfileData>({
    nickname: '',
    phone: '',
    email: '',
    address: '北京市西城区金融街 8 号银河大厦',
    username: '',
    risk_level: 'C3',
    avatar_url: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 弹窗状态
  const [editModal, setEditModal] = useState<{ show: boolean; title: string; value: string; key: string }>({
    show: false,
    title: '',
    value: '',
    key: ''
  });
  
  const [avatarModal, setAvatarModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  // 加载用户资料
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await userService.getCurrentUserProfile();
      setProfileData(prev => ({
        ...prev,
        nickname: profile.username || '',
        phone: profile.phone || '',
        email: profile.email || '',
        username: profile.username || '',
        risk_level: profile.risk_level || 'C3',
        avatar_url: (profile as any).avatar_url || '',
      }));
    } catch (error) {
      console.error('加载用户资料失败:', error);
      // 使用默认值
      setProfileData({
        nickname: 'Invest_ZY_2026',
        phone: '138****8888',
        email: 'nexus_user@galaxy.com',
        address: '北京市西城区金融街 8 号银河大厦',
        username: 'Invest_ZY_2026',
        risk_level: 'C3',
        avatar_url: '',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 动态生成信息组
  const infoGroups: InfoGroup[] = [
    {
      title: '基本身份信息',
      items: [
        { label: '用户昵称', value: profileData.nickname || '未设置', key: 'nickname', editable: true },
        { label: '日斗 ID', value: 'Nexus_0992837', copyable: true },
        { label: '实名认证', value: '已认证 (*振华)', status: 'verified' },
      ]
    },
    {
      title: '联系方式',
      items: [
        { label: '绑定手机', value: profileData.phone || '未绑定', key: 'phone', editable: true },
        { label: '电子邮箱', value: profileData.email || '未设置', key: 'email', editable: true },
        { label: '通讯地址', value: profileData.address, key: 'address', editable: true },
      ]
    },
    {
      title: '投教背景',
      items: [
        { label: '投资经验', value: '5-10 年' },
        { label: '职业背景', value: '金融/科技从业者' },
        { label: '关联项目', value: '银河 Nexus 2.0 种子计划' },
      ]
    }
  ];
  
  // 处理编辑
  const handleEdit = (item: ProfileItem) => {
    if (!item.editable || !item.key) return;
    setEditModal({
      show: true,
      title: item.label,
      value: profileData[item.key as keyof ProfileData] || '',
      key: item.key
    });
  };
  
  // 保存编辑
  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      await userService.updateCurrentUserProfile({
        username: key === 'nickname' ? value : undefined,
        phone: key === 'phone' ? value : undefined,
        email: key === 'email' ? value : undefined,
      });
      
      setProfileData(prev => ({
        ...prev,
        [key]: value
      }));
      
      setToast('保存成功');
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('保存失败:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };
  
  // 头像上传
  const handleAvatarUpload = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登录');
      }
      
      // 上传头像到存储
      const { key, url, error } = await uploadUserAvatar(user.id, file);
      
      if (error) {
        throw error;
      }
      
      // 更新用户资料
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        throw updateError;
      }
      
      // 更新本地状态
      setProfileData(prev => ({
        ...prev,
        avatar_url: url
      }));
      
      setToast('头像更新成功');
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('头像上传失败:', error);
      throw error;
    }
  };
  
  // 复制到剪贴板
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('已复制到剪贴板');
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setToast('复制失败');
      setTimeout(() => setToast(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
        <header className="sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
          <button 
            onClick={() => navigate('/client/settings')} 
            className="w-10 h-10 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all"
          >
            <ICONS.ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">个人资料</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button 
          onClick={() => navigate('/client/settings')} 
          className="w-10 h-10 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all"
        >
          <ICONS.ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-[var(--color-text-primary)]">个人资料</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-10">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6 gap-4">
          <div 
            className="relative group cursor-pointer"
            onClick={() => setAvatarModal(true)}
          >
            {profileData.avatar_url ? (
              <img 
                src={profileData.avatar_url} 
                alt="用户头像" 
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[var(--color-primary)]/20"
              />
            ) : (
              <StockIcon name={profileData.nickname || 'User'} size="lg" className="ring-4 ring-[var(--color-primary)]/20" />
            )}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--color-primary)] rounded-full border-4 border-[var(--color-bg)] flex items-center justify-center text-white shadow-lg group-hover:opacity-90 transition-all">
              <ICONS.Camera size={14} />
            </div>
          </div>
          <p 
            className="text-xs font-medium text-[var(--color-primary)] cursor-pointer hover:opacity-80"
            onClick={() => setAvatarModal(true)}
          >
            点击修改头像
          </p>
        </div>

        {infoGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="px-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]">
              {group.items.map((item, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-between p-4 border-b border-[var(--color-border)] last:border-0 ${item.editable ? 'cursor-pointer hover:bg-[var(--color-bg)] transition-all' : ''}`}
                  onClick={() => handleEdit(item)}
                >
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${(item.status ?? '') === 'verified' ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-primary)]'}`}>
                      {item.value}
                    </span>
                    {item.editable && <ICONS.ArrowRight size={14} className="text-[var(--color-text-muted)]" />}
                    {item.copyable && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.value);
                        }}
                        className="p-1 hover:bg-[var(--color-bg)] rounded transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)]"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-[var(--color-positive)]/5 border border-[var(--color-positive)]/20 p-4 rounded-2xl">
          <p className="text-xs font-bold text-[var(--color-positive)] uppercase tracking-wide mb-2 flex items-center gap-2">
            <ICONS.Shield size={14} /> 敏感信息保护
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            为了您的账户安全，关键实名信息已进行脱敏处理。如需修改认证信息，请前往"账户安全中心"提交审核申请。
          </p>
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
      
      {/* 头像上传弹窗 */}
      {avatarModal && (
        <AvatarModal
          currentAvatar={profileData.avatar_url}
          onUpload={handleAvatarUpload}
          onClose={() => setAvatarModal(false)}
        />
      )}
      
      {/* 提示 */}
      {toast && <Toast message={toast} />}
    </div>
  );
};

export default ProfileDetailView;
