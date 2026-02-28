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

    const { 
      market_type, 
      trade_type, 
      stock_code, 
      stock_name, 
      price, 
      quantity, 
      leverage = 1 
    } = await req.json()

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const userId = user.id
    const amount = price * quantity

    // 1. 交易规则校验
    const { data: rule } = await supabaseClient
      .from('trade_rules')
      .select('config')
      .eq('rule_type', trade_type)
      .single()

    if (rule) {
      const config = rule.config
      if (trade_type === 'IPO') {
        if (quantity < config.min_apply_quantity) {
          return new Response(JSON.stringify({ error: `新股申购最低数量为 ${config.min_apply_quantity}股，当前申购数量为${quantity}股，不符合规则`, code: 1101 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        if (amount > config.max_apply_amount) {
          return new Response(JSON.stringify({ error: `新股申购最高金额为 ${config.max_apply_amount}元，当前申购金额为${amount}元，超出规则限制`, code: 1102 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      } else if (trade_type === 'BLOCK_TRADE') {
        if (quantity < config.min_quantity) {
          return new Response(JSON.stringify({ error: `大宗交易需满足最低${config.min_quantity}股起买，当前委托数量为${quantity}股，不符合规则`, code: 1103 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      } else if (trade_type === 'LIMIT_UP') {
        // 涨停打板规则校验
        if (config.max_single_order && quantity > config.max_single_order) {
          return new Response(JSON.stringify({ error: `涨停打板单次最大报单数量为${config.max_single_order}股，当前报单数量为${quantity}股，超出规则限制`, code: 1105 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        // 触发阈值校验（需要前端传递当前涨幅，这里简化处理）
        // 实际应用中，需要获取当前股票价格和涨幅进行校验
      }
    }

    // 2. 获取资产信息
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (assetsError) throw assetsError

    const isBuy = ['BUY', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP'].includes(trade_type)

    // 3. 校验余额
    if (isBuy && Number(assets.available_balance) < amount) {
      return new Response(JSON.stringify({ error: '余额不足', code: 1003 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 4. 执行交易逻辑 (进入撮合池)
    // 冻结资金 (如果是买入)
    if (isBuy) {
      const { error: freezeError } = await supabaseClient
        .from('assets')
        .update({ 
          available_balance: Number(assets.available_balance) - amount,
          frozen_balance: Number(assets.frozen_balance) + amount 
        })
        .eq('user_id', userId)
      if (freezeError) throw freezeError
    }

    // 5. 记录订单 (状态为 MATCHING)
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
        status: 'MATCHING'
      })
      .select()
      .single()

    if (tradeError) throw tradeError

    // 6. 进入撮合池
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

    return new Response(JSON.stringify({ success: true, trade, status: 'MATCHING' }), {
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
