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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: '无权限', code: 3001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { trade_id, action, remark } = await req.json()
    if (!trade_id || !action || !['APPROVED', 'REJECTED'].includes(action)) {
      throw new Error('Invalid parameters')
    }

    const { data: trade, error: tradeError } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('id', trade_id)
      .single()

    if (tradeError || !trade) {
      return new Response(JSON.stringify({ error: '订单不存在', code: 3002 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (!trade.need_approval || trade.approval_status !== 'PENDING') {
      return new Response(JSON.stringify({ error: '订单无需审核或已审核', code: 3003 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (action === 'APPROVED') {
      await supabaseClient.from('trades').update({
        approval_status: 'APPROVED',
        approved_by: user.id,
        approval_time: new Date().toISOString(),
        approval_remark: remark,
        status: 'MATCHING'
      }).eq('id', trade_id)

      const isBuy = ['BUY', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP'].includes(trade.trade_type)
      await supabaseClient.from('trade_match_pool').insert({
        trade_id: trade.id,
        user_id: trade.user_id,
        market_type: trade.market_type,
        trade_type: isBuy ? 'BUY' : 'SELL',
        stock_code: trade.stock_code,
        price: trade.price,
        quantity: trade.quantity,
        status: 'MATCHING'
      })

      await supabaseClient.from('admin_operation_logs').insert({
        admin_id: user.id,
        operate_type: 'AUDIT',
        target_user_id: trade.user_id,
        operate_content: { trade_id, action: 'APPROVED', remark }
      })

      return new Response(JSON.stringify({ success: true, message: '审核通过，订单已进入撮合池' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      await supabaseClient.from('trades').update({
        approval_status: 'REJECTED',
        approved_by: user.id,
        approval_time: new Date().toISOString(),
        approval_remark: remark,
        status: 'FAILED',
        finish_time: new Date().toISOString()
      }).eq('id', trade_id)

      const isBuy = ['BUY', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP'].includes(trade.trade_type)
      const amount = trade.price * trade.quantity
      const fee = trade.fee || 0

      if (isBuy) {
        const { data: assets } = await supabaseClient.from('assets').select('*').eq('user_id', trade.user_id).single()
        const totalFrozen = amount + fee
        await supabaseClient.from('assets').update({
          available_balance: Number(assets.available_balance) + totalFrozen,
          frozen_balance: Number(assets.frozen_balance) - totalFrozen
        }).eq('user_id', trade.user_id)
      } else {
        const { data: position } = await supabaseClient.from('positions').select('*').eq('user_id', trade.user_id).eq('symbol', trade.stock_code).single()
        if (position) {
          await supabaseClient.from('positions').update({
            available_quantity: position.available_quantity + trade.quantity
          }).eq('id', position.id)
        }
      }

      await supabaseClient.from('admin_operation_logs').insert({
        admin_id: user.id,
        operate_type: 'AUDIT',
        target_user_id: trade.user_id,
        operate_content: { trade_id, action: 'REJECTED', remark }
      })

      return new Response(JSON.stringify({ success: true, message: '审核拒绝，已解冻资金/持仓' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
