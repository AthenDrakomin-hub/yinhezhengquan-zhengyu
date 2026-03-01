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

    const { trade_id } = await req.json()
    if (!trade_id) throw new Error('trade_id is required')

    const { data: trade, error: tradeError } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('id', trade_id)
      .eq('user_id', user.id)
      .single()

    if (tradeError || !trade) {
      return new Response(JSON.stringify({ error: '订单不存在', code: 2001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (!['MATCHING', 'PARTIAL'].includes(trade.status)) {
      return new Response(JSON.stringify({ 
        error: `订单状态为 ${trade.status}，不可撤销`, 
        code: 2002 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    await supabaseClient.from('trade_match_pool').delete().eq('trade_id', trade_id)

    const isBuy = ['BUY', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP'].includes(trade.trade_type)
    const remainingQty = trade.remaining_quantity || trade.quantity
    const amount = trade.price * remainingQty
    const fee = trade.fee || 0

    if (isBuy) {
      const { data: assets } = await supabaseClient.from('assets').select('*').eq('user_id', user.id).single()
      const totalFrozen = amount + fee
      await supabaseClient.from('assets').update({
        available_balance: Number(assets.available_balance) + totalFrozen,
        frozen_balance: Number(assets.frozen_balance) - totalFrozen
      }).eq('user_id', user.id)
    } else {
      const { data: position } = await supabaseClient.from('positions').select('*').eq('user_id', user.id).eq('symbol', trade.stock_code).single()
      if (position) {
        await supabaseClient.from('positions').update({
          available_quantity: position.available_quantity + remainingQty
        }).eq('id', position.id)
      }
    }

    await supabaseClient.from('trades').update({ 
      status: 'CANCELLED', 
      finish_time: new Date().toISOString() 
    }).eq('id', trade_id)

    return new Response(JSON.stringify({ 
      success: true, 
      message: '撤单成功',
      refunded_amount: isBuy ? amount + fee : 0,
      refunded_quantity: isBuy ? 0 : remainingQty
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
