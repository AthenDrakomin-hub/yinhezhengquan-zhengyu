/**
 * 管理员操作入口 Edge Function
 * 统一的管理操作分发函数
 * 
 * 安全措施：
 * 1. JWT Token 验证
 * 2. 管理员权限验证
 * 3. 操作日志记录
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  verifyAdminAccess,
  logAdminOperation,
  AdminLevel
} from "../_shared/admin.ts"
import {
  jsonResponse,
  errorResponse,
  forbiddenResponse,
  CORS_HEADERS
} from "../_shared/response.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // 1. 验证管理员权限
    const authResult = await verifyAdminAccess(req, {
      checkIPWhitelist: false // 通过 JWT 验证即可
    })
    
    if (!authResult.isValid || !authResult.userId) {
      return authResult.error!
    }
    
    const { userId: adminId, adminLevel } = authResult
    
    // 2. 创建数据库客户端
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. 解析请求
    const { operation, ...params } = await req.json()
    
    // 4. 分发操作
    switch (operation) {
      case 'intervene_trade':
        return await interveneTrade(supabase, adminId, params, req)
        
      case 'force_sell_position':
        return await forceSellPosition(supabase, adminId, params, req)
        
      case 'update_rules':
        return await updateTradeRules(supabase, adminId, params, req, adminLevel)
        
      case 'fund_operation':
        return await fundOperation(supabase, adminId, params, req, adminLevel)
        
      case 'update_position_risk':
        return await updatePositionRisk(supabase, adminId, params, req)
        
      case 'send_notification':
        return await sendNotification(supabase, adminId, params, req)
        
      default:
        return errorResponse(`未知操作: ${operation}`, 400)
    }
  } catch (error: any) {
    console.error('[admin-operations] 错误:', error)
    return errorResponse(error.message)
  }
})

// ==================== 操作实现 ====================

/**
 * 干预交易订单
 */
async function interveneTrade(
  supabase: any,
  adminId: string,
  params: any,
  req: Request
) {
  const { operation_type, target_order_id, params: operationParams } = params
  
  // 参数验证
  if (!operation_type || !target_order_id) {
    return errorResponse('缺少必要参数: operation_type, target_order_id', 400)
  }
  
  // 获取订单信息
  const { data: order } = await supabase
    .from('trade_match_pool')
    .select('*')
    .eq('id', target_order_id)
    .maybeSingle()
  
  if (!order && operation_type !== 'BATCH_MATCH') {
    return errorResponse('订单不存在', 404)
  }
  
  let result: any = {}
  let operateType = 'TRADE_INTERVENE'
  
  switch (operation_type) {
    case 'MANUAL_MATCH':
      operateType = 'TRADE_MATCH_MANUAL'
      await supabase.functions.invoke('match-trade-order', {
        body: { trigger_type: 'manual', order_id: target_order_id }
      })
      result = { success: true, message: '已手动触发撮合' }
      break
      
    case 'PAUSE':
      operateType = 'TRADE_MATCH_PAUSE'
      await supabase.from('trade_match_pool').update({ status: 'PAUSED' }).eq('id', target_order_id)
      result = { success: true, message: '订单撮合已暂停' }
      break
      
    case 'RESUME':
      operateType = 'TRADE_MATCH_RESUME'
      await supabase.from('trade_match_pool').update({ status: 'MATCHING' }).eq('id', target_order_id)
      result = { success: true, message: '订单撮合已恢复' }
      break
      
    case 'FORCE_MATCH':
      operateType = 'TRADE_MATCH_FORCE'
      await supabase.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', target_order_id)
      await supabase.from('trades').update({
        status: 'SUCCESS',
        finish_time: new Date().toISOString()
      }).eq('id', order.trade_id)
      result = { success: true, message: '订单已强制撮合成功' }
      break
      
    case 'DELETE':
      operateType = 'TRADE_MATCH_DELETE'
      await supabase.from('trade_match_pool').delete().eq('id', target_order_id)
      await supabase.from('trades').update({ status: 'CANCELLED' }).eq('id', order.trade_id)
      result = { success: true, message: '订单已从撮合池移除并撤单' }
      break
      
    case 'IPO_ADJUST':
      operateType = 'IPO_WIN_ADJUST'
      const { is_win, win_quantity } = operationParams || {}
      if (is_win !== undefined) {
        const newStatus = is_win ? 'SUCCESS' : 'CANCELLED'
        await supabase.from('trades').update({
          status: newStatus,
          finish_time: new Date().toISOString(),
          ...(win_quantity && { quantity: win_quantity })
        }).eq('id', order.trade_id)
        result = { success: true, message: `新股结果已调整：${is_win ? '中签' : '未中签'}` }
      } else {
        return errorResponse('IPO调整需要提供 is_win 参数', 400)
      }
      break
      
    default:
      return errorResponse(`不支持的操作类型: ${operation_type}`, 400)
  }
  
  // 记录操作日志
  await logAdminOperation(supabase, {
    adminId,
    operationType: operateType,
    targetType: 'trade',
    targetId: target_order_id,
    details: { operation_type, order_id: target_order_id, params: operationParams },
    req
  })
  
  return jsonResponse(result)
}

