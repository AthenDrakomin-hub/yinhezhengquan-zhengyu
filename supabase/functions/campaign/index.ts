/**
 * 运营活动服务 Edge Function
 * 功能：
 * 1. 获取活动列表
 * 2. 参与活动
 * 3. 获取活动详情
 * 4. 管理员：创建/编辑/管理活动
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
    let user = null
    let isAdmin = false

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (!authError && authUser) {
        user = authUser
        
        // 检查是否为管理员
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('admin_level')
          .eq('id', authUser.id)
          .single()
        
        isAdmin = profile?.admin_level === 'admin' || profile?.admin_level === 'super_admin'
      }
    }

    // 解析请求参数
    const body = await req.json().catch(() => ({}))
    const { action, ...params } = body

    // 根据action处理不同请求
    switch (action) {
      case 'list':
        return await listCampaigns(supabaseClient, params)
      case 'detail':
        return await getCampaignDetail(supabaseClient, params.campaign_id)
      case 'participate':
        if (!user) return errorResponse('请先登录', 401)
        return await participateCampaign(supabaseClient, user.id, params.campaign_id, params.data)
      case 'my_participations':
        if (!user) return errorResponse('请先登录', 401)
        return await getMyParticipations(supabaseClient, user.id)
      
      // 管理员操作
      case 'admin_list':
        if (!isAdmin) return errorResponse('无权限', 403)
        return await adminListCampaigns(supabaseClient, params)
      case 'admin_create':
        if (!isAdmin) return errorResponse('无权限', 403)
        return await adminCreateCampaign(supabaseClient, params)
      case 'admin_update':
        if (!isAdmin) return errorResponse('无权限', 403)
        return await adminUpdateCampaign(supabaseClient, params)
      case 'admin_delete':
        if (!isAdmin) return errorResponse('无权限', 403)
        return await adminDeleteCampaign(supabaseClient, params.campaign_id)
      case 'admin_stats':
        if (!isAdmin) return errorResponse('无权限', 403)
        return await adminGetStats(supabaseClient, params.campaign_id)
      case 'admin_give_reward':
        if (!isAdmin) return errorResponse('无权限', 403)
        return await adminGiveReward(supabaseClient, params)
      
      default:
        return await listCampaigns(supabaseClient, params)
    }

  } catch (error: any) {
    console.error('运营活动服务错误:', error)
    return errorResponse(error.message || '服务失败，请稍后重试')
  }
})

/**
 * 获取活动列表（用户端）
 * 使用 Supabase client，并捕获 schema cache 错误返回空列表
 */
async function listCampaigns(supabaseClient: any, params: any) {
  const now = new Date().toISOString()
  
  try {
    let query = supabaseClient
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('start_time', now)
      .gte('end_time', now)
      .order('created_at', { ascending: false })

    if (params.type) {
      query = query.eq('type', params.type)
    }

    const { data, error } = await query

    // 如果是 schema cache 错误，返回空列表
    if (error) {
      if (error.message?.includes('schema cache')) {
        console.log('campaigns 表不在 schema cache 中，返回空列表')
        return successResponse({ campaigns: [] })
      }
      console.error('获取活动列表失败:', error)
      return errorResponse('获取活动列表失败: ' + error.message)
    }

    return successResponse({ campaigns: data || [] })
  } catch (error: any) {
    // 如果是 schema cache 错误，返回空列表
    if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
      console.log('campaigns 表不可用，返回空列表')
      return successResponse({ campaigns: [] })
    }
    console.error('获取活动列表失败:', error)
    return errorResponse('获取活动列表失败: ' + error.message)
  }
}

/**
 * 获取活动详情
 */
async function getCampaignDetail(supabaseClient: any, campaignId: string) {
  if (!campaignId) {
    return errorResponse('活动ID不能为空')
  }

  const { data, error } = await supabaseClient
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (error || !data) {
    return errorResponse('活动不存在')
  }

  return successResponse({
    campaign: data
  })
}

/**
 * 参与活动
 */
