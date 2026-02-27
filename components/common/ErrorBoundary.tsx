"use strict";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ICONS } from '../../constants';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnNavigate?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
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
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新 state 使下一次渲染能够显示降级 UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误信息
    this.setState({
      errorInfo,
    });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 也可以在这里将错误日志上报到服务器
    this.reportErrorToServer(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // 如果 resetOnNavigate 为 true 且 children 发生变化（路由变化），重置错误状态
    if (this.props.resetOnNavigate && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  private reportErrorToServer(error: Error, errorInfo: ErrorInfo): void {
    // 这里可以集成 Sentry、LogRocket 等错误监控服务
    // 目前先使用 console.error 记录，后续可以扩展
    console.error('ErrorBoundary 捕获到错误:', error);
    console.error('错误组件栈:', errorInfo.componentStack);

    // 模拟发送错误到监控服务
    if (process.env.NODE_ENV === 'production') {
      // 生产环境可以发送到错误监控服务
      // 例如：Sentry.captureException(error, { extra: errorInfo });
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果有自定义的 fallback UI，使用自定义的
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认的降级 UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
          <div className="max-w-md w-full glass-card p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <ICONS.AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-[var(--color-text-primary)]">
                页面加载失败
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                抱歉，页面加载时出现了问题。我们已经记录了这个错误，请稍后重试。
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                <p className="text-xs font-bold text-red-500 mb-2">开发模式错误详情：</p>
                <pre className="text-xs text-[var(--color-text-muted)] overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="text-xs text-[var(--color-text-muted)] overflow-auto max-h-32 mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.resetErrorBoundary}
                className="w-full py-3 bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-sm rounded-xl hover:opacity-90 transition-opacity"
              >
                重试页面
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold text-sm rounded-xl hover:bg-[var(--color-surface)] transition-colors"
              >
                返回首页
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold text-sm rounded-xl hover:bg-[var(--color-surface)] transition-colors"
              >
                刷新页面
              </button>
            </div>

            <p className="text-[10px] text-[var(--color-text-muted)] pt-4 border-t border-[var(--color-border)]">
              如果问题持续存在，请联系客服或检查网络连接。
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
