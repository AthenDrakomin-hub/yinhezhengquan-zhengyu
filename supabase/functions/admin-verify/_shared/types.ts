/**
 * 交易系统共享类型定义
 */

// 市场类型
export type MarketType = 'A股' | '港股' | '美股'

// 交易类型
export type TradeType = 'BUY' | 'SELL' | 'IPO' | 'BLOCK_TRADE' | 'LIMIT_UP'

// 订单状态
export type OrderStatus = 'PENDING' | 'MATCHING' | 'FILLED' | 'CANCELLED' | 'REJECTED'

// 审核状态
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// 用户等级
export type UserLevel = 'user' | 'vip' | 'svip' | 'institution'

// ==================== 请求类型 ====================

/** 基础交易请求 */
export interface BaseTradeRequest {
  user_id?: string        // 可选，由 JWT 自动获取
  stock_code: string      // 股票代码
  stock_name: string      // 股票名称
  price: number           // 价格
  quantity: number        // 数量
  leverage?: number       // 杠杆倍数（默认1）
  transaction_id?: string // 客户端交易ID
  metadata?: Record<string, any>  // 扩展元数据
}

/** A股/港股交易请求 */
export interface EquityTradeRequest extends BaseTradeRequest {
  trade_type: 'BUY' | 'SELL'  // 买卖方向
}

/** 新股申购请求 */
export interface IPOTtradeRequest extends BaseTradeRequest {
  ipo_id?: string  // 新股ID
}

/** 大宗交易请求 */
export interface BlockTradeRequest extends BaseTradeRequest {
  trade_type: 'BUY' | 'SELL'  // 买卖方向
  counterparty?: string       // 交易对手
}

/** 涨停打板请求 */
export interface LimitUpTradeRequest extends BaseTradeRequest {
  // 继承基础请求，无额外字段
}

// ==================== 响应类型 ====================

/** 统一响应格式 */
export interface TradeResponse {
  success: boolean
  error?: string
  code?: number
  trade?: TradeOrder
  status?: string
  message?: string
  transactionId?: string
}

/** 交易订单 */
export interface TradeOrder {
  id: string
  user_id: string
  market_type: MarketType
  trade_type: TradeType
  stock_code: string
  stock_name: string
  price: number
  quantity: number
  leverage: number
  fee: number
  status: OrderStatus
  need_approval: boolean
  approval_status?: ApprovalStatus
  created_at: string
  metadata?: Record<string, any>
}

// ==================== 数据库实体 ====================

/** 用户资产 */
export interface UserAssets {
  id?: string
  user_id: string
  total_balance: number
  available_balance: number
  frozen_balance: number
  market_value: number
  total_assets: number
}

/** 用户持仓 */
export interface Position {
  id?: string
  user_id: string
  symbol: string
  stock_name?: string
  quantity: number
  available_quantity: number
  cost_price: number
  market?: string
}

/** 用户档案 */
export interface UserProfile {
  id: string
  level?: UserLevel
  role?: string
  admin_level?: string
}

/** 交易规则 */
export interface TradeRule {
  id?: string
  rule_type: string
  config: Record<string, any>
  status?: boolean
}

/** 审核规则 */
export interface ApprovalRule {
  id?: string
  trade_type: string
  auto_approve_enabled: boolean
  auto_approve_threshold: {
    max_amount?: number
    max_quantity?: number
  }
  reviewer_level_required?: string
  manual_review_conditions?: {
    all?: boolean
    large_amount?: number
  }
  status?: boolean
}

/** 交易时段 */
export interface TradingHours {
  id?: string
  market_type: string
  trading_sessions: Array<{
    type: string
    start: string
    end: string
  }>
  status?: boolean
}

// ==================== 错误码 ====================

export const ErrorCodes = {
  // 通用错误 (1000-1099)
  UNKNOWN_ERROR: 1000,
  INVALID_REQUEST: 1001,
  MISSING_FIELD: 1002,
  INVALID_PRICE: 1003,
  INVALID_QUANTITY: 1004,
  INVALID_TRADE_TYPE: 1005,
  INVALID_MARKET: 1006,
  NOT_TRADING_TIME: 1007,
  INVALID_UNIT: 1008,
  
  // 资金/持仓错误 (1100-1199)
  INSUFFICIENT_BALANCE: 1100,
  INSUFFICIENT_POSITION: 1101,
  FREEZE_FAILED: 1102,
  
  // 权限错误 (1200-1299)
  UNAUTHORIZED: 1200,
  INVALID_TOKEN: 1201,
  PERMISSION_DENIED: 1202,
  
  // 系统错误 (1300-1399)
  DATABASE_ERROR: 1300,
  CACHE_ERROR: 1301,
  EXTERNAL_API_ERROR: 1302,
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
