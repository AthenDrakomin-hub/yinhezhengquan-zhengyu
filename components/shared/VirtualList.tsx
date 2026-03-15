"use strict";

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';

// 虚拟列表配置
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  className?: string;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  isLoading?: boolean;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  onEndReached,
  endReachedThreshold = 200,
  className = '',
  emptyComponent,
  loadingComponent,
  isLoading = false
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 计算总高度
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const end = Math.min(items.length, start + visibleCount);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // 可见项
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // 检测是否滚动到底部
    if (onEndReached) {
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop - clientHeight < endReachedThreshold) {
        onEndReached();
      }
    }
  }, [onEndReached, endReachedThreshold]);

  // 空状态
  if (items.length === 0 && !isLoading) {
    return (
      <div className={`relative overflow-auto ${className}`} style={{ height: containerHeight }}>
        {emptyComponent || (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
            暂无数据
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* 总高度容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可见项 */}
        <div
          style={{
            position: 'absolute',
            top: visibleRange.start * itemHeight,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, i) => renderItem(item, visibleRange.start + i))}
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && loadingComponent && (
        <div className="absolute bottom-0 left-0 right-0">
          {loadingComponent}
        </div>
      )}
    </div>
  );
}

// 可变高度的虚拟列表
interface VariableVirtualListProps<T> {
  items: T[];
  getItemHeight: (item: T, index: number) => number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  estimatedItemHeight?: number;
}

export function VariableVirtualList<T>({
  items,
  getItemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  estimatedItemHeight = 50
}: VariableVirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [heightCache, setHeightCache] = useState<number[]>([]);

  // 更新高度缓存
  useEffect(() => {
    const newCache = items.map((item, i) => {
      return heightCache[i] || getItemHeight(item, i);
    });
    setHeightCache(newCache);
  }, [items, getItemHeight]);

  // 计算位置缓存
  const positionCache = useMemo(() => {
    const positions: number[] = [];
    let offset = 0;
    
    items.forEach((_, i) => {
      positions.push(offset);
      offset += heightCache[i] || estimatedItemHeight;
    });
    
    return positions;
  }, [items, heightCache, estimatedItemHeight]);

  // 总高度
  const totalHeight = useMemo(() => {
    return heightCache.reduce((sum, h) => sum + h, 0) || items.length * estimatedItemHeight;
  }, [heightCache, items.length, estimatedItemHeight]);

  // 二分查找开始索引
  const findStartIndex = useCallback((scrollOffset: number) => {
    let low = 0;
    let high = items.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const position = positionCache[mid] || 0;
      
      if (position < scrollOffset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    return Math.max(0, low - overscan);
  }, [items.length, positionCache, overscan]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const start = findStartIndex(scrollTop);
    let end = start;
    let offset = scrollTop + containerHeight;
    
    while (end < items.length && (positionCache[end] || 0) < offset) {
      end++;
    }
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan)
    };
  }, [scrollTop, containerHeight, items.length, positionCache, findStartIndex, overscan]);

  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 可见项
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = visibleRange.start + i;
          const top = positionCache[index] || 0;
          const height = heightCache[index] || estimatedItemHeight;
          
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                height
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 股票列表优化版
interface StockItem {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockVirtualListProps {
  stocks: StockItem[];
  onSelect?: (stock: StockItem) => void;
  height?: number;
}

export const StockVirtualList: React.FC<StockVirtualListProps> = ({
  stocks,
  onSelect,
  height = 400
}) => {
  const renderItem = useCallback((stock: StockItem, index: number) => (
    <div
      onClick={() => onSelect?.(stock)}
      className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
    >
      <div>
        <div className="font-bold text-[var(--color-text-primary)]">{stock.name}</div>
        <div className="text-xs text-[var(--color-text-muted)]">{stock.code}</div>
      </div>
      <div className="text-right">
        <div className="font-bold" style={{ color: stock.change >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
          {stock.price.toFixed(2)}
        </div>
        <div 
          className="text-xs"
          style={{ color: stock.change >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}
        >
          {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  ), [onSelect]);

  return (
    <VirtualList
      items={stocks}
      itemHeight={60}
      containerHeight={height}
      renderItem={renderItem}
    />
  );
};

export default VirtualList;
