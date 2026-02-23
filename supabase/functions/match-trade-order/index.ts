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

    // 2. 按标的代码分组
    const ordersByStock: Record<string, any[]> = {}
    poolOrders.forEach(order => {
      if (!ordersByStock[order.stock_code]) {
        ordersByStock[order.stock_code] = []
      }
      ordersByStock[order.stock_code].push(order)
    })

    // 3. 对每个标的执行撮合
    for (const stockCode in ordersByStock) {
      const stockOrders = ordersByStock[stockCode]
      
      // 分离买入和卖出订单
      const buyOrders = stockOrders.filter(o => o.trade_type === 'BUY' && o.status === 'MATCHING')
        .sort((a, b) => {
          // 价格优先：买入价高的优先
          if (b.price !== a.price) return b.price - a.price
          // 时间优先：时间早的优先
          return new Date(a.enter_time).getTime() - new Date(b.enter_time).getTime()
        })
      
      const sellOrders = stockOrders.filter(o => o.trade_type === 'SELL' && o.status === 'MATCHING')
        .sort((a, b) => {
          // 价格优先：卖出价低的优先
          if (a.price !== b.price) return a.price - b.price
          // 时间优先：时间早的优先
          return new Date(a.enter_time).getTime() - new Date(b.enter_time).getTime()
        })

      // 4. 撮合逻辑：遍历买入订单，寻找匹配的卖出订单
      for (const buyOrder of buyOrders) {
        if (buyOrder.status !== 'MATCHING') continue
        
        for (const sellOrder of sellOrders) {
          if (sellOrder.status !== 'MATCHING') continue
          
          // 检查是否可撮合：买入价 >= 卖出价
          if (buyOrder.price >= sellOrder.price) {
            // 计算可成交数量
            const matchQty = Math.min(buyOrder.quantity, sellOrder.quantity)
            
            if (matchQty > 0) {
              // 执行撮合
              await executeMatch(supabaseClient, buyOrder, sellOrder, matchQty)
              matchCount++
              
              // 更新订单剩余数量
              buyOrder.quantity -= matchQty
              sellOrder.quantity -= matchQty
              
              // 如果订单数量为0，标记为完成
              if (buyOrder.quantity === 0) {
                buyOrder.status = 'COMPLETED'
              }
              if (sellOrder.quantity === 0) {
                sellOrder.status = 'COMPLETED'
              }
              
              // 如果买入订单已完成，跳出内层循环
              if (buyOrder.quantity === 0) break
            }
          }
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

async function executeMatch(supabase: any, buyOrder: any, sellOrder: any, matchQty: number) {
  const matchPrice = sellOrder.price // 成交价为卖出价（价格优先原则）
  const amount = Number(matchPrice) * matchQty

  // 1. 更新买家资产 (解冻并扣除)
  const { data: buyAssets } = await supabase.from('assets').select('*').eq('user_id', buyOrder.user_id).single()
  await supabase.from('assets').update({
    frozen_balance: Number(buyAssets.frozen_balance) - amount,
    total_balance: Number(buyAssets.total_balance) - amount
  }).eq('user_id', buyOrder.user_id)

  // 2. 更新买家持仓
  const { data: buyPos } = await supabase.from('positions').select('*').eq('user_id', buyOrder.user_id).eq('symbol', buyOrder.stock_code).single()
  if (buyPos) {
    const newQty = buyPos.quantity + matchQty
    const newAvg = (Number(buyPos.average_price) * buyPos.quantity + Number(matchPrice) * matchQty) / newQty
    await supabase.from('positions').update({
      quantity: newQty,
      available_quantity: buyPos.available_quantity + matchQty,
      average_price: newAvg,
      market_value: newQty * Number(matchPrice)
    }).eq('id', buyPos.id)
  } else {
    await supabase.from('positions').insert({
      user_id: buyOrder.user_id,
      symbol: buyOrder.stock_code,
      name: buyOrder.stock_code, // 简化
      quantity: matchQty,
      available_quantity: matchQty,
      average_price: matchPrice,
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
    const newQty = sellPos.quantity - matchQty
    if (newQty <= 0) {
      await supabase.from('positions').delete().eq('id', sellPos.id)
    } else {
      await supabase.from('positions').update({
        quantity: newQty,
        available_quantity: sellPos.available_quantity - matchQty,
        market_value: newQty * Number(matchPrice)
      }).eq('id', sellPos.id)
    }
  }

  // 5. 创建成交记录（可选）
  await supabase.from('trade_executions').insert({
    buy_order_id: buyOrder.trade_id,
    sell_order_id: sellOrder.trade_id,
    stock_code: buyOrder.stock_code,
    price: matchPrice,
    quantity: matchQty,
    executed_at: new Date().toISOString()
  }).catch(() => {
    // 如果表不存在，忽略错误
  })

  // 6. 更新撮合池订单数量
  if (matchQty === buyOrder.quantity) {
    // 买入订单完全成交
    await supabase.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', buyOrder.id)
  } else {
    // 买入订单部分成交，更新剩余数量
    await supabase.from('trade_match_pool').update({ quantity: buyOrder.quantity - matchQty }).eq('id', buyOrder.id)
  }

  if (matchQty === sellOrder.quantity) {
    // 卖出订单完全成交
    await supabase.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', sellOrder.id)
  } else {
    // 卖出订单部分成交，更新剩余数量
    await supabase.from('trade_match_pool').update({ quantity: sellOrder.quantity - matchQty }).eq('id', sellOrder.id)
  }

  // 7. 检查并更新原始交易订单状态
  // 适配现有数据库结构：trades表没有executed_quantity字段和PARTIAL状态
  // 如果订单完全成交，更新状态为SUCCESS；否则保持MATCHING状态
  if (matchQty === buyOrder.quantity) {
    await supabase.from('trades').update({ 
      status: 'SUCCESS', 
      finish_time: new Date().toISOString()
    }).eq('id', buyOrder.trade_id)
  }
  // 注意：部分成交时，不更新trades表状态，保持MATCHING状态
  // 撮合池中的数量已经更新，下次撮合会继续处理剩余数量

  if (matchQty === sellOrder.quantity) {
    await supabase.from('trades').update({ 
      status: 'SUCCESS', 
      finish_time: new Date().toISOString()
    }).eq('id', sellOrder.trade_id)
  }
  // 注意：部分成交时，不更新trades表状态，保持MATCHING状态
}
