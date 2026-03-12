"use strict";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  loading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showTotal = true,
  loading = false,
}) => {
  // 生成页码数组
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 始终显示第一页
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // 当前页附近的页码
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // 始终显示最后一页
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1 && !showPageSize && !showTotal) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      {/* 左侧：总数显示 */}
      <div className="flex items-center gap-4">
        {showTotal && totalItems !== undefined && (
          <span className="text-xs text-[var(--color-text-muted)]">
            共 <span className="font-bold text-[var(--color-text-primary)]">{totalItems}</span> 条
          </span>
        )}
        
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[#00D4AA]"
              disabled={loading}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-xs text-[var(--color-text-muted)]">条</span>
          </div>
        )}
      </div>

      {/* 右侧：分页按钮 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* 首页按钮 */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            title="首页"
          >
            <ChevronLeft size={14} />
            <ChevronLeft size={14} className="-ml-2" />
          </button>

          {/* 上一页按钮 */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            title="上一页"
          >
            <ChevronLeft size={16} />
          </button>

          {/* 页码按钮 */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="w-8 h-8 flex items-center justify-center text-xs text-[var(--color-text-muted)]">...</span>
                ) : (
                  <button
                    onClick={() => onPageChange(page as number)}
                    disabled={loading}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      currentPage === page
                        ? 'bg-[#00D4AA] text-[#0A1628]'
                        : 'hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* 下一页按钮 */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            title="下一页"
          >
            <ChevronRight size={16} />
          </button>

          {/* 末页按钮 */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            title="末页"
          >
            <ChevronRight size={14} />
            <ChevronRight size={14} className="-ml-2" />
          </button>
        </div>
      )}

      {/* 页码信息（移动端） */}
      <div className="sm:hidden text-xs text-[var(--color-text-muted)]">
        第 <span className="font-bold text-[var(--color-text-primary)]">{currentPage}</span> / {totalPages} 页
      </div>
    </div>
  );
};

export default Pagination;

// usePagination Hook - 用于管理分页状态
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UsePaginationReturn extends PaginationState {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  reset: () => void;
  offset: number;
}

export const usePagination = (initialPageSize: number = 20): UsePaginationReturn => {
  const [state, setState] = React.useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 1,
  });

  const setPage = (page: number) => {
    setState(prev => ({ ...prev, page }));
  };

  const setPageSize = (size: number) => {
    setState(prev => ({ 
      ...prev, 
      pageSize: size, 
      page: 1,
      totalPages: Math.ceil(prev.total / size) || 1 
    }));
  };

  const setTotal = (total: number) => {
    setState(prev => ({
      ...prev,
      total,
      totalPages: Math.ceil(total / prev.pageSize) || 1,
      page: Math.min(prev.page, Math.ceil(total / prev.pageSize) || 1),
    }));
  };

  const reset = () => {
    setState({
      page: 1,
      pageSize: initialPageSize,
      total: 0,
      totalPages: 1,
    });
  };

  return {
    ...state,
    setPage,
    setPageSize,
    setTotal,
    reset,
    offset: (state.page - 1) * state.pageSize,
  };
};
