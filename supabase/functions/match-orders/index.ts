/**
 * 撮合引擎 Edge Function
 * 
 * 功能：
 * 1. 价格优先、时间优先撮合
 * 2. 支持部分成交
 * 3. 自动计算手续费
 * 4. 更新持仓和资金
 * 5. 记录成交和资金流水
 * 6. 推送订单状态变化
 * 
 * 触发方式：
 * - pg_cron 定时任务（每分钟）
 * - 手动调用（管理员）
 * - API 触发（交易提交后）
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 撮合配置
const MATCH_CONFIG = {
  maxIterations: 1000,           // 单次最大撮合轮次
  batchSize: 100,                // 每批处理订单数
  enablePartialMatch: true,      // 启用部分成交
  enableFeeCalculation: true,    // 启用手续费计算
  enableSettlement: true,        // 启用资金结算
  enablePositionUpdate: true,    // 启用持仓更新
  enableNotification: true,      // 启用通知推送
}

serve(async (req) => {
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const batchId = crypto.randomUUID()
  
  // 初始化撮合日志
  let matchLog: MatchLog = {
    batch_id: batchId,
    total_orders: 0,
    matched_count: 0,
    failed_count: 0,
    partial_count: 0,
    status: 'RUNNING',
    details: []
  }

  try {
    // 初始化 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })

    console.log(`[${batchId}] 撮合引擎启动`)

    // 创建撮合日志
    const { data: logEntry, error: logError } = await supabase
      .from('match_logs')
      .insert(matchLog)
      .select('id')
      .single()
    
    if (logError) {
      console.error('创建撮合日志失败:', logError)
    }
    const logId = logEntry?.id

    // 获取请求参数
    let params: MatchParams = {}
    try {
      if (req.method === 'POST') {
        params = await req.json()
      }
    } catch {
      // 忽略解析错误，使用默认参数
    }

    // 1. 获取撮合池中的待撮合订单
    const { orders, error: fetchError } = await fetchMatchingOrders(supabase, params)
    
    if (fetchError) {
      throw new Error(`获取订单失败: ${fetchError.message}`)
    }

    if (!orders || orders.length === 0) {
      console.log(`[${batchId}] 撮合池为空`)
      
      await updateMatchLog(supabase, logId, {
        status: 'COMPLETED',
        total_orders: 0,
        matched_count: 0,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      })
      
      return jsonResponse({
        success: true,
        message: '撮合池为空',
        batch_id: batchId,
        duration_ms: Date.now() - startTime
      })
    }

    matchLog.total_orders = orders.length
    console.log(`[${batchId}] 获取到 ${orders.length} 个待撮合订单`)

    // 2. 按交易类型分类处理
    const results = {
      matched: 0,
      partial: 0,
      failed: 0,
      details: [] as any[]
    }

    // 分离特殊交易（IPO、大宗、涨停板）和普通交易
    const { specialOrders, normalOrders } = classifyOrders(orders)

    // 处理特殊交易
    for (const order of specialOrders) {
      try {
        await processSpecialOrder(supabase, order, batchId)
        results.matched++
        results.details.push({
          type: 'SPECIAL',
          trade_id: order.trade_id,
          trade_type: order.trade_type,
          stock_code: order.stock_code,
          status: 'SUCCESS'
        })
      } catch (err: any) {
        results.failed++
        results.details.push({
          type: 'SPECIAL',
          trade_id: order.trade_id,
          stock_code: order.stock_code,
          status: 'FAILED',
          error: err.message
        })
      }
    }

    // 处理普通交易（买卖撮合）
    const normalResults = await processNormalOrders(supabase, normalOrders, batchId)
    results.matched += normalResults.matched
    results.partial += normalResults.partial
    results.failed += normalResults.failed
    results.details.push(...normalResults.details)

    // 3. 更新撮合日志
    matchLog.matched_count = results.matched
    matchLog.partial_count = results.partial
    matchLog.failed_count = results.failed
    matchLog.status = 'COMPLETED'
    matchLog.finished_at = new Date().toISOString()
    matchLog.duration_ms = Date.now() - startTime
    matchLog.details = results.details.slice(0, 100) // 最多保存100条详情

    await updateMatchLog(supabase, logId, matchLog)

    console.log(`[${batchId}] 撮合完成: ${results.matched} 成功, ${results.partial} 部分成交, ${results.failed} 失败`)

    return jsonResponse({
      success: true,
      batch_id: batchId,
      stats: {
        total_orders: orders.length,
        matched_count: results.matched,
        partial_count: results.partial,
        failed_count: results.failed
      },
      duration_ms: matchLog.duration_ms
    })

  } catch (error: any) {
    console.error(`[${batchId}] 撮合引擎错误:`, error)
    
    // 更新日志为失败状态
    matchLog.status = 'FAILED'
    matchLog.error_message = error.message
    matchLog.finished_at = new Date().toISOString()
    matchLog.duration_ms = Date.now() - startTime

    return jsonResponse({
      success: false,
      error: error.message,
      batch_id: batchId,
      duration_ms: matchLog.duration_ms
    }, 500)
  }
})

/**
 * 获取待撮合订单
 */
