import React, { useState, useCallback } from 'react';

// 安全错误处理框架
interface AppError {
  message: string;
  code: string;
  userMessage?: string;
  technicalInfo?: string;
  severity: 'info' | 'warning' | 'error' | 'fatal';
}

// 错误类别映射
export const ERROR_CATEGORIES = {
  // 认证错误
  AUTH_UNAUTHORIZED: {
    userMessage: '认证已失效，请重新登录',
    code: 'AUTH-001',
    severity: 'error' as const
  },
  AUTH_EXPIRED: {
    userMessage: '会话已过期，请重新登录',
    code: 'AUTH-002',
    severity: 'error' as const
  },
  AUTH_INSUFFICIENT_PRIVILEGE: {
    userMessage: '权限不足',
    code: 'AUTH-003',
    severity: 'error' as const
  },
  
  // 业务逻辑错误
  VALIDATION_INPUT: {
    userMessage: '输入验证失败',
    code: 'BUSINESS-001',
    severity: 'warning' as const
  },
  TRADING_AMOUNT_TOO_SMALL: {
    userMessage: '金额或数量小于最小限制',
    code: 'BUSINESS-002',
    severity: 'warning' as const
  },
  TRADING_BALANCE_INSUFFICIENT: {
    userMessage: '账户余额不足',
    code: 'BUSINESS-003',
    severity: 'error' as const
  },
  TRADING_RISK_LIMIT: {
    userMessage: '交易风险超出限制',
    code: 'BUSINESS-004',
    severity: 'error' as const
  },
  
  // 交易系统错误
  TRADING_DUPLICATE_REQUEST: {
    userMessage: '检测到重复交易请求',
    code: 'TRADE-001',
    severity: 'warning' as const
  },
  TRADING_SYSTEM_BUSY: {
    userMessage: '交易系统繁忙，请稍后重试',
    code: 'TRADE-002',
    severity: 'error' as const
  },
  TRADING_SERVICE_UNAVAILABLE: {
    userMessage: '交易服务暂时不可用',
    code: 'TRADE-003',
    severity: 'error' as const
  },
  
  // 数据库错误
  DB_CONNECTION_FAILED: {
    userMessage: '数据服务暂时不可用',
    code: 'DB-001',
    severity: 'error' as const
  },
  DB_QUERY_TIMEOUT: {
    userMessage: '查询超时，请重试',
    code: 'DB-002',
    severity: 'error' as const
  },
  
  // 网络错误
  NETWORK_TIMEOUT: {
    userMessage: '网络请求超时，请检查网络连接',
    code: 'NETWORK-001',
    severity: 'error' as const
  },
  NETWORK_DISCONNECTED: {
    userMessage: '网络连接已断开',
    code: 'NETWORK-002',
    severity: 'error' as const
  }
};

// 安全错误处理类
export class ErrorHandler {
  static handle(error: any, context?: string): AppError {
    console.error(`[错误处理] ${context || '未知上下文'}:`, error);
    
    // 记录错误日志（生产环境应发送到监控系统）
    this.logError(error, context);
    
    // 根据错误类型返回用户友好的消息
    if (error.code) {
      const errorConfig = Object.values(ERROR_CATEGORIES).find(
        config => config.code === error.code
      );
      
      if (errorConfig) {
        return {
          message: error.message || errorConfig.userMessage,
          code: errorConfig.code,
          userMessage: errorConfig.userMessage,
          technicalInfo: error.technicalInfo,
          severity: errorConfig.severity
        };
      }
    }
    
    // 默认错误处理
    return {
      message: error.message || '操作失败',
      code: 'UNKNOWN-001',
      userMessage: '操作失败，请稍后重试',
      technicalInfo: error.stack,
      severity: 'error'
    };
  }
  
  static logError(error: any, context?: string) {
    // 生产环境应发送到日志服务
    const errorLog = {
      timestamp: new Date().toISOString(),
      context: context || 'unknown',
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
        // 移除敏感信息
        ...this.sanitizeError(error)
      }
    };
    
    // 开发环境输出到控制台
    if (import.meta.env.DEV) {
      console.error('[错误日志]', JSON.stringify(errorLog, null, 2));
    }
    
    // TODO: 生产环境发送到监控系统
    // this.sendToMonitoring(errorLog);
  }
  
  static sanitizeError(error: any) {
    // 移除敏感信息
    const sanitized = { ...error };
    
    // 移除可能包含敏感信息的字段
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.authorization;
    delete sanitized.apiKey;
    delete sanitized.secret;
    
    // 清理URL中的敏感参数
    if (sanitized.url) {
      sanitized.url = sanitized.url.replace(/(token|key|password)=[^&]*/gi, '$1=***');
    }
    
    return sanitized;
  }
  
  // 创建特定类型的错误
  static createError(type: keyof typeof ERROR_CATEGORIES, additionalInfo?: any) {
    const config = ERROR_CATEGORIES[type];
    return {
      message: config.userMessage,
      code: config.code,
      severity: config.severity,
      ...additionalInfo
    };
  }
  
  // 检查错误是否需要用户重新认证
  static requiresReauthentication(error: AppError): boolean {
    return error.code.startsWith('AUTH-');
  }
  
  // 检查错误是否为临时性错误
  static isTransientError(error: AppError): boolean {
    return ['NETWORK-001', 'DB-002', 'TRADE-002'].includes(error.code);
  }
}

// React错误边界组件
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: AppError }> },
  { error: AppError | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { error: ErrorHandler.handle(error, 'React Error Boundary') };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} />;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">操作失败</h2>
            <p className="text-gray-600 mb-6">
              {this.state.error.userMessage || '系统遇到了一些问题，请稍后重试'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 全局错误处理Hook
export const useErrorHandler = () => {
  const [error, setError] = useState<AppError | null>(null);
  
  const handleError = useCallback((error: any, context?: string) => {
    const appError = ErrorHandler.handle(error, context);
    setError(appError);
    return appError;
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    error,
    handleError,
    clearError,
    requiresReauth: error ? ErrorHandler.requiresReauthentication(error) : false,
    isTransient: error ? ErrorHandler.isTransientError(error) : false
  };
};