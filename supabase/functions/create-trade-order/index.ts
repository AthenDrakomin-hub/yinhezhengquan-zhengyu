import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 交易幂等性检查表（内存缓存，生产环境应使用Redis）
const transactionCache = new Map<string, { timestamp: number, response: any }>();
const CACHE_TTL = 300000; // 5分钟缓存

// 清理过期缓存
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of transactionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      transactionCache.delete(key);
    }
  }
}

// 定期清理缓存
setInterval(cleanupCache, 60000); // 每分钟清理一次

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
      leverage = 1,
      transaction_id, // 幂等性标识
      metadata = {}
    } = await req.json()

    // 幂等性检查
    if (transaction_id) {
      // 检查是否已处理过此交易
      const cachedResult = transactionCache.get(transaction_id);
      if (cachedResult) {
        console.log(`幂等性检查: 交易 ${transaction_id} 已处理，返回缓存结果`);
        return new Response(JSON.stringify(cachedResult.response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

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
        if (config.allocation_per_account && quantity > config.allocation_per_account) {
          return new Response(JSON.stringify({ error: `新股每户配售上限为 ${config.allocation_per_account}股，当前申购数量为${quantity}股，超出配售限制`, code: 1104 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        if (config.lock_period_days && config.lock_period_days > 0) {
          // 这里可以记录锁定期信息
        }
      } else if (trade_type === 'BLOCK_TRADE') {
        if (quantity < config.min_quantity) {
          return new Response(JSON.stringify({ error: `大宗交易需满足最低${config.min_quantity}股起买，当前委托数量为${quantity}股，不符合规则`, code: 1103 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        if (config.max_single_order && quantity > config.max_single_order) {
          return new Response(JSON.stringify({ error: `大宗交易单笔最大限额为${config.max_single_order}股，当前委托数量为${quantity}股，超出规则限制`, code: 1106 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        if (config.need_admin_confirm && config.need_admin_confirm === true) {
          // 标记需要管理员确认的订单
        }
        if (config.commission_fee_rate) {
          // 计算佣金费用
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
        if (config.frequency_limit_per_minute) {
          // 这里可以实现频率限制逻辑
        }
        if (config.daily_order_limit) {
          // 这里可以实现日订单限制逻辑
        }
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

    // 幂等性响应缓存
    const response = { 
      success: true, 
      trade: { ...trade, transactionId: transaction_id }, 
      status: 'MATCHING',
      cache_until: Date.now() + 300000 // 响应的有效时间
    };
    
    if (transaction_id) {
      transactionCache.set(transaction_id, {
        timestamp: Date.now(),
        response: response
      });
      console.log(`交易 ${transaction_id} 已缓存，防止重复提交`);
    }

    return new Response(JSON.stringify(response), {
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