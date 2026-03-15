/**
 * 全局通知工具
 * 提供替代 alert() 的友好提示方式
 * 包含确认对话框、操作成功/失败提示等
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

// Toast 类型
type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 通知配置
interface NotificationOptions {
  type: NotificationType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 创建全局通知容器
let notificationContainer: HTMLDivElement | null = null;
let notificationRoot: ReactDOM.Root | null = null;

const getNotificationContainer = () => {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:8px;max-width:380px;';
    document.body.appendChild(notificationContainer);
    notificationRoot = ReactDOM.createRoot(notificationContainer);
  }
  return { container: notificationContainer, root: notificationRoot! };
};

// 通知组件
const NotificationItem: React.FC<{
  id: string;
  type: NotificationType;
  message: string;
  action?: { label: string; onClick: () => void };
  onClose: () => void;
}> = ({ type, message, action, onClose }) => {
  const styles = {
    success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-500' },
    error: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-500' },
    warning: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'text-orange-500' },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-500' },
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const style = styles[type];

  return (
    <div 
      className={`${style.bg} ${style.border} border rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm animate-slide-in-right`}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      <div className="flex items-start gap-3">
        <span className={`${style.icon} text-lg font-bold`}>{icons[type]}</span>
        <p className="text-sm text-[var(--color-text-primary)] flex-1">{message}</p>
        <button 
          onClick={onClose}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shrink-0"
        >
          ✕
        </button>
      </div>
      {action && (
        <div className="mt-2 ml-7">
          <button 
            onClick={action.onClick}
            className="text-xs font-bold text-[var(--color-primary)] hover:underline"
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
};

// 通知队列
const activeNotifications = new Map<string, { close: () => void }>();

// 显示通知
export const notify = {
  success: (message: string, options?: Partial<NotificationOptions>) => 
    showNotification({ type: 'success', message, ...options }),
  
  error: (message: string, options?: Partial<NotificationOptions>) => 
    showNotification({ type: 'error', message, ...options }),
  
  warning: (message: string, options?: Partial<NotificationOptions>) => 
    showNotification({ type: 'warning', message, ...options }),
  
  info: (message: string, options?: Partial<NotificationOptions>) => 
    showNotification({ type: 'info', message, ...options }),
};

function showNotification(options: NotificationOptions): { close: () => void } {
  const { root } = getNotificationContainer();
  const id = `notify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const duration = options.duration ?? 4000;

  const close = () => {
    activeNotifications.delete(id);
    renderNotifications();
  };

  activeNotifications.set(id, { close });

  const renderNotifications = () => {
    root.render(
      <>
        {Array.from(activeNotifications.entries()).map(([notifyId, data]) => (
          <NotificationItem
            key={notifyId}
            id={notifyId}
            type={options.type}
            message={options.message}
            action={options.action}
            onClose={() => {
              activeNotifications.delete(notifyId);
              renderNotifications();
            }}
          />
        ))}
      </>
    );
  };

  renderNotifications();

  if (duration > 0) {
    setTimeout(close, duration);
  }

  return { close };
}

// 确认对话框
interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const confirm = (options: ConfirmOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'confirm-modal-container';
    document.body.appendChild(modalContainer);
    const modalRoot = ReactDOM.createRoot(modalContainer);

    const handleClose = (result: boolean) => {
      resolve(result);
      modalRoot.unmount();
      modalContainer.remove();
    };

    const typeStyles = {
      danger: 'bg-red-500 hover:bg-red-600',
      warning: 'bg-orange-500 hover:bg-orange-600',
      info: 'bg-blue-500 hover:bg-blue-600',
    };

    const buttonStyle = typeStyles[options.type || 'info'];

    modalRoot.render(
      <div 
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => handleClose(false)}
      >
        <div 
          className="bg-[var(--color-surface)] rounded-2xl p-6 max-w-md w-[90%] shadow-2xl animate-slide-up"
          onClick={e => e.stopPropagation()}
        >
          {options.title && (
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
              {options.title}
            </h3>
          )}
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            {options.message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleClose(false)}
              className="flex-1 h-11 bg-[var(--color-surface-hover)] rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
            >
              {options.cancelText || '取消'}
            </button>
            <button
              onClick={() => handleClose(true)}
              className={`flex-1 h-11 ${buttonStyle} rounded-xl text-sm font-bold text-white transition-colors`}
            >
              {options.confirmText || '确认'}
            </button>
          </div>
        </div>
      </div>
    );
  });
};

// 带撤销操作的提示
export const notifyWithUndo = (
  message: string,
  onUndo: () => void,
  type: NotificationType = 'info'
): { close: () => void } => {
  return showNotification({
    type,
    message,
    duration: 5000,
    action: {
      label: '撤销',
      onClick: onUndo,
    },
  });
};

// 替代 alert() 的友好提示
export const alert = (message: string, type: NotificationType = 'info'): void => {
  notify[type](message);
};

// 导出默认对象
export default notify;
