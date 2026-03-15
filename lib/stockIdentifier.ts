/**
 * 股票标识解析与展示工具
 * 根据 A股和港股规则解析股票名称中的特殊标识
 */

/**
 * 股票标识类型定义
 */
export interface StockIdentifier {
  // 前缀标识
  prefix?: {
    type: 'ST' | '*ST' | 'N' | 'C' | 'XR' | 'XD' | 'DR';
    label: string;
    color: string;
    bgColor?: string;
    tooltip: string;
  };
  
  // 后缀标识（右侧标签）
  suffixes?: Array<{
    type: 'U' | 'W' | 'R' | 'B' | 'S' | 'SW' | '-B' | '-W' | '-S' | '-SW' | '-R';
    label: string;
    color: string;
    bgColor: string;
    tooltip: string;
  }>;
  
  // 板块标识
  board?: {
    type: 'A股主板' | '科创板' | '创业板' | '北交所' | '港股主板' | '港股创业板' | '港股特殊证券';
    label: string;
    color: string;
    bgColor: string;
    tooltip: string;
  };
  
  // 清理后的股票名称
  cleanName: string;
  
  // 市场类型
  market: 'CN' | 'HK';
  
  // 代码后缀（港股）
  codeSuffix?: string;
}

/**
 * A股前缀标识配置
 */
const PREFIX_CONFIG: Record<string, { label: string; color: string; bgColor?: string; tooltip: string }> = {
  '*ST': { label: '*ST', color: '#DC2626', tooltip: '退市风险警示，该公司存在退市风险' },
  'ST': { label: 'ST', color: '#DC2626', tooltip: '特别处理，公司连续两年亏损，投资风险较高' },
  'N': { label: 'N', color: '#2563EB', tooltip: '新股上市首日，涨跌幅限制特殊' },
  'C': { label: 'C', color: '#2563EB', tooltip: '上市后未满5个交易日的新股' },
  'XR': { label: 'XR', color: '#059669', tooltip: '当日为除权日，买入不享有送转股权益' },
  'XD': { label: 'XD', color: '#10B981', tooltip: '当日为除息日，买入不享有现金分红权益' },
  'DR': { label: 'DR', color: '#14B8A6', tooltip: '当日既除权又除息' },
};

/**
 * A股后缀标识配置（右侧小标签）
 */
const SUFFIX_CONFIG_CN: Record<string, { label: string; color: string; bgColor: string; tooltip: string }> = {
  'U': { label: 'U', color: '#D97706', bgColor: '#FEF3C7', tooltip: '未盈利公司，投资风险较高' },
  'W': { label: 'W', color: '#7C3AED', bgColor: '#EDE9FE', tooltip: '同股不同权架构' },
  'R': { label: 'R', color: '#EA580C', bgColor: '#FFEDD5', tooltip: '融资融券标的' },
};

/**
 * 港股后缀标识配置
 */
const SUFFIX_CONFIG_HK: Record<string, { label: string; color: string; bgColor: string; tooltip: string }> = {
  '-B': { label: '-B', color: '#DC2626', bgColor: '#FEE2E2', tooltip: '未盈利生物科技公司' },
  '-W': { label: '-W', color: '#7C3AED', bgColor: '#EDE9FE', tooltip: '同股不同权架构' },
  '-SW': { label: '-SW', color: '#7C3AED', bgColor: '#EDE9FE', tooltip: '二次上市+同股不同权' },
  '-S': { label: '-S', color: '#6B7280', bgColor: '#F3F4F6', tooltip: '二次上市' },
  '-R': { label: '-R', color: '#2563EB', bgColor: '#DBEAFE', tooltip: '人民币计价柜台' },
};

/**
 * 根据股票代码判断A股板块
 */
export function getCNBoard(code: string): StockIdentifier['board'] {
  if (code.startsWith('688')) {
    return {
      type: '科创板',
      label: '科创板',
      color: '#9333EA',
      bgColor: '#F3E8FF',
      tooltip: '科创板股票，涨跌幅限制20%',
    };
  }
  if (code.startsWith('300') || code.startsWith('301')) {
    return {
      type: '创业板',
      label: '创业板',
      color: '#059669',
      bgColor: '#D1FAE5',
      tooltip: '创业板股票，涨跌幅限制20%',
    };
  }
  if (code.startsWith('8') || code.startsWith('4')) {
    return {
      type: '北交所',
      label: '北交所',
      color: '#D97706',
      bgColor: '#FEF3C7',
      tooltip: '北交所股票',
    };
  }
  // 主板
  if (code.startsWith('60') || code.startsWith('00')) {
    return {
      type: 'A股主板',
      label: '主板',
      color: '#2563EB',
      bgColor: '#DBEAFE',
      tooltip: '主板股票，涨跌幅限制10%',
    };
  }
  return undefined;
}

/**
 * 根据港股代码判断板块
 */
