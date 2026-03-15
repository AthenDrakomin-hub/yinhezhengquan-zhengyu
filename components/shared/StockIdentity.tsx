/**
 * 股票标识组件
 * 展示股票代码、名称、标识（ST/N/C等）和板块信息
 */
import React, { useState, useMemo } from 'react';
import {
  parseStockIdentifier,
  getInitialColor,
  formatStockCode,
  StockIdentifier,
} from '../../lib/stockIdentifier';

interface StockIdentityProps {
  symbol: string;
  name: string;
  market?: 'CN' | 'HK';
  logoUrl?: string;
  showCode?: boolean;
  showBoard?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 标识标签组件
 */
const IdentifierTag: React.FC<{
  label: string;
  color: string;
  bgColor?: string;
  tooltip: string;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ label, color, bgColor, tooltip, size = 'sm', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-1 text-[10px]';
  
  return (
    <span
      className={`${sizeClasses} rounded font-bold whitespace-nowrap ${className}`}
      style={{
        color,
        backgroundColor: bgColor || `${color}20`,
      }}
      title={tooltip}
    >
      {label}
    </span>
  );
};

/**
 * 首字图标组件
 */
const InitialIcon: React.FC<{
  name: string;
  market: 'CN' | 'HK';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ name, market, size = 'sm', className = '' }) => {
  const colors = useMemo(() => getInitialColor(name, market), [name, market]);
  const initial = name.charAt(0);
  
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg text-[11px]',
    md: 'w-9 h-9 rounded-xl text-sm',
    lg: 'w-11 h-11 rounded-2xl text-base',
  };
  
  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center font-black flex-shrink-0 border border-current/20 ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {initial}
    </div>
  );
};

/**
 * 股票标识组件
 */
const StockIdentity: React.FC<StockIdentityProps> = ({
  symbol,
  name,
  market = 'CN',
  logoUrl,
  showCode = true,
  showBoard = false,
  size = 'sm',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  
  // 解析股票标识
  const identity = useMemo(
    () => parseStockIdentifier(symbol, name, market),
    [symbol, name, market]
  );
  
  // 格式化代码
  const displayCode = useMemo(
    () => formatStockCode(symbol, market),
    [symbol, market]
  );
  
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* 首字图标 */}
      {!logoUrl || imageError ? (
        <InitialIcon name={identity.cleanName} market={market} size={size} />
      ) : (
        <div
          className={`
            ${size === 'sm' ? 'w-7 h-7 rounded-lg' : size === 'md' ? 'w-9 h-9 rounded-xl' : 'w-11 h-11 rounded-2xl'}
            bg-white flex items-center justify-center p-1 border border-slate-200 shadow-sm overflow-hidden flex-shrink-0
          `}
        >
          <img
            src={logoUrl}
            alt={identity.cleanName}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      )}
      
      {/* 名称和代码区域 */}
      <div className="flex flex-col min-w-0 flex-1">
        {/* 股票名称行 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 前缀标识（ST/N/C等） */}
          {identity.prefix && (
            <span
              className="font-black text-[10px]"
              style={{ color: identity.prefix.color }}
              title={identity.prefix.tooltip}
            >
              {identity.prefix.label}
            </span>
          )}
          
          {/* 港股标签 */}
          {market === 'HK' && (
            <span className="px-1.5 py-0.5 bg-[var(--color-secondary)] text-white text-[8px] rounded font-bold">
              港股
            </span>
          )}
          
          {/* 股票名称 */}
          <span
            className={`
              font-black tracking-tight truncate
              ${size === 'sm' ? 'text-[13px]' : size === 'md' ? 'text-sm' : 'text-base'}
              ${identity.prefix?.type === 'ST' || identity.prefix?.type === '*ST' ? 'text-red-600' : 'text-[var(--color-text-primary)]'}
            `}
            style={
              identity.prefix && !['ST', '*ST'].includes(identity.prefix.type)
                ? { color: identity.prefix.color }
                : undefined
            }
          >
            {identity.cleanName}
          </span>
          
          {/* 后缀标识（U/W/R等） */}
          {identity.suffixes?.map((suffix, idx) => (
            <IdentifierTag
              key={idx}
              label={suffix.label}
              color={suffix.color}
              bgColor={suffix.bgColor}
              tooltip={suffix.tooltip}
              size="sm"
            />
          ))}
          
          {/* 板块标签 */}
          {showBoard && identity.board && (
            <IdentifierTag
              label={identity.board.label}
              color={identity.board.color}
              bgColor={identity.board.bgColor}
              tooltip={identity.board.tooltip}
              size="sm"
            />
          )}
        </div>
        
        {/* 股票代码行 */}
        {showCode && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[var(--color-text-muted)] font-mono font-bold">
              {displayCode}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockIdentity;

// 导出工具函数供其他组件使用
export { parseStockIdentifier, formatStockCode, getInitialColor };
export type { StockIdentifier };