async function fetchMatchingOrders(supabase: any, params: MatchParams) {
  let query = supabase
    .from('trade_match_pool')
    .select(`
      *,
      trades!inner(
        id,
        user_id,
        trade_type,
        market_type,
        stock_code,
        stock_name,
        price,
        quantity,
        executed_quantity,
        status,
        created_at
      )
    `)
    .eq('status', 'MATCHING')
    .order('enter_time', { ascending: true })

  // 可选：按股票代码筛选
  if (params.stock_code) {
    query = query.eq('stock_code', params.stock_code)
  }

  // 可选：限制数量
  if (params.limit) {
    query = query.limit(params.limit)
  }

  const { data, error } = await query

  return { orders: data, error }
}

/**
 * 分类订单：特殊交易 vs 普通交易
 */
function classifyOrders(orders: any[]) {
  const specialOrders: any[] = []
  const normalOrders: any[] = []

  for (const order of orders) {
    const tradeType = order.trades?.trade_type
    
    // 特殊交易类型：IPO、大宗、涨停板
    if (['IPO_SUBSCRIBE', 'BLOCK_BUY', 'LIMIT_UP_BUY'].includes(tradeType)) {
      specialOrders.push(order)
    } else {
      normalOrders.push(order)
    }
  }

  return { specialOrders, normalOrders }
}

/**
 * 处理特殊交易订单
 */
async function processSpecialOrder(supabase: any, order: any, batchId: string) {
  const trade = order.trades
  const tradeType = trade.trade_type

  switch (tradeType) {
    case 'IPO_SUBSCRIBE':
      await processIPOOrder(supabase, order, batchId)
      break
    case 'BLOCK_BUY':
      await processBlockOrder(supabase, order, batchId)
      break
    case 'LIMIT_UP_BUY':
      await processLimitUpOrder(supabase, order, batchId)
      break
    default:
      throw new Error(`未知的特殊交易类型: ${tradeType}`)
  }
}

/**
 * 处理IPO申购订单
 */
