/**
 * 基金订单确认结算 Edge Function
 * 功能：
 * 1. 确认申购订单 -> 确认份额、更新持仓
 * 2. 确认赎回订单 -> 资金到账、更新持仓
 * 3. 可由定时任务或手动触发
 */

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY') ?? ''
    )

    // 验证管理员权限（可选）
    const authHeader = req.headers.get('Authorization')
    
    // 解析请求参数
    const body = await req.json()
    const { order_id, action } = body  // action: 'confirm' | 'cancel' | 'batch'

    // 批量处理模式
    if (action === 'batch') {
      return await batchSettle(supabaseClient)
    }

    // 单个订单处理
    if (!order_id) {
      return errorResponse('参数错误：订单ID不能为空')
    }

    // 获取订单信息
    const { data: order, error: orderError } = await supabaseClient
      .from('fund_orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return errorResponse('订单不存在')
    }

    if (order.status !== 'PENDING') {
      return errorResponse(`订单状态为${order.status}，无法处理`)
    }

    // 根据订单类型处理
    if (order.order_type === 'PURCHASE') {
      return await confirmPurchase(supabaseClient, order, action)
    } else if (order.order_type === 'REDEEM') {
      return await confirmRedeem(supabaseClient, order, action)
    } else {
      return errorResponse('未知订单类型')
    }

  } catch (error: any) {
    console.error('基金订单结算错误:', error)
    return errorResponse(error.message || '结算失败，请稍后重试')
  }
})

/**
 * 确认申购订单
 */