export function getHKBoard(code: string): StockIdentifier['board'] {
  // 去掉前导0
  const cleanCode = code.replace(/^0+/, '');
  
  if (cleanCode.startsWith('8')) {
    return {
      type: '港股创业板',
      label: '港股创业板',
      color: '#059669',
      bgColor: '#D1FAE5',
      tooltip: '港股创业板股票',
    };
  }
  if (cleanCode.startsWith('1') || cleanCode.startsWith('2')) {
    return {
      type: '港股特殊证券',
      label: '特殊证券',
      color: '#EA580C',
      bgColor: '#FFEDD5',
      tooltip: '港股特殊证券或衍生品',
    };
  }
  // 主板（0开头）
  return {
    type: '港股主板',
    label: '港股主板',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    tooltip: '港股主板股票',
  };
}

/**
 * 解析股票标识
 * @param symbol 股票代码
 * @param name 股票名称（可能包含ST/N等前缀）
 * @param market 市场类型 CN/HK
 */
export function parseStockIdentifier(
  symbol: string,
  name: string,
  market: 'CN' | 'HK' = 'CN'
): StockIdentifier {
  let cleanName = name;
  let prefix: StockIdentifier['prefix'];
  const suffixes: StockIdentifier['suffixes'] = [];
  let board: StockIdentifier['board'];
  let codeSuffix = '';
  
  if (market === 'CN') {
    // 解析A股前缀标识
    // 优先匹配 *ST
    if (cleanName.startsWith('*ST')) {
      const config = PREFIX_CONFIG['*ST'];
      prefix = { type: '*ST', ...config };
      cleanName = cleanName.replace('*ST', '');
    } else if (cleanName.startsWith('ST')) {
      const config = PREFIX_CONFIG['ST'];
      prefix = { type: 'ST', ...config };
      cleanName = cleanName.replace('ST', '');
    } else if (cleanName.startsWith('N')) {
      const config = PREFIX_CONFIG['N'];
      prefix = { type: 'N', ...config };
      cleanName = cleanName.substring(1);
    } else if (cleanName.startsWith('C')) {
      const config = PREFIX_CONFIG['C'];
      prefix = { type: 'C', ...config };
      cleanName = cleanName.substring(1);
    } else if (cleanName.startsWith('XR')) {
      const config = PREFIX_CONFIG['XR'];
      prefix = { type: 'XR', ...config };
      cleanName = cleanName.substring(2);
    } else if (cleanName.startsWith('XD')) {
      const config = PREFIX_CONFIG['XD'];
      prefix = { type: 'XD', ...config };
      cleanName = cleanName.substring(2);
    } else if (cleanName.startsWith('DR')) {
      const config = PREFIX_CONFIG['DR'];
      prefix = { type: 'DR', ...config };
      cleanName = cleanName.substring(2);
    }
    
    // 解析A股后缀标识
    for (const [suffix, config] of Object.entries(SUFFIX_CONFIG_CN)) {
      if (name.includes(suffix)) {
        suffixes.push({ type: suffix as any, ...config });
        cleanName = cleanName.replace(suffix, '');
      }
    }
    
    // 获取A股板块
    board = getCNBoard(symbol);
    
  } else {
    // 港股处理
    codeSuffix = '.HK';
    
    // 解析港股后缀标识
    for (const [suffix, config] of Object.entries(SUFFIX_CONFIG_HK)) {
      if (name.includes(suffix) || symbol.includes(suffix)) {
        suffixes.push({ type: suffix as any, ...config });
        cleanName = cleanName.replace(suffix, '');
      }
    }
    
    // 获取港股板块
    board = getHKBoard(symbol);
  }
  
  // 清理名称中的空格
  cleanName = cleanName.trim();
  
  return {
    prefix,
    suffixes: suffixes.length > 0 ? suffixes : undefined,
    board,
    cleanName,
    market,
    codeSuffix,
  };
}

/**
 * 获取首字图标背景色
 */
export function getInitialColor(name: string, market: 'CN' | 'HK' = 'CN'): { bg: string; text: string } {
  // 根据市场使用不同的颜色
  if (market === 'HK') {
    return { bg: 'rgba(37, 99, 235, 0.15)', text: '#2563EB' };
  }
  
  // A股根据首字生成颜色
  const colors = [
    { bg: 'rgba(0, 212, 170, 0.15)', text: '#E63946' },
    { bg: 'rgba(37, 99, 235, 0.15)', text: '#2563EB' },
    { bg: 'rgba(220, 38, 38, 0.15)', text: '#DC2626' },
    { bg: 'rgba(5, 150, 105, 0.15)', text: '#059669' },
    { bg: 'rgba(124, 58, 237, 0.15)', text: '#7C3AED' },
  ];
  
  const charCode = name.charCodeAt(0);
  const index = charCode % colors.length;
  return colors[index];
}

/**
 * 格式化股票代码显示
 */
export function formatStockCode(symbol: string, market: 'CN' | 'HK' = 'CN'): string {
  if (market === 'HK') {
    return `${symbol}.HK`;
  }
  return symbol;
}