async function processIPOOrder(supabase: any, order: any, batchId: string) {
  const trade = order.trades
  const userId = trade.user_id
  const stockCode = trade.stock_code
  const price = trade.price
  const quantity = trade.quantity
  const amount = price * quantity

  console.log(`处理IPO订单: ${trade.stock_name} ${quantity}股 @ ¥${price}`)

  // 1. 计算手续费
  const { data: feeResult } = await supabase.rpc('calculate_trade_fee', {
    p_market_type: 'A_SHARE',
    p_trade_type: 'BUY',
    p_amount: amount,
    p_is_vip: false
  })
  
  const totalFee = feeResult?.total_fee || 0
  const totalCost = amount + totalFee

  // 2. 获取用户资产
  const { data: assets, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (assetError || !assets) {
    throw new Error('用户资产记录不存在')
  }

  // 3. 检查冻结资金是否充足
  if (assets.frozen_balance < totalCost) {
    throw new Error('冻结资金不足')
  }

  // 4. 扣减冻结资金
  await supabase
    .from('assets')
    .update({
      frozen_balance: assets.frozen_balance - totalCost,
      total_balance: assets.total_balance - totalFee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  // 5. 增加持仓
  await updatePosition(supabase, userId, stockCode, trade.stock_name, quantity, price)

  // 6. 更新交易状态
  await supabase
    .from('trades')
    .update({
      status: 'SUCCESS',
      executed_quantity: quantity,
      executed_amount: amount,
      fee: totalFee,
      finish_time: new Date().toISOString()
    })
    .eq('id', trade.id)

  // 7. 标记撮合池完成
  await supabase
    .from('trade_match_pool')
    .update({ status: 'COMPLETED' })
    .eq('id', order.id)

  // 8. 记录成交
  await supabase
    .from('trade_executions')
    .insert({
      buy_trade_id: trade.id,
      buy_user_id: userId,
      stock_code: stockCode,
      stock_name: trade.stock_name,
      match_price: price,
      match_quantity: quantity,
      buy_fee: totalFee,
      batch_id: batchId
    })

  // 9. 记录资金流水
  await recordFundFlow(supabase, userId, 'BUY', trade.id, -totalCost, 'IPO申购')
  await recordFundFlow(supabase, userId, 'FEE', trade.id, -totalFee, '申购手续费')

  // 10. 推送通知
  await pushNotification(supabase, userId, {
    type: 'TRADE_SUCCESS',
    title: 'IPO申购成功',
    content: `${trade.stock_name}(${stockCode}) 申购成功，成交${quantity}股`,
    data: { trade_id: trade.id, batch_id: batchId }
  })
}

/**
 * 处理大宗交易订单
 */
async function processBlockOrder(supabase: any, order: any, batchId: string) {
  // 大宗交易逻辑（简化版：直接成交）
  const trade = order.trades
  const userId = trade.user_id
  const stockCode = trade.stock_code
  const price = trade.price
  const quantity = trade.quantity
  const amount = price * quantity

  console.log(`处理大宗订单: ${trade.stock_name} ${quantity}股 @ ¥${price}`)

  // 计算手续费（大宗交易佣金更低）
  const { data: feeResult } = await supabase.rpc('calculate_trade_fee', {
    p_market_type: 'A_SHARE',
    p_trade_type: 'BUY',
    p_amount: amount,
    p_is_vip: true  // 大宗交易享受VIP费率
  })
  
  const totalFee = feeResult?.total_fee || 0
  const totalCost = amount + totalFee

  // 扣减资金
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!assets) throw new Error('用户资产记录不存在')

  await supabase
    .from('assets')
    .update({
      available_balance: assets.available_balance - totalCost,
      total_balance: assets.total_balance - totalFee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  // 增加持仓
  await updatePosition(supabase, userId, stockCode, trade.stock_name, quantity, price)

  // 更新交易状态
  await supabase
    .from('trades')
    .update({
      status: 'SUCCESS',
      executed_quantity: quantity,
      executed_amount: amount,
      fee: totalFee,
      finish_time: new Date().toISOString()
    })
    .eq('id', trade.id)

  // 标记撮合池完成
  await supabase
    .from('trade_match_pool')
    .update({ status: 'COMPLETED' })
    .eq('id', order.id)

  // 推送通知
  await pushNotification(supabase, userId, {
    type: 'TRADE_SUCCESS',
    title: '大宗交易成功',
    content: `${trade.stock_name}(${stockCode}) 成交${quantity}股`,
    data: { trade_id: trade.id, batch_id: batchId }
  })
}

/**
 * 处理涨停板买入订单
 */
async function processLimitUpOrder(supabase: any, order: any, batchId: string) {
  // 涨停板买入逻辑（排队买入）
  const trade = order.trades
  
  console.log(`处理涨停板订单: ${trade.stock_name} ${trade.quantity}股 @ ¥${trade.price}`)

  // 涨停板买入需要检查是否有卖盘
  // 简化版：直接挂单等待
  // TODO: 实现涨停板排队逻辑
  
  await supabase
    .from('trades')
    .update({ status: 'MATCHING' })
    .eq('id', trade.id)
}

/**
 * 处理普通交易订单（买卖撮合）
 */
async function processNormalOrders(supabase: any, orders: any[], batchId: string) {
  const results = {
    matched: 0,
    partial: 0,
    failed: 0,
    details: [] as any[]
  }

  // 按标的分组
  const ordersByStock = groupOrdersByStock(orders)

  // 对每个标的执行撮合
  for (const stockCode in ordersByStock) {
    const stockOrders = ordersByStock[stockCode]
    
    try {
      const stockResults = await matchStockOrders(supabase, stockCode, stockOrders, batchId)
      results.matched += stockResults.matched
      results.partial += stockResults.partial
      results.failed += stockResults.failed
      results.details.push(...stockResults.details)
    } catch (err: any) {
      console.error(`撮合 ${stockCode} 失败:`, err)
      results.failed += stockOrders.length
    }
  }

  return results
}

/**
 * 按标的分组订单
 */
function groupOrdersByStock(orders: any[]) {
  const groups: Record<string, any[]> = {}
  
  for (const order of orders) {
    const stockCode = order.stock_code
    if (!groups[stockCode]) {
      groups[stockCode] = []
    }
    groups[stockCode].push(order)
  }

  return groups
}

/**
 * 对单个标的执行撮合
 */
async function matchStockOrders(supabase: any, stockCode: string, orders: any[], batchId: string) {
  const results = {
    matched: 0,
    partial: 0,
    failed: 0,
    details: [] as any[]
  }

  // 分离买入和卖出订单
  const buyOrders = orders
    .filter(o => o.trade_type === 'BUY' && o.status === 'MATCHING')
    .sort((a, b) => {
      // 价格优先（高价优先）+ 时间优先
      if (b.price !== a.price) return b.price - a.price
      return new Date(a.enter_time).getTime() - new Date(b.enter_time).getTime()
    })

  const sellOrders = orders
    .filter(o => o.trade_type === 'SELL' && o.status === 'MATCHING')
    .sort((a, b) => {
      // 价格优先（低价优先）+ 时间优先
      if (a.price !== b.price) return a.price - b.price
      return new Date(a.enter_time).getTime() - new Date(b.enter_time).getTime()
    })

  console.log(`${stockCode}: ${buyOrders.length} 个买单, ${sellOrders.length} 个卖单`)

  // 撮合循环
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
            const isPartial = await executeMatch(supabase, buyOrder, sellOrder, matchQty, batchId)
            
            if (isPartial) {
              results.partial++
            } else {
              results.matched++
            }

            results.details.push({
              type: 'MATCH',
              stock_code: stockCode,
              buy_trade_id: buyOrder.trade_id,
              sell_trade_id: sellOrder.trade_id,
              price: sellOrder.price,
              quantity: matchQty,
              status: 'SUCCESS'
            })

            // 更新订单剩余数量
            buyOrder.quantity -= matchQty
            sellOrder.quantity -= matchQty

            // 如果订单完成，标记状态
            if (buyOrder.quantity === 0) {
              buyOrder.status = 'COMPLETED'
            }
            if (sellOrder.quantity === 0) {
              sellOrder.status = 'COMPLETED'
            }

            // 如果买入订单已完成，跳出内层循环
            if (buyOrder.quantity === 0) break
            
          } catch (err: any) {
            results.failed++
            results.details.push({
              type: 'MATCH',
              buy_trade_id: buyOrder.trade_id,
              sell_trade_id: sellOrder.trade_id,
              status: 'FAILED',
              error: err.message
            })
          }
        }
      }
    }
  }

  return results
}

