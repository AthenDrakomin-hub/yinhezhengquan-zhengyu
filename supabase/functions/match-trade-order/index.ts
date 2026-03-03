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

    // 1. 获取撮合池中所有待撮合订单，关联trades表获取原始交易类型
    const { data: poolOrders, error: fetchError } = await supabaseClient
      .from('trade_match_pool')
      .select(`
        *,
        trades!inner (
          trade_type,
          metadata
        )
      `)
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
    let specialTradeCount = 0

    // 2. 先处理特殊交易类型（IPO、大宗交易、涨停打板）
    for (const order of poolOrders) {
      const originalTradeType = order.trades?.trade_type
      
      // 处理IPO：跳过撮合，直接标记为成交
      if (originalTradeType === 'IPO') {
        await handleSpecialTrade(supabaseClient, order, 'IPO')
        specialTradeCount++
        continue
      }
      
      // 处理大宗交易：确认折扣计算是否正确（已在create-trade-order中验证）
      if (originalTradeType === 'BLOCK_TRADE') {
        // 大宗交易按普通交易处理，但可以记录日志
        console.log(`处理大宗交易订单: ${order.trade_id}, 股票: ${order.stock_code}`)
      }
      
      // 处理涨停打板：价格限制为涨停价（已在create-trade-order中验证）
      if (originalTradeType === 'LIMIT_UP') {
        // 涨停打板按普通交易处理，但可以记录日志
        console.log(`处理涨停打板订单: ${order.trade_id}, 股票: ${order.stock_code}, 价格: ${order.price}`)
      }
    }

    // 3. 按标的代码分组（只处理普通交易）
    const ordersByStock: Record<string, any[]> = {}
    poolOrders.forEach(order => {
      const originalTradeType = order.trades?.trade_type
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

  // 1. 更新买家资产 (解冻并扣除)
  const { data: buyAssets } = await supabase.from('assets').select('*').eq('user_id', buyOrder.user_id).single()
  await supabase.from('assets').update({
    frozen_balance: Number(buyAssets.frozen_balance) - amount,
    total_balance: Number(buyAssets.total_balance) - amount
  }).eq('user_id', buyOrder.user_id)

  // 2. 更新买家持仓
  const { data: buyPos } = await supabase.from('positions').select('*').eq('user_id', buyOrder.user_id).eq('symbol', buyOrder.stock_code).single()
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (buyPos) {
    const newQty = buyPos.quantity + matchQty
    const newAvg = (Number(buyPos.average_price) * buyPos.quantity + Number(matchPrice) * matchQty) / newQty
    await supabase.from('positions').update({
      quantity: newQty,
      available_quantity: buyPos.available_quantity + matchQty,
      locked_quantity: (buyPos.locked_quantity || 0) + matchQty,
      lock_until: tomorrow,
      average_price: newAvg,
      market_value: newQty * Number(matchPrice)
    }).eq('id', buyPos.id)
  } else {
    await supabase.from('positions').insert({
      user_id: buyOrder.user_id,
      symbol: buyOrder.stock_code,
      name: buyOrder.stock_code,
      quantity: matchQty,
      available_quantity: matchQty,
      locked_quantity: matchQty,
      lock_until: tomorrow,
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
  // 获取订单原始数量
  const { data: originalTrade } = await supabase.from('trades').select('quantity').eq('id', buyOrder.trade_id).single()
  const originalQuantity = originalTrade?.quantity || buyOrder.quantity
  
  // 计算已成交和剩余数量
  const executedQty = originalQuantity - (buyOrder.quantity - matchQty)
  const remainingQty = buyOrder.quantity - matchQty
  
  if (remainingQty === 0) {
    // 完全成交
    await supabase.from('trades').update({ 
      status: 'SUCCESS',
      executed_quantity: executedQty,
      remaining_quantity: 0,
      finish_time: new Date().toISOString()
    }).eq('id', buyOrder.trade_id)
  } else {
    // 部分成交
    await supabase.from('trades').update({ 
      status: 'PARTIAL',
      executed_quantity: executedQty,
      remaining_quantity: remainingQty
    }).eq('id', buyOrder.trade_id)
  }

  // 卖方订单同理
  const { data: originalSellTrade } = await supabase.from('trades').select('quantity').eq('id', sellOrder.trade_id).single()
  const originalSellQuantity = originalSellTrade?.quantity || sellOrder.quantity
  const executedSellQty = originalSellQuantity - (sellOrder.quantity - matchQty)
  const remainingSellQty = sellOrder.quantity - matchQty
  
  if (remainingSellQty === 0) {
    await supabase.from('trades').update({ 
      status: 'SUCCESS',
      executed_quantity: executedSellQty,
      remaining_quantity: 0,
      finish_time: new Date().toISOString()
    }).eq('id', sellOrder.trade_id)
  } else {
    await supabase.from('trades').update({ 
      status: 'PARTIAL',
      executed_quantity: executedSellQty,
      remaining_quantity: remainingSellQty
    }).eq('id', sellOrder.trade_id)
  }
}

/**
 * 处理特殊交易类型（IPO、大宗交易、涨停打板）
 * @param supabase Supabase客户端
 * @param order 撮合池订单
 * @param tradeType 交易类型
 */
async function handleSpecialTrade(supabase: any, order: any, tradeType: string) {
  try {
    console.log(`处理特殊交易: ${tradeType}, 订单ID: ${order.trade_id}, 股票: ${order.stock_code}`)
    
    // 根据交易类型处理
    switch (tradeType) {
      case 'IPO':
        // IPO：直接标记为成交，不需要撮合
        await handleIPOTrade(supabase, order)
        break
      
      case 'BLOCK_TRADE':
      case 'LIMIT_UP':
        // 大宗交易和涨停打板：按普通交易处理，进入撮合池
        // 这里不进行特殊处理，让它们进入普通撮合流程
        console.log(`${tradeType}交易进入撮合流程: ${order.trade_id}`)
        break
      
      default:
        console.warn(`未知的特殊交易类型: ${tradeType}, 订单ID: ${order.trade_id}`)
        break
    }
  } catch (error) {
    console.error(`处理特殊交易失败: ${tradeType}, 订单ID: ${order.trade_id}`, error)
  }
}

/**
 * 处理IPO交易：直接标记为成交
 * @param supabase Supabase客户端
 * @param order 撮合池订单
 */
async function handleIPOTrade(supabase: any, order: any) {
  try {
    // 1. 获取中签率
    const { data: rule } = await supabase
      .from('trade_rules')
      .select('config')
      .eq('rule_type', 'IPO')
      .single()
    
    const winRate = rule?.config?.win_rate || 0.005
    const isWin = Math.random() < winRate
    
    if (!isWin) {
      // 未中签：解冻资金
      const amount = order.price * order.quantity
      const { data: assets } = await supabase.from('assets').select('*').eq('user_id', order.user_id).single()
      
      await supabase.from('assets').update({
        frozen_balance: Number(assets.frozen_balance) - amount,
        available_balance: Number(assets.available_balance) + amount
      }).eq('user_id', order.user_id)
      
      await supabase.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', order.id)
      await supabase.from('trades').update({ 
        status: 'FAILED',
        finish_time: new Date().toISOString()
      }).eq('id', order.trade_id)
      
      console.log(`IPO未中签: ${order.trade_id}, 股票: ${order.stock_code}`)
      return
    }
    // 1. 更新撮合池订单状态为完成
    await supabase.from('trade_match_pool')
      .update({ status: 'COMPLETED' })
      .eq('id', order.id)
    
    // 2. 更新原始交易订单状态为成功
    await supabase.from('trades')
      .update({ 
        status: 'SUCCESS',
        finish_time: new Date().toISOString()
      })
      .eq('id', order.trade_id)
    
    // 3. 更新资产：解冻资金并扣除
    const { data: assets } = await supabase.from('assets')
      .select('*')
      .eq('user_id', order.user_id)
      .single()
    
    if (assets) {
      const amount = order.price * order.quantity
      await supabase.from('assets').update({
        frozen_balance: Number(assets.frozen_balance) - amount,
        total_balance: Number(assets.total_balance) - amount
      }).eq('user_id', order.user_id)
    }
    
    // 4. 更新持仓：添加新股持仓
    const { data: position } = await supabase.from('positions')
      .select('*')
      .eq('user_id', order.user_id)
      .eq('symbol', order.stock_code)
      .single()
    
    if (position) {
      // 如果已有持仓，更新数量
      const newQty = position.quantity + order.quantity
      const newAvg = (Number(position.average_price) * position.quantity + order.price * order.quantity) / newQty
      await supabase.from('positions').update({
        quantity: newQty,
        available_quantity: position.available_quantity + order.quantity,
        average_price: newAvg,
        market_value: newQty * order.price
      }).eq('id', position.id)
    } else {
      // 创建新持仓
      await supabase.from('positions').insert({
        user_id: order.user_id,
        symbol: order.stock_code,
        name: order.stock_code, // 简化，实际应从trades表获取股票名称
        quantity: order.quantity,
        available_quantity: order.quantity,
        average_price: order.price,
        market_value: order.price * order.quantity
      })
    }
    
    // 5. 记录成交记录
    await supabase.from('trade_executions').insert({
      buy_order_id: order.trade_id,
      sell_order_id: null, // IPO没有卖方
      stock_code: order.stock_code,
      price: order.price,
      quantity: order.quantity,
      executed_at: new Date().toISOString()
    }).catch(() => {
      // 如果表不存在，忽略错误
    })
    
    console.log(`IPO中签: ${order.trade_id}, 股票: ${order.stock_code}, 数量: ${order.quantity}`)
  } catch (error) {
    console.error(`处理IPO交易失败: ${order.trade_id}`, error)
    throw error
  }
}
