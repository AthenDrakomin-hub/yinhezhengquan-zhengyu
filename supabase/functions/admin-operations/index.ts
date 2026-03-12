import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 使用 ANON_KEY 验证用户身份
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '未授权，请先登录', code: 401 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 2. 使用 SERVICE_ROLE_KEY 访问数据库
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabaseClient.from('profiles').select('role, admin_level').eq('id', user.id).single()
    
    // 权限检查：需要admin角色或admin_level
    if (profile?.role !== 'admin' && !['admin', 'super_admin'].includes(profile?.admin_level || '')) {
      return new Response(JSON.stringify({ error: '权限不足', code: 1001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { operation, ...params } = await req.json()

    switch (operation) {
      case 'intervene_trade':
        return await interveneTrade(supabaseClient, user.id, params, req)
      case 'force_sell_position':
        return await forceSellPosition(supabaseClient, user.id, params, req)
      case 'update_rules':
        return await updateTradeRules(supabaseClient, user.id, params, req)
      case 'fund_operation':
        return await fundOperation(supabaseClient, user.id, params, req)
      case 'update_position_risk':
        return await updatePositionRisk(supabaseClient, user.id, params, req)
      case 'send_notification':
        return await sendNotification(supabaseClient, user.id, params, req)
      default:
        throw new Error('Invalid operation')
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * 强制平仓操作
 */
async function forceSellPosition(supabase: any, adminId: string, params: any, req: Request) {
  const { position_id, user_id, stock_code, quantity, reason } = params

  // 参数验证
  if (!position_id || !user_id || !stock_code || !quantity || !reason) {
    throw new Error('缺少必要参数：position_id, user_id, stock_code, quantity, reason')
  }

  // 获取持仓信息
  const { data: position, error: positionError } = await supabase
    .from('positions')
    .select('*')
    .eq('id', position_id)
    .single()

  if (positionError || !position) {
    throw new Error('持仓不存在')
  }

  // 验证可用数量
  if (quantity > position.available_quantity) {
    throw new Error(`平仓数量 ${quantity} 超过可用数量 ${position.available_quantity}`)
  }

  // 获取当前市场价格
  const { data: stockData } = await supabase
    .from('limit_up_stocks')
    .select('current_price')
    .eq('symbol', stock_code)
    .single()

  const sellPrice = stockData?.current_price || position.current_price || position.average_price
  const sellAmount = quantity * sellPrice

  // 开始事务操作
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
      .single()

    if (assetsError) throw assetsError

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
    await supabase
      .from('fund_flows')
      .insert({
        user_id,
        flow_type: 'FORCE_SELL',
        amount: sellAmount,
        balance_after: newBalance,
        related_trade_id: trade.id,
        remark: `强制平仓：${stock_code} ${quantity}股`,
        created_at: new Date().toISOString()
      })

    // 5. 创建强制平仓记录（会自动触发通知）
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
        status: 'COMPLETED',
        trade_id: trade.id,
        created_at: new Date().toISOString()
      })

    if (recordError) throw recordError

    // 6. 记录管理员操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId,
      operation_type: 'FORCE_SELL_POSITION',
      target_type: 'position',
      target_id: position_id,
      details: {
        user_id,
        stock_code,
        stock_name: position.name,
        quantity,
        price: sellPrice,
        amount: sellAmount,
        reason
      },
      ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      created_at: new Date().toISOString()
    })

    return new Response(JSON.stringify({
      success: true,
      message: '强制平仓成功',
      data: {
        trade_id: trade.id,
        quantity,
        price: sellPrice,
        amount: sellAmount,
        new_balance: newBalance
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    // 回滚操作记录
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId,
      operation_type: 'FORCE_SELL_FAILED',
      target_type: 'position',
      target_id: position_id,
      details: { error: error.message, params },
      ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
      created_at: new Date().toISOString()
    })

    throw new Error(`强制平仓失败: ${error.message}`)
  }
}

/**
 * 更新持仓风险等级
 */
async function updatePositionRisk(supabase: any, adminId: string, params: any, req: Request) {
  const { position_id, risk_level } = params

  if (!position_id || !risk_level || !['HIGH', 'MEDIUM', 'LOW'].includes(risk_level)) {
    throw new Error('参数错误：需要 position_id 和有效的 risk_level (HIGH/MEDIUM/LOW)')
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

  if (error) throw error

  // 记录操作日志
  await supabase.from('admin_operation_logs').insert({
    admin_id: adminId,
    operation_type: 'UPDATE_POSITION_RISK',
    target_type: 'position',
    target_id: position_id,
    details: { risk_level, position },
    ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
    created_at: new Date().toISOString()
  })

  // 如果是高风险，发送预警通知给用户
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

  return new Response(JSON.stringify({ success: true, position }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

/**
 * 发送用户通知
 */
async function sendNotification(supabase: any, adminId: string, params: any, req: Request) {
  const { user_id, notification_type, title, content, priority, related_type, related_id } = params

  if (!user_id || !notification_type || !title || !content) {
    throw new Error('缺少必要参数')
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

  if (error) throw error

  // 记录操作日志
  await supabase.from('admin_operation_logs').insert({
    admin_id: adminId,
    operation_type: 'SEND_NOTIFICATION',
    target_type: 'user',
    target_id: user_id,
    details: { notification_id: notification.id, title, notification_type },
    ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
    created_at: new Date().toISOString()
  })

  return new Response(JSON.stringify({ success: true, notification }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function interveneTrade(supabase: any, adminId: string, params: any, req: Request) {
  const { operation_type, target_order_id, params: operationParams } = params
  const { data: order } = await supabase.from('trade_match_pool').select('*').eq('id', target_order_id).single()
  if (!order && operation_type !== 'BATCH_MATCH') throw new Error('订单不存在')

  let result = {}
  let operateType = 'TRADE_INTERVENE'

  switch (operation_type) {
    case 'MANUAL_MATCH':
      operateType = 'TRADE_MATCH_MANUAL'
      await supabase.functions.invoke('match-trade-order', { body: { trigger_type: 'manual', order_id: target_order_id } })
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
      await supabase.from('trades').update({ status: 'SUCCESS', finish_time: new Date().toISOString() }).eq('id', order.trade_id)
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
        throw new Error('IPO调整需要提供 is_win 参数')
      }
      break
    default:
      throw new Error('不支持的操作类型')
  }

  await supabase.from('admin_operation_logs').insert({
    admin_id: adminId,
    operation_type: operateType,
    target_type: 'trade',
    target_id: target_order_id,
    details: { operation_type, order_id: target_order_id, params: operationParams },
    ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
    created_at: new Date().toISOString()
  })

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function updateTradeRules(supabase: any, adminId: string, params: any, req: Request) {
  const { rule_key, rule_value, description, is_active } = params
  
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

  if (error) throw error

  await supabase.from('admin_operation_logs').insert({
    admin_id: adminId,
    operation_type: 'TRADE_RULE_UPDATE',
    target_type: 'rule',
    target_id: rule.id,
    details: { rule_key, rule_value },
    ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
    created_at: new Date().toISOString()
  })

  return new Response(JSON.stringify({ success: true, rule }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function fundOperation(supabase: any, adminId: string, params: any, req: Request) {
  const { target_user_id, operate_type, amount, remark } = params
  const { data: assets, error: assetsError } = await supabase.from('assets').select('available_balance, total_asset').eq('user_id', target_user_id).single()
  if (assetsError) throw assetsError

  const isRecharge = operate_type === 'RECHARGE'
  const newBalance = isRecharge ? Number(assets.available_balance) + amount : Number(assets.available_balance) - amount
  const newTotal = isRecharge ? Number(assets.total_asset) + amount : Number(assets.total_asset) - amount

  if (!isRecharge && newBalance < 0) throw new Error('余额不足以扣减')

  const { error: updateError } = await supabase.from('assets').update({ 
    available_balance: newBalance,
    total_asset: newTotal,
    updated_at: new Date().toISOString()
  }).eq('user_id', target_user_id)

  if (updateError) throw updateError

  // 创建资金流水
  await supabase.from('fund_flows').insert({
    user_id: target_user_id,
    flow_type: isRecharge ? 'DEPOSIT' : 'WITHDRAW',
    amount,
    balance_after: newBalance,
    remark: remark || (isRecharge ? '管理员充值' : '管理员扣款'),
    created_at: new Date().toISOString()
  })

  // 发送通知给用户
  await supabase.from('user_notifications').insert({
    user_id: target_user_id,
    notification_type: 'ACCOUNT',
    title: isRecharge ? '账户充值通知' : '账户扣款通知',
    content: isRecharge 
      ? `您的账户已充值 ¥${amount.toFixed(2)}，当前余额 ¥${newBalance.toFixed(2)}`
      : `您的账户已扣款 ¥${amount.toFixed(2)}，当前余额 ¥${newBalance.toFixed(2)}。原因：${remark || '无'}`,
    priority: 'HIGH',
    created_at: new Date().toISOString()
  })

  await supabase.from('admin_operation_logs').insert({
    admin_id: adminId,
    operation_type: operate_type,
    target_type: 'user',
    target_id: target_user_id,
    details: { amount, remark, oldBalance: assets.available_balance, newBalance },
    ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
    created_at: new Date().toISOString()
  })

  return new Response(JSON.stringify({ success: true, newBalance }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
