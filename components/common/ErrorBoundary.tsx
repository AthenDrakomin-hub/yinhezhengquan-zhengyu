"use strict";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnNavigate?: boolean;
  /** 错误类型，用于显示不同的错误界面 */
  errorType?: 'page' | 'component' | 'network';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'unknown' | 'network' | 'render' | 'script';
}

/**
 * 错误边界组件
 * 
 * 用于捕获子组件树中的 JavaScript 错误，显示降级 UI 而不是崩溃
 * 支持错误日志上报和手动重置
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 根据错误类型判断
    let errorType: 'unknown' | 'network' | 'render' | 'script' = 'unknown';
    
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Network')) {
      errorType = 'network';
    } else if (error.message.includes('render') || error.message.includes('React')) {
      errorType = 'render';
    } else if (error.message.includes('script') || error.message.includes('Script')) {
      errorType = 'script';
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.reportErrorToServer(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.props.resetOnNavigate && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  private reportErrorToServer(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary 捕获到错误:', error);
    console.error('错误组件栈:', errorInfo.componentStack);

    if (process.env.NODE_ENV === 'production') {
      // 生产环境可以发送到错误监控服务
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isPage = this.props.errorType === 'page' || !this.props.errorType;

      return isPage ? (
        <PageErrorFallback
          errorType={this.state.errorType}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.resetErrorBoundary}
        />
      ) : (
        <ComponentErrorFallback
          errorType={this.state.errorType}
          onRetry={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * 页面级错误回退界面
 */
interface ErrorFallbackProps {
  errorType: string;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
}

const PageErrorFallback: React.FC<ErrorFallbackProps> = ({
  errorType,
  error,
  errorInfo,
  onRetry,
}) => {
  const getErrorContent = () => {
    switch (errorType) {
      case 'network':
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          ),
          title: '网络连接失败',
          description: '请检查您的网络连接后重试',
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
        };
      case 'render':
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: '页面渲染异常',
          description: '页面加载时出现问题，请刷新重试',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
        };
      default:
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          title: '页面加载失败',
          description: '抱歉，页面加载时出现了问题',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-md w-full">
        {/* 错误卡片 */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 text-center">
          {/* 图标 */}
          <div className={`w-24 h-24 mx-auto rounded-2xl ${content.bgColor} flex items-center justify-center ${content.color} mb-6`}>
            {content.icon}
          </div>

          {/* 标题 */}
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            {content.title}
          </h2>

          {/* 描述 */}
          <p className="text-slate-500 mb-8">
            {content.description}
          </p>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={onRetry}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            >
              重新加载
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              返回首页
            </button>
          </div>

          {/* 开发模式错误详情 */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mt-6 text-left">
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
                  开发者信息（点击展开）
                </summary>
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 overflow-auto max-h-48">
                  <p className="text-xs font-mono text-red-500 mb-2">
                    {error.toString()}
                  </p>
                  {errorInfo && (
                    <pre className="text-xs text-slate-500 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <p className="text-center text-xs text-slate-400 mt-6">
          如果问题持续存在，请联系客服或稍后再试
        </p>
      </div>
    </div>
  );
};

/**
 * 组件级错误回退界面
 */
interface ComponentFallbackProps {
  errorType: string;
  onRetry: () => void;
}

const ComponentErrorFallback: React.FC<ComponentFallbackProps> = ({
  errorType,
  onRetry,
}) => {
  return (
    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
      <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mb-3">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm text-slate-600 mb-3">组件加载失败</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        重试
      </button>
    </div>
  );
};

export default ErrorBoundary;