/**
 * 执行单次撮合
 */
async function executeMatch(supabase: any, buyOrder: any, sellOrder: any, matchQty: number, batchId: string): Promise<boolean> {
  const matchPrice = sellOrder.price // 以卖方价格成交
  const matchAmount = matchPrice * matchQty

  console.log(`撮合成功: 买${buyOrder.trade_id} 卖${sellOrder.trade_id} ${matchQty}股 @ ¥${matchPrice}`)

  // 1. 计算手续费
  const buyFeeResult = await supabase.rpc('calculate_trade_fee', {
    p_market_type: buyOrder.trades?.market_type || 'A_SHARE',
    p_trade_type: 'BUY',
    p_amount: matchAmount,
    p_is_vip: false
  })

  const sellFeeResult = await supabase.rpc('calculate_trade_fee', {
    p_market_type: sellOrder.trades?.market_type || 'A_SHARE',
    p_trade_type: 'SELL',
    p_amount: matchAmount,
    p_is_vip: false
  })

  const buyFee = buyFeeResult?.data?.total_fee || 0
  const sellFee = sellFeeResult?.data?.total_fee || 0
  const sellTax = sellFeeResult?.data?.stamp_tax || 0

  // 2. 更新买入方资产和持仓
  await updateBuyerAssets(supabase, buyOrder, matchAmount, buyFee)
  await updatePosition(supabase, buyOrder.user_id, buyOrder.stock_code, buyOrder.trades?.stock_name, matchQty, matchPrice)

  // 3. 更新卖出方资产和持仓
  await updateSellerAssets(supabase, sellOrder, matchAmount, sellFee + sellTax)
  await updatePositionForSell(supabase, sellOrder.user_id, sellOrder.stock_code, matchQty)

  // 4. 记录成交
  await supabase
    .from('trade_executions')
    .insert({
      buy_trade_id: buyOrder.trade_id,
      sell_trade_id: sellOrder.trade_id,
      buy_user_id: buyOrder.user_id,
      sell_user_id: sellOrder.user_id,
      stock_code: buyOrder.stock_code,
      stock_name: buyOrder.trades?.stock_name,
      match_price: matchPrice,
      match_quantity: matchQty,
      buy_fee: buyFee,
      sell_fee: sellFee,
      sell_tax: sellTax,
      batch_id: batchId
    })

  // 5. 更新交易订单状态
  const buyRemaining = buyOrder.quantity - matchQty
  const sellRemaining = sellOrder.quantity - matchQty

  await supabase
    .from('trades')
    .update({
      status: buyRemaining === 0 ? 'SUCCESS' : 'PARTIAL',
      executed_quantity: (buyOrder.trades?.executed_quantity || 0) + matchQty,
      executed_amount: (buyOrder.trades?.executed_amount || 0) + matchAmount,
      fee: (buyOrder.trades?.fee || 0) + buyFee,
      finish_time: buyRemaining === 0 ? new Date().toISOString() : null
    })
    .eq('id', buyOrder.trade_id)

  await supabase
    .from('trades')
    .update({
      status: sellRemaining === 0 ? 'SUCCESS' : 'PARTIAL',
      executed_quantity: (sellOrder.trades?.executed_quantity || 0) + matchQty,
      executed_amount: (sellOrder.trades?.executed_amount || 0) + matchAmount,
      fee: (sellOrder.trades?.fee || 0) + sellFee + sellTax,
      finish_time: sellRemaining === 0 ? new Date().toISOString() : null
    })
    .eq('id', sellOrder.trade_id)

  // 6. 更新撮合池
  if (buyRemaining === 0) {
    await supabase
      .from('trade_match_pool')
      .update({ status: 'COMPLETED' })
      .eq('id', buyOrder.id)
  } else {
    await supabase
      .from('trade_match_pool')
      .update({ quantity: buyRemaining })
      .eq('id', buyOrder.id)
  }

  if (sellRemaining === 0) {
    await supabase
      .from('trade_match_pool')
      .update({ status: 'COMPLETED' })
      .eq('id', sellOrder.id)
  } else {
    await supabase
      .from('trade_match_pool')
      .update({ quantity: sellRemaining })
      .eq('id', sellOrder.id)
  }

  // 7. 记录资金流水
  await recordFundFlow(supabase, buyOrder.user_id, 'BUY', buyOrder.trade_id, -(matchAmount + buyFee), '买入成交')
  await recordFundFlow(supabase, sellOrder.user_id, 'SELL', sellOrder.trade_id, matchAmount - sellFee - sellTax, '卖出成交')

  // 8. 推送通知
  await pushNotification(supabase, buyOrder.user_id, {
    type: 'TRADE_MATCHED',
    title: '买入成交',
    content: `${buyOrder.trades?.stock_name} 买入${matchQty}股，成交价 ¥${matchPrice}`,
    data: { trade_id: buyOrder.trade_id, batch_id: batchId }
  })

  await pushNotification(supabase, sellOrder.user_id, {
    type: 'TRADE_MATCHED',
    title: '卖出成交',
    content: `${sellOrder.trades?.stock_name} 卖出${matchQty}股，成交价 ¥${matchPrice}`,
    data: { trade_id: sellOrder.trade_id, batch_id: batchId }
  })

  return buyRemaining > 0 || sellRemaining > 0
}

