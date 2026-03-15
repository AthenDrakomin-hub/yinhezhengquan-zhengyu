/**
 * 增强版撮合引擎 Edge Function
 * 功能：
 * 1. 价格优先、时间优先撮合
 * 2. 部分成交支持
 * 3. 手续费计算
 * 4. 清算流水记录
 * 5. 撮合日志
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

  const startTime = Date.now()
  const batchId = crypto.randomUUID()
  let matchLog: any = {
    batch_id: batchId,
    total_orders: 0,
    matched_count: 0,
    failed_count: 0,
    status: 'RUNNING',
    details: []
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY') ?? ''
    )

    // 验证管理员权限
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseClient.auth.getUser(token)
      // 可选：验证是否为管理员
    }

    // 创建撮合日志
    const { data: logEntry } = await supabaseClient
      .from('match_logs')
      .insert(matchLog)
      .select()
      .single()
    
    const logId = logEntry?.id

    // 1. 获取撮合池中所有待撮合订单
    const { data: poolOrders, error: fetchError } = await supabaseClient
      .from('trade_match_pool')
      .select('*')
      .eq('status', 'MATCHING')
      .order('enter_time', { ascending: true })

    if (fetchError) throw fetchError
    
    if (!poolOrders || poolOrders.length === 0) {
      await updateMatchLog(supabaseClient, logId, {
        status: 'COMPLETED',
        total_orders: 0,
        matched_count: 0,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      })
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: '撮合池为空',
        batch_id: batchId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    matchLog.total_orders = poolOrders.length

    let matchedCount = 0
    let failedCount = 0
    let specialCount = 0
    const details: any[] = []

    // 2. 先处理特殊交易类型（IPO直接成交）
    for (const order of poolOrders) {
      const originalTradeType = order.trades?.trade_type
      
      if (originalTradeType === 'IPO') {
        try {
          await handleIPOMatch(supabaseClient, order)
          specialCount++
          details.push({
            type: 'IPO',
            trade_id: order.trade_id,
            stock_code: order.stock_code,
            status: 'SUCCESS'
          })
        } catch (err: any) {
          failedCount++
          details.push({
            type: 'IPO',
            trade_id: order.trade_id,
            stock_code: order.stock_code,
            status: 'FAILED',
            error: err.message
          })
        }
      }
    }

    // 3. 按标的代码分组普通交易
    const ordersByStock: Record<string, any[]> = {}
    poolOrders.forEach(order => {
      const originalTradeType = order.trades?.trade_type
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

      // 5. 撮合循环
      for (const buyOrder of buyOrders) {
        if (buyOrder.status !== 'MATCHING') continue
        
        for (const sellOrder of sellOrders) {
          if (sellOrder.status !== 'MATCHING') continue
          
          // 检查是否可撮合：买入价 >= 卖出价
          if (buyOrder.price >= sellOrder.price) {
            // 计算可成交数量
            const matchQty = Math.min(buyOrder.quantity, sellOrder.quantity)
            
            if (matchQty > 0) {
              try {
                // 执行撮合
                await executeMatchWithSettlement(
                  supabaseClient, 
                  buyOrder, 
                  sellOrder, 
                  matchQty,
                  batchId
                )
                matchedCount++
                
                details.push({
                  type: 'MATCH',
                  buy_trade_id: buyOrder.trade_id,
                  sell_trade_id: sellOrder.trade_id,
                  stock_code: stockCode,
                  price: sellOrder.price,
                  quantity: matchQty,
                  status: 'SUCCESS'
                })
                
                // 更新订单剩余数量
                buyOrder.quantity -= matchQty
                sellOrder.quantity -= matchQty
                
                // 如果订单数量为0，标记为完成
                if (buyOrder.quantity === 0) {
                  buyOrder.status = 'COMPLETED'
                  await supabaseClient
                    .from('trade_match_pool')
                    .update({ status: 'COMPLETED' })
                    .eq('id', buyOrder.id)
                } else {
                  // 部分成交，更新数量
                  await supabaseClient
                    .from('trade_match_pool')
                    .update({ quantity: buyOrder.quantity })
                    .eq('id', buyOrder.id)
                }
                
                if (sellOrder.quantity === 0) {
                  sellOrder.status = 'COMPLETED'
                  await supabaseClient
                    .from('trade_match_pool')
                    .update({ status: 'COMPLETED' })
                    .eq('id', sellOrder.id)
                } else {
                  await supabaseClient
                    .from('trade_match_pool')
                    .update({ quantity: sellOrder.quantity })
                    .eq('id', sellOrder.id)
                }
                
                // 如果买入订单已完成，跳出内层循环
                if (buyOrder.quantity === 0) break
                
              } catch (err: any) {
                failedCount++
                details.push({
                  type: 'MATCH',
                  buy_trade_id: buyOrder.trade_id,
                  sell_trade_id: sellOrder.trade_id,
                  stock_code: stockCode,
                  status: 'FAILED',
                  error: err.message
                })
              }
            }
          }
        }
      }
    }

    // 6. 更新撮合日志
    matchLog.matched_count = matchedCount
    matchLog.failed_count = failedCount
    matchLog.status = 'COMPLETED'
    matchLog.finished_at = new Date().toISOString()
    matchLog.duration_ms = Date.now() - startTime
    matchLog.details = details

    await updateMatchLog(supabaseClient, logId, matchLog)

    return new Response(JSON.stringify({ 
      success: true, 
      batch_id: batchId,
      stats: {
        total_orders: poolOrders.length,
        matched_count: matchedCount,
        special_count: specialCount,
        failed_count: failedCount
      },
      duration_ms: matchLog.duration_ms
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('撮合引擎错误:', error)
    
    // 更新日志为失败状态
    matchLog.status = 'FAILED'
    matchLog.error_message = error.message
    matchLog.finished_at = new Date().toISOString()
    matchLog.duration_ms = Date.now() - startTime
    
    return new Response(JSON.stringify({ 
      error: error.message,
      batch_id: batchId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * 更新撮合日志
 */
