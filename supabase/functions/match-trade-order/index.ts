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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 获取撮合池中所有待撮合订单
    const { data: poolOrders, error: fetchError } = await supabaseClient
      .from('trade_match_pool')
      .select('*')
      .eq('status', 'MATCHING')
      .order('enter_time', { ascending: true })

    if (fetchError) throw fetchError
    if (!poolOrders || poolOrders.length === 0) {
      return new Response(JSON.stringify({ message: '撮合池为空' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    let matchCount = 0

    // 2. 简单撮合逻辑：遍历订单寻找反向匹配
    for (let i = 0; i < poolOrders.length; i++) {
      const orderA = poolOrders[i]
      if (orderA.status !== 'MATCHING') continue

      for (let j = i + 1; j < poolOrders.length; j++) {
        const orderB = poolOrders[j]
        if (orderB.status !== 'MATCHING') continue

        // 匹配条件：同标的、同价格、反向交易
        if (
          orderA.stock_code === orderB.stock_code &&
          orderA.price === orderB.price &&
          orderA.trade_type !== orderB.trade_type &&
          orderA.quantity === orderB.quantity // 简化版：要求数量一致
        ) {
          // 执行撮合
          await executeMatch(supabaseClient, orderA, orderB)
          orderA.status = 'COMPLETED'
          orderB.status = 'COMPLETED'
          matchCount++
          break
        }
      }
    }

    return new Response(JSON.stringify({ success: true, matchCount }), {
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

async function executeMatch(supabase: any, orderA: any, orderB: any) {
  const buyOrder = orderA.trade_type === 'BUY' ? orderA : orderB
  const sellOrder = orderA.trade_type === 'SELL' ? orderA : orderB

  // 1. 更新买家资产 (解冻并扣除)
  const { data: buyAssets } = await supabase.from('assets').select('*').eq('user_id', buyOrder.user_id).single()
  const amount = Number(buyOrder.price) * buyOrder.quantity
  await supabase.from('assets').update({
    frozen_balance: Number(buyAssets.frozen_balance) - amount,
    total_balance: Number(buyAssets.total_balance) - amount // 假设买入扣除总资产
  }).eq('user_id', buyOrder.user_id)

  // 2. 更新买家持仓
  const { data: buyPos } = await supabase.from('positions').select('*').eq('user_id', buyOrder.user_id).eq('symbol', buyOrder.stock_code).single()
  if (buyPos) {
    const newQty = buyPos.quantity + buyOrder.quantity
    const newAvg = (Number(buyPos.average_price) * buyPos.quantity + Number(buyOrder.price) * buyOrder.quantity) / newQty
    await supabase.from('positions').update({
      quantity: newQty,
      available_quantity: buyPos.available_quantity + buyOrder.quantity,
      average_price: newAvg,
      market_value: newQty * Number(buyOrder.price)
    }).eq('id', buyPos.id)
  } else {
    await supabase.from('positions').insert({
      user_id: buyOrder.user_id,
      symbol: buyOrder.stock_code,
      name: 'Stock', // 简化
      quantity: buyOrder.quantity,
      available_quantity: buyOrder.quantity,
      average_price: buyOrder.price,
      market_value: amount
    })
  }

  // 3. 更新卖家资产 (增加余额)
  const { data: sellAssets } = await supabase.from('assets').select('*').eq('user_id', sellOrder.user_id).single()
  await supabase.from('assets').update({
    available_balance: Number(sellAssets.available_balance) + amount,
    total_balance: Number(sellAssets.total_balance) + amount
  }).eq('user_id', sellOrder.user_id)

  // 4. 更新卖家持仓
  const { data: sellPos } = await supabase.from('positions').select('*').eq('user_id', sellOrder.user_id).eq('symbol', sellOrder.stock_code).single()
  if (sellPos) {
    const newQty = sellPos.quantity - sellOrder.quantity
    if (newQty <= 0) {
      await supabase.from('positions').delete().eq('id', sellPos.id)
    } else {
      await supabase.from('positions').update({
        quantity: newQty,
        available_quantity: sellPos.available_quantity - sellOrder.quantity,
        market_value: newQty * Number(sellOrder.price)
      }).eq('id', sellPos.id)
    }
  }

  // 5. 更新订单状态
  await supabase.from('trades').update({ status: 'SUCCESS', finish_time: new Date().toISOString() }).eq('id', buyOrder.trade_id)
  await supabase.from('trades').update({ status: 'SUCCESS', finish_time: new Date().toISOString() }).eq('id', sellOrder.trade_id)

  // 6. 更新撮合池状态
  await supabase.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', buyOrder.id)
  await supabase.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', sellOrder.id)
}
