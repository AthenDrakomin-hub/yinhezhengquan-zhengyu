"use strict";

import React from 'react';

// 基础骨架屏组件
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  borderRadius = '8px',
  animate = true
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius,
  };

  return (
    <div
      className={`bg-[var(--color-surface-hover)] ${animate ? 'animate-pulse' : ''} ${className}`}
      style={style}
      role="presentation"
      aria-hidden="true"
    />
  );
};

// 文本骨架屏
export const SkeletonText: React.FC<{ 
  lines?: number; 
  lineHeight?: number;
  className?: string;
}> = ({ lines = 3, lineHeight = 16, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
};

// 头像骨架屏
export const SkeletonAvatar: React.FC<{ 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64
  };

  return (
    <Skeleton
      width={sizeMap[size]}
      height={sizeMap[size]}
      borderRadius="50%"
      className={className}
    />
  );
};

// 卡片骨架屏
export const SkeletonCard: React.FC<{ 
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  contentLines?: number;
}> = ({ 
  className = '', 
  showHeader = true, 
  showFooter = false,
  contentLines = 3 
}) => {
  return (
    <div className={`galaxy-card p-4 ${className}`}>
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          <SkeletonAvatar size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton height={14} width="40%" />
            <Skeleton height={10} width="60%" />
          </div>
        </div>
      )}
      <SkeletonText lines={contentLines} />
      {showFooter && (
        <div className="flex justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
          <Skeleton height={32} width={80} borderRadius="8px" />
          <Skeleton height={32} width={80} borderRadius="8px" />
        </div>
      )}
    </div>
  );
};

// 列表项骨架屏
export const SkeletonListItem: React.FC<{ 
  className?: string;
  showAvatar?: boolean;
}> = ({ className = '', showAvatar = true }) => {
  return (
    <div className={`flex items-center gap-3 p-4 ${className}`}>
      {showAvatar && <SkeletonAvatar size="md" />}
      <div className="flex-1 space-y-2">
        <Skeleton height={14} width="30%" />
        <Skeleton height={10} width="50%" />
      </div>
      <Skeleton height={24} width={60} borderRadius="4px" />
    </div>
  );
};

// 表格行骨架屏
export const SkeletonTableRow: React.FC<{ 
  columns?: number;
  className?: string;
}> = ({ columns = 4, className = '' }) => {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton height={16} width={i === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  );
};

// 表格骨架屏
export const SkeletonTable: React.FC<{ 
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`galaxy-card overflow-hidden ${className}`}>
      <table className="w-full">
        <thead className="bg-[var(--color-surface)]">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-4">
                <Skeleton height={12} width={60} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 持仓卡片骨架屏
export const SkeletonHoldingCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`galaxy-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="md" />
          <div className="space-y-2">
            <Skeleton height={16} width={80} />
            <Skeleton height={12} width={60} />
          </div>
        </div>
        <div className="text-right space-y-2">
          <Skeleton height={16} width={70} />
          <Skeleton height={12} width={50} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 pt-3 border-t border-[var(--color-border)]">
        <Skeleton height={24} />
        <Skeleton height={24} />
        <Skeleton height={24} />
        <Skeleton height={24} />
      </div>
    </div>
  );
};

// 股票行情骨架屏
export const SkeletonStockCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`galaxy-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton height={20} width={60} borderRadius="4px" />
          <Skeleton height={14} width={40} />
        </div>
        <Skeleton height={24} width={80} />
      </div>
      <div className="flex items-end justify-between">
        <Skeleton height={32} width={100} />
        <Skeleton height={16} width={60} />
      </div>
    </div>
  );
};

// 新闻列表骨架屏
export const SkeletonNewsCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-4 border-b border-[var(--color-border)] ${className}`}>
      <Skeleton height={16} width="80%" className="mb-2" />
      <Skeleton height={12} width="100%" className="mb-1" />
      <Skeleton height={12} width="60%" className="mb-3" />
      <div className="flex items-center gap-4">
        <Skeleton height={10} width={40} />
        <Skeleton height={10} width={60} />
      </div>
    </div>
  );
};

// 页面加载骨架屏
export const SkeletonPage: React.FC<{ 
  className?: string;
  title?: boolean;
}> = ({ className = '', title = true }) => {
  return (
    <div className={`p-4 space-y-4 ${className}`}>
      {title && <Skeleton height={24} width={150} className="mb-6" />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton height={80} borderRadius="12px" />
        <Skeleton height={80} borderRadius="12px" />
        <Skeleton height={80} borderRadius="12px" />
        <Skeleton height={80} borderRadius="12px" />
      </div>
      <SkeletonCard contentLines={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard contentLines={3} />
        <SkeletonCard contentLines={3} />
      </div>
    </div>
  );
};

export default Skeleton;
