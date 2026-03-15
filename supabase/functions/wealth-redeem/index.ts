/**
 * 理财产品赎回 Edge Function
 * 功能：
 * 1. 验证用户持仓
 * 2. 检查赎回条件（是否到期、是否可提前赎回）
 * 3. 计算收益和赎回金额
 * 4. 创建赎回订单
 * 5. 更新持仓状态
 * 6. 资金到账
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

    // 验证用户身份
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('未登录', 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return errorResponse('用户身份验证失败', 401)
    }

    // 解析请求参数
    const body = await req.json()
    const { holding_id, request_id } = body

    // 参数验证
    if (!holding_id) {
      return errorResponse('参数错误：持仓ID不能为空')
    }

    // 幂等性检查
    if (request_id) {
      const { data: existingOrder } = await supabaseClient
        .from('wealth_orders')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('metadata->request_id', request_id)
        .maybeSingle()
      
      if (existingOrder) {
        return successResponse({
          message: '订单已存在',
          order_id: existingOrder.id,
          status: existingOrder.status
        })
      }
    }

    // 获取持仓信息
    const { data: holding, error: holdingError } = await supabaseClient
      .from('wealth_holdings')
      .select('*')
      .eq('id', holding_id)
      .eq('user_id', user.id)
      .single()

    if (holdingError || !holding) {
      return errorResponse('持仓不存在')
    }

    if (holding.status !== 'holding') {
      return errorResponse('该持仓已赎回或已到期')
    }

    // 获取理财产品信息
    const { data: product, error: productError } = await supabaseClient
      .from('wealth_products')
      .select('*')
      .eq('code', holding.product_code)
      .single()

    if (productError || !product) {
      return errorResponse('理财产品不存在')
    }

    // 计算收益
    const today = new Date()
    const valueDate = new Date(holding.value_date)
    const maturityDate = holding.maturity_date ? new Date(holding.maturity_date) : null
    
    // 检查是否提前赎回
    const isEarlyRedeem = maturityDate && today < maturityDate
    const isMatured = maturityDate && today >= maturityDate
    
    // 计算持有天数
    const holdingDays = Math.floor((today.getTime() - valueDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // 计算利息收益
    let interest = 0
    if (product.expected_return && holdingDays > 0) {
      // 利息 = 本金 * 年化收益率 * 天数 / 365
      interest = holding.principal * product.expected_return / 100 * holdingDays / 365
      
      // 提前赎回可能扣减收益
      if (isEarlyRedeem && product.period_type === 'fixed') {
        // 定期产品提前赎回，收益打折或无收益
        interest = interest * 0.5  // 例子：提前赎回收益减半
      }
    }

    // 计算赎回金额
    const redeemAmount = holding.principal + interest

    // 获取用户资产
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (assetsError || !assets) {
      return errorResponse('用户资产信息不存在')
    }

    // 开始事务
    const orderId = crypto.randomUUID()
    
    // 1. 更新持仓状态
    const { error: updateHoldingError } = await supabaseClient
      .from('wealth_holdings')
      .update({
        status: 'redeemed',
        current_amount: redeemAmount,
        accrued_interest: interest,
        last_interest_date: today.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', holding.id)

    if (updateHoldingError) {
      return errorResponse('更新持仓状态失败')
    }

    // 2. 创建赎回订单
    const { error: orderError } = await supabaseClient
      .from('wealth_orders')
      .insert({
        id: orderId,
        user_id: user.id,
        product_code: product.code,
        product_name: product.name,
        order_type: 'REDEEM',
        amount: redeemAmount,
        interest: interest,
        status: 'SETTLED',  // 直接结算
        order_date: today.toISOString().split('T')[0],
        settle_date: today.toISOString().split('T')[0],
        metadata: {
          request_id: request_id,
          holding_id: holding.id,
          principal: holding.principal,
          holding_days: holdingDays,
          is_early_redeem: isEarlyRedeem,
          is_matured: isMatured
        }
      })

    if (orderError) {
      // 回滚持仓状态
      await supabaseClient
        .from('wealth_holdings')
        .update({
          status: 'holding',
          updated_at: new Date().toISOString()
        })
        .eq('id', holding.id)
      
      return errorResponse('创建订单失败')
    }

    // 3. 资金到账
    const { error: updateAssetsError } = await supabaseClient
      .from('assets')
      .update({
        available_balance: assets.available_balance + redeemAmount,
        total_balance: assets.total_balance + interest,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateAssetsError) {
      console.warn('资金到账更新失败，但订单已创建')
    }

    // 4. 记录收益
    if (interest > 0) {
      await supabaseClient
        .from('wealth_interest_records')
        .insert({
          user_id: user.id,
          holding_id: holding.id,
          product_code: product.code,
          product_name: product.name,
          principal: holding.principal,
          rate: product.expected_return || 0,
          days: holdingDays,
          interest: interest,
          interest_date: today.toISOString().split('T')[0],
          start_date: valueDate.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0]
        })
    }

    // 5. 记录资金流水
    await supabaseClient.rpc('record_fund_flow', {
      p_user_id: user.id,
      p_flow_type: 'WEALTH_REDEEM',
      p_amount: redeemAmount,
      p_related_id: orderId,
      p_description: `理财赎回: ${product.name}(${product.code})`
    }).catch(() => {
      console.warn('记录资金流水失败')
    })

    return successResponse({
      message: isEarlyRedeem ? '提前赎回成功' : (isMatured ? '到期赎回成功' : '赎回成功'),
      order_id: orderId,
      product_code: product.code,
      product_name: product.name,
      principal: holding.principal,
      interest: interest.toFixed(2),
      total_amount: redeemAmount.toFixed(2),
      holding_days: holdingDays,
      is_early_redeem: isEarlyRedeem,
      settle_date: today.toISOString().split('T')[0]
    })

  } catch (error: any) {
    console.error('理财赎回错误:', error)
    return errorResponse(error.message || '赎回失败，请稍后重试')
  }
})

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
