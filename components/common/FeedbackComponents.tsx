import React from 'react';
import { Navigate } from 'react-router-dom';
import { ICONS } from '../../constants';

interface PermissionDeniedProps {
  requiredRole: string;
  currentRole: string;
  message?: string;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({ 
  requiredRole, 
  currentRole,
  message 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="max-w-md w-full p-8 bg-slate-900/60 border border-red-500/20 rounded-3xl text-center">
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
          <ICONS.ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-4">权限不足</h2>
      <p className="text-slate-400 mb-6">
        {message || `此功能需要 ${requiredRole} 权限，您当前是 ${currentRole} 用户`}
      </p>
      <div className="space-y-3">
        <button
          onClick={() => window.history.back()}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
        >
          返回上一页
        </button>
        <p className="text-xs text-slate-500">
          如需开通权限，请联系管理员（客服热线：95551）
        </p>
      </div>
    </div>
  </div>
);

/**
 * 增强的错误提示
 */
export const ErrorMessage: React.FC<{ 
  error: string | Error;
  onRetry?: () => void;
  details?: string;
}> = ({ error, onRetry, details }) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <ICONS.AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-500 font-bold">{errorMessage}</p>
          {details && (
            <p className="text-sm text-slate-400 mt-1">{details}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/30"
            >
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 成功提示
 */
export const SuccessMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <ICONS.CheckCircle className="w-5 h-5 text-green-500" />
      <p className="text-green-500 font-bold">{message}</p>
    </div>
  </div>
);

/**
 * 加载状态
 */
export const LoadingState: React.FC<{ message?: string }> = ({ 
  message = '加载中...' 
}) => (
  <div className="flex flex-col items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D4AA] mb-4"></div>
    <p className="text-slate-400">{message}</p>
  </div>
);

/**
 * 空状态
 */
export const EmptyState: React.FC<{ 
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-12">
    {icon || <ICONS.Inbox className="w-16 h-16 text-slate-600 mb-4" />}
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    {description && <p className="text-slate-400 text-sm mb-4">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="px-6 py-3 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold hover:opacity-90"
      >
        {action.label}
      </button>
    )}
  </div>
);