/**
 * 强制平仓操作
 */
async function forceSellPosition(
  supabase: any,
  adminId: string,
  params: any,
  req: Request
) {
  const { position_id, user_id, stock_code, quantity, reason } = params
  
  // 参数验证
  if (!position_id || !user_id || !stock_code || !quantity || !reason) {
    return errorResponse('缺少必要参数: position_id, user_id, stock_code, quantity, reason', 400)
  }
  
  // 获取持仓信息
  const { data: position, error: positionError } = await supabase
    .from('positions')
    .select('*')
    .eq('id', position_id)
    .maybeSingle()
  
  if (positionError || !position) {
    return errorResponse('持仓不存在', 404)
  }
  
  // 验证可用数量
  if (quantity > position.available_quantity) {
    return errorResponse(`平仓数量 ${quantity} 超过可用数量 ${position.available_quantity}`, 400)
  }
  
  // 获取当前市场价格
  const { data: stockData } = await supabase
    .from('stocks')
    .select('current_price')
    .eq('symbol', stock_code)
    .maybeSingle()
  
  const sellPrice = stockData?.current_price || position.current_price || position.average_price
  const sellAmount = quantity * sellPrice
  
  try {
    // 1. 更新持仓
    const newQuantity = position.quantity - quantity
    const newAvailableQuantity = position.available_quantity - quantity
    
    const { error: updatePositionError } = await supabase
      .from('positions')
      .update({
        quantity: newQuantity,
        available_quantity: newAvailableQuantity,
        is_forced_sell: true,
        forced_sell_at: new Date().toISOString(),
        forced_sell_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', position_id)
    
    if (updatePositionError) throw updatePositionError
    
    // 2. 创建交易记录
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id,
        symbol: stock_code,
        name: position.name,
        trade_type: 'FORCE_SELL',
        order_type: 'MARKET',
        price: sellPrice,
        quantity,
        amount: sellAmount,
        status: 'FILLED',
        filled_quantity: quantity,
        filled_amount: sellAmount,
        remark: `强制平仓：${reason}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (tradeError) throw tradeError
    
    // 3. 更新用户资产
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('available_balance, total_asset')
      .eq('user_id', user_id)
      .maybeSingle()
    
    if (assetsError || !assets) {
      throw new Error('用户资产记录不存在')
    }
    
    const newBalance = Number(assets.available_balance) + sellAmount
    const newTotalAsset = Number(assets.total_asset) - (quantity * position.average_price) + sellAmount
    
    const { error: updateAssetsError } = await supabase
      .from('assets')
      .update({
        available_balance: newBalance,
        total_asset: newTotalAsset,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
    
    if (updateAssetsError) throw updateAssetsError
    
    // 4. 创建资金流水
    await supabase.from('fund_flows').insert({
      user_id,
      flow_type: 'FORCE_SELL',
      amount: sellAmount,
      balance_after: newBalance,
      related_trade_id: trade.id,
      remark: `强制平仓：${stock_code} ${quantity}股`,
      created_at: new Date().toISOString()
    })
    
    // 5. 创建强制平仓记录
    const { error: recordError } = await supabase
      .from('force_sell_records')
      .insert({
        position_id,
        user_id,
        admin_id: adminId,
        symbol: stock_code,
        stock_name: position.name,
        quantity,
        price: sellPrice,
        amount: sellAmount,
        reason,
        status: 'SUCCESS',
        created_at: new Date().toISOString()
      })
    
    if (recordError) throw recordError
    
    // 6. 记录操作日志
    await logAdminOperation(supabase, {
      adminId,
      operationType: 'FORCE_SELL_POSITION',
      targetType: 'position',
      targetId: position_id,
      details: { user_id, stock_code, quantity, reason, sellPrice, sellAmount },
      req
    })
    
    return jsonResponse({
      success: true,
      trade,
      message: '强制平仓成功'
    })
    
  } catch (error: any) {
    console.error('[admin] 强制平仓失败:', error)
    
    // 记录失败日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId,
      operation_type: 'FORCE_SELL_POSITION_FAILED',
      target_type: 'position',
      target_id: position_id,
      details: { error: error.message, params },
      ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
      created_at: new Date().toISOString()
    })
    
    return errorResponse(`强制平仓失败: ${error.message}`)
  }
}

/**
 * 更新交易规则（仅超级管理员）
 */
async function updateTradeRules(
  supabase: any,
  adminId: string,
  params: any,
  req: Request,
  adminLevel: AdminLevel
) {
  const { rule_key, rule_value, description, is_active } = params
  
  // 只有超级管理员可以修改规则
  if (adminLevel !== 'super_admin') {
    return forbiddenResponse('需要超级管理员权限')
  }
  
  const { data: rule, error } = await supabase
    .from('trade_rules')
    .upsert({
      rule_key,
      rule_value,
      description,
      is_active: is_active ?? true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'rule_key' })
    .select()
    .single()
  
  if (error) {
    return errorResponse(`更新规则失败: ${error.message}`)
  }
  
  // 记录操作日志
  await logAdminOperation(supabase, {
    adminId,
    operationType: 'TRADE_RULE_UPDATE',
    targetType: 'rule',
    targetId: rule.id,
    details: { rule_key, rule_value, description },
    req
  })
  
  return jsonResponse({ success: true, rule })
}

/**
 * 资金操作（仅超级管理员）
 */
async function fundOperation(
  supabase: any,
  adminId: string,
  params: any,
  req: Request,
  adminLevel: AdminLevel
) {
  const { user_id, operation: fundOp, amount, remark } = params
  
  // 只有超级管理员可以进行资金操作
  if (adminLevel !== 'super_admin') {
    return forbiddenResponse('需要超级管理员权限')
  }
  
  if (!user_id || !fundOp || !amount) {
    return errorResponse('缺少必要参数: user_id, operation, amount', 400)
  }
  
  // 获取用户资产
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle()
  
  if (assetsError || !assets) {
    return errorResponse('用户资产记录不存在', 404)
  }
  
  let newBalance: number
  
  switch (fundOp) {
    case 'ADD':
      newBalance = Number(assets.available_balance) + Number(amount)
      break
    case 'DEDUCT':
      newBalance = Number(assets.available_balance) - Number(amount)
      if (newBalance < 0) {
        return errorResponse('余额不足', 400)
      }
      break
    case 'SET':
      newBalance = Number(amount)
      break
    default:
      return errorResponse(`未知资金操作: ${fundOp}`, 400)
  }
  
  // 更新余额
  const { error: updateError } = await supabase
    .from('assets')
    .update({
      available_balance: newBalance,
      total_asset: newBalance, // 简化处理
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user_id)
  
  if (updateError) {
    return errorResponse(`资金操作失败: ${updateError.message}`)
  }
  
  // 创建资金流水
  await supabase.from('fund_flows').insert({
    user_id,
    flow_type: fundOp === 'ADD' ? 'ADMIN_ADD' : fundOp === 'DEDUCT' ? 'ADMIN_DEDUCT' : 'ADMIN_SET',
    amount: Number(amount),
    balance_after: newBalance,
    remark: remark || `管理员操作: ${fundOp}`,
    created_at: new Date().toISOString()
  })
  
  // 记录操作日志
  await logAdminOperation(supabase, {
    adminId,
    operationType: 'FUND_OPERATION',
    targetType: 'user',
    targetId: user_id,
    details: { operation: fundOp, amount, remark, balance_before: assets.available_balance, balance_after: newBalance },
    req
  })
  
  return jsonResponse({
    success: true,
    balance_before: assets.available_balance,
    balance_after: newBalance
  })
}

/**
 * 更新持仓风险等级
 */
async function updatePositionRisk(
  supabase: any,
  adminId: string,
  params: any,
  req: Request
) {
  const { position_id, risk_level } = params
  
  if (!position_id || !risk_level || !['HIGH', 'MEDIUM', 'LOW'].includes(risk_level)) {
    return errorResponse('参数错误: 需要 position_id 和有效的 risk_level (HIGH/MEDIUM/LOW)', 400)
  }
  
  const { data: position, error } = await supabase
    .from('positions')
    .update({
      risk_level,
      updated_at: new Date().toISOString()
    })
    .eq('id', position_id)
    .select()
    .single()
  
  if (error) {
    return errorResponse(`更新持仓风险失败: ${error.message}`)
  }
  
  // 记录操作日志
  await logAdminOperation(supabase, {
    adminId,
    operationType: 'UPDATE_POSITION_RISK',
    targetType: 'position',
    targetId: position_id,
    details: { risk_level, position },
    req
  })
  
  // 如果是高风险，发送预警通知
  if (risk_level === 'HIGH') {
    await supabase.from('user_notifications').insert({
      user_id: position.user_id,
      notification_type: 'RISK_WARNING',
      title: '持仓风险预警',
      content: `您的持仓 ${position.name} (${position.symbol}) 已被标记为高风险，请注意风险控制。`,
      related_type: 'position',
      related_id: position_id,
      priority: 'HIGH',
      created_at: new Date().toISOString()
    })
  }
  
  return jsonResponse({ success: true, position })
}

/**
 * 发送用户通知
 */
async function sendNotification(
  supabase: any,
  adminId: string,
  params: any,
  req: Request
) {
  const { user_id, notification_type, title, content, priority, related_type, related_id } = params
  
  if (!user_id || !notification_type || !title || !content) {
    return errorResponse('缺少必要参数: user_id, notification_type, title, content', 400)
  }
  
  const { data: notification, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id,
      notification_type,
      title,
      content,
      priority: priority || 'NORMAL',
      related_type,
      related_id,
      created_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) {
    return errorResponse(`发送通知失败: ${error.message}`)
  }
  
  // 记录操作日志
  await logAdminOperation(supabase, {
    adminId,
    operationType: 'SEND_NOTIFICATION',
    targetType: 'user',
    targetId: user_id,
    details: { notification_id: notification.id, title, notification_type },
    req
  })
  
  return jsonResponse({ success: true, notification })
}
