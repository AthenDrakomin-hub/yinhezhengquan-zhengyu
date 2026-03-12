/**
 * 大宗交易 Edge Function
 * 支持A股和港股大宗交易
 * 
 * @module create-block-trade-order
 * @description 大宗交易，通常单笔金额较大，需要特殊审批流程
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import {
  // 类型
  BlockTradeRequest,
  ErrorCodes,
  
  // 响应
  successResponse,
  errorResponse,
  optionsResponse,
  systemErrorResponse,
  
  // 认证
  authenticateUser,
  
  // 验证
  validateRequired,
  validatePrice,
  validateQuantity,
  validateTradeType,
  
  // 数据库
  createSupabaseClient,
  getUserAssets,
  createDefaultAssets,
  getTradeRule,
  getApprovalRule,
  getTradingHours,
  createTradeOrder,
  
  // 交易逻辑
  checkTradingTime,
  checkNeedsApproval,
  logTrade,
  
  // 缓存
  checkRateLimit,
} from '../_shared/mod.ts'

// 大宗交易最低金额（万元）
const MIN_BLOCK_AMOUNT = 50

// ==================== 主函数 ====================

serve(async (req) => {
  // OPTIONS 预检
  if (req.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const supabase = createSupabaseClient()

    // 1. 用户认证
    const { userId, error: authError } = await authenticateUser(req)
    if (authError || !userId) {
      return authError || errorResponse('认证失败', ErrorCodes.UNAUTHORIZED, 401)
    }

    // 2. 限流检查
    const rateLimit = await checkRateLimit(userId, 'block_trade', 10)
    if (!rateLimit.allowed) {
      return errorResponse('操作过于频繁，请稍后再试', ErrorCodes.UNKNOWN_ERROR, 429)
    }

    // 3. 解析请求体
    let body: BlockTradeRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse('请求体格式错误', ErrorCodes.INVALID_REQUEST, 400)
    }

    const { 
      trade_type = 'BUY',
      stock_code, 
      stock_name, 
      price, 
      quantity, 
      counterparty,
      transaction_id,
      metadata = {} 
    } = body

    logTrade('大宗交易请求', { userId, trade_type, stock_code, price, quantity })

    // 4. 必填字段验证
    const fieldValidation = validateRequired(body, ['stock_code', 'price', 'quantity'])
    if (!fieldValidation.valid) return fieldValidation.error!

    // 5. 交易类型验证
    const tradeTypeValidation = validateTradeType(trade_type, ['BUY', 'SELL'])
    if (!tradeTypeValidation.valid) return tradeTypeValidation.error!

    // 6. 价格验证
    const priceValidation = validatePrice(price)
    if (!priceValidation.valid) return priceValidation.error!

    // 7. 数量验证（大宗交易数量通常较大）
    const quantityValidation = validateQuantity(quantity, { min: 10000 })
    if (!quantityValidation.valid) {
      return errorResponse('大宗交易数量不能少于10000股', ErrorCodes.INVALID_QUANTITY, 400)
    }

    // 8. 判断市场类型
    const marketType = stock_code.length === 5 ? '港股' : 'A股'

    // 9. 交易时间检查
    const tradingHours = await getTradingHours(supabase, marketType)
    const timeCheck = checkTradingTime(tradingHours)
    if (!timeCheck.valid) {
      return errorResponse(timeCheck.reason!, ErrorCodes.NOT_TRADING_TIME, 400)
    }

    // 10. 检查金额是否达到大宗交易门槛
    const amount = price * quantity
    if (amount < MIN_BLOCK_AMOUNT * 10000) {
      return errorResponse(
        `大宗交易金额不能低于 ${MIN_BLOCK_AMOUNT} 万元`,
        ErrorCodes.INVALID_REQUEST,
        400
      )
    }

    // 11. 获取审核规则（大宗交易通常需要审批）
    const approvalRule = await getApprovalRule(supabase, '大宗交易')

    // 12. 计算手续费（大宗交易费率可能不同）
    const feeRule = await getTradeRule(supabase, '大宗交易手续费')
    const feeRate = feeRule?.config?.rate || 0.0001 // 默认万1
    const minFee = feeRule?.config?.min_fee || 100
    const feeAmount = Math.max(amount * feeRate, minFee)

    // 13. 获取用户资产
    let userAssets = await getUserAssets(supabase, userId)
    if (!userAssets) {
      userAssets = await createDefaultAssets(supabase, userId)
      if (!userAssets) {
        return systemErrorResponse('初始化账户资产失败')
      }
    }

    // 14. 大宗交易通常都需要审核
    const { needApproval } = checkNeedsApproval(approvalRule, amount, quantity)
    const finalNeedApproval = true // 大宗交易强制审批

    // 15. 冻结资金或持仓
    const isBuy = trade_type === 'BUY'
    
    if (isBuy) {
      const totalCost = amount + feeAmount
      
      if (Number(userAssets.available_balance) < totalCost) {
        return errorResponse(
          `余额不足，需要 ${totalCost.toFixed(2)} 元`,
          ErrorCodes.INSUFFICIENT_BALANCE,
          400
        )
      }
      
      // 冻结资金
      const { data: freezeResult, error: freezeError } = await supabase.rpc('freeze_user_funds', {
        p_user_id: userId,
        p_amount: totalCost
      })
      
      if (freezeError || !freezeResult) {
        return errorResponse('冻结资金失败，请重试', ErrorCodes.FREEZE_FAILED, 500)
      }
    } else {
      // 卖出：检查并冻结持仓
      const { data: position } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', stock_code)
        .maybeSingle()
      
      if (!position || position.available_quantity < quantity) {
        return errorResponse(
          `持仓不足，需要 ${quantity} 股`,
          ErrorCodes.INSUFFICIENT_POSITION,
          400
        )
      }
      
      // 冻结持仓
      const { data: freezeResult, error: freezeError } = await supabase.rpc('freeze_user_position', {
        p_user_id: userId,
        p_stock_code: stock_code,
        p_quantity: quantity
      })
      
      if (freezeError || !freezeResult) {
        return errorResponse('冻结持仓失败，请重试', ErrorCodes.FREEZE_FAILED, 500)
      }
    }

    // 16. 创建订单
    const orderResult = await createTradeOrder(supabase, {
      userId,
      marketType,
      tradeType: 'BLOCK_TRADE',
      stockCode: stock_code,
      stockName: stock_name || stock_code,
      price,
      quantity,
      leverage: 1,
      fee: feeAmount,
      needApproval: finalNeedApproval,
      approvalStatus: 'PENDING',
      status: 'PENDING',
      metadata: { 
        ...metadata, 
        counterparty,
        block_amount: amount,
        trade_direction: trade_type
      }
    })

    if (!orderResult.success) {
      return systemErrorResponse(orderResult.error)
    }

    const trade = orderResult.order!

    logTrade('大宗交易申请成功', { 
      tradeId: trade.id, 
      userId, 
      trade_type, 
      stock_code, 
      amount 
    })

    // 17. 返回结果
    return successResponse({
      trade: { ...trade, transactionId: transaction_id },
      status: 'PENDING_APPROVAL',
      message: '大宗交易申请已提交，等待审核'
    })

  } catch (error: any) {
    console.error('[大宗交易] 处理异常:', error)
    return systemErrorResponse(error.message)
  }
})
