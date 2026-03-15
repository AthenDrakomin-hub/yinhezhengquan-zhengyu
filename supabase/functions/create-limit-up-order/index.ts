/**
 * 涨停打板 Edge Function
 * 支持A股涨停板买入
 * 
 * @module create-limit-up-order
 * @description 涨停打板买入，在涨停价买入股票，风险较高，需要特殊审批
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import {
  // 类型
  LimitUpTradeRequest,
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
  validateQuantity,
  
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
  logTrade,
  
  // 缓存
  checkRateLimit,
} from './_shared/mod.ts'

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
    const rateLimit = await checkRateLimit(userId, 'limit_up', 10)
    if (!rateLimit.allowed) {
      return errorResponse('操作过于频繁，请稍后再试', ErrorCodes.UNKNOWN_ERROR, 429)
    }

    // 3. 解析请求体
    let body: LimitUpTradeRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse('请求体格式错误', ErrorCodes.INVALID_REQUEST, 400)
    }

    const { 
      stock_code, 
      stock_name, 
      price,  // 涨停价
      quantity, 
      transaction_id,
      metadata = {} 
    } = body

    logTrade('涨停打板请求', { userId, stock_code, price, quantity })

    // 4. 必填字段验证
    const fieldValidation = validateRequired(body, ['stock_code', 'price', 'quantity'])
    if (!fieldValidation.valid) return fieldValidation.error!

    // 5. 价格验证
    if (typeof price !== 'number' || price <= 0) {
      return errorResponse('价格必须为大于0的数字', ErrorCodes.INVALID_PRICE, 400)
    }

    // 6. 数量验证（A股最小单位100股）
    const unitRule = await getTradeRule(supabase, '最小交易单位')
    const minUnit = unitRule?.config?.['A股'] || 100
    const quantityValidation = validateQuantity(quantity, { minUnit })
    if (!quantityValidation.valid) return quantityValidation.error!

    // 7. 交易时间检查
    const tradingHours = await getTradingHours(supabase, 'A股')
    const timeCheck = checkTradingTime(tradingHours)
    if (!timeCheck.valid) {
      return errorResponse(timeCheck.reason!, ErrorCodes.NOT_TRADING_TIME, 400)
    }

    // 8. 验证股票是否处于涨停状态
    const { data: limitUpData, error: limitUpError } = await supabase.rpc('get_stock_limit_up_status', {
      p_stock_code: stock_code
    })
    
    // 如果涨停验证接口可用，进行验证
    if (!limitUpError && limitUpData) {
      if (!limitUpData.is_limit_up) {
        return errorResponse('该股票当前未涨停，无法打板买入', ErrorCodes.INVALID_REQUEST, 400)
      }
      
      // 验证价格是否为涨停价
      if (Math.abs(price - limitUpData.limit_up_price) > 0.01) {
        return errorResponse(
          `涨停打板价格 ${price} 与涨停价 ${limitUpData.limit_up_price} 不符`,
          ErrorCodes.INVALID_PRICE,
          400
        )
      }
    }

    // 9. 获取审核规则（涨停打板风险高，通常需要审批）
    const approvalRule = await getApprovalRule(supabase, '涨停打板')

    // 10. 计算金额和手续费
    const amount = price * quantity
    const feeRule = await getTradeRule(supabase, '手续费')
    const buyRate = feeRule?.config?.买入费率 || 0.00025
    const minFee = feeRule?.config?.最低收费 || 5
    const feeAmount = Math.max(amount * buyRate, minFee)

    // 11. 获取用户资产
    let userAssets = await getUserAssets(supabase, userId)
    if (!userAssets) {
      userAssets = await createDefaultAssets(supabase, userId)
      if (!userAssets) {
        return systemErrorResponse('初始化账户资产失败')
      }
    }

    // 12. 涨停打板通常需要审核
    const { needApproval } = checkNeedsApproval(approvalRule, amount, quantity)

    // 13. 冻结资金
    const totalCost = amount + feeAmount
    
    if (Number(userAssets.available_balance) < totalCost) {
      return errorResponse(
        `余额不足，需要 ${totalCost.toFixed(2)} 元，可用 ${Number(userAssets.available_balance).toFixed(2)} 元`,
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

    // 14. 创建订单
    const orderResult = await createTradeOrder(supabase, {
      userId,
      marketType: 'A股',
      tradeType: 'LIMIT_UP',
      stockCode: stock_code,
      stockName: stock_name || stock_code,
      price,
      quantity,
      leverage: 1,
      fee: feeAmount,
      needApproval,
      approvalStatus: needApproval ? 'PENDING' : undefined,
      status: needApproval ? 'PENDING' : 'MATCHING',
      metadata: { 
        ...metadata, 
        min_unit: minUnit,
        limit_up_price: price,
        total_cost: totalCost
      }
    })

    if (!orderResult.success) {
      return systemErrorResponse(orderResult.error)
    }

    const trade = orderResult.order!

    // 15. 加入撮合池
    if (!needApproval) {
      await addToMatchPool(supabase, {
        tradeId: trade.id,
        userId,
        marketType: 'A股',
        tradeType: 'LIMIT_UP',
        stockCode: stock_code,
        price,
        quantity
      })
    }

    logTrade('涨停打板成功', { 
      tradeId: trade.id, 
      userId, 
      stock_code, 
      price, 
      quantity,
      status: needApproval ? 'PENDING_APPROVAL' : 'MATCHING' 
    })

    // 16. 返回结果
    return successResponse({
      trade: { ...trade, transactionId: transaction_id },
      status: needApproval ? 'PENDING_APPROVAL' : 'MATCHING',
      message: needApproval 
        ? '涨停打板申请已提交，等待审核' 
        : '涨停打板申请已提交，正在撮合'
    })

  } catch (error: any) {
    console.error('[涨停打板] 处理异常:', error)
    return systemErrorResponse(error.message)
  }
})
