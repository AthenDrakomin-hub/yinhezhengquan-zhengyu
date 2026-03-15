/**
 * 请求验证工具
 */

import { errorResponse, missingFieldResponse } from './response.ts'
import { ErrorCodes } from './types.ts'

/**
 * 验证必填字段
 */
export function validateRequired(
  body: Record<string, any>, 
  fields: string[]
): { valid: boolean; error?: Response } {
  const missingFields = fields.filter(field => {
    const value = body[field]
    return value === undefined || value === null || value === ''
  })
  
  if (missingFields.length > 0) {
    return { valid: false, error: missingFieldResponse(missingFields) }
  }
  
  return { valid: true }
}

/**
 * 验证价格
 */
export function validatePrice(price: number): { valid: boolean; error?: Response } {
  if (typeof price !== 'number' || isNaN(price) || price <= 0) {
    return { 
      valid: false, 
      error: errorResponse('价格必须为大于0的数字', ErrorCodes.INVALID_PRICE, 400) 
    }
  }
  
  // 检查精度（最多4位小数）
  const decimals = (price.toString().split('.')[1] || '').length
  if (decimals > 4) {
    return { 
      valid: false, 
      error: errorResponse('价格最多支持4位小数', ErrorCodes.INVALID_PRICE, 400) 
    }
  }
  
  return { valid: true }
}

/**
 * 验证数量
 */
export function validateQuantity(
  quantity: number, 
  options?: { 
    minUnit?: number    // 最小交易单位
    min?: number        // 最小数量
    max?: number        // 最大数量
  }
): { valid: boolean; error?: Response } {
  // 基础验证
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    return { 
      valid: false, 
      error: errorResponse('数量必须为大于0的整数', ErrorCodes.INVALID_QUANTITY, 400) 
    }
  }
  
  // 最小交易单位验证
  if (options?.minUnit && quantity % options.minUnit !== 0) {
    return { 
      valid: false, 
      error: errorResponse(`数量必须为 ${options.minUnit} 的整数倍`, ErrorCodes.INVALID_UNIT, 400) 
    }
  }
  
  // 最小数量验证
  if (options?.min && quantity < options.min) {
    return { 
      valid: false, 
      error: errorResponse(`数量不能少于 ${options.min}`, ErrorCodes.INVALID_QUANTITY, 400) 
    }
  }
  
  // 最大数量验证
  if (options?.max && quantity > options.max) {
    return { 
      valid: false, 
      error: errorResponse(`数量不能超过 ${options.max}`, ErrorCodes.INVALID_QUANTITY, 400) 
    }
  }
  
  return { valid: true }
}

/**
 * 验证交易类型
 */
export function validateTradeType(
  tradeType: string, 
  allowedTypes: string[]
): { valid: boolean; error?: Response } {
  if (!allowedTypes.includes(tradeType)) {
    return { 
      valid: false, 
      error: errorResponse(
        `交易类型无效，允许的类型: ${allowedTypes.join(', ')}`,
        ErrorCodes.INVALID_TRADE_TYPE,
        400
      ) 
    }
  }
  return { valid: true }
}

/**
 * 验证市场类型
 */
export function validateMarket(market: string): { valid: boolean; error?: Response } {
  const validMarkets = ['A股', '港股', '美股']
  if (!validMarkets.includes(market)) {
    return { 
      valid: false, 
      error: errorResponse(
        `市场类型无效，允许的类型: ${validMarkets.join(', ')}`,
        ErrorCodes.INVALID_MARKET,
        400
      ) 
    }
  }
  return { valid: true }
}

/**
 * 验证杠杆倍数
 */
export function validateLeverage(leverage: number, maxLeverage = 10): { valid: boolean; error?: Response } {
  if (typeof leverage !== 'number' || isNaN(leverage) || leverage < 1 || leverage > maxLeverage) {
    return { 
      valid: false, 
      error: errorResponse(
        `杠杆倍数必须在 1-${maxLeverage} 之间`,
        ErrorCodes.INVALID_REQUEST,
        400
      ) 
    }
  }
  return { valid: true }
}

/**
 * 验证股票代码格式
 */
export function validateStockCode(
  stockCode: string, 
  market: 'A股' | '港股'
): { valid: boolean; error?: Response } {
  if (!stockCode || typeof stockCode !== 'string') {
    return { valid: false, error: errorResponse('股票代码不能为空', ErrorCodes.INVALID_REQUEST, 400) }
  }
  
  if (market === 'A股') {
    // A股：6位数字，以 00/30/60/68 开头
    if (!/^(00|30|60|68)\d{4}$/.test(stockCode)) {
      return { 
        valid: false, 
        error: errorResponse('A股代码格式无效（应为6位数字）', ErrorCodes.INVALID_REQUEST, 400) 
      }
    }
  } else if (market === '港股') {
    // 港股：5位数字
    if (!/^\d{5}$/.test(stockCode)) {
      return { 
        valid: false, 
        error: errorResponse('港股代码格式无效（应为5位数字）', ErrorCodes.INVALID_REQUEST, 400) 
      }
    }
  }
  
  return { valid: true }
}
