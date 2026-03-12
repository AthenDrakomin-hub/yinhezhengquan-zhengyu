/**
 * 新股申购 Edge Function
 * 支持A股和港股新股申购
 * 
 * @module create-ipo-order
 * @description 新股申购（打新），支持主板、科创板、港股新股
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import {
  // 类型
  IPOTtradeRequest,
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
    const rateLimit = await checkRateLimit(userId, 'ipo', 10)
    if (!rateLimit.allowed) {
      return errorResponse('操作过于频繁，请稍后再试', ErrorCodes.UNKNOWN_ERROR, 429)
    }

    // 3. 解析请求体
    let body: IPOTtradeRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse('请求体格式错误', ErrorCodes.INVALID_REQUEST, 400)
    }

    const { 
      stock_code, 
      stock_name, 
      price, 
      quantity, 
      ipo_id,
      transaction_id,
      metadata = {} 
    } = body

    logTrade('新股申购请求', { userId, stock_code, price, quantity })

    // 4. 必填字段验证
    const fieldValidation = validateRequired(body, ['stock_code', 'price', 'quantity'])
    if (!fieldValidation.valid) return fieldValidation.error!

    // 5. 价格验证（发行价）
    const priceValidation = validatePrice(price)
    if (!priceValidation.valid) return priceValidation.error!

    // 6. 数量验证
    const quantityValidation = validateQuantity(quantity, { min: 100 })
    if (!quantityValidation.valid) return quantityValidation.error!

    // 7. 判断市场类型
    const marketType = stock_code.length === 5 ? '港股' : 'A股'

    // 8. 交易时间检查
    const tradingHours = await getTradingHours(supabase, marketType)
    const timeCheck = checkTradingTime(tradingHours)
    if (!timeCheck.valid) {
      return errorResponse(timeCheck.reason!, ErrorCodes.NOT_TRADING_TIME, 400)
    }

    // 9. 检查新股申购资格（可选：查询 IPO 数据）
    if (ipo_id) {
      const { data: ipoData, error: ipoError } = await supabase
        .from('ipo_data')
        .select('*')
        .eq('id', ipo_id)
        .maybeSingle()
      
      if (ipoError || !ipoData) {
        return errorResponse('新股信息不存在', ErrorCodes.INVALID_REQUEST, 400)
      }
      
      // 检查申购时间
      const now = new Date()
      const startDate = new Date(ipoData.subscription_start)
      const endDate = new Date(ipoData.subscription_end)
      
      if (now < startDate || now > endDate) {
        return errorResponse('当前不在申购时间范围内', ErrorCodes.NOT_TRADING_TIME, 400)
      }
    }

    // 10. 获取审核规则
    const approvalRule = await getApprovalRule(supabase, '新股申购')

    // 11. 计算申购金额
    const amount = price * quantity
    // 新股申购通常不收手续费
    const feeAmount = 0

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

    // 14. 冻结资金
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

    // 15. 创建订单
    const orderResult = await createTradeOrder(supabase, {
      userId,
      marketType,
      tradeType: 'IPO',
      stockCode: stock_code,
      stockName: stock_name || stock_code,
      price,
      quantity,
      leverage: 1,
      fee: feeAmount,
      needApproval,
      approvalStatus: needApproval ? 'PENDING' : undefined,
      status: needApproval ? 'PENDING' : 'SUBMITTED',
      metadata: { 
        ...metadata, 
        ipo_id,
        subscription_amount: amount
      }
    })

    if (!orderResult.success) {
      return systemErrorResponse(orderResult.error)
    }

    const trade = orderResult.order!

    logTrade('新股申购成功', { 
      tradeId: trade.id, 
      userId, 
      stock_code, 
      quantity,
      amount 
    })

    // 16. 返回结果
    return successResponse({
      trade: { ...trade, transactionId: transaction_id },
      status: needApproval ? 'PENDING_APPROVAL' : 'SUBMITTED',
      message: needApproval 
        ? '申购申请已提交，等待审核' 
        : '申购申请已提交'
    })

  } catch (error: any) {
    console.error('[新股申购] 处理异常:', error)
    return systemErrorResponse(error.message)
  }
})
