/**
 * 用户VIP服务 Edge Function
 * 功能：
 * 1. 获取用户VIP信息
 * 2. 获取VIP等级配置
 * 3. 计算升级进度
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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY') ?? ''
    )

    // 验证用户身份
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('未登录', 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return errorResponse('用户身份验证失败', 401)
    }

    // 解析请求参数
    const body = await req.json().catch(() => ({}))
    const { action } = body

    // 根据action处理不同请求
    switch (action) {
      case 'get_vip_levels':
        return await getVipLevels(supabaseClient)
      case 'get_my_vip':
        return await getMyVip(supabaseClient, user.id)
      case 'get_benefits':
        return await getVipBenefits(supabaseClient, user.id)
      default:
        return await getMyVip(supabaseClient, user.id)
    }

  } catch (error: any) {
    console.error('VIP服务错误:', error)
    return errorResponse(error.message || '服务失败，请稍后重试')
  }
})

/**
 * 获取VIP等级配置
 */
async function getVipLevels(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from('vip_levels')
    .select('*')
    .eq('is_active', true)
    .order('level', { ascending: true })

  if (error) {
    return errorResponse('获取VIP等级配置失败')
  }

  return successResponse({
    levels: data || []
  })
}

/**
 * 获取用户VIP信息
 */
async function getMyVip(supabaseClient: any, userId: string) {
  // 获取用户VIP信息
  let { data: userVip, error } = await supabaseClient
    .from('user_vip')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // 如果没有记录，创建初始记录
  if (!userVip) {
    const { data: newVip, error: createError } = await supabaseClient
      .from('user_vip')
      .insert({
        user_id: userId,
        current_level: 1,
        current_points: 0,
        total_points: 0,
        total_trades: 0,
        total_assets: 0
      })
      .select()
      .single()

    if (createError) {
      return errorResponse('初始化VIP信息失败')
    }
    userVip = newVip
  }

  // 获取当前等级配置
  const { data: currentLevelConfig } = await supabaseClient
    .from('vip_levels')
    .select('*')
    .eq('level', userVip.current_level)
    .single()

  // 获取下一等级配置
  const { data: nextLevelConfig } = await supabaseClient
    .from('vip_levels')
    .select('*')
    .gt('level', userVip.current_level)
    .eq('is_active', true)
    .order('level', { ascending: true })
    .limit(1)
    .maybeSingle()

  // 计算升级进度
  let progressPercent = 100
  let nextLevel = null

  if (nextLevelConfig) {
    nextLevel = nextLevelConfig
    
    // 计算各维度进度，取最大值
    const pointsProgress = (userVip.total_points / nextLevelConfig.required_points) * 100
    const tradesProgress = (userVip.total_trades / nextLevelConfig.required_trades) * 100
    const assetsProgress = (Number(userVip.total_assets) / Number(nextLevelConfig.required_assets)) * 100
    
    progressPercent = Math.min(100, Math.max(pointsProgress, tradesProgress, assetsProgress))
  }

  // 检查是否需要重置月度权益
  const currentMonth = new Date().getMonth() + 1
  if (userVip.last_reset_month !== currentMonth) {
    await supabaseClient
      .from('user_vip')
      .update({
        monthly_condition_orders_used: 0,
        last_reset_month: currentMonth,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    userVip.monthly_condition_orders_used = 0
  }

  return successResponse({
    vip: {
      ...userVip,
      level_config: currentLevelConfig,
      next_level: nextLevel,
      progress_percent: Math.round(progressPercent * 100) / 100
    }
  })
}

/**
 * 获取VIP权益使用情况
 */
async function getVipBenefits(supabaseClient: any, userId: string) {
  // 获取用户VIP信息
  const { data: userVip } = await supabaseClient
    .from('user_vip')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!userVip) {
    return successResponse({
      benefits: {
        condition_orders: { used: 0, limit: 3 },
        ipo_priority: 0,
        level2_quote: false,
        exclusive_service: false
      }
    })
  }

  // 获取等级配置
  const { data: levelConfig } = await supabaseClient
    .from('vip_levels')
    .select('*')
    .eq('level', userVip.current_level)
    .single()

  return successResponse({
    benefits: {
      condition_orders: {
        used: userVip.monthly_condition_orders_used || 0,
        limit: levelConfig?.condition_order_limit || 3
      },
      fee_discount: levelConfig?.fee_discount || 1.0,
      ipo_priority: levelConfig?.ipo_priority || 0,
      level2_quote: levelConfig?.level2_quote || false,
      exclusive_service: levelConfig?.exclusive_service || false,
      withdrawal_limit: levelConfig?.withdrawal_limit || 100000
    }
  })
}

function successResponse(data: any) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, code: number = 400) {
  return new Response(JSON.stringify({ success: false, error: message, code }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: code,
  })
}
