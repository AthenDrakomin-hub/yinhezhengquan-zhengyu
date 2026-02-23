
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: 'CN' | 'HK' | 'US' | 'BOND' | 'FUND' | 'FUTURES';
  sparkline: number[];
  logoUrl?: string;
}

export interface Transaction {
  id: string;
  symbol: string;
  name: string;
  type: TradeType;
  price: number;
  quantity: number;
  amount: number;
  timestamp: Date;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'MATCHING';
}

export interface ConditionalOrder {
  id: string;
  symbol: string;
  name: string;
  type: 'TP_SL' | 'GRID';
  status: 'RUNNING' | 'TRIGGERED' | 'CANCELLED';
  config: {
    stopLoss?: number;
    takeProfit?: number;
    gridUpper?: number;
    gridLower?: number;
    gridCount?: number;
    baseQty?: number;
  };
  createdAt: Date;
}

export interface AssetSnapshot {
  date: string;
  equity: number;
  balance: number;
  profit: number;
}

export interface UserNotification {
  id: string;
  title: string;
  content: string;
  time: Date;
  isRead: boolean;
  type: 'SYSTEM' | 'TRADE' | 'COMPLIANCE';
}

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  balance: number;
  holdings: Holding[];
  transactions: Transaction[];
  conditionalOrders: ConditionalOrder[];
  history: AssetSnapshot[];
  notifications: UserNotification[];
}

export interface TradingSettings {
  fastOrderMode: boolean;
  defaultStrategy: OrderStrategy;
  defaultLeverage: number;
  autoStopLoss: boolean;
}

export interface PersonalSettings {
  language: 'zh-CN' | 'zh-HK' | 'en-US';
  fontSize: 'standard' | 'large';
  hapticFeedback: boolean;
  soundEffects: boolean;
  theme: 'dark' | 'light' | 'system';
}

export interface Banner {
  id: string;
  title: string;
  desc: string;
  img: string;
  category: string;
  date: string;
  content: string;
  relatedSymbol?: string;
}

export interface ResearchReport {
  id: string;
  title: string;
  author: string;
  date: string;
  summary: string;
  content?: string;
  category: '个股' | '行业' | '宏观' | '策略';
  sentiment: '看多' | '中性' | '看空';
  tags?: string[];
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  availableQuantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
  profitRate: number;
  category: 'STOCK' | 'FUND' | 'BOND' | 'OPTION' | 'MARGIN';
  logoUrl?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'IN_PROGRESS' | 'CLOSED' | 'OPEN';
  lastUpdate: string;
}

export interface EducationTopic {
  id: string;
  title: string;
  category: string;
  image: string;
  duration: string;
}

export interface MarketHoliday {
  date: string;
  name: string;
  markets: string[];
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: string;
  time?: string;
  markets?: string[];
}

export interface FundOperationRecord {
  _id: string;
  userId: string;
  accountId: string;
  type: 'RECHARGE' | 'WITHDRAW';
  amount: number;
  operatorId: string;
  remark: string;
  operationTime: Date;
}

export interface ApiKey {
  _id: string;
  clientName: string;
  apiKey: string;
  apiSecret: string;
  permissions: string[];
  ipWhitelist: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createTime: Date;
  updateTime: Date;
}

export enum TradeType {
  BUY = '买入',
  SELL = '卖出',
  IPO = '新股申购',
  BLOCK = '大宗交易',
  LIMIT_UP = '涨停打板'
}

export enum OrderStrategy {
  NORMAL = '普通委托',
  GRID = '网格交易',
  TP_SL = '止盈止损',
  TIME = '时间条件',
  INFLECTION = '拐点触发'
}
