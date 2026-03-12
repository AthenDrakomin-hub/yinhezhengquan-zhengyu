/**
 * 全局 Toast 提示组件
 * 提供成功、错误、警告、信息四种类型的提示
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Toast 类型
type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast 配置
interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Context 类型
interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

// 创建 Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// 默认持续时间
const DEFAULT_DURATION = 3000;

// 图标组件
const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const iconClass = "w-5 h-5";
  
  switch (type) {
    case 'success':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'info':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

// 样式配置
const toastStyles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-[var(--color-positive)]/10',
    border: 'border-[var(--color-positive)]/30',
    text: 'text-[var(--color-positive)]',
    icon: 'text-[var(--color-positive)]',
  },
  error: {
    bg: 'bg-[var(--color-negative)]/10',
    border: 'border-[var(--color-negative)]/30',
    text: 'text-[var(--color-negative)]',
    icon: 'text-[var(--color-negative)]',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-500',
    icon: 'text-orange-500',
  },
  info: {
    bg: 'bg-[var(--color-primary)]/10',
    border: 'border-[var(--color-primary)]/30',
    text: 'text-[var(--color-primary)]',
    icon: 'text-[var(--color-primary)]',
  },
};

// 单个 Toast 组件
const ToastItem: React.FC<{ 
  toast: Toast; 
  onClose: () => void;
}> = ({ toast, onClose }) => {
  const styles = toastStyles[toast.type];

  return (
    <div 
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
        ${styles.bg} ${styles.border}
        animate-slide-in-right
      `}
    >
      <span className={styles.icon}>
        <ToastIcon type={toast.type} />
      </span>
      <p className={`text-sm font-medium ${styles.text} flex-1`}>
        {toast.message}
      </p>
      <button
        onClick={onClose}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// Toast Provider 组件
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = DEFAULT_DURATION) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, message, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => {
    addToast('success', message, duration);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    addToast('error', message, duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    addToast('warning', message, duration);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    addToast('info', message, duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast 容器 */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
