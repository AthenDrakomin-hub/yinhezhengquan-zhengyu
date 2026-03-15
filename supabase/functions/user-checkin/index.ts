/**
 * 签到积分服务 Edge Function
 * 功能：
 * 1. 用户签到
 * 2. 获取签到记录
 * 3. 获取积分记录
 * 4. 积分兑换
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
    const { action, ...params } = body

    // 根据action处理不同请求
    switch (action) {
      case 'checkin':
        return await handleCheckin(supabaseClient, user.id)
      case 'get_checkin_status':
        return await getCheckinStatus(supabaseClient, user.id)
      case 'get_checkin_records':
        return await getCheckinRecords(supabaseClient, user.id, params.month)
      case 'get_point_records':
        return await getPointRecords(supabaseClient, user.id, params.limit)
      case 'get_point_goods':
        return await getPointGoods(supabaseClient)
      case 'redeem_goods':
        return await redeemGoods(supabaseClient, user.id, params.goods_id)
      case 'get_redemptions':
        return await getRedemptions(supabaseClient, user.id)
      default:
        return await getCheckinStatus(supabaseClient, user.id)
    }

  } catch (error: any) {
    console.error('签到积分服务错误:', error)
    return errorResponse(error.message || '服务失败，请稍后重试')
  }
})

/**
 * 处理签到
 */