async function updateMatchLog(supabase: any, logId: string, data: any) {
  if (!logId) return
  await supabase
    .from('match_logs')
    .update(data)
    .eq('id', logId)
}

/**
 * 处理IPO撮合（直接成交）
 */
async function handleIPOMatch(supabase: any, order: any) {
  const tradeId = order.trade_id
  
  // 获取交易详情
  const { data: trade } = await supabase
    .from('trades')
    .select('*')
    .eq('id', tradeId)
    .single()
  
  if (!trade) throw new Error('交易记录不存在')
  
  const amount = trade.price * trade.quantity
  
  // 计算手续费
  const { data: feeResult } = await supabase.rpc('calculate_trade_fee', {
    p_market_type: 'A_SHARE',
    p_trade_type: 'BUY',
    p_amount: amount,
    p_is_vip: false
  })
  
  const totalFee = feeResult?.total_fee || 0
  
  // 1. 扣减冻结资金
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', order.user_id)
    .single()
  
  if (!assets) throw new Error('资产记录不存在')
  
  const totalCost = amount + totalFee
  
  await supabase
    .from('assets')
    .update({
      frozen_balance: Math.max(0, assets.frozen_balance - totalCost),
      total_balance: assets.total_balance - totalFee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', order.user_id)
  
  // 2. 增加持仓
  const { data: existingPos } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', order.user_id)
    .eq('symbol', order.stock_code)
    .maybeSingle()
  
  if (existingPos) {
    const newQty = existingPos.quantity + trade.quantity
    const newAvgPrice = (existingPos.average_price * existingPos.quantity + amount) / newQty
    
    await supabase
      .from('positions')
      .update({
        quantity: newQty,
        average_price: newAvgPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPos.id)
  } else {
    await supabase
      .from('positions')
      .insert({
        user_id: order.user_id,
        symbol: order.stock_code,
        name: order.stock_code,
        quantity: trade.quantity,
        available_quantity: 0,  // A股T+1
        average_price: trade.price,
        locked_quantity: trade.quantity,
        lock_until: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      })
  }
  
  // 3. 更新交易状态
  await supabase
    .from('trades')
    .update({
      status: 'SUCCESS',
      executed_quantity: trade.quantity,
      executed_amount: amount,
      fee: totalFee,
      finish_time: new Date().toISOString()
    })
    .eq('id', tradeId)
  
  // 4. 标记撮合池完成
  await supabase
    .from('trade_match_pool')
    .update({ status: 'COMPLETED' })
    .eq('id', order.id)
  
  // 5. 记录成交
  await supabase
    .from('trade_executions')
    .insert({
      buy_trade_id: tradeId,
      buy_user_id: order.user_id,
      stock_code: order.stock_code,
      match_price: trade.price,
      match_quantity: trade.quantity,
      buy_fee: totalFee,
      batch_id: crypto.randomUUID()
    })
  
  // 6. 记录资金流水
  await supabase.rpc('record_fund_flow', {
    p_user_id: order.user_id,
    p_flow_type: 'BUY',
    p_amount: -totalCost,
    p_related_id: tradeId,
    p_description: `IPO申购: ${order.stock_code}`
  })
}

/**
 * 执行撮合并完成清算
 */
async function executeMatchWithSettlement(
  supabase: any, 
  buyOrder: any, 
  sellOrder: any, 
  matchQty: number,
  batchId: string
) {
  const matchPrice = sellOrder.price  // 成交价为卖出价
  const matchAmount = matchPrice * matchQty
  
  // 获取市场类型
  const marketType = buyOrder.trades?.market_type || 'A_SHARE'
  const isHK = marketType === 'HK'
  
  // 1. 计算手续费
  const { data: buyFeeResult } = await supabase.rpc('calculate_trade_fee', {
    p_market_type: isHK ? 'HK' : 'A_SHARE',
    p_trade_type: 'BUY',
    p_amount: matchAmount,
    p_is_vip: false
  })
  
  const { data: sellFeeResult } = await supabase.rpc('calculate_trade_fee', {
    p_market_type: isHK ? 'HK' : 'A_SHARE',
    p_trade_type: 'SELL',
    p_amount: matchAmount,
    p_is_vip: false
  })
  
  const buyFee = buyFeeResult?.total_fee || 0
  const sellFee = sellFeeResult?.total_fee || 0
  const sellTax = sellFeeResult?.stamp_tax || 0
  
  // 2. 更新买家资产
  const { data: buyAssets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', buyOrder.user_id)
    .single()
  
  if (!buyAssets) throw new Error('买家资产不存在')
  
  await supabase
    .from('assets')
    .update({
      frozen_balance: Math.max(0, buyAssets.frozen_balance - matchAmount),
      total_balance: buyAssets.total_balance - buyFee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', buyOrder.user_id)
  
  // 3. 更新买家持仓
  const { data: buyPos } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', buyOrder.user_id)
    .eq('symbol', buyOrder.stock_code)
    .maybeSingle()
  
  if (buyPos) {
    const newQty = buyPos.quantity + matchQty
    const newAvgPrice = (buyPos.average_price * buyPos.quantity + matchAmount) / newQty
    
    await supabase
      .from('positions')
      .update({
        quantity: newQty,
        average_price: newAvgPrice,
        // 港股T+0，A股T+1
        available_quantity: buyPos.available_quantity + (isHK ? matchQty : 0),
        locked_quantity: buyPos.locked_quantity + (isHK ? 0 : matchQty),
        lock_until: isHK ? null : new Date(Date.now() + 86400000).toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', buyPos.id)
  } else {
    await supabase
      .from('positions')
      .insert({
        user_id: buyOrder.user_id,
        symbol: buyOrder.stock_code,
        name: buyOrder.stock_code,
        quantity: matchQty,
        available_quantity: isHK ? matchQty : 0,
        average_price: matchPrice,
        locked_quantity: isHK ? 0 : matchQty,
        lock_until: isHK ? null : new Date(Date.now() + 86400000).toISOString().split('T')[0]
      })
  }
  
  // 4. 更新卖家资产
  const { data: sellAssets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', sellOrder.user_id)
    .single()
  
  if (!sellAssets) throw new Error('卖家资产不存在')
  
  const sellNetAmount = matchAmount - sellFee
  
  await supabase
    .from('assets')
    .update({
      available_balance: sellAssets.available_balance + sellNetAmount,
      total_balance: sellAssets.total_balance - sellFee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', sellOrder.user_id)
  
  // 5. 更新卖家持仓
  const { data: sellPos } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', sellOrder.user_id)
    .eq('symbol', sellOrder.stock_code)
    .maybeSingle()
  
  if (sellPos) {
    const newQty = sellPos.quantity - matchQty
    if (newQty <= 0) {
      await supabase
        .from('positions')
        .delete()
        .eq('id', sellPos.id)
    } else {
      await supabase
        .from('positions')
        .update({
          quantity: newQty,
          available_quantity: Math.max(0, sellPos.available_quantity - matchQty),
          updated_at: new Date().toISOString()
        })
        .eq('id', sellPos.id)
    }
  }
  
  // 6. 更新交易记录
  await supabase
    .from('trades')
    .update({
      status: 'SUCCESS',
      executed_quantity: matchQty,
      executed_amount: matchAmount,
      fee: buyFee,
      finish_time: new Date().toISOString()
    })
    .eq('id', buyOrder.trade_id)
  
  await supabase
    .from('trades')
    .update({
      status: 'SUCCESS',
      executed_quantity: matchQty,
      executed_amount: matchAmount,
      fee: sellFee,
      finish_time: new Date().toISOString()
    })
    .eq('id', sellOrder.trade_id)
  
  // 7. 创建成交记录
  await supabase
    .from('trade_executions')
    .insert({
      buy_trade_id: buyOrder.trade_id,
      sell_trade_id: sellOrder.trade_id,
      buy_user_id: buyOrder.user_id,
      sell_user_id: sellOrder.user_id,
      stock_code: buyOrder.stock_code,
      stock_name: buyOrder.stock_code,
      match_price: matchPrice,
      match_quantity: matchQty,
      buy_fee: buyFee,
      sell_fee: sellFee,
      sell_tax: sellTax,
      batch_id: batchId
    })
  
  // 8. 记录资金流水
  await supabase.rpc('record_fund_flow', {
    p_user_id: buyOrder.user_id,
    p_flow_type: 'BUY',
    p_amount: -(matchAmount + buyFee),
    p_related_id: buyOrder.trade_id,
    p_description: `买入: ${buyOrder.stock_code} ${matchQty}股`
  })
  
  await supabase.rpc('record_fund_flow', {
    p_user_id: sellOrder.user_id,
    p_flow_type: 'SELL',
    p_amount: sellNetAmount,
    p_related_id: sellOrder.trade_id,
    p_description: `卖出: ${sellOrder.stock_code} ${matchQty}股`
  })
}
