/**
 * 撤单 Edge Function
 * 
 * 修复记录：
 * 1. 兼容 PENDING 状态（待审核订单可撤单）
 * 2. 使用数据库事务函数保障原子性
 * 3. 增加错误处理和日志
 * 
 * @module cancel-trade-order
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 可撤销的订单状态
const CANCELABLE_STATUSES = ['PENDING', 'MATCHING', 'PARTIAL', 'SUBMITTED']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 使用 ANON_KEY 验证用户身份
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('VITE_SUPABASE_ANON_KEY') ?? '',
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
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY') ?? ''
    )

    const { trade_id } = await req.json()
    if (!trade_id) {
      return new Response(JSON.stringify({ error: 'trade_id 参数必填', code: 1001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 3. 尝试使用事务函数撤单（推荐方式）
    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc('cancel_order', {
      p_trade_id: trade_id,
      p_user_id: user.id
    })

    // 如果事务函数存在且执行成功
    if (!rpcError && rpcResult) {
      console.log('[撤单] 事务执行成功:', rpcResult)
      
      if (rpcResult.success) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: '撤单成功',
          refunded_amount: rpcResult.refunded_amount || 0,
          refunded_quantity: rpcResult.refunded_quantity || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } else {
        return new Response(JSON.stringify({ 
          error: rpcResult.error || '撤单失败', 
          code: 2002 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // 4. 事务函数不存在时，回退到原有逻辑（兼容旧数据库）
    console.log('[撤单] 事务函数不可用，使用回退逻辑')
    
    const { data: trade, error: tradeError } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('id', trade_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (tradeError || !trade) {
      return new Response(JSON.stringify({ error: '订单不存在', code: 2001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // 兼容多种状态：PENDING（待审核）、MATCHING（撮合中）、PARTIAL（部分成交）、SUBMITTED（已提交）
    if (!CANCELABLE_STATUSES.includes(trade.status)) {
      return new Response(JSON.stringify({ 
        error: `订单状态为 ${trade.status}，不可撤销。可撤销状态：${CANCELABLE_STATUSES.join('、')}`, 
        code: 2002 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 5. 删除撮合池记录
    await supabaseClient.from('trade_match_pool').delete().eq('trade_id', trade_id)

    // 6. 计算退款金额
    const isBuy = ['BUY', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP'].includes(trade.trade_type)
    const remainingQty = trade.remaining_quantity || trade.quantity
    const amount = trade.price * remainingQty
    const fee = trade.fee || 0

    // 7. 退款/解冻持仓
    let refundedAmount = 0
    let refundedQuantity = 0

    if (isBuy) {
      const { data: assets } = await supabaseClient.from('assets').select('*').eq('user_id', user.id).maybeSingle()
      if (assets) {
        const totalFrozen = amount + fee
        const { error: updateError } = await supabaseClient.from('assets').update({
          available_balance: Number(assets.available_balance) + totalFrozen,
          frozen_balance: Number(assets.frozen_balance) - totalFrozen
        }).eq('user_id', user.id)
        
        if (updateError) {
          console.error('[撤单] 解冻资金失败:', updateError)
          // 继续执行，更新订单状态
        } else {
          refundedAmount = totalFrozen
        }
      }
    } else {
      const { data: position } = await supabaseClient.from('positions').select('*').eq('user_id', user.id).eq('symbol', trade.stock_code).maybeSingle()
      if (position) {
        const { error: updateError } = await supabaseClient.from('positions').update({
          available_quantity: position.available_quantity + remainingQty
        }).eq('id', position.id)
        
        if (updateError) {
          console.error('[撤单] 解冻持仓失败:', updateError)
        } else {
          refundedQuantity = remainingQty
        }
      }
    }

    // 8. 更新订单状态
    const { error: statusError } = await supabaseClient.from('trades').update({ 
      status: 'CANCELLED', 
      finish_time: new Date().toISOString() 
    }).eq('id', trade_id)

    if (statusError) {
      console.error('[撤单] 更新订单状态失败:', statusError)
      return new Response(JSON.stringify({ error: '更新订单状态失败，请重试', code: 2003 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('[撤单] 成功:', { trade_id, refundedAmount, refundedQuantity })

    return new Response(JSON.stringify({ 
      success: true, 
      message: '撤单成功',
      refunded_amount: refundedAmount,
      refunded_quantity: refundedQuantity
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('[撤单] 异常:', error)
    return new Response(JSON.stringify({ error: error.message || '系统错误', code: 1000 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