async function handleCheckin(supabaseClient: any, userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // 检查今日是否已签到
  const { data: todayCheckin } = await supabaseClient
    .from('user_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('checkin_date', today)
    .maybeSingle()

  if (todayCheckin) {
    return errorResponse('今日已签到')
  }

  // 获取昨日签到记录
  const { data: yesterdayCheckin } = await supabaseClient
    .from('user_checkins')
    .select('consecutive_days, total_days')
    .eq('user_id', userId)
    .eq('checkin_date', yesterday)
    .maybeSingle()

  let consecutiveDays = 1
  let totalDays = 1

  if (yesterdayCheckin) {
    consecutiveDays = yesterdayCheckin.consecutive_days + 1
    totalDays = yesterdayCheckin.total_days + 1
  } else {
    // 获取累计签到天数
    const { data: lastCheckin } = await supabaseClient
      .from('user_checkins')
      .select('total_days')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastCheckin) {
      totalDays = lastCheckin.total_days + 1
    }
  }

  // 获取签到配置
  const { data: config } = await supabaseClient
    .from('checkin_config')
    .select('*')
    .eq('consecutive_days', consecutiveDays)
    .eq('is_active', true)
    .maybeSingle()

  let pointsEarned = 10
  let bonusMultiplier = 1.0

  if (config) {
    pointsEarned = config.bonus_points
    bonusMultiplier = config.bonus_multiplier
  } else {
    // 默认积分规则：基础10 + 连续天数额外奖励
    pointsEarned = 10 + Math.min(consecutiveDays - 1, 40)
  }

  // 连续签到额外奖励
  let extraBonus = 0
  if (consecutiveDays === 7) extraBonus = 50
  else if (consecutiveDays === 14) extraBonus = 100
  else if (consecutiveDays === 30) extraBonus = 500

  const totalPoints = pointsEarned + extraBonus

  // 1. 插入签到记录
  const { error: insertError } = await supabaseClient
    .from('user_checkins')
    .insert({
      user_id: userId,
      checkin_date: today,
      consecutive_days: consecutiveDays,
      total_days: totalDays,
      points_earned: totalPoints,
      bonus_multiplier: bonusMultiplier
    })

  if (insertError) {
    return errorResponse('签到失败')
  }

  // 2. 更新用户积分
  await supabaseClient
    .from('user_vip')
    .upsert({
      user_id: userId,
      current_points: totalPoints,
      total_points: totalPoints
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })

  await supabaseClient
    .from('user_vip')
    .update({
      current_points: supabaseClient.rpc('increment_points', { amount: totalPoints }),
      total_points: supabaseClient.rpc('increment_total_points', { amount: totalPoints }),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  // 简化更新
  const { data: currentVip } = await supabaseClient
    .from('user_vip')
    .select('current_points, total_points')
    .eq('user_id', userId)
    .single()

  if (currentVip) {
    await supabaseClient
      .from('user_vip')
      .update({
        current_points: (currentVip.current_points || 0) + totalPoints,
        total_points: (currentVip.total_points || 0) + totalPoints,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
  }

  // 3. 记录积分流水
  await supabaseClient
    .from('point_records')
    .insert({
      user_id: userId,
      points: totalPoints,
      source_type: 'SIGN_IN',
      description: `签到奖励: 连续${consecutiveDays}天${extraBonus > 0 ? `，额外奖励${extraBonus}积分` : ''}`
    })

  return successResponse({
    message: '签到成功',
    points_earned: totalPoints,
    consecutive_days: consecutiveDays,
    total_days: totalDays,
    bonus_multiplier: bonusMultiplier,
    extra_bonus: extraBonus
  })
}

/**
 * 获取签到状态
 */
async function getCheckinStatus(supabaseClient: any, userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // 今日是否已签到
  const { data: todayCheckin } = await supabaseClient
    .from('user_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('checkin_date', today)
    .maybeSingle()

  // 获取最新签到记录
  const { data: lastCheckin } = await supabaseClient
    .from('user_checkins')
    .select('*')
    .eq('user_id', userId)
    .order('checkin_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 获取签到配置
  const { data: configs } = await supabaseClient
    .from('checkin_config')
    .select('*')
    .eq('is_active', true)
    .order('consecutive_days', { ascending: true })

  return successResponse({
    today_checked_in: !!todayCheckin,
    consecutive_days: lastCheckin?.consecutive_days || 0,
    total_days: lastCheckin?.total_days || 0,
    today_points: todayCheckin?.points_earned || 0,
    configs: configs || []
  })
}

/**
 * 获取签到记录
 */
async function getCheckinRecords(supabaseClient: any, userId: string, month?: string) {
  const year = new Date().getFullYear()
  const monthNum = month ? parseInt(month) : new Date().getMonth() + 1
  
  const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
  const endDate = monthNum === 12 
    ? `${year + 1}-01-01` 
    : `${year}-${String(monthNum + 1).padStart(2, '0')}-01`

  const { data, error } = await supabaseClient
    .from('user_checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('checkin_date', startDate)
    .lt('checkin_date', endDate)
    .order('checkin_date', { ascending: true })

  if (error) {
    return errorResponse('获取签到记录失败')
  }

  return successResponse({
    records: data || [],
    month: monthNum,
    year: year
  })
}

/**
 * 获取积分记录
 */
async function getPointRecords(supabaseClient: any, userId: string, limit: number = 50) {
  const { data, error } = await supabaseClient
    .from('point_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return errorResponse('获取积分记录失败')
  }

  return successResponse({
    records: data || []
  })
}

/**
 * 获取积分商品
 */
async function getPointGoods(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from('point_goods')
    .select('*')
    .eq('status', 'active')
    .order('points_required', { ascending: true })

  if (error) {
    return errorResponse('获取积分商品失败')
  }

  return successResponse({
    goods: data || []
  })
}

/**
 * 兑换商品
 */
async function redeemGoods(supabaseClient: any, userId: string, goodsId: string) {
  if (!goodsId) {
    return errorResponse('商品ID不能为空')
  }

  // 获取商品信息
  const { data: goods, error: goodsError } = await supabaseClient
    .from('point_goods')
    .select('*')
    .eq('id', goodsId)
    .eq('status', 'active')
    .single()

  if (goodsError || !goods) {
    return errorResponse('商品不存在或已下架')
  }

  // 检查库存
  if (goods.stock > 0) {
    // 需要检查库存逻辑（使用事务或原子操作）
  }

  // 获取用户积分
  const { data: userVip } = await supabaseClient
    .from('user_vip')
    .select('current_points')
    .eq('user_id', userId)
    .single()

  if (!userVip || userVip.current_points < goods.points_required) {
    return errorResponse('积分不足')
  }

  // 检查兑换次数限制
  if (goods.max_per_user > 0) {
    const { data: redemptions } = await supabaseClient
      .from('point_redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('goods_id', goodsId)

    if (redemptions && redemptions.length >= goods.max_per_user) {
      return errorResponse('已达到兑换上限')
    }
  }

  // 1. 扣减积分
  await supabaseClient
    .from('user_vip')
    .update({
      current_points: userVip.current_points - goods.points_required,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  // 2. 创建兑换记录
  const { data: redemption, error: redeemError } = await supabaseClient
    .from('point_redemptions')
    .insert({
      user_id: userId,
      goods_id: goodsId,
      goods_name: goods.name,
      points_spent: goods.points_required,
      status: 'completed'
    })
    .select()
    .single()

  if (redeemError) {
    // 回滚积分
    await supabaseClient
      .from('user_vip')
      .update({
        current_points: userVip.current_points,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    return errorResponse('兑换失败')
  }

  // 3. 更新库存
  if (goods.stock > 0) {
    await supabaseClient
      .from('point_goods')
      .update({
        stock: goods.stock - 1,
        status: goods.stock - 1 <= 0 ? 'sold_out' : 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', goodsId)
  }

  // 4. 记录积分流水
  await supabaseClient
    .from('point_records')
    .insert({
      user_id: userId,
      points: -goods.points_required,
      source_type: 'REDEEM',
      source_id: redemption.id,
      description: `兑换商品: ${goods.name}`
    })

  return successResponse({
    message: '兑换成功',
    redemption: redemption,
    goods: {
      name: goods.name,
      type: goods.goods_type,
      value: goods.goods_value
    }
  })
}

/**
 * 获取兑换记录
 */
async function getRedemptions(supabaseClient: any, userId: string) {
  const { data, error } = await supabaseClient
    .from('point_redemptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return errorResponse('获取兑换记录失败')
  }

  return successResponse({
    redemptions: data || []
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
