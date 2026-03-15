/**
 * 银河证券涨跌颜色工具
 * 
 * 遵循中国市场惯例：红涨绿跌
 * 深色模式优化：橙涨蓝跌（降低视觉疲劳）
 */

/**
 * 检查当前是否为深色模式
 */
export const isDarkMode = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.body.classList.contains('dark-mode');
};

/**
 * 获取涨跌颜色类名
 * @param value 涨跌值或涨跌幅（正数表示涨，负数表示跌）
 * @param type 返回类型：'text' 返回文字颜色类，'bg' 返回背景颜色类，'all' 返回完整类名
 * @returns Tailwind CSS 类名
 */
export const getChangeColorClass = (
  value: number,
  type: 'text' | 'bg' | 'all' = 'text'
): string => {
  const isUp = value >= 0;
  const dark = isDarkMode();
  
  if (type === 'text') {
    // 文字颜色
    if (dark) {
      return isUp ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]';
    }
    return isUp ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]';
  }
  
  if (type === 'bg') {
    // 背景颜色
    if (dark) {
      return isUp ? 'bg-orange-500/20' : 'bg-blue-500/20';
    }
    return isUp ? 'bg-red-500/20' : 'bg-green-500/20';
  }
  
  // 完整类名（文字+背景）
  if (dark) {
    return isUp 
      ? 'text-[var(--color-positive)] bg-orange-500/10' 
      : 'text-[var(--color-negative)] bg-blue-500/10';
  }
  return isUp 
    ? 'text-[var(--color-positive)] bg-red-500/10' 
    : 'text-[var(--color-negative)] bg-green-500/10';
};

/**
 * 获取涨跌颜色（CSS 变量形式）
 * @param value 涨跌值
 * @returns CSS 变量颜色值
 */
export const getChangeColorVar = (value: number): string => {
  return value >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
};

/**
 * 获取涨跌箭头符号
 * @param value 涨跌值
 * @returns 箭头符号
 */
export const getChangeArrow = (value: number): string => {
  if (value > 0) return '↑';
  if (value < 0) return '↓';
  return '→';
};

/**
 * 格式化涨跌百分比
 * @param value 涨跌幅
 * @param showSign 是否显示正负号
 * @returns 格式化后的字符串
 */
export const formatChangePercent = (value: number, showSign: boolean = true): string => {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

/**
 * 获取涨跌状态描述
 * @param value 涨跌值
 * @returns 状态描述
 */
export const getChangeStatus = (value: number): 'rise' | 'fall' | 'flat' => {
  if (value > 0) return 'rise';
  if (value < 0) return 'fall';
  return 'flat';
};

/**
 * 股票涨跌颜色映射表（用于快速查询）
 */
export const STOCK_CHANGE_COLORS = {
  // 浅色模式
  light: {
    rise: {
      text: 'text-[#E30613]',
      bg: 'bg-red-50',
      border: 'border-red-200',
      all: 'text-[#E30613] bg-red-50'
    },
    fall: {
      text: 'text-[#19A55F]',
      bg: 'bg-green-50',
      border: 'border-green-200',
      all: 'text-[#19A55F] bg-green-50'
    },
    flat: {
      text: 'text-gray-500',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      all: 'text-gray-500 bg-gray-50'
    }
  },
  // 深色模式
  dark: {
    rise: {
      text: 'text-[#FF8C42]',
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/30',
      all: 'text-[#FF8C42] bg-orange-500/20'
    },
    fall: {
      text: 'text-[#3B9AE1]',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      all: 'text-[#3B9AE1] bg-blue-500/20'
    },
    flat: {
      text: 'text-gray-400',
      bg: 'bg-gray-800',
      border: 'border-gray-700',
      all: 'text-gray-400 bg-gray-800'
    }
  }
} as const;

/**
 * 根据深色模式获取完整颜色配置
 */
export const getStockColors = (value: number) => {
  const status = getChangeStatus(value);
  const mode = isDarkMode() ? 'dark' : 'light';
  return STOCK_CHANGE_COLORS[mode][status];
};
