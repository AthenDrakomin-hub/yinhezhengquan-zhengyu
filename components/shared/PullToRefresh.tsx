"use strict";

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  pullDownThreshold?: number;
  refreshingContent?: React.ReactNode;
  pullingContent?: React.ReactNode;
  className?: string;
}

// 下拉指示器组件
const PullIndicator: React.FC<{
  progress: number;
  isRefreshing: boolean;
}> = ({ progress, isRefreshing }) => {
  return (
    <div 
      className="flex items-center justify-center py-4 transition-all duration-200"
      style={{ 
        opacity: Math.min(progress, 1),
        transform: `translateY(${Math.min(progress * 30, 30)}px)`
      }}
    >
      {isRefreshing ? (
        <div className="flex items-center gap-2 text-[var(--color-primary)]">
          <svg 
            className="w-5 h-5 animate-spin" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm font-medium">刷新中...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <svg 
            className="w-6 h-6 text-[var(--color-text-muted)] transition-transform duration-200"
            style={{ 
              transform: `rotate(${progress * 180}deg)`,
              color: progress >= 1 ? 'var(--color-primary)' : undefined
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
          <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
            {progress >= 1 ? '松开刷新' : '下拉刷新'}
          </span>
        </div>
      )}
    </div>
  );
};

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  disabled = false,
  pullDownThreshold = 80,
  className = '',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  // 计算进度
  const progress = Math.min(pullDistance / pullDownThreshold, 1.5);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    currentYRef.current = e.touches[0].clientY;
    const distance = currentYRef.current - startYRef.current;
    
    if (distance > 0 && container.scrollTop <= 0) {
      // 阻尼效果
      const dampedDistance = distance * 0.5;
      setPullDistance(Math.max(0, dampedDistance));
    }
  }, [isPulling, disabled, isRefreshing]);

  // 处理触摸结束
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (pullDistance >= pullDownThreshold && !isRefreshing) {
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
  }, [isPulling, disabled, pullDistance, pullDownThreshold, isRefreshing, onRefresh]);

  // 添加事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  // 桌面端鼠标支持
  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    let isMouseDown = false;

    const handleMouseDown = (e: MouseEvent) => {
      if (container.scrollTop <= 0) {
        isMouseDown = true;
        startYRef.current = e.clientY;
        setIsPulling(true);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || isRefreshing) return;
      
      const distance = e.clientY - startYRef.current;
      if (distance > 0 && container.scrollTop <= 0) {
        const dampedDistance = distance * 0.3;
        setPullDistance(Math.max(0, dampedDistance));
      }
    };

    const handleMouseUp = async () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      setIsPulling(false);
      
      if (pullDistance >= pullDownThreshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [disabled, pullDistance, pullDownThreshold, isRefreshing, onRefresh]);

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ 
        touchAction: 'pan-y',
        overscrollBehavior: 'contain'
      }}
    >
      {/* 下拉指示器 */}
      {(isPulling || isRefreshing) && pullDistance > 0 && (
        <PullIndicator progress={progress} isRefreshing={isRefreshing} />
      )}
      
      {/* 内容区域 */}
      <div 
        style={{ 
          transform: `translateY(${isRefreshing ? pullDownThreshold : pullDistance * 0.5}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
