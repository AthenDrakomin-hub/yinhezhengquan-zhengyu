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

    // 1. 获取撮合池中所有待撮合订单（直接使用 trade_match_pool 表的字段）
    const { data: poolOrders, error: fetchError } = await supabaseClient
      .from('trade_match_pool')
      .select('*')
      .eq('status', 'MATCHING')
      .order('id', { ascending: true })

    if (fetchError) throw fetchError
    if (!poolOrders || poolOrders.length === 0) {
      return new Response(JSON.stringify({ message: '撮合池为空' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    let matchCount = 0
    let specialTradeCount = 0

    // 2. 先处理特殊交易类型（IPO、大宗交易、涨停打板）
    for (const order of poolOrders) {
      const originalTradeType = order.trade_type
      
      // 处理IPO：跳过撮合，直接标记为成交
      if (originalTradeType === 'IPO') {
        await handleSpecialTrade(supabaseClient, order, 'IPO')
        specialTradeCount++
        continue
      }
      
      // 处理大宗交易
      if (originalTradeType === 'BLOCK_TRADE') {
        console.log(`处理大宗交易订单: ${order.trade_id}, 股票: ${order.stock_code}`)
      }
      
      // 处理涨停打板
      if (originalTradeType === 'LIMIT_UP') {
        console.log(`处理涨停打板订单: ${order.trade_id}, 股票: ${order.stock_code}, 价格: ${order.price}`)
      }
    }

    // 3. 按标的代码分组（只处理普通交易）
    const ordersByStock: Record<string, any[]> = {}
    poolOrders.forEach(order => {
      const originalTradeType = order.trade_type
      // 跳过已处理的特殊交易
      if (originalTradeType === 'IPO' || order.status !== 'MATCHING') return
      
      if (!ordersByStock[order.stock_code]) {
        ordersByStock[order.stock_code] = []
      }
      ordersByStock[order.stock_code].push(order)
    })

    // 4. 对每个标的执行撮合
    for (const stockCode in ordersByStock) {
      const stockOrders = ordersByStock[stockCode]
      
      // 分离买入和卖出订单
      const buyOrders = stockOrders.filter(o => o.trade_type === 'BUY' && o.status === 'MATCHING')
        .sort((a, b) => {
          // 价格优先：买入价高的优先
          if (b.price !== a.price) return b.price - a.price
          // 时间优先：ID小的优先
          return a.id.localeCompare(b.id)
        })
      
      const sellOrders = stockOrders.filter(o => o.trade_type === 'SELL' && o.status === 'MATCHING')
        .sort((a, b) => {
          // 价格优先：卖出价低的优先
          if (a.price !== b.price) return a.price - b.price
          // 时间优先：ID小的优先
          return a.id.localeCompare(b.id)
        })

      // 5. 撮合逻辑：遍历买入订单，寻找匹配的卖出订单
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

    return new Response(JSON.stringify({ 
      success: true, 
      matchCount, 
      specialTradeCount,
      message: `撮合完成: ${matchCount}笔普通交易, ${specialTradeCount}笔特殊交易`
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

async function executeMatch(supabase: any, buyOrder: any, sellOrder: any, matchQty: number) {
  const matchPrice = sellOrder.price // 成交价为卖出价（价格优先原则）
  const amount = Number(matchPrice) * matchQty

  // 判断市场类型，A股T+1，港股T+0
  const marketType = buyOrder.market_type || 'A股'
  const isT0Market = marketType.includes('港股') || marketType === 'HK_SHARE'
  const tomorrow = isT0Market ? null : new Date(Date.now() + 86400000).toISOString().split('T')[0]

  // 1. 更新买家资产 (解冻并扣除)
  const { data: buyAssets } = await supabase.from('assets').select('*').eq('user_id', buyOrder.user_id).maybeSingle()
  if (!buyAssets) {
    throw new Error('买家资产记录不存在')
  }
  await supabase.from('assets').update({
    frozen_balance: Number(buyAssets.frozen_balance) - amount,
    total_balance: Number(buyAssets.total_balance) - amount
  }).eq('user_id', buyOrder.user_id)

  // 2. 更新买家持仓
  const { data: buyPos } = await supabase.from('positions').select('*').eq('user_id', buyOrder.user_id).eq('symbol', buyOrder.stock_code).maybeSingle()
  
  const updateData: any = {
    quantity: (buyPos?.quantity || 0) + matchQty,
    available_quantity: (buyPos?.available_quantity || 0) + (isT0Market ? matchQty : 0),
    average_price: buyPos ? (Number(buyPos.average_price) * buyPos.quantity + Number(matchPrice) * matchQty) / ((buyPos.quantity || 0) + matchQty) : matchPrice,
    market_value: ((buyPos?.quantity || 0) + matchQty) * Number(matchPrice)
  }
  
  if (!isT0Market) {
    updateData.locked_quantity = (buyPos?.locked_quantity || 0) + matchQty
    updateData.lock_until = tomorrow
  }

  if (buyPos) {
    await supabase.from('positions').update(updateData).eq('id', buyPos.id)
  } else {
    await supabase.from('positions').insert({
      user_id: buyOrder.user_id,
      symbol: buyOrder.stock_code,
      ...updateData
    })
  }

  // 3. 更新卖家资产（增加余额）
  const { data: sellAssets } = await supabase.from('assets').select('*').eq('user_id', sellOrder.user_id).maybeSingle()
  if (sellAssets) {
    await supabase.from('assets').update({
      total_balance: Number(sellAssets.total_balance) + amount
    }).eq('user_id', sellOrder.user_id)
  }

  // 4. 更新卖家持仓
  const { data: sellPos } = await supabase.from('positions').select('*').eq('user_id', sellOrder.user_id).eq('symbol', sellOrder.stock_code).maybeSingle()
  if (sellPos) {
    await supabase.from('positions').update({
      quantity: Number(sellPos.quantity) - matchQty,
      available_quantity: Number(sellPos.available_quantity) - matchQty,
      market_value: (Number(sellPos.quantity) - matchQty) * Number(matchPrice)
    }).eq('id', sellPos.id)
  }

  // 5. 更新撮合池状态
  await supabase.from('trade_match_pool').update({ status: 'COMPLETED', matched_at: new Date().toISOString() }).eq('id', buyOrder.id)
  await supabase.from('trade_match_pool').update({ status: 'COMPLETED', matched_at: new Date().toISOString() }).eq('id', sellOrder.id)

  // 6. 更新原始交易记录
  await supabase.from('trades').update({ status: 'FILLED', filled_quantity: matchQty, filled_amount: amount }).eq('id', buyOrder.trade_id)
  await supabase.from('trades').update({ status: 'FILLED', filled_quantity: matchQty, filled_amount: amount }).eq('id', sellOrder.trade_id)

  // 7. 记录清算流水
  await supabase.from('settlement_logs').insert([
    { user_id: buyOrder.user_id, trade_id: buyOrder.trade_id, type: 'BUY', amount: -amount, quantity: matchQty, price: matchPrice, symbol: buyOrder.stock_code },
    { user_id: sellOrder.user_id, trade_id: sellOrder.trade_id, type: 'SELL', amount: amount, quantity: matchQty, price: matchPrice, symbol: sellOrder.stock_code }
  ])
}

async function handleSpecialTrade(supabase: any, order: any, type: string) {
  // IPO直接成交
  const amount = Number(order.price) * Number(order.quantity)
  
  // 更新资产
  const { data: assets } = await supabase.from('assets').select('*').eq('user_id', order.user_id).maybeSingle()
  if (assets) {
    await supabase.from('assets').update({
      frozen_balance: Number(assets.frozen_balance) - amount,
      total_balance: Number(assets.total_balance) - amount
    }).eq('user_id', order.user_id)
  }

  // 更新持仓
  const { data: pos } = await supabase.from('positions').select('*').eq('user_id', order.user_id).eq('symbol', order.stock_code).maybeSingle()
  if (pos) {
    await supabase.from('positions').update({
      quantity: Number(pos.quantity) + Number(order.quantity),
      market_value: (Number(pos.quantity) + Number(order.quantity)) * Number(order.price)
    }).eq('id', pos.id)
  } else {
    await supabase.from('positions').insert({
      user_id: order.user_id,
      symbol: order.stock_code,
      quantity: Number(order.quantity),
      available_quantity: 0, // IPO新股T+1
      average_price: Number(order.price),
      market_value: Number(order.quantity) * Number(order.price),
      locked_quantity: Number(order.quantity),
      lock_until: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    })
  }

  // 更新状态
  await supabase.from('trade_match_pool').update({ status: 'COMPLETED', matched_at: new Date().toISOString() }).eq('id', order.id)
  await supabase.from('trades').update({ status: 'FILLED', filled_quantity: Number(order.quantity), filled_amount: amount }).eq('id', order.trade_id)
}
