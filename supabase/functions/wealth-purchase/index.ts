/**
 * 理财产品购买 Edge Function
 * 功能：
 * 1. 验证理财产品状态
 * 2. 检查购买限额（起购金额、递增金额、单用户限额、产品剩余额度）
 * 3. 冻结用户资金
 * 4. 创建购买订单和持仓记录
 * 5. 设置起息日和到期日
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
    const { product_code, amount, request_id } = body

    // 参数验证
    if (!product_code || !amount || amount <= 0) {
      return errorResponse('参数错误：产品代码和金额不能为空')
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

    // 获取理财产品信息
    const { data: product, error: productError } = await supabaseClient
      .from('wealth_products')
      .select('*')
      .eq('code', product_code)
      .single()

    if (productError || !product) {
      return errorResponse('理财产品不存在')
    }

    // 检查产品状态
    if (product.status !== 'active') {
      return errorResponse('该产品已下架')
    }

    // 检查起购金额
    if (amount < product.min_amount) {
      return errorResponse(`最低起购金额为 ¥${product.min_amount.toLocaleString()}`)
    }

    // 检查递增金额
    if (product.increment > 0 && (amount - product.min_amount) % product.increment !== 0) {
      return errorResponse(`递增金额为 ¥${product.increment.toLocaleString()}`)
    }

    // 检查单用户限额
    if (product.per_user_limit) {
      const { data: userHoldings } = await supabaseClient
        .from('wealth_holdings')
        .select('principal')
        .eq('user_id', user.id)
        .eq('product_code', product_code)
        .eq('status', 'holding')
      
      const currentTotal = userHoldings?.reduce((sum: number, h: any) => sum + Number(h.principal), 0) || 0
      if (currentTotal + amount > product.per_user_limit) {
        return errorResponse(`单用户限额 ¥${product.per_user_limit.toLocaleString()}，您已持有 ¥${currentTotal.toLocaleString()}`)
      }
    }

    // 检查产品剩余额度
    if (product.quota > 0 && amount > product.quota) {
      return errorResponse(`产品剩余额度不足，当前剩余 ¥${product.quota.toLocaleString()}`)
    }

    // 获取用户资产
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (assetsError || !assets) {
      return errorResponse('用户资产信息不存在')
    }

    // 检查余额
    if (amount > assets.available_balance) {
      return errorResponse('可用余额不足')
    }

    // 计算起息日和到期日
    const today = new Date()
    const valueDate = new Date(today)
    valueDate.setDate(valueDate.getDate() + 1)  // T+1起息
    
    let maturityDate: Date | null = null
    if (product.period_days && product.period_days > 0) {
      maturityDate = new Date(valueDate)
      maturityDate.setDate(maturityDate.getDate() + product.period_days)
    }

    // 开始事务
    const orderId = crypto.randomUUID()
    const holdingId = crypto.randomUUID()
    
    // 1. 冻结用户资金
    const { error: updateAssetsError } = await supabaseClient
      .from('assets')
      .update({
        available_balance: assets.available_balance - amount,
        frozen_balance: assets.frozen_balance + amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateAssetsError) {
      return errorResponse('资金冻结失败')
    }

    // 2. 创建购买订单
    const { error: orderError } = await supabaseClient
      .from('wealth_orders')
      .insert({
        id: orderId,
        user_id: user.id,
        product_code: product.code,
        product_name: product.name,
        order_type: 'PURCHASE',
        amount: amount,
        status: 'PENDING',
        order_date: new Date().toISOString().split('T')[0],
        value_date: valueDate.toISOString().split('T')[0],
        maturity_date: maturityDate?.toISOString().split('T')[0] || null,
        metadata: {
          request_id: request_id,
          expected_return: product.expected_return,
          period_days: product.period_days,
          risk_level: product.risk_level
        }
      })

    if (orderError) {
      // 回滚资金冻结
      await supabaseClient
        .from('assets')
        .update({
          available_balance: assets.available_balance,
          frozen_balance: assets.frozen_balance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
      
      return errorResponse('创建订单失败')
    }

    // 3. 创建持仓记录（状态为holding，等待起息日确认）
    const { error: holdingError } = await supabaseClient
      .from('wealth_holdings')
      .insert({
        id: holdingId,
        user_id: user.id,
        product_code: product.code,
        product_name: product.name,
        principal: amount,
        current_amount: amount,
        accrued_interest: 0,
        purchase_date: new Date().toISOString().split('T')[0],
        value_date: valueDate.toISOString().split('T')[0],
        maturity_date: maturityDate?.toISOString().split('T')[0] || null,
        status: 'holding',
        order_id: orderId
      })

    if (holdingError) {
      console.warn('创建持仓记录失败，但不影响订单:', holdingError)
    }

    // 4. 更新产品剩余额度
    if (product.quota > 0) {
      await supabaseClient
        .from('wealth_products')
        .update({
          quota: Math.max(0, product.quota - amount),
          updated_at: new Date().toISOString()
        })
        .eq('code', product.code)
    }

    // 5. 记录资金流水
    await supabaseClient.rpc('record_fund_flow', {
      p_user_id: user.id,
      p_flow_type: 'WEALTH_PURCHASE',
      p_amount: -amount,
      p_related_id: orderId,
      p_description: `理财购买: ${product.name}(${product.code})`
    }).catch(() => {
      console.warn('记录资金流水失败')
    })

    return successResponse({
      message: '购买成功',
      order_id: orderId,
      holding_id: holdingId,
      product_code: product.code,
      product_name: product.name,
      amount: amount,
      expected_return: product.expected_return,
      period_days: product.period_days,
      risk_level: product.risk_level,
      value_date: valueDate.toISOString().split('T')[0],
      maturity_date: maturityDate?.toISOString().split('T')[0] || '灵活期限',
      order_date: new Date().toISOString().split('T')[0]
    })

  } catch (error: any) {
    console.error('理财购买错误:', error)
    return errorResponse(error.message || '购买失败，请稍后重试')
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
