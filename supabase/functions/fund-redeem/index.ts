/**
 * 基金赎回 Edge Function
 * 功能：
 * 1. 验证用户持仓
 * 2. 检查可赎回份额
 * 3. 计算赎回金额和手续费（持有天数影响费率）
 * 4. 冻结赎回份额
 * 5. 创建赎回订单
 * 6. T+1确认资金到账（通过定时任务或手动触发）
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
    const { fund_code, shares, redeem_all, request_id } = body

    // 参数验证
    if (!fund_code) {
      return errorResponse('参数错误：基金代码不能为空')
    }

    if (!redeem_all && (!shares || shares <= 0)) {
      return errorResponse('参数错误：赎回份额必须大于0')
    }

    // 幂等性检查
    if (request_id) {
      const { data: existingOrder } = await supabaseClient
        .from('fund_orders')
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

    // 获取基金产品信息
    const { data: fund, error: fundError } = await supabaseClient
      .from('funds')
      .select('*')
      .eq('code', fund_code)
      .single()

    if (fundError || !fund) {
      return errorResponse('基金产品不存在')
    }

    // 检查基金状态
    if (fund.status !== 'active' || !fund.can_redeem) {
      return errorResponse('该基金当前暂停赎回')
    }

    // 获取用户持仓
    const { data: holding, error: holdingError } = await supabaseClient
      .from('fund_holdings')
      .select('*')
      .eq('user_id', user.id)
      .eq('fund_code', fund_code)
      .single()

    if (holdingError || !holding) {
      return errorResponse('未持有该基金')
    }

    // 确定赎回份额
    let redeemShares = shares
    if (redeem_all) {
      redeemShares = holding.available_shares
    }

    // 检查可赎回份额
    if (redeemShares > holding.available_shares) {
      return errorResponse(`可赎回份额不足，当前可赎回: ${holding.available_shares.toFixed(4)} 份`)
    }

    // 计算持有天数
    const purchaseDate = new Date(holding.first_purchase_date)
    const today = new Date()
    const holdingDays = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))

    // 计算赎回费用（持有时间越长费率越低）
    let feeRate = fund.redeem_fee_rate
    if (holdingDays >= 730) {
      feeRate = 0  // 持有2年以上免费
    } else if (holdingDays >= 365) {
      feeRate = fund.redeem_fee_rate * 0.25  // 持有1年以上25%
    } else if (holdingDays >= 180) {
      feeRate = fund.redeem_fee_rate * 0.5  // 持有半年以上50%
    } else if (holdingDays >= 30) {
      feeRate = fund.redeem_fee_rate * 0.75  // 持有1月以上75%
    }

    // 计算赎回金额
    const amount = redeemShares * fund.nav
    const fee = amount * feeRate
    const netAmount = amount - fee

    // 开始事务
    const orderId = crypto.randomUUID()
    
    // 1. 冻结赎回份额
    const { error: updateHoldingError } = await supabaseClient
      .from('fund_holdings')
      .update({
        available_shares: holding.available_shares - redeemShares,
        frozen_shares: holding.frozen_shares + redeemShares,
        updated_at: new Date().toISOString()
      })
      .eq('id', holding.id)

    if (updateHoldingError) {
      return errorResponse('份额冻结失败')
    }

    // 2. 创建赎回订单
    const { error: orderError } = await supabaseClient
      .from('fund_orders')
      .insert({
        id: orderId,
        user_id: user.id,
        fund_code: fund.code,
        fund_name: fund.name,
        order_type: 'REDEEM',
        shares: redeemShares,
        fee: fee,
        status: 'PENDING',
        order_date: new Date().toISOString().split('T')[0],
        metadata: {
          request_id: request_id,
          fund_nav: fund.nav,
          amount: amount,
          net_amount: netAmount,
          fee_rate: feeRate,
          holding_days: holdingDays
        }
      })

    if (orderError) {
      // 回滚份额冻结
      await supabaseClient
        .from('fund_holdings')
        .update({
          available_shares: holding.available_shares,
          frozen_shares: holding.frozen_shares,
          updated_at: new Date().toISOString()
        })
        .eq('id', holding.id)
      
      return errorResponse('创建订单失败')
    }

    return successResponse({
      message: '赎回申请已提交，预计T+1资金到账',
      order_id: orderId,
      fund_code: fund.code,
      fund_name: fund.name,
      shares: redeemShares.toFixed(4),
      nav: fund.nav,
      amount: amount.toFixed(2),
      fee_rate: (feeRate * 100).toFixed(4) + '%',
      fee: fee.toFixed(2),
      net_amount: netAmount.toFixed(2),
      holding_days: holdingDays,
      order_date: new Date().toISOString().split('T')[0]
    })

  } catch (error: any) {
    console.error('基金赎回错误:', error)
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
