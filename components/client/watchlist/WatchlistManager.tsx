/**
 * 自选股管理组件
 * 支持左滑删除、拖拽排序、批量管理
 */

import React, { useState, useRef } from 'react';
import { Stock } from '../../../lib/types';

interface WatchlistManagerProps {
  stocks: Stock[];
  onRemove: (symbol: string) => void;
  onReorder: (stocks: Stock[]) => void;
  onStockClick: (symbol: string) => void;
}

interface SwipeState {
  [key: string]: number;
}

const WatchlistManager: React.FC<WatchlistManagerProps> = ({
  stocks,
  onRemove,
  onReorder,
  onStockClick,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [swipeOffset, setSwipeOffset] = useState<SwipeState>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const currentSwipeSymbol = useRef<string>('');

  // 切换编辑模式
  const toggleEditMode = () => {
    setEditMode(!editMode);
    setSelectedStocks(new Set());
    setSwipeOffset({});
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedStocks.size === stocks.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(stocks.map(s => s.symbol)));
    }
  };

  // 切换单个选中
  const toggleSelect = (symbol: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedStocks(newSelected);
  };

  // 批量删除
  const handleBatchRemove = () => {
    selectedStocks.forEach(symbol => onRemove(symbol));
    setSelectedStocks(new Set());
    setEditMode(false);
  };

  // 触摸开始
  const handleTouchStart = (e: React.TouchEvent, symbol: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    currentSwipeSymbol.current = symbol;
  };

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent, symbol: string) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // 如果是垂直滑动，不处理
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    
    // 限制滑动范围
    const maxOffset = -80;
    const offset = Math.max(maxOffset, Math.min(0, deltaX));
    setSwipeOffset(prev => ({ ...prev, [symbol]: offset }));
  };

  // 触摸结束
  const handleTouchEnd = (symbol: string) => {
    const offset = swipeOffset[symbol] || 0;
    // 如果滑动超过一半，保持打开状态
    if (offset < -40) {
      setSwipeOffset(prev => ({ ...prev, [symbol]: -80 }));
    } else {
      setSwipeOffset(prev => ({ ...prev, [symbol]: 0 }));
    }
  };

  // 删除按钮点击
  const handleDelete = (symbol: string) => {
    onRemove(symbol);
    setSwipeOffset(prev => {
      const newOffset = { ...prev };
      delete newOffset[symbol];
      return newOffset;
    });
  };

  // 拖拽开始
  const handleDragStart = (index: number) => {
    if (editMode) {
      setDragIndex(index);
    }
  };

  // 拖拽移动
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    const newStocks = [...stocks];
    const draggedItem = newStocks[dragIndex];
    newStocks.splice(dragIndex, 1);
    newStocks.splice(index, 0, draggedItem);
    onReorder(newStocks);
    setDragIndex(index);
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDragIndex(null);
  };

  // 格式化涨跌幅
  const formatChange = (change: number, isPercent: boolean = false) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${isPercent ? (change * 100).toFixed(2) + '%' : change.toFixed(2)}`;
  };

  return (
    <div className="bg-white">
      {/* 工具栏 */}
      {stocks.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#F0F0F0]">
          <button
            onClick={toggleEditMode}
            className="text-sm text-[#0066CC]"
          >
            {editMode ? '完成' : '管理'}
          </button>
          {editMode && (
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-[#666666]"
              >
                {selectedStocks.size === stocks.length ? '取消全选' : '全选'}
              </button>
              {selectedStocks.size > 0 && (
                <button
                  onClick={handleBatchRemove}
                  className="text-sm text-[#E63946]"
                >
                  删除({selectedStocks.size})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 股票列表 */}
      {stocks.map((stock, index) => {
        const offset = swipeOffset[stock.symbol] || 0;
        const isSelected = selectedStocks.has(stock.symbol);
        const isUp = stock.changePercent >= 0;

        return (
          <div
            key={stock.symbol}
            className="relative overflow-hidden border-b border-[#F0F0F0] last:border-0"
            draggable={editMode}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            {/* 删除按钮背景 */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-20 bg-[#E63946] flex items-center justify-center"
              style={{ opacity: Math.abs(offset) / 80 }}
            >
              <button
                onClick={() => handleDelete(stock.symbol)}
                className="text-white text-sm font-medium"
              >
                删除
              </button>
            </div>

            {/* 股票行 */}
            <div
              className="flex items-center px-4 py-3 bg-white transition-transform"
              style={{ transform: `translateX(${offset}px)` }}
              onTouchStart={(e) => !editMode && handleTouchStart(e, stock.symbol)}
              onTouchMove={(e) => !editMode && handleTouchMove(e, stock.symbol)}
              onTouchEnd={() => !editMode && handleTouchEnd(stock.symbol)}
              onClick={() => !editMode && onStockClick(stock.symbol)}
            >
              {/* 编辑模式下显示复选框 */}
              {editMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(stock.symbol);
                  }}
                  className="mr-3"
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'bg-[#0066CC] border-[#0066CC]' : 'border-[#CCCCCC]'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              )}

              {/* 拖拽手柄 */}
              {editMode && (
                <div className="mr-2 cursor-move">
                  <svg className="w-4 h-4 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              )}

              {/* 股票信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#333333]">{stock.name}</span>
                  <span className="text-xs text-[#999999]">{stock.symbol}</span>
                </div>
                <div className="text-xs text-[#999999] mt-0.5">
                  {stock.market === 'HK' ? '港股' : 'A股'}
                </div>
              </div>

              {/* 价格和涨跌 */}
              <div className="text-right">
                <p className={`text-sm font-medium ${isUp ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                  ¥{stock.price.toFixed(2)}
                </p>
                <p className={`text-xs ${isUp ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                  {formatChange(stock.changePercent, true)}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* 空状态 */}
      {stocks.length === 0 && (
        <div className="py-12 text-center">
          <svg className="w-16 h-16 mx-auto text-[#E5E5E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-sm text-[#999999] mt-3">暂无自选股</p>
          <p className="text-xs text-[#CCCCCC] mt-1">在行情页面添加自选股</p>
        </div>
      )}
    </div>
  );
};

export default WatchlistManager;
