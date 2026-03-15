"use strict";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// 拼音转换工具（简化版）
const pinyinMap: Record<string, string[]> = {
  '平': ['ping'], '安': ['an'], '银': ['yin'], '行': ['hang', 'xing'],
  '招': ['zhao'], '商': ['shang'],
  '贵': ['gui'], '州': ['zhou'], '茅': ['mao'], '台': ['tai'],
  '五': ['wu'], '粮': ['liang'], '液': ['ye'],
  '比': ['bi'], '亚': ['ya'], '迪': ['di'],
  '宁': ['ning'], '德': ['de'], '时': ['shi'], '代': ['dai'],
  '隆': ['long'], '基': ['ji'], '绿': ['lv'], '能': ['neng'],
  '中': ['zhong'], '国': ['guo'], '石': ['shi'], '油': ['you'],
  '工': ['gong'], '农': ['nong'], '建': ['jian'], '交': ['jiao'],
  '海': ['hai'], '康': ['kang'], '威': ['wei'], '视': ['shi'],
  '美': ['mei'], '的': ['de'], '集': ['ji'], '团': ['tuan'],
  '格': ['ge'], '力': ['li'], '电': ['dian'], '器': ['qi'],
  '恒': ['heng'], '瑞': ['rui'], '医': ['yi'], '药': ['yao'],
  '智': ['zhi'], '飞': ['fei'], '生': ['sheng'], '物': ['wu'],
  '万': ['wan'], '科': ['ke'], 'a': ['a'], 'b': ['b'],
};

// 获取拼音首字母
const getInitials = (str: string): string => {
  return str.split('').map(char => {
    const pinyin = pinyinMap[char];
    return pinyin ? pinyin[0][0] : char.toLowerCase();
  }).join('');
};

// 获取完整拼音
const getPinyin = (str: string): string[] => {
  return str.split('').map(char => {
    const pinyin = pinyinMap[char];
    return pinyin ? pinyin[0] : char.toLowerCase();
  });
};

// 搜索选项类型
interface SearchOption {
  id: string;
  name: string;
  code: string;
  pinyin?: string;
  initials?: string;
  tags?: string[];
}

// 高亮文本组件
interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className = '' }) => {
  if (!query) return <span className={className}>{text}</span>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return <span className={className}>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <span className={className}>
      {before}
      <span className="text-[var(--color-primary)] font-bold bg-[var(--color-primary)]/10 px-0.5 rounded">
        {match}
      </span>
      {after}
    </span>
  );
};

// 搜索历史管理
interface SearchHistoryProps {
  history: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelect,
  onRemove,
  onClear
}) => {
  if (history.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-bold text-[var(--color-text-muted)]">搜索历史</span>
        <button
          onClick={onClear}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        >
          清空
        </button>
      </div>
      <div className="flex flex-wrap gap-2 px-3">
        {history.map((item, i) => (
          <div
            key={i}
            className="group flex items-center gap-1 px-3 py-1 bg-[var(--color-bg)] rounded-full text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <button onClick={() => onSelect(item)} className="truncate max-w-[100px]">
              {item}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// 热门搜索
interface HotSearchProps {
  items: string[];
  onSelect: (query: string) => void;
}

export const HotSearch: React.FC<HotSearchProps> = ({ items, onSelect }) => {
  return (
    <div className="mb-3">
      <div className="px-3 py-2">
        <span className="text-xs font-bold text-[var(--color-text-muted)]">热门搜索</span>
      </div>
      <div className="flex flex-wrap gap-2 px-3">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onSelect(item)}
            className="px-3 py-1 bg-[var(--color-bg)] rounded-full text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

// 智能搜索输入框
interface SmartSearchInputProps {
  options: SearchOption[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (option: SearchOption) => void;
  maxHistory?: number;
  hotItems?: string[];
  className?: string;
}

export const SmartSearchInput: React.FC<SmartSearchInputProps> = ({
  options,
  placeholder = '搜索股票代码或名称',
  value: externalValue,
  onChange,
  onSelect,
  maxHistory = 10,
  hotItems = [],
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = externalValue !== undefined ? externalValue : internalValue;

  // 加载搜索历史
  useEffect(() => {
    const saved = localStorage.getItem('search-history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  // 保存搜索历史
  const saveToHistory = useCallback((query: string) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h !== query);
      const newHistory = [query, ...filtered].slice(0, maxHistory);
      localStorage.setItem('search-history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, [maxHistory]);

  // 搜索过滤
  const filteredOptions = useMemo(() => {
    if (!value.trim()) return [];
    
    const query = value.toLowerCase().trim();
    
    return options.filter(opt => {
      // 代码匹配
      if (opt.code.toLowerCase().includes(query)) return true;
      
      // 名称匹配
      if (opt.name.toLowerCase().includes(query)) return true;
      
      // 拼音首字母匹配
      const initials = opt.initials || getInitials(opt.name);
      if (initials.includes(query)) return true;
      
      // 完整拼音匹配
      const pinyin = opt.pinyin || getPinyin(opt.name).join('');
      if (pinyin.includes(query)) return true;
      
      return false;
    }).slice(0, 10);
  }, [value, options]);

  const handleSelect = useCallback((option: SearchOption) => {
    saveToHistory(option.code);
    setInternalValue(option.code);
    setIsOpen(false);
    onSelect?.(option);
  }, [saveToHistory, onSelect]);

  const handleHistorySelect = useCallback((query: string) => {
    setInternalValue(query);
    onChange?.(query);
    inputRef.current?.focus();
  }, [onChange]);

  const handleRemoveHistory = useCallback((query: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(h => h !== query);
      localStorage.setItem('search-history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('search-history');
  }, []);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, filteredOptions, highlightedIndex, handleSelect]);

  return (
    <div className={`relative ${className}`}>
      {/* 输入框 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            setInternalValue(newValue);
            onChange?.(newValue);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-10 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none transition-all"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          🔍
        </div>
        {value && (
          <button
            onClick={() => {
              setInternalValue('');
              onChange?.('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        )}
      </div>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 overflow-hidden">
          {!value.trim() ? (
            <>
              {history.length > 0 && (
                <SearchHistory
                  history={history}
                  onSelect={handleHistorySelect}
                  onRemove={handleRemoveHistory}
                  onClear={handleClearHistory}
                />
              )}
              {hotItems.length > 0 && (
                <HotSearch items={hotItems} onSelect={handleHistorySelect} />
              )}
            </>
          ) : (
            <>
              {filteredOptions.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                  {filteredOptions.map((opt, i) => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect(opt)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-bg)] transition-colors ${
                        i === highlightedIndex ? 'bg-[var(--color-bg)]' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--color-text-primary)]">
                            <HighlightText text={opt.name} query={value} />
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            <HighlightText text={opt.code} query={value} />
                          </span>
                        </div>
                        {opt.tags && (
                          <div className="flex items-center gap-1 mt-1">
                            {opt.tags.map((tag, j) => (
                              <span 
                                key={j}
                                className="px-1.5 py-0.5 text-[10px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  未找到相关股票
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSearchInput;