async function confirmPurchase(supabaseClient: any, order: any, action: string) {
  // 取消订单
  if (action === 'cancel') {
    return await cancelOrder(supabaseClient, order, 'PURCHASE')
  }

  // 获取基金信息
  const { data: fund } = await supabaseClient
    .from('funds')
    .select('*')
    .eq('code', order.fund_code)
    .single()

  if (!fund) {
    return errorResponse('基金产品不存在')
  }

  // 获取用户资产
  const { data: assets } = await supabaseClient
    .from('assets')
    .select('*')
    .eq('user_id', order.user_id)
    .single()

  if (!assets) {
    return errorResponse('用户资产不存在')
  }

  // 计算确认份额
  const confirmNav = fund.nav
  const confirmShares = (order.amount - order.fee) / confirmNav
  const confirmDate = new Date().toISOString().split('T')[0]

  // 1. 解冻资金并扣款
  await supabaseClient
    .from('assets')
    .update({
      frozen_balance: Math.max(0, assets.frozen_balance - order.amount),
      total_balance: assets.total_balance - order.fee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', order.user_id)

  // 2. 更新订单状态
  await supabaseClient
    .from('fund_orders')
    .update({
      status: 'SETTLED',
      confirm_nav: confirmNav,
      confirm_shares: confirmShares,
      confirm_date: confirmDate,
      settle_date: confirmDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id)

  // 3. 更新或创建持仓
  const { data: existingHolding } = await supabaseClient
    .from('fund_holdings')
    .select('*')
    .eq('user_id', order.user_id)
    .eq('fund_code', order.fund_code)
    .maybeSingle()

  if (existingHolding) {
    // 更新持仓
    const newShares = existingHolding.total_shares + confirmShares
    const newCost = existingHolding.cost_amount + order.amount - order.fee
    const newAvgNav = newCost / newShares

    await supabaseClient
      .from('fund_holdings')
      .update({
        total_shares: newShares,
        available_shares: existingHolding.available_shares + confirmShares,  // T+1后可用
        cost_amount: newCost,
        cost_nav: newAvgNav,
        current_nav: confirmNav,
        market_value: newShares * confirmNav,
        last_update_date: confirmDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingHolding.id)
  } else {
    // 创建新持仓
    await supabaseClient
      .from('fund_holdings')
      .insert({
        user_id: order.user_id,
        fund_code: order.fund_code,
        fund_name: order.fund_name,
        total_shares: confirmShares,
        available_shares: confirmShares,
        frozen_shares: 0,
        cost_amount: order.amount - order.fee,
        cost_nav: confirmNav,
        current_nav: confirmNav,
        market_value: confirmShares * confirmNav,
        first_purchase_date: new Date().toISOString().split('T')[0],
        last_update_date: confirmDate
      })
  }

  // 4. 记录资金流水
  await supabaseClient.rpc('record_fund_flow', {
    p_user_id: order.user_id,
    p_flow_type: 'FUND_PURCHASE',
    p_amount: -order.amount,
    p_related_id: order.id,
    p_description: `基金申购确认: ${order.fund_name}(${order.fund_code})`
  }).catch(() => {})

  return successResponse({
    message: '申购确认成功',
    order_id: order.id,
    fund_code: order.fund_code,
    fund_name: order.fund_name,
    confirm_shares: confirmShares.toFixed(4),
    confirm_nav: confirmNav,
    confirm_date: confirmDate
  })
}

/**
 * 确认赎回订单
 */
async function confirmRedeem(supabaseClient: any, order: any, action: string) {
  // 取消订单
  if (action === 'cancel') {
    return await cancelOrder(supabaseClient, order, 'REDEEM')
  }

  // 获取基金信息
  const { data: fund } = await supabaseClient
    .from('funds')
    .select('*')
    .eq('code', order.fund_code)
    .single()

  if (!fund) {
    return errorResponse('基金产品不存在')
  }

  // 获取用户资产
  const { data: assets } = await supabaseClient
    .from('assets')
    .select('*')
    .eq('user_id', order.user_id)
    .single()

  if (!assets) {
    return errorResponse('用户资产不存在')
  }

  // 获取持仓
  const { data: holding } = await supabaseClient
    .from('fund_holdings')
    .select('*')
    .eq('user_id', order.user_id)
    .eq('fund_code', order.fund_code)
    .single()

  if (!holding) {
    return errorResponse('持仓不存在')
  }

  // 计算赎回金额
  const confirmNav = fund.nav
  const confirmAmount = order.shares * confirmNav
  const netAmount = confirmAmount - order.fee
  const confirmDate = new Date().toISOString().split('T')[0]

  // 1. 解冻份额并扣减
  await supabaseClient
    .from('fund_holdings')
    .update({
      frozen_shares: Math.max(0, holding.frozen_shares - order.shares),
      total_shares: holding.total_shares - order.shares,
      cost_amount: holding.cost_amount - (holding.cost_amount / holding.total_shares * order.shares),
      market_value: (holding.total_shares - order.shares) * confirmNav,
      last_update_date: confirmDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', holding.id)

  // 2. 更新订单状态
  await supabaseClient
    .from('fund_orders')
    .update({
      status: 'SETTLED',
      confirm_nav: confirmNav,
      confirm_amount: confirmAmount,
      confirm_date: confirmDate,
      settle_date: confirmDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id)

  // 3. 资金到账
  await supabaseClient
    .from('assets')
    .update({
      available_balance: assets.available_balance + netAmount,
      total_balance: assets.total_balance - order.fee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', order.user_id)

  // 4. 记录资金流水
  await supabaseClient.rpc('record_fund_flow', {
    p_user_id: order.user_id,
    p_flow_type: 'FUND_REDEEM',
    p_amount: netAmount,
    p_related_id: order.id,
    p_description: `基金赎回确认: ${order.fund_name}(${order.fund_code})`
  }).catch(() => {})

  return successResponse({
    message: '赎回确认成功',
    order_id: order.id,
    fund_code: order.fund_code,
    fund_name: order.fund_name,
    confirm_shares: order.shares,
    confirm_nav: confirmNav,
    confirm_amount: confirmAmount.toFixed(2),
    fee: order.fee.toFixed(2),
    net_amount: netAmount.toFixed(2),
    confirm_date: confirmDate
  })
}

/**
 * 取消订单
 */
async function cancelOrder(supabaseClient: any, order: any, orderType: string) {
  // 获取用户资产
  const { data: assets } = await supabaseClient
    .from('assets')
    .select('*')
    .eq('user_id', order.user_id)
    .single()

  if (orderType === 'PURCHASE') {
    // 解冻资金
    await supabaseClient
      .from('assets')
      .update({
        available_balance: assets.available_balance + order.amount,
        frozen_balance: Math.max(0, assets.frozen_balance - order.amount),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', order.user_id)
  } else {
    // 解冻份额
    const { data: holding } = await supabaseClient
      .from('fund_holdings')
      .select('*')
      .eq('user_id', order.user_id)
      .eq('fund_code', order.fund_code)
      .single()

    if (holding) {
      await supabaseClient
        .from('fund_holdings')
        .update({
          available_shares: holding.available_shares + order.shares,
          frozen_shares: Math.max(0, holding.frozen_shares - order.shares),
          updated_at: new Date().toISOString()
        })
        .eq('id', holding.id)
    }
  }

  // 更新订单状态
  await supabaseClient
    .from('fund_orders')
    .update({
      status: 'CANCELLED',
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id)

  return successResponse({
    message: '订单已取消',
    order_id: order.id
  })
}

/**
 * 批量结算
 */
async function batchSettle(supabaseClient: any) {
  // 获取所有待处理订单
  const { data: orders, error } = await supabaseClient
    .from('fund_orders')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })

  if (error || !orders || orders.length === 0) {
    return successResponse({
      message: '没有待处理的订单',
      settled_count: 0
    })
  }

  let settledCount = 0
  let failedCount = 0
  const details: any[] = []

  for (const order of orders) {
    try {
      if (order.order_type === 'PURCHASE') {
        await confirmPurchase(supabaseClient, order, 'confirm')
      } else {
        await confirmRedeem(supabaseClient, order, 'confirm')
      }
      settledCount++
      details.push({ order_id: order.id, status: 'success' })
    } catch (err: any) {
      failedCount++
      details.push({ order_id: order.id, status: 'failed', error: err.message })
    }
  }

  return successResponse({
    message: '批量结算完成',
    total_orders: orders.length,
    settled_count: settledCount,
    failed_count: failedCount,
    details: details
  })
}

function successResponse(data: any) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, code: number = 400) {
  return new Response(JSON.stringify({ success: false, error: message, code }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: code,
  })
}