async function participateCampaign(supabaseClient: any, userId: string, campaignId: string, participationData: any) {
  if (!campaignId) {
    return errorResponse('活动ID不能为空')
  }

  // 获取活动信息
  const { data: campaign, error: campaignError } = await supabaseClient
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    return errorResponse('活动不存在')
  }

  // 检查活动状态
  if (campaign.status !== 'active') {
    return errorResponse('活动未开始或已结束')
  }

  const now = new Date()
  if (now < new Date(campaign.start_time) || now > new Date(campaign.end_time)) {
    return errorResponse('活动不在有效期内')
  }

  // 检查参与人数限制
  if (campaign.max_participants > 0 && campaign.participant_count >= campaign.max_participants) {
    return errorResponse('活动参与人数已达上限')
  }

  // 检查是否已参与
  const { data: existing } = await supabaseClient
    .from('campaign_participations')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return errorResponse('您已参与过此活动')
  }

  // 检查VIP限制
  if (campaign.vip_only || campaign.min_vip_level > 1) {
    const { data: userVip } = await supabaseClient
      .from('user_vip')
      .select('current_level')
      .eq('user_id', userId)
      .single()

    if (!userVip || userVip.current_level < campaign.min_vip_level) {
      return errorResponse(`此活动仅限VIP${campaign.min_vip_level}及以上用户参与`)
    }
  }

  // 创建参与记录
  const { data: participation, error: insertError } = await supabaseClient
    .from('campaign_participations')
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      participation_data: participationData || {}
    })
    .select()
    .single()

  if (insertError) {
    return errorResponse('参与活动失败')
  }

  // 更新参与人数
  await supabaseClient
    .from('campaigns')
    .update({
      participant_count: campaign.participant_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)

  // 自动发放奖励（如果配置为自动）
  if (campaign.reward_config?.auto_reward) {
    await giveReward(supabaseClient, userId, campaign, participation.id)
  }

  return successResponse({
    message: '参与成功',
    participation: participation
  })
}

/**
 * 获取用户参与的活动
 */
async function getMyParticipations(supabaseClient: any, userId: string) {
  const { data, error } = await supabaseClient
    .from('campaign_participations')
    .select(`
      *,
      campaign:campaigns (
        id,
        name,
        campaign_type,
        status,
        end_time
      )
    `)
    .eq('user_id', userId)
    .order('participated_at', { ascending: false })
    .limit(50)

  if (error) {
    return errorResponse('获取参与记录失败')
  }

  return successResponse({
    participations: data || []
  })
}

/**
 * 管理员：获取活动列表
 */
async function adminListCampaigns(supabaseClient: any, params: any) {
  let query = supabaseClient
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.type) {
    query = query.eq('campaign_type', params.type)
  }

  const { data, error } = await query

  if (error) {
    return errorResponse('获取活动列表失败')
  }

  return successResponse({
    campaigns: data || []
  })
}

/**
 * 管理员：创建活动
 */
async function adminCreateCampaign(supabaseClient: any, params: any) {
  const {
    name, description, image_url, campaign_type,
    start_time, end_time, rules, reward_type, reward_value,
    reward_config, max_participants, max_per_user,
    vip_only, min_vip_level
  } = params

  if (!name || !campaign_type || !start_time || !end_time) {
    return errorResponse('缺少必要参数')
  }

  const { data, error } = await supabaseClient
    .from('campaigns')
    .insert({
      name,
      description,
      image_url,
      campaign_type,
      start_time,
      end_time,
      rules: rules || {},
      reward_type: reward_type || 'points',
      reward_value,
      reward_config: reward_config || {},
      max_participants: max_participants || -1,
      max_per_user: max_per_user || 1,
      vip_only: vip_only || false,
      min_vip_level: min_vip_level || 1,
      status: 'draft'
    })
    .select()
    .single()

  if (error) {
    return errorResponse('创建活动失败')
  }

  return successResponse({
    message: '活动创建成功',
    campaign: data
  })
}

/**
 * 管理员：更新活动
 */
