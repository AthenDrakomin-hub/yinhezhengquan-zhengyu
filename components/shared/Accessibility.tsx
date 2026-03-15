"use strict";

import React, { useEffect, useRef, useCallback, useState } from 'react';

// 无障碍焦点管理Hook
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
};

// 屏幕阅读器公告Hook
export const useAnnounce = () => {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) return;

    const announcer = announceRef.current;
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = '';
    
    // 强制屏幕阅读器读取
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }, []);

  return { announceRef, announce };
};

// 跳转链接组件
interface SkipLinkProps {
  targetId: string;
  label?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ 
  targetId, 
  label = '跳转到主要内容' 
}) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-lg focus:outline-none"
    >
      {label}
    </a>
  );
};

// 屏幕阅读器专用文本
interface SrOnlyProps {
  children: React.ReactNode;
}

export const SrOnly: React.FC<SrOnlyProps> = ({ children }) => {
  return <span className="sr-only">{children}</span>;
};

// 无障碍按钮组件
interface AriaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  haspopup?: 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

export const AriaButton: React.FC<AriaButtonProps> = ({
  label,
  description,
  pressed,
  expanded,
  controls,
  haspopup,
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      aria-label={label}
      aria-describedby={description ? `${props.id}-desc` : undefined}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-haspopup={haspopup}
      className={className}
      {...props}
    >
      {children}
      {description && (
        <span id={`${props.id}-desc`} className="sr-only">
          {description}
        </span>
      )}
    </button>
  );
};

// 无障碍模态框组件
interface AriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const AriaModal: React.FC<AriaModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = ''
}) => {
  const modalRef = useFocusTrap(isOpen);
  const { announce } = useAnnounce();

  useEffect(() => {
    if (isOpen) {
      announce(`已打开对话框: ${title}`, 'assertive');
    }
  }, [isOpen, title, announce]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-desc" : undefined}
        className={`bg-[var(--color-surface)] rounded-2xl p-6 max-w-md w-[90%] shadow-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
          {title}
        </h2>
        {description && (
          <p id="modal-desc" className="text-sm text-[var(--color-text-secondary)] mb-4">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

// 实时区域组件
interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearOnUpdate?: boolean;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  priority = 'polite',
  clearOnUpdate = true
}) => {
  const [displayMessage, setDisplayMessage] = useState(message);

  useEffect(() => {
    if (clearOnUpdate) {
      setDisplayMessage('');
      setTimeout(() => setDisplayMessage(message), 100);
    } else {
      setDisplayMessage(message);
    }
  }, [message, clearOnUpdate]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {displayMessage}
    </div>
  );
};

// 无障碍表单输入组件
interface AriaInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const AriaInput: React.FC<AriaInputProps> = ({
  label,
  error,
  hint,
  required,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="space-y-1">
      <label 
        htmlFor={inputId}
        className="block text-sm font-bold text-[var(--color-text-primary)]"
      >
        {label}
        {required && <span className="text-[var(--color-error)] ml-1">*</span>}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
        aria-required={required}
        className={`w-full px-4 py-3 bg-[var(--color-bg)] border rounded-xl text-[var(--color-text-primary)] outline-none transition-all ${
          error 
            ? 'border-[var(--color-error)] focus:ring-2 focus:ring-[var(--color-error)]/20' 
            : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// 无障碍选择组件
interface AriaSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  error?: string;
  hint?: string;
}

export const AriaSelect: React.FC<AriaSelectProps> = ({
  label,
  options,
  error,
  hint,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className="space-y-1">
      <label 
        htmlFor={selectId}
        className="block text-sm font-bold text-[var(--color-text-primary)]"
      >
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
        className={`w-full px-4 py-3 bg-[var(--color-bg)] border rounded-xl text-[var(--color-text-primary)] outline-none transition-all ${
          error 
            ? 'border-[var(--color-error)] focus:ring-2 focus:ring-[var(--color-error)]/20' 
            : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// 无障碍进度条
interface AriaProgressProps {
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
  className?: string;
}

export const AriaProgress: React.FC<AriaProgressProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
  className = ''
}) => {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-[var(--color-text-primary)]">{label}</span>
        {showValue && (
          <span className="text-sm text-[var(--color-text-muted)]">
            {value}%
          </span>
        )}
      </div>
      <div 
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="w-full h-2 bg-[var(--color-bg)] rounded-full overflow-hidden"
      >
        <div 
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
};

// 添加全局无障碍样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    
    *:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
    
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default useFocusTrap;
