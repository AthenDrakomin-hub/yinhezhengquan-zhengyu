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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: '权限不足', code: 1001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { operation, ...params } = await req.json()

    switch (operation) {
      case 'intervene_trade':
        return await interveneTrade(supabaseClient, user.id, params, req)
      case 'update_rules':
        return await updateTradeRules(supabaseClient, user.id, params, req)
      case 'fund_operation':
        return await fundOperation(supabaseClient, user.id, params, req)
      default:
        throw new Error('Invalid operation')
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function interveneTrade(supabase: any, adminId: string, params: any, req: Request) {
  const { operation_type, target_order_id } = params
  const { data: order } = await supabase.from('trade_match_pool').select('*').eq('id', target_order_id).single()
  if (!order && operation_type !== 'BATCH_MATCH') throw new Error('订单不存在')

  let result = {}
  let operateType = 'TRADE_INTERVENE'

  switch (operation_type) {
    case 'MANUAL_MATCH':
      operateType = 'TRADE_MATCH_MANUAL'
      await supabase.functions.invoke('match-trade-order', { body: { trigger_type: 'manual', order_id: target_order_id } })
      result = { success: true, message: '已手动触发撮合' }
      break
    case 'PAUSE':
      operateType = 'TRADE_MATCH_PAUSE'
      await supabase.from('trade_match_pool').update({ status: 'PAUSED' }).eq('id', target_order_id)
      result = { success: true, message: '订单撮合已暂停' }
      break
    case 'RESUME':
      operateType = 'TRADE_MATCH_RESUME'
      await supabase.from('trade_match_pool').update({ status: 'MATCHING' }).eq('id', target_order_id)
      result = { success: true, message: '订单撮合已恢复' }
      break
    case 'FORCE_MATCH':
      operateType = 'TRADE_MATCH_FORCE'
      await supabase.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', target_order_id)
      await supabase.from('trades').update({ status: 'SUCCESS', finish_time: new Date().toISOString() }).eq('id', order.trade_id)
      result = { success: true, message: '订单已强制撮合成功' }
      break
    case 'DELETE':
      operateType = 'TRADE_MATCH_DELETE'
      await supabase.from('trade_match_pool').delete().eq('id', target_order_id)
      await supabase.from('trades').update({ status: 'CANCELLED' }).eq('id', order.trade_id)
      result = { success: true, message: '订单已从撮合池移除并撤单' }
      break
    case 'IPO_WIN_ADJUST':
      operateType = 'IPO_WIN_ADJUST'
      const { win_user_id, win_quantity } = params
      if (win_user_id && win_quantity) {
        await supabase.from('trades').update({ status: 'SUCCESS', finish_time: new Date().toISOString(), quantity: win_quantity }).eq('id', order.trade_id)
        result = { success: true, message: `新股中签结果已调整：用户 ${win_user_id} 中签 ${win_quantity} 股` }
      } else {
        throw new Error('调整新股中签结果需要提供中签用户ID和数量')
      }
      break
    default:
      throw new Error('不支持的操作类型')
  }

  await supabase.from('admin_operation_logs').insert({
    admin_id: adminId,
    operate_type: operateType,
    target_user_id: order?.user_id || adminId,
    operate_content: { operation_type, order_id: target_order_id, params },
    ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')
  })

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function updateTradeRules(supabase: any, adminId: string, params: any, req: Request) {
  const { rule_type, config, status } = params
  const { data: oldRule } = await supabase.from('trade_rules').select('*').eq('rule_type', rule_type).single()

  const { data: rule, error } = await supabase.from('trade_rules').upsert({
    rule_type,
    config,
    status: status ?? true,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'rule_type' }).select().single()

  if (error) throw error

  await supabase.from('admin_operation_logs').insert({
    admin_id: adminId,
    operate_type: 'TRADE_RULE_UPDATE',
    target_user_id: adminId,
    operate_content: { rule_type, old_config: oldRule?.config, new_config: config },
    ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
  })

  return new Response(JSON.stringify({ success: true, rule }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function fundOperation(supabase: any, adminId: string, params: any, req: Request) {
  const { target_user_id, operate_type, amount, remark } = params
  const { data: assets, error: assetsError } = await supabase.from('assets').select('available_balance, total_asset').eq('user_id', target_user_id).single()
  if (assetsError) throw assetsError

  const isRecharge = operate_type === 'RECHARGE'
  const newBalance = isRecharge ? Number(assets.available_balance) + amount : Number(assets.available_balance) - amount
  const newTotal = isRecharge ? Number(assets.total_asset) + amount : Number(assets.total_asset) - amount

  if (!isRecharge && newBalance < 0) throw new Error('余额不足以扣减')

  const { error: updateError } = await supabase.from('assets').update({ 
    available_balance: newBalance,
    total_asset: newTotal
  }).eq('user_id', target_user_id)

  if (updateError) throw updateError

  await supabase.from('admin_operation_logs').insert({
    admin_id: adminId,
    operate_type,
    target_user_id,
    operate_content: { amount, remark, oldBalance: assets.available_balance, newBalance },
    ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')
  })

  return new Response(JSON.stringify({ success: true, newBalance }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