async function adminUpdateCampaign(supabaseClient: any, params: any) {
  const { campaign_id, ...updates } = params

  if (!campaign_id) {
    return errorResponse('活动ID不能为空')
  }

  const { data, error } = await supabaseClient
    .from('campaigns')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaign_id)
    .select()
    .single()

  if (error) {
    return errorResponse('更新活动失败')
  }

  return successResponse({
    message: '活动更新成功',
    campaign: data
  })
}

/**
 * 管理员：删除活动
 */
async function adminDeleteCampaign(supabaseClient: any, campaignId: string) {
  if (!campaignId) {
    return errorResponse('活动ID不能为空')
  }

  const { error } = await supabaseClient
    .from('campaigns')
    .delete()
    .eq('id', campaignId)

  if (error) {
    return errorResponse('删除活动失败')
  }

  return successResponse({
    message: '活动已删除'
  })
}

/**
 * 管理员：获取活动统计
 */
async function adminGetStats(supabaseClient: any, campaignId: string) {
  if (!campaignId) {
    return errorResponse('活动ID不能为空')
  }

  const { data: campaign } = await supabaseClient
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  const { data: participations } = await supabaseClient
    .from('campaign_participations')
    .select('*')
    .eq('campaign_id', campaignId)

  const stats = {
    total_participants: participations?.length || 0,
    rewarded_count: participations?.filter(p => p.reward_received).length || 0,
    pending_count: participations?.filter(p => !p.reward_received).length || 0,
    by_vip_level: {} as Record<number, number>
  }

  // 按VIP等级统计
  for (const p of (participations || [])) {
    // 需要关联user_vip表获取VIP等级
  }

  return successResponse({
    campaign,
    stats
  })
}

/**
 * 管理员：发放奖励
 */
async function adminGiveReward(supabaseClient: any, params: any) {
  const { participation_id, reward_type, reward_value } = params

  if (!participation_id) {
    return errorResponse('参与记录ID不能为空')
  }

  const { data: participation } = await supabaseClient
    .from('campaign_participations')
    .select('*')
    .eq('id', participation_id)
    .single()

  if (!participation) {
    return errorResponse('参与记录不存在')
  }

  if (participation.reward_received) {
    return errorResponse('奖励已发放')
  }

  const { data: campaign } = await supabaseClient
    .from('campaigns')
    .select('*')
    .eq('id', participation.campaign_id)
    .single()

  const actualRewardType = reward_type || campaign.reward_type
  const actualRewardValue = reward_value || campaign.reward_value

  // 发放奖励
  await giveReward(supabaseClient, participation.user_id, campaign, participation_id, actualRewardType, actualRewardValue)

  return successResponse({
    message: '奖励发放成功'
  })
}

/**
 * 发放奖励
 */
async function giveReward(
  supabaseClient: any,
  userId: string,
  campaign: any,
  participationId: string,
  rewardType?: string,
  rewardValue?: number
) {
  const type = rewardType || campaign.reward_type
  const value = rewardValue || campaign.reward_value

  // 更新参与记录
  await supabaseClient
    .from('campaign_participations')
    .update({
      reward_received: true,
      reward_type: type,
      reward_value: value,
      reward_given_at: new Date().toISOString()
    })
    .eq('id', participationId)

  // 根据奖励类型发放
  if (type === 'points' && value) {
    // 发放积分
    const { data: userVip } = await supabaseClient
      .from('user_vip')
      .select('current_points, total_points')
      .eq('user_id', userId)
      .single()

    if (userVip) {
      await supabaseClient
        .from('user_vip')
        .update({
          current_points: userVip.current_points + value,
          total_points: userVip.total_points + value,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    }

    // 记录积分流水
    await supabaseClient
      .from('point_records')
      .insert({
        user_id: userId,
        points: value,
        source_type: 'ACTIVITY',
        source_id: participationId,
        description: `活动奖励: ${campaign.name}`
      })
  }

  // 更新活动统计
  await supabaseClient
    .from('campaigns')
    .update({
      reward_given_count: campaign.reward_given_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaign.id)
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
