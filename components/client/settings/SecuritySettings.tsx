"use strict";

import React, { useState, useEffect } from 'react';
import { ICONS } from '../../../lib/constants';
import { userService } from '../../../services/userService';

// 修改密码弹窗
interface PasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('密码长度至少6位');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await userService.updatePassword(currentPassword, newPassword);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-[var(--color-surface)] rounded-2xl w-[90%] max-w-md p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">修改登录密码</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">当前密码</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full h-12 px-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-primary)] transition-all mt-1"
              placeholder="请输入当前密码"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full h-12 px-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-primary)] transition-all mt-1"
              placeholder="请输入新密码"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-primary)] transition-all mt-1"
              placeholder="请再次输入新密码"
            />
          </div>
        </div>
        
        {error && (
          <p className="text-xs text-red-500 mt-3">{error}</p>
        )}
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 bg-[var(--color-bg)] rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-all"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-11 bg-[var(--color-primary)] rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? '修改中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 设备管理弹窗
interface DeviceModalProps {
  onClose: () => void;
}

const DeviceModal: React.FC<DeviceModalProps> = ({ onClose }) => {
  const [devices, setDevices] = useState([
    { id: 1, name: '当前设备', device: 'iPhone 15 Pro', location: '北京市', lastActive: '刚刚', current: true },
    { id: 2, name: 'Chrome 浏览器', device: 'Windows PC', location: '上海市', lastActive: '2小时前', current: false },
  ]);
  
  const handleRemoveDevice = async (deviceId: number) => {
    if (confirm('确定要移除此设备吗？该设备将需要重新登录。')) {
      setDevices(devices.filter(d => d.id !== deviceId));
    }
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-[var(--color-surface)] rounded-2xl w-[90%] max-w-md p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">登录设备管理</h3>
        
        <div className="space-y-3">
          {devices.map(device => (
            <div key={device.id} className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center">
                    <ICONS.User size={18} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">
                      {device.name}
                      {device.current && (
                        <span className="ml-2 text-[8px] px-2 py-0.5 bg-[#00D4AA]/10 text-[#00D4AA] rounded-full">当前</span>
                      )}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{device.device} · {device.location}</p>
                    <p className="text-[9px] text-[var(--color-text-muted)]">最后活跃: {device.lastActive}</p>
                  </div>
                </div>
                
                {!device.current && (
                  <button 
                    onClick={() => handleRemoveDevice(device.id)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    移除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-[#FF6B6B]/5 rounded-xl border border-[#FF6B6B]/20">
          <p className="text-[9px] text-[var(--color-text-secondary)]">
            如发现异常登录设备，请立即移除并修改密码。如有疑问请联系客服 95551。
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full h-11 mt-4 bg-[var(--color-bg)] rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-all"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

// 条款弹窗
interface TermsModalProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ type, onClose }) => {
  const title = type === 'terms' ? '服务条款' : '隐私政策';
  
  const termsContent = `
一、总则

1.1 本服务条款是您（以下简称"用户"）与中国银河证券股份有限公司（以下简称"银河证券"）之间关于使用银河证券日斗投资单元服务所订立的协议。

1.2 用户通过网络页面点击确认或以其他方式选择接受本服务条款，即表示用户与银河证券已达成协议并同意接受本服务条款的全部约定内容。

二、服务内容

2.1 银河证券日斗投资单元为用户提供证券交易、行情查询、资产查询、智能投顾等服务。

2.2 银河证券有权根据业务发展需要调整、变更服务内容，并及时通知用户。

三、用户权利与义务

3.1 用户应按照相关法律法规及银河证券的要求，如实提供身份信息。

3.2 用户应妥善保管账户信息和密码，因用户保管不当造成的损失由用户自行承担。

3.3 用户不得利用本服务从事任何违法违规活动。

四、风险提示

4.1 证券投资有风险，入市需谨慎。

4.2 用户应充分了解证券投资的风险，根据自身风险承受能力进行投资决策。
  `;
  
  const privacyContent = `
一、信息收集

1.1 我们收集的信息包括：身份信息、联系方式、交易信息、设备信息等。

1.2 我们仅在提供服务所必需的情况下收集您的个人信息。

二、信息使用

2.1 我们使用您的信息用于：提供交易服务、风险控制、客户服务、合规监管等目的。

2.2 未经您的同意，我们不会将您的信息用于其他目的。

三、信息保护

3.1 我们采用行业标准的安全措施保护您的个人信息。

3.2 我们不会向第三方出售您的个人信息。

四、用户权利

4.1 您有权查询、更正、删除您的个人信息。

4.2 您有权撤回对信息处理的同意。

五、联系我们

如对隐私政策有任何疑问，请联系客服：95551
  `;
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-[var(--color-surface)] rounded-2xl w-[90%] max-w-lg p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">{title}</h3>
        
        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
          {type === 'terms' ? termsContent : privacyContent}
        </div>
        
        <button
          onClick={onClose}
          className="w-full h-11 mt-6 bg-[var(--color-primary)] rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all"
        >
          我已阅读并了解
        </button>
      </div>
    </div>
  );
};

// 成功提示
const SuccessToast: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] bg-[#00D4AA] text-white px-4 py-2 rounded-lg text-sm animate-slide-up">
    {message}
  </div>
);

const SecuritySettings: React.FC = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState<'terms' | 'privacy' | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // 初始化2FA状态
  useEffect(() => {
    loadSecuritySettings();
  }, []);
  
  const loadSecuritySettings = async () => {
    try {
      const settings = await userService.getSecuritySettings();
      if (settings) {
        setTwoFactorEnabled(settings.twoFactorEnabled ?? true);
      }
    } catch (error) {
      console.error('加载安全设置失败:', error);
    }
  };
  
  // 切换2FA
  const handleToggle2FA = async (enabled: boolean) => {
    try {
      await userService.updateSecuritySettings({ twoFactorEnabled: enabled });
      setTwoFactorEnabled(enabled);
      setSuccessToast(enabled ? '双重验证已开启' : '双重验证已关闭');
      setTimeout(() => setSuccessToast(null), 2000);
    } catch (error) {
      console.error('更新双重验证失败:', error);
      setSuccessToast('设置失败，请重试');
      setTimeout(() => setSuccessToast(null), 2000);
    }
  };
  
  return (
    <div className="animate-slide-up space-y-6">
      <div className="galaxy-card p-6 rounded-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#00D4AA]/10 flex items-center justify-center">
            <ICONS.Shield size={28} className="text-[#00D4AA]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[var(--color-text-primary)]">账户安全</h3>
            <p className="text-xs text-[var(--color-text-muted)]">密码、双重验证和登录设备管理</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* 密码设置 */}
          <div 
            className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[#00D4AA]/30 transition-all"
            onClick={() => setShowPasswordModal(true)}
          >
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">登录密码</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">定期修改密码可提高账户安全</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">修改</span>
              <ICONS.ArrowRight size={14} className="text-[var(--color-text-muted)]" />
            </div>
          </div>
          
          {/* 双重验证 */}
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">双重验证</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">使用手机验证码进行二次验证</p>
            </div>
            <div 
              onClick={() => handleToggle2FA(!twoFactorEnabled)}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${twoFactorEnabled ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </div>
          
          {/* 登录设备 */}
          <div 
            className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[#00D4AA]/30 transition-all"
            onClick={() => setShowDeviceModal(true)}
          >
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">登录设备管理</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">查看和管理所有登录设备</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#00D4AA]">2 台设备</span>
              <ICONS.ArrowRight size={14} className="text-[var(--color-text-muted)]" />
            </div>
          </div>
          
          {/* 服务条款 */}
          <div 
            className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[#00D4AA]/30 transition-all"
            onClick={() => setShowTermsModal('terms')}
          >
            <div className="flex items-center gap-3">
              <ICONS.FileText size={18} className="text-[var(--color-text-muted)]" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">服务条款</p>
            </div>
            <ICONS.ArrowRight size={14} className="text-[var(--color-text-muted)]" />
          </div>
          
          {/* 隐私政策 */}
          <div 
            className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[#00D4AA]/30 transition-all"
            onClick={() => setShowTermsModal('privacy')}
          >
            <div className="flex items-center gap-3">
              <ICONS.Shield size={18} className="text-[var(--color-text-muted)]" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">隐私政策</p>
            </div>
            <ICONS.ArrowRight size={14} className="text-[var(--color-text-muted)]" />
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-[#FF6B6B]/5 rounded-xl border border-[#FF6B6B]/20">
          <div className="flex items-start gap-3">
            <ICONS.AlertTriangle size={16} className="text-[#FF6B6B] mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#FF6B6B]">安全提示</p>
              <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">建议您定期更换密码，并开启双重验证以保护账户安全。如发现异常登录，请立即联系客服 95551。</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 弹窗 */}
      {showPasswordModal && (
        <PasswordModal 
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setSuccessToast('密码修改成功');
            setTimeout(() => setSuccessToast(null), 2000);
          }}
        />
      )}
      
      {showDeviceModal && (
        <DeviceModal onClose={() => setShowDeviceModal(false)} />
      )}
      
      {showTermsModal && (
        <TermsModal type={showTermsModal} onClose={() => setShowTermsModal(null)} />
      )}
      
      {/* 成功提示 */}
      {successToast && <SuccessToast message={successToast} />}
    </div>
  );
};

export default SecuritySettings;