/**
 * 更新买入方资产
 */
async function updateBuyerAssets(supabase: any, order: any, amount: number, fee: number) {
  const userId = order.user_id
  const totalCost = amount + fee

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!assets) throw new Error('买家资产记录不存在')

  // 扣减冻结资金
  await supabase
    .from('assets')
    .update({
      frozen_balance: Math.max(0, assets.frozen_balance - totalCost),
      total_balance: assets.total_balance - fee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
}

/**
 * 更新卖出方资产
 */
async function updateSellerAssets(supabase: any, order: any, amount: number, fee: number) {
  const userId = order.user_id
  const netAmount = amount - fee

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!assets) throw new Error('卖家资产记录不存在')

  // 增加可用资金
  await supabase
    .from('assets')
    .update({
      available_balance: assets.available_balance + netAmount,
      total_balance: assets.total_balance - fee,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
}

/**
 * 更新持仓（买入）
 */
async function updatePosition(supabase: any, userId: string, stockCode: string, stockName: string, quantity: number, price: number) {
  const { data: existingPos } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', stockCode)
    .maybeSingle()

  if (existingPos) {
    const newQty = existingPos.quantity + quantity
    const newAvgPrice = (existingPos.average_price * existingPos.quantity + price * quantity) / newQty

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
        user_id: userId,
        symbol: stockCode,
        name: stockName || stockCode,
        quantity: quantity,
        available_quantity: 0,  // A股 T+1
        average_price: price,
        locked_quantity: quantity,
        lock_until: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      })
  }
}

