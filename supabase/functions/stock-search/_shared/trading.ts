/**
 * 交易核心逻辑模块
 */

import type { ApprovalRule, TradingHours } from './types.ts'

// ==================== 交易时间检查 ====================

/**
 * 检查是否为周末
 */
export function isWeekend(): boolean {
  const day = new Date().getDay()
  return day === 0 || day === 6
}

/**
 * 检查是否在交易时段内
 */
export function isInTradingSession(tradingHours: TradingHours | null): boolean {
  if (!tradingHours || !tradingHours.trading_sessions) {
    return true // 无配置时默认允许
  }
  
  const now = new Date()
  const currentHour = now.getHours().toString().padStart(2, '0')
  const currentMinute = now.getMinutes().toString().padStart(2, '0')
  const currentTimeStr = `${currentHour}:${currentMinute}`
  
  for (const session of tradingHours.trading_sessions) {
    if (session.type === 'continuous' || session.type === 'call_auction') {
      if (currentTimeStr >= session.start && currentTimeStr <= session.end) {
        return true
      }
    }
  }
  
  return false
}

/**
 * 检查交易时间
 */
export function checkTradingTime(
  tradingHours: TradingHours | null
): { valid: boolean; reason?: string } {
  // 周末检查
  if (isWeekend()) {
    return { valid: false, reason: '周末不开市' }
  }
  
  // 交易时段检查
  if (tradingHours && !isInTradingSession(tradingHours)) {
    return { valid: false, reason: '当前非交易时间' }
  }
  
  return { valid: true }
}

// ==================== 审核判断 ====================

/**
 * 判断是否需要审核
 */
export function checkNeedsApproval(
  approvalRule: ApprovalRule | null,
  amount: number,
  quantity: number
): { needApproval: boolean; reviewerLevel: string } {
  if (!approvalRule) {
    return { needApproval: false, reviewerLevel: 'admin' }
  }
  
  let needApproval = false
  const reviewerLevel = approvalRule.reviewer_level_required || 'admin'
  
  // 自动审核未启用
  if (!approvalRule.auto_approve_enabled) {
    needApproval = true
  } else {
    // 检查阈值
    const threshold = approvalRule.auto_approve_threshold
    
    if (threshold) {
      if (threshold.max_amount && amount > threshold.max_amount) {
        needApproval = true
      }
      if (threshold.max_quantity && quantity > threshold.max_quantity) {
        needApproval = true
      }
    }
    
    // 检查手动审核条件
    if (approvalRule.manual_review_conditions?.all) {
      needApproval = true
    }
  }
  
  return { needApproval, reviewerLevel }
}

// ==================== 费用计算 ====================

/**
 * 计算交易费用
 */
export function calculateFee(
  amount: number,
  tradeType: 'BUY' | 'SELL',
  feeConfig?: {
    buyRate?: number    // 买入费率
    sellRate?: number   // 卖出费率
    stampDuty?: number  // 印花税（仅卖出）
    minFee?: number     // 最低收费
  }
): number {
  if (!feeConfig) {
    // 默认费率
    const defaultBuyRate = 0.00025  // 万2.5
    const defaultSellRate = 0.00025
    const defaultStampDuty = 0.001  // 千1
    const defaultMinFee = 5
    
    const rate = tradeType === 'SELL' 
      ? defaultSellRate + defaultStampDuty 
      : defaultBuyRate
    
    return Math.max(amount * rate, defaultMinFee)
  }
  
  const { buyRate = 0, sellRate = 0, stampDuty = 0, minFee = 5 } = feeConfig
  
  const rate = tradeType === 'SELL' 
    ? sellRate + stampDuty 
    : buyRate
  
  return Math.max(amount * rate, minFee)
}

// ==================== 用户等级 ====================

/**
 * 用户等级映射
 */
export const USER_LEVEL_MAP: Record<string, number> = {
  'user': 0,
  'vip': 1,
  'svip': 2,
  'institution': 3
}

/**
 * 获取用户等级数值
 */
export function getUserLevelValue(level?: string): number {
  if (!level) return 0
  return USER_LEVEL_MAP[level] || 0
}

// ==================== 最小交易单位 ====================

/**
 * 获取最小交易单位
 */
export function getMinTradeUnit(
  market: 'A股' | '港股',
  tradeRules?: Record<string, any>
): number {
  if (tradeRules) {
    if (market === 'A股') {
      return tradeRules['A股'] || tradeRules['CN'] || 100
    } else {
      return tradeRules['港股'] || tradeRules['HK'] || 1
    }
  }
  
  // 默认值
  return market === 'A股' ? 100 : 1
}

// ==================== 日志工具 ====================

/**
 * 交易日志
 */
export function logTrade(
  action: string,
  data: Record<string, any>
): void {
  console.log(`[交易] ${action}:`, JSON.stringify(data))
}

/**
 * 交易错误日志
 */
export function logTradeError(
  action: string,
  error: any
): void {
  console.error(`[交易错误] ${action}:`, error)
}
