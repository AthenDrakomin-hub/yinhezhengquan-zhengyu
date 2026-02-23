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
          return new Response(JSON.stringify({ error: `新股申购最低数量为 ${config.min_apply_quantity}`, code: 1101 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        if (amount > config.max_apply_amount) {
          return new Response(JSON.stringify({ error: `新股申购最高金额为 ${config.max_apply_amount}`, code: 1102 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      } else if (trade_type === 'BLOCK_TRADE') {
        if (quantity < config.min_quantity) {
          return new Response(JSON.stringify({ error: `大宗交易最低起买量为 ${config.min_quantity}`, code: 1103 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      } else if (trade_type === 'DERIVATIVES') {
        if (leverage < config.min_leverage || leverage > config.max_leverage) {
          return new Response(JSON.stringify({ error: `衍生品杠杆需在 ${config.min_leverage}-${config.max_leverage} 倍之间`, code: 1104 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      }
    }

    // 2. 风险等级校验
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('risk_level')
      .eq('id', userId)
      .single()

    if (market_type === 'DERIVATIVES' && (!profile || profile.risk_level < 'C4')) {
      return new Response(JSON.stringify({ error: '风险等级不足，无法进行衍生品交易', code: 1002 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
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
