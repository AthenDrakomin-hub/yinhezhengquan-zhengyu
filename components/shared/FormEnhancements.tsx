"use strict";

import React, { useState, useCallback, useMemo } from 'react';

// 数量快捷按钮组件
interface QuickAmountButtonsProps {
  availableQuantity: number;
  availableAmount: number;
  price: number;
  onSelect: (quantity: number) => void;
  minUnit?: number;
  className?: string;
}

export const QuickAmountButtons: React.FC<QuickAmountButtonsProps> = ({
  availableQuantity,
  availableAmount,
  price,
  onSelect,
  minUnit = 100,
  className = ''
}) => {
  // 计算各种比例的数量
  const amounts = useMemo(() => {
    const maxByQuantity = Math.floor(availableQuantity / minUnit) * minUnit;
    const maxByAmount = Math.floor(availableAmount / price / minUnit) * minUnit;
    const maxQuantity = Math.min(maxByQuantity, maxByAmount);
    
    return {
      quarter: Math.floor(maxQuantity * 0.25 / minUnit) * minUnit,
      third: Math.floor(maxQuantity / 3 / minUnit) * minUnit,
      half: Math.floor(maxQuantity * 0.5 / minUnit) * minUnit,
      all: maxQuantity
    };
  }, [availableQuantity, availableAmount, price, minUnit]);

  const buttons = [
    { label: '1/4', value: amounts.quarter },
    { label: '1/3', value: amounts.third },
    { label: '1/2', value: amounts.half },
    { label: '全仓', value: amounts.all },
  ];

  return (
    <div className={`flex gap-2 ${className}`}>
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={() => onSelect(btn.value)}
          disabled={btn.value <= 0}
          className="flex-1 py-2 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
};

// 价格滑块组件
interface PriceSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  priceChange?: number; // 涨跌幅限制
  className?: string;
}

export const PriceSlider: React.FC<PriceSliderProps> = ({
  min,
  max,
  step = 0.01,
  value,
  onChange,
  priceChange,
  className = ''
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={className}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-[var(--color-surface)] rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${percentage}%, var(--color-surface) ${percentage}%)`
        }}
      />
      <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
        <span>{min.toFixed(2)}</span>
        {priceChange !== undefined && (
          <span className={priceChange >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        )}
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
};

// 输入框实时验证组件
interface ValidatedInputProps {
  value: string;
  onChange: (value: string) => void;
  validate: (value: string) => string | null;
  placeholder?: string;
  type?: 'text' | 'number';
  className?: string;
  inputClassName?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  value,
  onChange,
  validate,
  placeholder,
  type = 'text',
  className = '',
  inputClassName = '',
  label,
  required = false,
  disabled = false
}) => {
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  
  const error = validate(value);
  const showError = touched && !focused && error;

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
          setTouched(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full h-11 px-4 bg-[var(--color-bg)] rounded-xl border text-sm outline-none transition-all
          ${showError 
            ? 'border-red-500 focus:border-red-500' 
            : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${inputClassName}
        `}
      />
      {showError && (
        <p className="mt-1 text-xs text-red-500 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

// 表单验证规则
export const validationRules = {
  required: (value: string): string | null => 
    !value.trim() ? '此字段为必填项' : null,
  
  number: (value: string): string | null => 
    isNaN(Number(value)) ? '请输入有效的数字' : null,
  
  positiveNumber: (value: string): string | null => {
    const num = Number(value);
    if (isNaN(num)) return '请输入有效的数字';
    if (num <= 0) return '请输入大于0的数字';
    return null;
  },
  
  min: (min: number) => (value: string): string | null => {
    const num = Number(value);
    if (isNaN(num)) return '请输入有效的数字';
    if (num < min) return `最小值为 ${min}`;
    return null;
  },
  
  max: (max: number) => (value: string): string | null => {
    const num = Number(value);
    if (isNaN(num)) return '请输入有效的数字';
    if (num > max) return `最大值为 ${max}`;
    return null;
  },
  
  integer: (value: string): string | null => {
    const num = Number(value);
    if (isNaN(num)) return '请输入有效的数字';
    if (!Number.isInteger(num)) return '请输入整数';
    return null;
  },
  
  multipleOf: (multiple: number) => (value: string): string | null => {
    const num = Number(value);
    if (isNaN(num)) return '请输入有效的数字';
    if (num % multiple !== 0) return `数量必须是 ${multiple} 的整数倍`;
    return null;
  },
  
  combine: (...rules: ((value: string) => string | null)[]) => 
    (value: string): string | null => {
      for (const rule of rules) {
        const error = rule(value);
        if (error) return error;
      }
      return null;
    },
};

// 带提示的输入框组件
interface InputWithHintProps {
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'password';
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const InputWithHint: React.FC<InputWithHintProps> = ({
  value,
  onChange,
  hint,
  placeholder,
  type = 'text',
  label,
  className = '',
  disabled = false
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full h-11 px-4 bg-[var(--color-bg)] rounded-xl border text-sm outline-none transition-all
            border-[var(--color-border)] focus:border-[var(--color-primary)]
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        {/* 提示气泡 */}
        {focused && hint && (
          <div className="absolute left-0 right-0 top-full mt-2 z-10 animate-fade-in">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-secondary)] shadow-lg">
              {hint}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAmountButtons;
