/**
 * 统一响应工具
 */

import { TradeResponse, ErrorCodes, ErrorCode } from './types.ts'

// CORS 头
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// 别名导出（兼容不同命名风格）
export const corsHeaders = CORS_HEADERS

/**
 * JSON 响应
 */
export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    status,
  })
}

/**
 * 成功响应
 */
export function successResponse(data: Omit<TradeResponse, 'success'>): Response {
  return jsonResponse({ success: true, ...data })
}

/**
 * 错误响应
 */
export function errorResponse(
  error: string, 
  code: ErrorCode | number, 
  status = 400,
  extra?: Record<string, any>
): Response {
  return jsonResponse({ success: false, error, code, ...extra }, status)
}

/**
 * OPTIONS 预检响应
 */
export function optionsResponse(): Response {
  return new Response('ok', { headers: CORS_HEADERS })
}

/**
 * 未授权响应
 */
export function unauthorizedResponse(message = '请先登录'): Response {
  return errorResponse(message, ErrorCodes.UNAUTHORIZED, 401)
}

/**
 * 无效 Token 响应
 */
export function invalidTokenResponse(message = '登录已过期'): Response {
  return errorResponse(message, ErrorCodes.INVALID_TOKEN, 401)
}

/**
 * 权限不足响应
 */
export function permissionDeniedResponse(message = '权限不足'): Response {
  return errorResponse(message, ErrorCodes.PERMISSION_DENIED, 403)
}

/**
 * 禁止访问响应
 */
export function forbiddenResponse(message = '禁止访问'): Response {
  return errorResponse(message, ErrorCodes.PERMISSION_DENIED, 403)
}

/**
 * 参数错误响应
 */
export function invalidParamResponse(field: string, reason: string): Response {
  return errorResponse(`${field}${reason}`, ErrorCodes.INVALID_REQUEST, 400)
}

/**
 * 缺少字段响应
 */
export function missingFieldResponse(fields: string[]): Response {
  return errorResponse(`缺少必填字段: ${fields.join(', ')}`, ErrorCodes.MISSING_FIELD, 400)
}

/**
 * 非交易时间响应
 */
export function notTradingTimeResponse(reason = '当前非交易时间'): Response {
  return errorResponse(reason, ErrorCodes.NOT_TRADING_TIME, 400)
}

/**
 * 余额不足响应
 */
export function insufficientBalanceResponse(required: number, available: number): Response {
  return errorResponse(
    `余额不足，需要 ${required.toFixed(2)} 元，可用 ${available.toFixed(2)} 元`,
    ErrorCodes.INSUFFICIENT_BALANCE,
    400
  )
}

/**
 * 持仓不足响应
 */
export function insufficientPositionResponse(required: number, available: number): Response {
  return errorResponse(
    `持仓不足，需要 ${required} 股，可用 ${available} 股`,
    ErrorCodes.INSUFFICIENT_POSITION,
    400
  )
}

/**
 * 系统错误响应（不暴露内部细节）
 */
export function systemErrorResponse(logMessage?: string): Response {
  if (logMessage) {
    console.error('[系统错误]', logMessage)
  }
  return errorResponse('系统繁忙，请稍后重试', ErrorCodes.UNKNOWN_ERROR, 500)
}
