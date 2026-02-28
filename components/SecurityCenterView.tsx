"use strict";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { userService } from '../services/userService';

const SecurityCenterView: React.FC = () => {
  const navigate = useNavigate();
  const [faceIdEnabled, setFaceIdEnabled] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);

  // 更新生物识别设置
  const updateBiometricSetting = async (enabled: boolean) => {
    setFaceIdEnabled(enabled);
    
    try {
      // 保存设置到后端
      await userService.updatePersonalPreferences({ biometric_enabled: enabled });
      console.log('生物识别设置已更新');
    } catch (error) {
      console.error('更新生物识别设置失败:', error);
    }
  };

  // 更新隐私模式设置
  const updatePrivacyMode = async (enabled: boolean) => {
    setPrivacyMode(enabled);
    
    try {
      // 保存设置到后端
      await userService.updatePersonalPreferences({ privacy_mode: enabled });
      console.log('隐私模式设置已更新');
    } catch (error) {
      console.error('更新隐私模式设置失败:', error);
    }
  };

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">账户安全中心</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-10">
        {/* Security Score Card */}
        <div className="glass-card p-6 bg-gradient-to-br from-[#00D4AA]/10 to-transparent border-[#00D4AA]/20">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-[#00D4AA] uppercase tracking-widest">安全审计评分</h3>
              <p className="text-4xl font-black font-mono tracking-tighter text-[var(--color-text-primary)]">98</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#00D4AA]/10 border border-[#00D4AA]/20 flex items-center justify-center text-[#00D4AA]">
              <ICONS.Shield size={24} />
            </div>
          </div>
          <div className="w-full h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden">
            <div className="w-[98%] h-full bg-[#00D4AA] shadow-[0_0_8px_#00D4AA]" />
          </div>
          <p className="mt-4 text-[10px] font-bold text-[var(--color-text-secondary)]">您的账户安全等级为 <span className="text-[#00D4AA]">极高</span>，已开启全方位防护。</p>
        </div>

        {/* Protection Settings */}
        <div className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">身份校验防护</h3>
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)]"><ICONS.User size={16} /></div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">登录密码</p>
                    <p className="text-[9px] text-[var(--color-text-muted)]">建议定期更换复杂密码</p>
                  </div>
               </div>
               <button className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest px-3 py-1.5 bg-[#00D4AA]/10 rounded-lg">修改</button>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">Face ID / 生体识别</p>
                    <p className="text-[9px] text-[var(--color-text-muted)]">开启后可通过面部或指纹快速解锁</p>
                  </div>
               </div>
               <div 
                 onClick={() => updateBiometricSetting(!faceIdEnabled)}
                 className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${faceIdEnabled ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
               >
                 <div className={`w-3 h-3 bg-white rounded-full transition-transform ${faceIdEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
               </div>
            </div>
            <div className="flex items-center justify-between p-4">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">交易资金密码</p>
                    <p className="text-[9px] text-[var(--color-text-muted)]">下单、提现等资金操作时校验</p>
                  </div>
               </div>
               <button className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest px-3 py-1.5 bg-[#00D4AA]/10 rounded-lg">重置</button>
            </div>
          </div>
        </div>

        {/* Login Activity */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">最近登录记录</h3>
            <button className="text-[9px] font-black text-[#00D4AA] uppercase tracking-widest">查看全部</button>
          </div>
          <div className="glass-card p-2 space-y-1">
            {[
              { device: 'iPhone 15 Pro Max', location: '北京 · 西城区', time: '刚刚', status: '当前在线' },
              { device: 'Desktop Chrome 124', location: '北京 · 海淀区', time: '2小时前', status: '正常' },
              { device: 'iPad Pro M4', location: '上海 · 静安区', time: '昨日 22:45', status: '正常' },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-[var(--color-surface-hover)] rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#00D4AA] animate-pulse" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">{log.device}</p>
                    <p className="text-[9px] text-[var(--color-text-muted)] font-mono">{log.location} · {log.time}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-[#00D4AA] uppercase tracking-tighter">{log.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Protection */}
        <div className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">高级隐私保护</h3>
          <div className="glass-card p-4 flex items-center justify-between">
             <div className="space-y-0.5">
                <p className="text-xs font-bold">截图隐私遮盖</p>
                <p className="text-[9px] text-[var(--color-text-muted)] leading-relaxed">启用后，应用在截图或录屏时会自动模糊资产金额。</p>
             </div>
             <div 
               onClick={() => updatePrivacyMode(!privacyMode)}
               className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${privacyMode ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
             >
               <div className={`w-3 h-3 bg-white rounded-full transition-transform ${privacyMode ? 'translate-x-5' : 'translate-x-0'}`} />
             </div>
          </div>
        </div>

        <button 
          onClick={async () => {
            if (window.confirm('确定要注销此设备的登录授权吗？此操作将使当前会话失效。')) {
              try {
                await userService.revokeDeviceSession();
                console.log('设备授权已注销');
                // 可以选择重定向到登录页面
                window.location.href = '/login';
              } catch (error) {
                console.error('注销设备授权失败:', error);
                alert('注销失败，请稍后再试');
              }
            }
          }}
          className="w-full py-4 rounded-2xl border border-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          注销此设备授权登录
        </button>
      </div>
    </div>
  );
};

export default SecurityCenterView;