/**
 * 更新持仓（卖出）
 */
async function updatePositionForSell(supabase: any, userId: string, stockCode: string, quantity: number) {
  const { data: existingPos } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', stockCode)
    .single()

  if (!existingPos) throw new Error('持仓记录不存在')

  const newQty = existingPos.quantity - quantity
  const newAvailableQty = Math.max(0, existingPos.available_quantity - quantity)

  if (newQty <= 0) {
    // 清仓
    await supabase
      .from('positions')
      .delete()
      .eq('id', existingPos.id)
  } else {
    await supabase
      .from('positions')
      .update({
        quantity: newQty,
        available_quantity: newAvailableQty,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPos.id)
  }
}

/**
 * 记录资金流水
 */
async function recordFundFlow(supabase: any, userId: string, flowType: string, relatedId: string, amount: number, description: string) {
  // 获取当前余额
  const { data: assets } = await supabase
    .from('assets')
    .select('total_balance')
    .eq('user_id', userId)
    .single()

  const balanceBefore = assets?.total_balance || 0
  const balanceAfter = balanceBefore + amount

  await supabase
    .from('fund_flows')
    .insert({
      user_id: userId,
      flow_type: flowType,
      related_id: relatedId,
      amount: amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: description
    })
}

/**
 * 推送通知
 */
async function pushNotification(supabase: any, userId: string, notification: any) {
  try {
    // 写入通知表
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        data: notification.data,
        is_read: false
      })

    // 通过 Realtime 推送（需要前端订阅）
    // Supabase Realtime 会自动推送 notifications 表的变化
  } catch (err) {
    console.error('推送通知失败:', err)
  }
}

/**
 * 更新撮合日志
 */
async function updateMatchLog(supabase: any, logId: string | undefined, data: any) {
  if (!logId) return
  
  try {
    await supabase
      .from('match_logs')
      .update(data)
      .eq('id', logId)
  } catch (err) {
    console.error('更新撮合日志失败:', err)
  }
}

/**
 * JSON 响应辅助函数
 */
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// 类型定义
interface MatchLog {
  batch_id: string
  total_orders: number
  matched_count: number
  failed_count: number
  partial_count?: number
  status: string
  details: any[]
  finished_at?: string
  duration_ms?: number
  error_message?: string
}

interface MatchParams {
  stock_code?: string
  limit?: number
}
