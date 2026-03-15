"use strict";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// 成功动画类型
type AnimationType = 'success' | 'error' | 'warning' | 'loading';

// 操作反馈动画组件
interface OperationFeedbackProps {
  isOpen: boolean;
  type: AnimationType;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

const animationIcons = {
  success: (
    <svg className="w-20 h-20" viewBox="0 0 80 80">
      <circle 
        cx="40" cy="40" r="36" 
        fill="none" 
        stroke="#10B981" 
        strokeWidth="4"
        className="animate-draw-circle"
        style={{ strokeDasharray: 226, strokeDashoffset: 0 }}
      />
      <path 
        d="M24 42L34 52L56 30" 
        fill="none" 
        stroke="#10B981" 
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw-check"
        style={{ 
          strokeDasharray: 60,
          strokeDashoffset: 60,
          animation: 'drawCheck 0.4s ease-out 0.3s forwards'
        }}
      />
    </svg>
  ),
  error: (
    <svg className="w-20 h-20" viewBox="0 0 80 80">
      <circle 
        cx="40" cy="40" r="36" 
        fill="none" 
        stroke="#EF4444" 
        strokeWidth="4"
        style={{ strokeDasharray: 226, animation: 'drawCircle 0.4s ease-out forwards' }}
      />
      <path 
        d="M28 28L52 52M52 28L28 52" 
        fill="none" 
        stroke="#EF4444" 
        strokeWidth="4"
        strokeLinecap="round"
        style={{ 
          strokeDasharray: 50,
          strokeDashoffset: 50,
          animation: 'drawX 0.3s ease-out 0.3s forwards'
        }}
      />
    </svg>
  ),
  warning: (
    <svg className="w-20 h-20" viewBox="0 0 80 80">
      <path 
        d="M40 16L64 60H16L40 16Z" 
        fill="none" 
        stroke="#F59E0B" 
        strokeWidth="4"
        strokeLinejoin="round"
        style={{ strokeDasharray: 130, animation: 'drawTriangle 0.4s ease-out forwards' }}
      />
      <line 
        x1="40" y1="32" x2="40" y2="46" 
        stroke="#F59E0B" 
        strokeWidth="4"
        strokeLinecap="round"
        style={{ animation: 'fadeIn 0.2s ease-out 0.4s forwards', opacity: 0 }}
      />
      <circle 
        cx="40" cy="52" r="2" 
        fill="#F59E0B"
        style={{ animation: 'fadeIn 0.2s ease-out 0.5s forwards', opacity: 0 }}
      />
    </svg>
  ),
  loading: (
    <svg className="w-20 h-20 animate-spin" viewBox="0 0 80 80">
      <circle 
        cx="40" cy="40" r="36" 
        fill="none" 
        stroke="var(--color-primary)" 
        strokeWidth="4"
        strokeDasharray="80 146"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const labels = {
  success: '操作成功',
  error: '操作失败',
  warning: '警告',
  loading: '处理中...',
};

export const OperationFeedback: React.FC<OperationFeedbackProps> = ({
  isOpen,
  type,
  message,
  duration = 2000,
  onClose
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      
      if (type !== 'loading' && duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          if (onClose) {
            setTimeout(onClose, 300);
          }
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [isOpen, type, duration, onClose]);

  if (!isOpen && !visible) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div 
        className={`bg-[var(--color-surface)] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 transition-transform duration-300 ${
          visible ? 'scale-100' : 'scale-90'
        }`}
      >
        {animationIcons[type]}
        <p className="text-lg font-bold text-[var(--color-text-primary)]">
          {message || labels[type]}
        </p>
      </div>
    </div>,
    document.body
  );
};

// 撤销操作提示组件
interface UndoActionProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export const UndoAction: React.FC<UndoActionProps> = ({
  message,
  onUndo,
  onDismiss,
  duration = 5000
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="text-sm text-[var(--color-text-primary)]">{message}</p>
          <button
            onClick={onUndo}
            className="px-3 py-1 bg-[var(--color-primary)] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            撤销
          </button>
        </div>
        {/* 进度条 */}
        <div className="h-1 bg-[var(--color-surface-hover)]">
          <div 
            className="h-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// 成功动画Hook
export const useSuccessAnimation = () => {
  const [state, setState] = useState<{
    isOpen: boolean;
    type: AnimationType;
    message?: string;
  }>({ isOpen: false, type: 'success' });

  const showSuccess = (message?: string) => {
    setState({ isOpen: true, type: 'success', message });
  };

  const showError = (message?: string) => {
    setState({ isOpen: true, type: 'error', message });
  };

  const showLoading = (message?: string) => {
    setState({ isOpen: true, type: 'loading', message });
  };

  const hide = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    ...state,
    showSuccess,
    showError,
    showLoading,
    hide
  };
};

// 添加CSS动画
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes drawCircle {
      from { stroke-dashoffset: 226; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes drawCheck {
      from { stroke-dashoffset: 60; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes drawX {
      from { stroke-dashoffset: 50; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes drawTriangle {
      from { stroke-dashoffset: 130; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export default OperationFeedback;
