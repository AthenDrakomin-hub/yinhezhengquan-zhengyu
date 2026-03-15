"use strict";

import React, { useEffect, useCallback, useRef } from 'react';

// 快捷键配置类型
interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

// 全局快捷键Hook
export const useHotkeys = (hotkeys: HotkeyConfig[], enabled: boolean = true) => {
  const hotkeysRef = useRef(hotkeys);
  hotkeysRef.current = hotkeys;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // 忽略在输入框中的快捷键（除了 Escape）
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    for (const config of hotkeysRef.current) {
      const keyMatch = e.key.toLowerCase() === config.key.toLowerCase();
      const ctrlMatch = config.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
      const shiftMatch = config.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = config.alt ? e.altKey : !e.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        // Escape 键可以在输入框中触发
        if (isInput && config.key.toLowerCase() !== 'escape') continue;
        
        if (config.preventDefault !== false) {
          e.preventDefault();
        }
        config.action();
        break;
      }
    }
  }, [enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// 快捷键提示组件
interface HotkeyHintProps {
  keys: string[];
  className?: string;
}

export const HotkeyHint: React.FC<HotkeyHintProps> = ({ keys, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {keys.map((key, i) => (
        <React.Fragment key={key}>
          <kbd className="px-2 py-0.5 text-[10px] font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-sm">
            {key}
          </kbd>
          {i < keys.length - 1 && <span className="text-[var(--color-text-muted)]">+</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

// 快捷键帮助面板
interface HotkeyHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  hotkeys: Array<{
    keys: string[];
    description: string;
    category?: string;
  }>;
}

export const HotkeyHelpPanel: React.FC<HotkeyHelpPanelProps> = ({
  isOpen,
  onClose,
  hotkeys
}) => {
  // 按 category 分组
  const groupedHotkeys = hotkeys.reduce((acc, hk) => {
    const category = hk.category || '通用';
    if (!acc[category]) acc[category] = [];
    acc[category].push(hk);
    return acc;
  }, {} as Record<string, typeof hotkeys>);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-surface)] rounded-2xl p-6 max-w-md w-[90%] shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            快捷键帮助
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {Object.entries(groupedHotkeys).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                {category}
              </h4>
              <div className="space-y-2">
                {items.map((hk, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {hk.description}
                    </span>
                    <HotkeyHint keys={hk.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-border)] text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            按 <kbd className="px-2 py-0.5 bg-[var(--color-bg)] rounded">?</kbd> 显示此帮助
          </p>
        </div>
      </div>
    </div>
  );
};

// 全局快捷键管理器
interface GlobalHotkeysProps {
  children: React.ReactNode;
}

export const GlobalHotkeysProvider: React.FC<GlobalHotkeysProps> = ({ children }) => {
  const [showHelp, setShowHelp] = React.useState(false);

  // 定义全局快捷键
  const hotkeys: HotkeyConfig[] = [
    {
      key: '?',
      shift: true,
      action: () => setShowHelp(true),
      description: '显示快捷键帮助'
    },
    {
      key: 'Escape',
      action: () => setShowHelp(false),
      description: '关闭弹窗',
      preventDefault: false
    }
  ];

  useHotkeys(hotkeys);

  const helpItems = [
    { keys: ['Esc'], description: '关闭弹窗/取消操作', category: '通用' },
    { keys: ['Shift', '?'], description: '显示快捷键帮助', category: '通用' },
    { keys: ['Ctrl', 'K'], description: '快速搜索股票', category: '导航' },
    { keys: ['Ctrl', '/'], description: '跳转到交易页面', category: '导航' },
    { keys: ['1'], description: '切换到概览标签', category: '标签切换' },
    { keys: ['2'], description: '切换到行情标签', category: '标签切换' },
    { keys: ['3'], description: '切换到交易标签', category: '标签切换' },
    { keys: ['4'], description: '切换到资产标签', category: '标签切换' },
    { keys: ['5'], description: '切换到设置标签', category: '标签切换' },
  ];

  return (
    <>
      {children}
      <HotkeyHelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        hotkeys={helpItems}
      />
    </>
  );
};

export default useHotkeys;
