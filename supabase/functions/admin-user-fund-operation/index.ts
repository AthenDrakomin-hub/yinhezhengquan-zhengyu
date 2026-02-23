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

    // 校验操作者权限
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: operatorProfile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (operatorProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: '权限不足', code: 1001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { target_user_id, operate_type, amount, remark } = await req.json()

    // 获取目标用户资产
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('available_balance, total_asset')
      .eq('user_id', target_user_id)
      .single()

    if (assetsError) throw assetsError

    const isRecharge = operate_type === 'RECHARGE'
    const newBalance = isRecharge ? Number(assets.available_balance) + amount : Number(assets.available_balance) - amount
    const newTotal = isRecharge ? Number(assets.total_asset) + amount : Number(assets.total_asset) - amount

    if (!isRecharge && newBalance < 0) {
      throw new Error('余额不足以扣减')
    }

    // 更新资产
    const { error: updateError } = await supabaseClient
      .from('assets')
      .update({ 
        available_balance: newBalance,
        total_asset: newTotal
      })
      .eq('user_id', target_user_id)

    if (updateError) throw updateError

    // 记录审计日志
    await supabaseClient.from('admin_operation_logs').insert({
      admin_id: user.id,
      operate_type,
      target_user_id,
      operate_content: { amount, remark, oldBalance: assets.available_balance, newBalance },
      ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')
    })

    return new Response(JSON.stringify({ success: true, newBalance }), {
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
