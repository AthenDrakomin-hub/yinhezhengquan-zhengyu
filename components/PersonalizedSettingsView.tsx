
import React from 'react';
import { ICONS } from '../constants';
import { PersonalSettings } from '../types';

interface PersonalizedSettingsViewProps {
  onBack: () => void;
  settings: PersonalSettings;
  onUpdateSettings: (settings: Partial<PersonalSettings>) => void;
}

const PersonalizedSettingsView: React.FC<PersonalizedSettingsViewProps> = ({ onBack, settings, onUpdateSettings }) => {
  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">偏好与显示</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-10">
        {/* Language Selection */}
        <section className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">系统语言</h3>
          <div className="glass-card divide-y divide-[var(--color-border)] overflow-hidden">
            {[
              { id: 'zh-CN', label: '简体中文' },
              { id: 'zh-HK', label: '繁體中文 (香港)' },
              { id: 'en-US', label: 'English (United States)' },
            ].map(lang => (
              <div 
                key={lang.id}
                onClick={() => onUpdateSettings({ language: lang.id as any })}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-all"
              >
                <span className={`text-xs font-bold ${settings.language === lang.id ? 'text-[#00D4AA]' : 'text-[var(--color-text-primary)]'}`}>
                  {lang.label}
                </span>
                {settings.language === lang.id && <ICONS.Check size={14} className="text-[#00D4AA]" />}
              </div>
            ))}
          </div>
        </section>

        {/* Font Size Selection */}
        <section className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">行情字体大小</h3>
          <div className="glass-card flex p-1 gap-1">
            <button 
              onClick={() => onUpdateSettings({ fontSize: 'standard' })}
              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${settings.fontSize === 'standard' ? 'bg-[#00D4AA] text-[#0A1628]' : 'text-[var(--color-text-muted)]'}`}
            >
              标准视图
            </button>
            <button 
              onClick={() => onUpdateSettings({ fontSize: 'large' })}
              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${settings.fontSize === 'large' ? 'bg-[#00D4AA] text-[#0A1628]' : 'text-[var(--color-text-muted)]'}`}
            >
              大字增强
            </button>
          </div>
          <p className="px-2 text-[8px] text-[var(--color-text-muted)]">提示：大字增强模式将优化盘口和分时图的数值可读性。</p>
        </section>

        {/* Interaction Settings */}
        <section className="space-y-3">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">交互反馈</h3>
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[var(--color-text-primary)]">触感反馈 (Haptic)</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">按钮点击及报单成功时伴有轻微物理振动</p>
              </div>
              <div 
                onClick={() => onUpdateSettings({ hapticFeedback: !settings.hapticFeedback })}
                className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${settings.hapticFeedback ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.hapticFeedback ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[var(--color-text-primary)]">交易音效控制</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">开启成交撮合、价格警示等场景的声音提示</p>
              </div>
              <div 
                onClick={() => onUpdateSettings({ soundEffects: !settings.soundEffects })}
                className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${settings.soundEffects ? 'bg-[#00D4AA]' : 'bg-[var(--color-text-muted)]/20'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.soundEffects ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PersonalizedSettingsView;
