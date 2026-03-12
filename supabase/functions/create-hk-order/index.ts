/**
 * 港股交易 Edge Function
 * 支持普通买入(BUY)和普通卖出(SELL)
 * 
 * @module create-hk-order
 * @description 港股市场交易，支持港股通标的
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import {
  // 类型
  EquityTradeRequest,
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
  validateStockCode,
  
  // 数据库
  createSupabaseClient,
  getUserAssets,
  createDefaultAssets,
  getTradeRule,
  getApprovalRule,
  getTradingHours,
  createTradeOrder,
  addToMatchPool,
  
  // 交易逻辑
  checkTradingTime,
  checkNeedsApproval,
  calculateFee,
  getMinTradeUnit,
  logTrade,
  
  // 缓存
  checkRateLimit,
} from '../_shared/mod.ts'

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
    const rateLimit = await checkRateLimit(userId, 'trade', 30)
    if (!rateLimit.allowed) {
      return errorResponse('操作过于频繁，请稍后再试', ErrorCodes.UNKNOWN_ERROR, 429)
    }

    // 3. 解析请求体
    let body: EquityTradeRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse('请求体格式错误', ErrorCodes.INVALID_REQUEST, 400)
    }

    const { 
      trade_type, 
      stock_code, 
      stock_name, 
      price, 
      quantity, 
      leverage = 1, 
      transaction_id,
      metadata = {} 
    } = body

    logTrade('港股交易请求', { userId, trade_type, stock_code, price, quantity })

    // 4. 必填字段验证
    const fieldValidation = validateRequired(body, ['trade_type', 'stock_code', 'price', 'quantity'])
    if (!fieldValidation.valid) return fieldValidation.error!

    // 5. 交易类型验证
    const tradeTypeValidation = validateTradeType(trade_type, ['BUY', 'SELL'])
    if (!tradeTypeValidation.valid) return tradeTypeValidation.error!

    // 6. 股票代码验证（港股5位数字）
    const stockCodeValidation = validateStockCode(stock_code, '港股')
    if (!stockCodeValidation.valid) return stockCodeValidation.error!

    // 7. 价格验证
    const priceValidation = validatePrice(price)
    if (!priceValidation.valid) return priceValidation.error!

    // 8. 数量验证（港股最小单位不同）
    const unitRule = await getTradeRule(supabase, '最小交易单位')
    const minUnit = getMinTradeUnit('港股', unitRule?.config)
    // 港股最小单位可以不是整数倍，但需要大于0
    const quantityValidation = validateQuantity(quantity)
    if (!quantityValidation.valid) return quantityValidation.error!

    // 9. 交易时间检查
    const tradingHours = await getTradingHours(supabase, '港股')
    const timeCheck = checkTradingTime(tradingHours)
    if (!timeCheck.valid) {
      return errorResponse(timeCheck.reason!, ErrorCodes.NOT_TRADING_TIME, 400)
    }

    // 10. 获取审核规则
    const tradeTypeName = trade_type === 'BUY' ? '港股买入' : '港股卖出'
    const approvalRule = await getApprovalRule(supabase, tradeTypeName)

    // 11. 计算金额和手续费
    const amount = price * quantity
    const feeRule = await getTradeRule(supabase, '手续费')
    // 港股费率可能不同
    const feeConfig = feeRule?.config?.['港股'] || feeRule?.config
    const feeAmount = calculateFee(amount, trade_type, feeConfig)

    // 12. 获取用户资产
    let userAssets = await getUserAssets(supabase, userId)
    if (!userAssets) {
      userAssets = await createDefaultAssets(supabase, userId)
      if (!userAssets) {
        return systemErrorResponse('初始化账户资产失败')
      }
    }

    // 13. 判断是否需要审核
    const { needApproval } = checkNeedsApproval(approvalRule, amount, quantity)

    // 14. 冻结资金或持仓
    const isBuy = trade_type === 'BUY'
    
    if (isBuy) {
      const totalCost = amount + feeAmount
      
      // 检查余额
      if (Number(userAssets.available_balance) < totalCost) {
        return errorResponse(
          `余额不足，需要 ${totalCost.toFixed(2)} 港元，可用 ${Number(userAssets.available_balance).toFixed(2)} 港元`,
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
      const { data: position, error: posError } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', stock_code)
        .maybeSingle()
      
      if (!position || position.available_quantity < quantity) {
        return errorResponse(
          `持仓不足，需要 ${quantity} 股，可用 ${position?.available_quantity || 0} 股`,
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

    // 15. 创建订单
    const orderResult = await createTradeOrder(supabase, {
      userId,
      marketType: '港股',
      tradeType: trade_type,
      stockCode: stock_code,
      stockName: stock_name || stock_code,
      price,
      quantity,
      leverage,
      fee: feeAmount,
      needApproval,
      approvalStatus: needApproval ? 'PENDING' : undefined,
      status: needApproval ? 'PENDING' : 'MATCHING',
      metadata: { 
        ...metadata, 
        min_unit: minUnit,
        total_cost: isBuy ? amount + feeAmount : amount - feeAmount
      }
    })

    if (!orderResult.success) {
      return systemErrorResponse(orderResult.error)
    }

    const trade = orderResult.order!

    // 16. 加入撮合池
    if (!needApproval) {
      await addToMatchPool(supabase, {
        tradeId: trade.id,
        userId,
        marketType: '港股',
        tradeType: trade_type,
        stockCode: stock_code,
        price,
        quantity
      })
    }

    logTrade('港股交易成功', { 
      tradeId: trade.id, 
      userId, 
      trade_type, 
      stock_code, 
      status: needApproval ? 'PENDING_APPROVAL' : 'MATCHING' 
    })

    // 17. 返回结果
    return successResponse({
      trade: { ...trade, transactionId: transaction_id },
      status: needApproval ? 'PENDING_APPROVAL' : 'MATCHING',
      message: needApproval 
        ? '订单已提交，等待审核' 
        : '订单已提交，正在撮合'
    })

  } catch (error: any) {
    console.error('[港股交易] 处理异常:', error)
    return systemErrorResponse(error.message)
  }
})
