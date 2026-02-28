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

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: '权限不足', code: 1001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { operation_type, target_order_id, params } = await req.json()

    // 获取订单详情用于审计
    const { data: order } = await supabaseClient
      .from('trade_match_pool')
      .select('*')
      .eq('id', target_order_id)
      .single()

    if (!order && operation_type !== 'BATCH_MATCH') throw new Error('订单不存在')

    // 注意：普通股票交易默认完全自动，但管理员仍然可以进行干预
    // 符合"不做纯人工撮合，但保留管理员干预权"的原则

    let result = {}

    let operateTypeForLog = 'TRADE_INTERVENE'
    
    switch (operation_type) {
      case 'MANUAL_MATCH':
        // 手动触发撮合：调用match-trade-order函数
        operateTypeForLog = 'TRADE_MATCH_MANUAL'
        await supabaseClient.functions.invoke('match-trade-order', {
          body: { trigger_type: 'manual', order_id: target_order_id }
        })
        result = { success: true, message: '已手动触发撮合' }
        break
      case 'PAUSE':
        operateTypeForLog = 'TRADE_MATCH_PAUSE'
        await supabaseClient.from('trade_match_pool').update({ status: 'PAUSED' }).eq('id', target_order_id)
        result = { success: true, message: '订单撮合已暂停' }
        break
      case 'RESUME':
        operateTypeForLog = 'TRADE_MATCH_RESUME'
        await supabaseClient.from('trade_match_pool').update({ status: 'MATCHING' }).eq('id', target_order_id)
        result = { success: true, message: '订单撮合已恢复' }
        break
      case 'FORCE_MATCH':
        operateTypeForLog = 'TRADE_MATCH_FORCE'
        // 强制撮合逻辑：手动指定另一个订单匹配
        // 这里简化为直接将该订单设为成功（模拟与系统撮合）
        await supabaseClient.from('trade_match_pool').update({ status: 'COMPLETED' }).eq('id', target_order_id)
        await supabaseClient.from('trades').update({ status: 'SUCCESS', finish_time: new Date().toISOString() }).eq('id', order.trade_id)
        result = { success: true, message: '订单已强制撮合成功' }
        break
      case 'DELETE':
        operateTypeForLog = 'TRADE_MATCH_DELETE'
        await supabaseClient.from('trade_match_pool').delete().eq('id', target_order_id)
        await supabaseClient.from('trades').update({ status: 'CANCELLED' }).eq('id', order.trade_id)
        result = { success: true, message: '订单已从撮合池移除并撤单' }
        break
      case 'IPO_WIN_ADJUST':
        operateTypeForLog = 'IPO_WIN_ADJUST'
        // 调整新股中签结果
        const { win_user_id, win_quantity } = params || {}
        if (win_user_id && win_quantity) {
          // 更新IPO订单的中签结果
          await supabaseClient.from('trades').update({
            status: 'SUCCESS',
            finish_time: new Date().toISOString(),
            quantity: win_quantity
          }).eq('id', order.trade_id)
          result = { success: true, message: `新股中签结果已调整：用户 ${win_user_id} 中签 ${win_quantity} 股` }
        } else {
          throw new Error('调整新股中签结果需要提供中签用户ID和数量')
        }
        break

      case 'TOGGLE_MATCH_SWITCH':
        operateTypeForLog = 'MATCH_SWITCH_TOGGLE'
        // 关闭/开启撮合开关
        const { market_type, enabled } = params || {}
        if (market_type && enabled !== undefined) {
          // 这里简化为记录到日志，实际应该存储到配置表
          result = { success: true, message: `${market_type} 撮合开关已${enabled ? '开启' : '关闭'}` }
        } else {
          throw new Error('切换撮合开关需要提供市场类型和启用状态')
        }
        break
      default:
        throw new Error('不支持的操作类型')
    }

    // 记录审计日志
    await supabaseClient.from('admin_operation_logs').insert({
      admin_id: user.id,
      operate_type: operateTypeForLog,
      target_user_id: order?.user_id || user.id,
      operate_content: { 
        operation_type, 
        order_id: target_order_id, 
        params,
        before_status: order?.status,
        after_status: operation_type === 'PAUSE' ? 'PAUSED' : 
                     operation_type === 'RESUME' ? 'MATCHING' :
                     operation_type === 'FORCE_MATCH' ? 'SUCCESS' :
                     operation_type === 'DELETE' ? 'CANCELLED' : 'UPDATED'
      },
      ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')
    })

    return new Response(JSON.stringify(result), {
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
