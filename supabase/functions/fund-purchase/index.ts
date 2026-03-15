/**
 * 基金申购 Edge Function
 * 功能：
 * 1. 验证基金产品状态
 * 2. 检查用户资金余额
 * 3. 计算申购份额和手续费
 * 4. 冻结用户资金
 * 5. 创建申购订单
 * 6. T+1确认份额（通过定时任务或手动触发）
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
    const { fund_code, amount, request_id } = body

    // 参数验证
    if (!fund_code || !amount || amount <= 0) {
      return errorResponse('参数错误：基金代码和金额不能为空')
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
    if (fund.status !== 'active' || !fund.can_purchase) {
      return errorResponse('该基金当前暂停申购')
    }

    // 检查最低申购金额
    if (amount < fund.min_purchase) {
      return errorResponse(`最低申购金额为 ¥${fund.min_purchase}`)
    }

    // 检查递增金额
    if (fund.min_increment > 0 && (amount - fund.min_purchase) % fund.min_increment !== 0) {
      return errorResponse(`递增金额为 ¥${fund.min_increment}`)
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

    // 计算申购份额和费用
    const fee = amount * fund.purchase_fee_rate
    const netAmount = amount - fee
    const shares = netAmount / fund.nav

    // 开始事务
    const orderId = crypto.randomUUID()
    
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

    // 2. 创建申购订单
    const { error: orderError } = await supabaseClient
      .from('fund_orders')
      .insert({
        id: orderId,
        user_id: user.id,
        fund_code: fund.code,
        fund_name: fund.name,
        order_type: 'PURCHASE',
        amount: amount,
        fee: fee,
        status: 'PENDING',
        order_date: new Date().toISOString().split('T')[0],
        metadata: {
          request_id: request_id,
          fund_nav: fund.nav,
          expected_shares: shares
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

    // 3. 记录资金流水
    await supabaseClient.rpc('record_fund_flow', {
      p_user_id: user.id,
      p_flow_type: 'FUND_PURCHASE_FREEZE',
      p_amount: -amount,
      p_related_id: orderId,
      p_description: `基金申购冻结: ${fund.name}(${fund.code})`
    }).catch(() => {
      // 流水记录失败不影响主流程
      console.warn('记录资金流水失败')
    })

    return successResponse({
      message: '申购申请已提交，预计T+1确认份额',
      order_id: orderId,
      fund_code: fund.code,
      fund_name: fund.name,
      amount: amount,
      fee: fee,
      net_amount: netAmount,
      nav: fund.nav,
      expected_shares: shares.toFixed(4),
      order_date: new Date().toISOString().split('T')[0]
    })

  } catch (error: any) {
    console.error('基金申购错误:', error)
    return errorResponse(error.message || '申购失败，请稍后重试')
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
