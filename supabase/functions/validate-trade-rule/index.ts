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

    const { order_type, order_params } = await req.json()
    
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 1. 获取交易规则
    const { data: rule, error: ruleError } = await supabaseClient
      .from('trade_rules')
      .select('config, status')
      .eq('rule_type', order_type)
      .single()

    if (ruleError || !rule) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: `未找到 ${order_type} 类型的交易规则` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 检查规则是否启用
    if (!rule.status) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: `${order_type} 类型交易规则已禁用` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const config = rule.config
    const { quantity, leverage = 1, amount, price, trade_type } = order_params
    let isValid = true
    let errorMessage = ''

    // 2. 根据规则类型进行校验
    if (order_type === 'IPO') {
      if (quantity < config.min_apply_quantity) {
        isValid = false
        errorMessage = `新股申购最低数量为 ${config.min_apply_quantity}股，当前申购数量为${quantity}股，不符合规则`
      }
      if (amount > config.max_apply_amount) {
        isValid = false
        errorMessage = `新股申购最高金额为 ${config.max_apply_amount}元，当前申购金额为${amount}元，超出规则限制`
      }
      if (config.allocation_per_account && quantity > config.allocation_per_account) {
        isValid = false
        errorMessage = `新股每户配售上限为 ${config.allocation_per_account}股，当前申购数量为${quantity}股，超出配售限制`
      }
    } else if (order_type === 'BLOCK_TRADE') {
      if (quantity < config.min_quantity) {
        isValid = false
        errorMessage = `大宗交易需满足最低${config.min_quantity}股起买，当前委托数量为${quantity}股，不符合规则`
      }
      if (config.max_single_order && quantity > config.max_single_order) {
        isValid = false
        errorMessage = `大宗交易单笔最大限额为${config.max_single_order}股，当前委托数量为${quantity}股，超出规则限制`
      }
    } else if (order_type === 'LIMIT_UP') {
      if (config.max_single_order && quantity > config.max_single_order) {
        isValid = false
        errorMessage = `涨停打板单次最大报单数量为${config.max_single_order}股，当前报单数量为${quantity}股，超出规则限制`
      }
      if (config.trigger_threshold && price && config.trigger_threshold > 0) {
        // 假设传入的price是当前价格，我们需要知道涨跌幅来判断是否符合涨停板规则
        // 这里只是示例，实际应用中需要获取股票的基准价格
      }
      if (config.frequency_limit_per_minute && order_params.frequency_count > config.frequency_limit_per_minute) {
        isValid = false
        errorMessage = `涨停打板分钟频率限制为${config.frequency_limit_per_minute}次，当前已超限`
      }
      if (config.daily_order_limit && order_params.daily_count > config.daily_order_limit) {
        isValid = false
        errorMessage = `涨停打板日订单限制为${config.daily_order_limit}单，当前已超限`
      }
    } else if (order_type === 'GENERAL') {
      // 通用交易规则校验
      if (config.daily_loss_limit && order_params.daily_loss > config.daily_loss_limit) {
        isValid = false
        errorMessage = `日亏损限制为${config.daily_loss_limit}元，当前已超限`
      }
      if (config.risk_level_threshold && order_params.risk_level > config.risk_level_threshold) {
        isValid = false
        errorMessage = `风险等级阈值为${config.risk_level_threshold}，当前风险等级过高`
      }
      if (config.margin_call_threshold && order_params.asset_ratio < config.margin_call_threshold) {
        isValid = false
        errorMessage = `追保线为${config.margin_call_threshold}，当前资产比例过低`
      }
    }

    return new Response(JSON.stringify({ 
      valid: isValid,
      error: errorMessage || null,
      rule_type: order_type,
      checked_at: new Date().toISOString()
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