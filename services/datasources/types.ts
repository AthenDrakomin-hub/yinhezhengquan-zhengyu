/**
 * 数据源类型定义（免费方案）
 * 
 * 支持的免费数据源：东方财富（主）、新浪财经（备用）
 */

// ==================== 市场类型 ====================

export type Market = 'CN' | 'HK' | 'US' | 'BJ'; // A股、港股、美股、北交所

// ==================== 数据类型 ====================

export type DataType = 
  | 'QUOTE'        // 行情
  | 'KLINE'        // K线
  | 'TICKS'        // 成交明细
  | 'ORDER_BOOK'   // 五档盘口
  | 'NEWS';        // 新闻

// ==================== 数据源标识 ====================

export type DataSourceName = 'EASTMONEY' | 'SINA';

// ==================== 统一数据格式 ====================

/** 统一行情格式 */
export interface UnifiedQuote {
  symbol: string;           // 代码
  name: string;             // 名称
  market: Market;           // 市场
  price: number;            // 当前价
  open: number;             // 开盘价
  high: number;             // 最高价
  low: number;              // 最低价
  prevClose: number;        // 昨收价
  volume: number;           // 成交量
  amount: number;           // 成交额
  change: number;           // 涨跌额
  changePercent: number;    // 涨跌幅
  turnoverRate?: number;    // 换手率
  timestamp: string;        // 时间戳
  source: DataSourceName;   // 数据来源
}

/** 统一K线格式 */
export interface UnifiedKline {
  time: string;             // 时间
  open: number;             // 开盘价
  high: number;             // 最高价
  low: number;              // 最低价
  close: number;            // 收盘价
  volume: number;           // 成交量
  amount: number;           // 成交额
}

/** 统一五档格式 */
export interface UnifiedOrderBook {
  bids: Array<{ price: number; volume: number }>; // 买盘
  asks: Array<{ price: number; volume: number }>; // 卖盘
  timestamp: string;
  source: DataSourceName;
}

/** 统一成交明细格式 */
export interface UnifiedTick {
  time: string;             // 成交时间
  price: number;            // 成交价格
  volume: number;           // 成交数量
  direction: 'BUY' | 'SELL' | 'NEUTRAL'; // 买卖方向
}

/** 统一新闻格式 */
export interface UnifiedNews {
  id: string;
  title: string;
  content: string;
  time: string;
  source: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  url?: string;
  dataSource: DataSourceName;
}
