/**
 * 页面下拉刷新高阶组件
 * 为页面添加下拉刷新功能
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface WithPullToRefreshOptions {
  /** 下拉阈值（像素） */
  threshold?: number;
  /** 刷新时显示的提示文字 */
  refreshingText?: string;
  /** 下拉时的提示文字 */
  pullingText?: string;
  /** 达到阈值时的提示文字 */
  releaseText?: string;
}

interface PullIndicatorProps {
  progress: number;
  isRefreshing: boolean;
  refreshingText: string;
  pullingText: string;
  releaseText: string;
}

// 下拉指示器
const PullIndicator: React.FC<PullIndicatorProps> = ({
  progress,
  isRefreshing,
  refreshingText,
  pullingText,
  releaseText,
}) => (
  <div
    className="flex items-center justify-center py-3 transition-all duration-200"
    style={{
      opacity: Math.min(progress, 1),
      transform: `translateY(${Math.min(progress * 20, 20)}px)`,
    }}
  >
    {isRefreshing ? (
      <div className="flex items-center gap-2 text-[var(--color-primary)]">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-medium">{refreshingText}</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 transition-transform duration-200"
          style={{
            transform: `rotate(${progress * 180}deg)`,
            color: progress >= 1 ? 'var(--color-primary)' : 'var(--color-text-muted)',
          }}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          {progress >= 1 ? releaseText : pullingText}
        </span>
      </div>
    )}
  </div>
);

/**
 * 高阶组件：为页面添加下拉刷新功能
 */
export function withPullToRefresh<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithPullToRefreshOptions = {}
) {
  const {
    threshold = 80,
    refreshingText = '刷新中...',
    pullingText = '下拉刷新',
    releaseText = '松开刷新',
  } = options;

  return function WithPullToRefreshWrapper(props: P & { onRefresh?: () => Promise<void> }) {
    const { onRefresh, ...restProps } = props as P & { onRefresh?: () => Promise<void> };
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef(0);

    const progress = Math.min(pullDistance / threshold, 1.5);

    // 默认刷新逻辑（如果未提供 onRefresh）
    const handleRefresh = useCallback(async () => {
      if (onRefresh) {
        await onRefresh();
      } else {
        // 默认：延迟500ms模拟刷新
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }, [onRefresh]);

    // 触摸开始
    const handleTouchStart = useCallback((e: TouchEvent) => {
      if (isRefreshing) return;
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;
      
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }, [isRefreshing]);

    // 触摸移动
    const handleTouchMove = useCallback((e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;
      const container = containerRef.current;
      if (!container) return;

      const distance = e.touches[0].clientY - startYRef.current;
      if (distance > 0 && container.scrollTop <= 0) {
        // 阻尼效果
        setPullDistance(Math.max(0, distance * 0.5));
      }
    }, [isPulling, isRefreshing]);

    // 触摸结束
    const handleTouchEnd = useCallback(async () => {
      if (!isPulling) return;
      setIsPulling(false);

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await handleRefresh();
        } catch (error) {
          console.error('刷新失败:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
    }, [isPulling, pullDistance, threshold, isRefreshing, handleRefresh]);

    // 绑定事件
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
      container.addEventListener('touchend', handleTouchEnd);

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* 下拉指示器 */}
        {(pullDistance > 0 || isRefreshing) && (
          <PullIndicator
            progress={progress}
            isRefreshing={isRefreshing}
            refreshingText={refreshingText}
            pullingText={pullingText}
            releaseText={releaseText}
          />
        )}

        {/* 页面内容 */}
        <WrappedComponent {...(restProps as P)} />
      </div>
    );
  };
}

/**
 * 通用下拉刷新组件（非高阶组件方式）
 */
interface PullToRefreshWrapperProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  refreshingText?: string;
  pullingText?: string;
  releaseText?: string;
  className?: string;
}

export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({
  children,
  onRefresh,
  threshold = 80,
  refreshingText = '刷新中...',
  pullingText = '下拉刷新',
  releaseText = '松开刷新',
  className = '',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  const progress = Math.min(pullDistance / threshold, 1.5);

  // 触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return;
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    startYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [isRefreshing]);

  // 触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const container = containerRef.current;
    if (!container) return;

    const distance = e.touches[0].clientY - startYRef.current;
    if (distance > 0 && container.scrollTop <= 0) {
      setPullDistance(Math.max(0, distance * 0.5));
    }
  }, [isPulling, isRefreshing]);

  // 触摸结束
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('刷新失败:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  // 绑定事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className={`h-full overflow-y-auto overscroll-contain ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <PullIndicator
          progress={progress}
          isRefreshing={isRefreshing}
          refreshingText={refreshingText}
          pullingText={pullingText}
          releaseText={releaseText}
        />
      )}
      {children}
    </div>
  );
};

export default PullToRefreshWrapper;
