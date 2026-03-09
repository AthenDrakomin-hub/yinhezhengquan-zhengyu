"use strict";

import React, { useState } from 'react';
import { ICONS } from '../../../lib/constants';

const SecuritySettings: React.FC = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  
  return (
    <div className="animate-slide-up space-y-6">
      <div className="glass-card p-6 rounded-2xl">
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
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">登录密码</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">上次修改：2025-01-01</p>
            </div>
            <button className="text-xs font-bold text-[#00D4AA] hover:underline">修改</button>
          </div>
          
          {/* 双重验证 */}
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">双重验证 (2FA)</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">使用手机验证码进行二次验证</p>
            </div>
            <div 
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${twoFactorEnabled ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </div>
          
          {/* 登录设备 */}
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">登录设备管理</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">当前有 2 台设备登录</p>
            </div>
            <button className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[#00D4AA]">查看</button>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-[#FF6B6B]/5 rounded-xl border border-[#FF6B6B]/20">
          <div className="flex items-start gap-3">
            <ICONS.Shield size={16} className="text-[#FF6B6B] mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#FF6B6B]">安全建议</p>
              <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">建议您定期更换密码，并开启双重验证以保护账户安全。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
