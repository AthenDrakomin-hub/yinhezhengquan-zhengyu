import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 交易类型映射（中文 -> 英文）
const TRADE_TYPE_MAP: Record<string, string> = {
  '普通买入': 'BUY',
  '普通卖出': 'SELL',
  '新股申购': 'IPO',
  '大宗交易': 'BLOCK_TRADE',
  '涨停打板': 'LIMIT_UP'
}

// 交易类型反向映射
const TRADE_TYPE_REVERSE_MAP: Record<string, string> = {
  'BUY': '普通买入',
  'SELL': '普通卖出',
  'IPO': '新股申购',
  'BLOCK_TRADE': '大宗交易',
  'LIMIT_UP': '涨停打板'
}

// 用户级别映射
const USER_LEVEL_MAP: Record<string, number> = {
  'user': 0,
  'vip': 1,
  'svip': 2,
  'institution': 3
}

// 交易幂等性检查表
const transactionCache = new Map<string, { timestamp: number, response: any }>();
const CACHE_TTL = 300000;

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of transactionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      transactionCache.delete(key);
    }
  }
}

setInterval(cleanupCache, 60000);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建两个客户端：
    // 1. 使用 ANON_KEY 验证用户身份
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: req.headers.get('Authorization') ?? '' 
          } 
        } 
      }
    )

    // 验证用户身份
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    
    if (authError || !user) {
      console.error('授权验证失败:', authError)
      return new Response(JSON.stringify({ 
        error: '未授权，请先登录', 
        code: 401 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const userId = user.id

    // 2. 使用 SERVICE_ROLE_KEY 访问数据库（绕过 RLS）
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 解析请求体
    const { 
      market_type, 
      trade_type, 
      stock_code, 
      stock_name, 
      price, 
      quantity, 
      leverage = 1,
      transaction_id,
      metadata = {}
    } = await req.json()

    // 幂等性检查
    if (transaction_id) {
      const cachedResult = transactionCache.get(transaction_id);
      if (cachedResult) {
        console.log(`幂等性检查: 交易 ${transaction_id} 已处理，返回缓存结果`);
        return new Response(JSON.stringify(cachedResult.response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('level, role')
      .eq('id', userId)
      .single()
    
    const userLevel = profile?.level || 'user'
    const userLevelNum = USER_LEVEL_MAP[userLevel] || 0
    const tradeTypeName = TRADE_TYPE_REVERSE_MAP[trade_type] || trade_type

    // 1. 获取交易时间配置
    const { data: tradingHours } = await supabaseClient
      .from('trading_hours')
      .select('*')
      .eq('market_type', market_type === 'A_SHARE' ? 'A股' : '港股')
      .eq('status', true)
      .single()

    // 2. 检查是否可以使用快速通道
    const fastChannelType = trade_type === 'LIMIT_UP' ? '涨停打板通道' :
                            trade_type === 'BLOCK_TRADE' ? '大宗交易通道' : null
    
    let bypassTradingHours = false
    let bypassPriceLimit = false

    if (fastChannelType) {
      const { data: fastChannel } = await supabaseClient
        .from('fast_channel_rules')
        .select('*')
        .eq('channel_type', fastChannelType)
        .eq('status', true)
        .single()

      if (fastChannel && fastChannel.allowed_user_levels) {
        const allowedLevels = fastChannel.allowed_user_levels as string[]
        if (allowedLevels.includes(userLevel)) {
          bypassTradingHours = fastChannel.bypass_trading_hours
          bypassPriceLimit = fastChannel.bypass_price_limit
          console.log(`用户 ${userId} 使用快速通道 ${fastChannelType}，绕过交易时间: ${bypassTradingHours}`)
        }
      }
    }

    // 3. 交易时间检查（如果不使用快速通道）
    const now = new Date()
    const day = now.getDay()
    
    // 周末检查（港股周六休市，A股周末休市）
    if ((day === 0 || day === 6) && !bypassTradingHours) {
      return new Response(JSON.stringify({ error: '周末不开市', code: 1007 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 交易时间检查
    if (tradingHours && !bypassTradingHours) {
      const sessions = tradingHours.trading_sessions as any[]
      const currentHour = now.getHours().toString().padStart(2, '0')
      const currentMinute = now.getMinutes().toString().padStart(2, '0')
      const currentTimeStr = `${currentHour}:${currentMinute}`
      
      let inTradingSession = false
      for (const session of sessions) {
        if (session.type === 'continuous' || session.type === 'call_auction') {
          if (currentTimeStr >= session.start && currentTimeStr <= session.end) {
            inTradingSession = true
            break
          }
        }
      }

      if (!inTradingSession) {
        return new Response(JSON.stringify({ 
          error: `当前非交易时间，${tradingHours.market_name}交易时间请参考交易时间配置`, 
          code: 1007 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // 4. 获取审核规则
    const { data: approvalRule } = await supabaseClient
      .from('approval_rules')
      .select('*')
      .eq('trade_type', tradeTypeName)
      .eq('status', true)
      .single()

    // 5. 获取交易规则
    const { data: tradeRule } = await supabaseClient
      .from('trade_rules')
      .select('config')
      .eq('rule_type', tradeTypeName)
      .eq('status', true)
      .single()

    const amount = price * quantity
    let feeAmount = 0

    // 计算手续费
    const { data: feeRule } = await supabaseClient
      .from('trade_rules')
      .select('config')
      .eq('rule_type', '手续费')
      .eq('status', true)
      .single()

    if (feeRule) {
      const feeConfig = feeRule.config as any
      const rate = trade_type === 'SELL' ? (feeConfig.卖出费率 || 0) + (feeConfig.印花税 || 0) : (feeConfig.买入费率 || 0)
      feeAmount = Math.max(amount * rate, feeConfig.最低收费 || 5)
    }

    // 6. 交易规则校验
    if (tradeRule) {
      const config = tradeRule.config as any
      const marketKey = market_type === 'A股' || market_type === 'A_SHARE' ? 'A股' : '港股'
      
      if (trade_type === 'BLOCK_TRADE') {
        // 大宗交易：根据市场类型检查最低数量和金额
        const minQuantityKey = `${marketKey}最低数量`
        const minAmountKey = `${marketKey}最低金额`
        
        if (config[minQuantityKey] && quantity < config[minQuantityKey]) {
          return new Response(JSON.stringify({ 
            error: `${marketKey}大宗交易最低数量为 ${config[minQuantityKey]} 股`, 
            code: 1103 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        if (config[minAmountKey] && amount < config[minAmountKey]) {
          return new Response(JSON.stringify({ 
            error: `${marketKey}大宗交易最低金额为 ${config[minAmountKey]} 元`, 
            code: 1104 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      } else if (trade_type === 'IPO') {
        // 新股申购：A股需持有市值，港股可融资认购
        // 简化校验：检查基本申购限制
        const minQuantity = config.最低申购数量 || 100
        const maxQuantity = config.最高申购数量 || 1000000
        
        if (quantity < minQuantity) {
          return new Response(JSON.stringify({ 
            error: `新股申购最低数量为 ${minQuantity} 股`, 
            code: 1101 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        if (quantity > maxQuantity) {
          return new Response(JSON.stringify({ 
            error: `新股申购最高数量为 ${maxQuantity} 股`, 
            code: 1102 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      } else if (trade_type === 'LIMIT_UP') {
        if (config.单笔最大数量 && quantity > config.单笔最大数量) {
          return new Response(JSON.stringify({ 
            error: `涨停打板单笔最大数量为 ${config.单笔最大数量} 股`, 
            code: 1105 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      }
    }

    // 获取最小交易单位配置
    const { data: unitRule } = await supabaseClient
      .from('trade_rules')
      .select('config')
      .eq('rule_type', '最小交易单位')
      .eq('status', true)
      .single()

    const minUnit = unitRule?.config?.[market_type === 'A股' || market_type === 'A_SHARE' ? 'A股' : '港股'] || 100

    // A股数量限制（使用配置）
    if ((market_type === 'A股' || market_type === 'A_SHARE') && trade_type !== 'IPO' && quantity % minUnit !== 0) {
      return new Response(JSON.stringify({ error: `A股交易数量必须为${minUnit}股的整数倍`, code: 1008 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 港股价格变动单位校验
    const isHongKong = market_type === '港股' || market_type === 'HK' || market_type === 'HK_SHARE'
    if (isHongKong && price > 0) {
      const { data: priceTickRule } = await supabaseClient
        .from('trade_rules')
        .select('config')
        .eq('rule_type', '港股价格变动单位')
        .eq('status', true)
        .single()

      if (priceTickRule?.config?.价位表) {
        const tickTable = priceTickRule.config.价位表 as Array<{ 价格范围: string; 最小变动: string }>
        
        // 根据价格找到对应的最小变动价位
        let minTick = 0.01 // 默认值
        for (const tick of tickTable) {
          const range = tick.价格范围
          const match = range.match(/(\d+\.?\d*)-(\d+\.?\d*)港元/)
          if (match) {
            const low = parseFloat(match[1])
            const high = parseFloat(match[2])
            if (price >= low && price < high) {
              minTick = parseFloat(tick.最小变动)
              break
            }
          }
        }

        // 检查价格是否符合最小变动价位
        const priceDecimals = (price.toString().split('.')[1] || '').length
        const tickDecimals = (minTick.toString().split('.')[1] || '').length
        
        if (priceDecimals > tickDecimals || (price * Math.pow(10, tickDecimals)) % (minTick * Math.pow(10, tickDecimals)) !== 0) {
          return new Response(JSON.stringify({ 
            error: `港股价格 ${price} 不符合最小变动价位 ${minTick} 港元`, 
            code: 1009 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      }
    }

    // 7. 获取资产信息
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (assetsError) throw assetsError

    const isBuy = ['BUY', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP'].includes(trade_type)

    // 8. 校验余额或持仓
    if (isBuy) {
      const totalCost = amount + feeAmount
      if (Number(assets.available_balance) < totalCost) {
        return new Response(JSON.stringify({ 
          error: `余额不足，需要 ${totalCost.toFixed(2)} 元（含手续费 ${feeAmount.toFixed(2)} 元）`, 
          code: 1001 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    } else {
      const { data: position } = await supabaseClient
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('stock_code', stock_code)
        .single()

      if (!position || position.available_quantity < quantity) {
        return new Response(JSON.stringify({ error: '持仓不足', code: 1002 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // 9. 判断是否需要审核
    let needApproval = false
    let needAdminLevel = 'admin'

    if (approvalRule) {
      const autoApproveEnabled = approvalRule.auto_approve_enabled
      const autoApproveThreshold = approvalRule.auto_approve_threshold as any
      const manualReviewConditions = approvalRule.manual_review_conditions as any
      needAdminLevel = approvalRule.reviewer_level_required || 'admin'

      if (!autoApproveEnabled) {
        // 未启用自动审核，所有订单都需要人工审核
        needApproval = true
      } else {
        // 检查是否超出自动审核阈值
        const exceedsAmount = autoApproveThreshold.max_amount && amount > autoApproveThreshold.max_amount
        const exceedsQuantity = autoApproveThreshold.max_quantity && quantity > autoApproveThreshold.max_quantity
        
        if (exceedsAmount || exceedsQuantity) {
          needApproval = true
        }

        // 检查是否满足人工审核条件
        if (manualReviewConditions) {
          if (manualReviewConditions.amount_above && amount > manualReviewConditions.amount_above) {
            needApproval = true
          }
          if (manualReviewConditions.all) {
            needApproval = true
          }
        }
      }
    }

    // 10. 冻结资金或持仓
    if (isBuy) {
      const totalCost = amount + feeAmount
      const { error: freezeError } = await supabaseClient
        .from('assets')
        .update({ 
          available_balance: Number(assets.available_balance) - totalCost,
          frozen_balance: Number(assets.frozen_balance) + totalCost 
        })
        .eq('user_id', userId)
      if (freezeError) throw freezeError
    } else {
      const { data: position } = await supabaseClient
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('stock_code', stock_code)
        .single()
      
      const { error: freezeError } = await supabaseClient
        .from('positions')
        .update({ 
          available_quantity: position.available_quantity - quantity 
        })
        .eq('user_id', userId)
        .eq('stock_code', stock_code)
      if (freezeError) throw freezeError
    }

    // 11. 记录订单
    const { data: trade, error: tradeError } = await supabaseClient
      .from('trades')
      .insert({
        user_id: userId,
        market_type,
        trade_type,
        stock_code,
        stock_name,
        price,
        quantity,
        leverage,
        fee: feeAmount,
        need_approval: needApproval,
        approval_status: needApproval ? 'PENDING' : null,
        status: needApproval ? 'PENDING' : 'MATCHING',
        metadata: {
          ...metadata,
          user_level: userLevel,
          bypass_trading_hours: bypassTradingHours,
          bypass_price_limit: bypassPriceLimit
        }
      })
      .select()
      .single()

    if (tradeError) throw tradeError

    // 12. 进入撮合池（需审核的订单不进入）
    if (!needApproval) {
      const { error: poolError } = await supabaseClient
        .from('trade_match_pool')
        .insert({
          trade_id: trade.id,
          user_id: userId,
          market_type,
          trade_type: isBuy ? 'BUY' : 'SELL',
          stock_code,
          price,
          quantity,
          status: 'MATCHING'
        })

      if (poolError) throw poolError
    }

    // 13. 响应
    const response = { 
      success: true, 
      trade: { ...trade, transactionId: transaction_id }, 
      status: needApproval ? 'PENDING_APPROVAL' : 'MATCHING',
      message: needApproval ? 
        `订单已提交，等待${needAdminLevel === 'super_admin' ? '超级管理员' : '管理员'}审核` : 
        '订单已进入撮合池',
      auto_approved: !needApproval,
      reviewer_level_required: needAdminLevel,
      cache_until: Date.now() + 300000
    };
    
    if (transaction_id) {
      transactionCache.set(transaction_id, {
        timestamp: Date.now(),
        response: response
      });
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('交易错误:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
