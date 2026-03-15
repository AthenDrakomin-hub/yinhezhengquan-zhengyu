/**
 * 数据报表 Edge Function
 * 功能：用户统计、交易统计、资产统计、收入统计、运营统计
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, errorResponse, optionsResponse, verifyAdminAccess } from './_shared/mod.ts';

Deno.serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  try {
    // 验证管理员权限（所有报表操作都需要管理员权限）
    const authResult = await verifyAdminAccess(req);
    if (!authResult.isValid) {
      return authResult.error!;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'dashboard':
        return await handleDashboard(supabase, body);
      
      case 'user_stats':
        return await handleUserStats(supabase, body);
      
      case 'trade_stats':
        return await handleTradeStats(supabase, body);
      
      case 'asset_stats':
        return await handleAssetStats(supabase, body);
      
      case 'revenue_stats':
        return await handleRevenueStats(supabase, body);
      
      case 'vip_stats':
        return await handleVipStats(supabase);
      
      case 'campaign_stats':
        return await handleCampaignStats(supabase, body);
      
      case 'points_stats':
        return await handlePointsStats(supabase);
      
      case 'export_users':
        return await handleExportUsers(supabase, body);
      
      case 'export_trades':
        return await handleExportTrades(supabase, body);
      
      case 'export_assets':
        return await handleExportAssets(supabase, body);
      
      default:
        return errorResponse('无效的操作', 400);
    }
  } catch (error) {
    console.error('数据报表错误:', error);
    return errorResponse('服务器错误', 500);
  }
});

/**
 * 获取仪表盘数据
 */
async function handleDashboard(supabase: any, body: any) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 并行获取各项统计
  const [
    userCount,
    todayNewUsers,
    todayActiveUsers,
    tradeCount,
    todayTrades,
    tradeVolume,
    todayVolume,
    assetTotal,
    vipCount,
    todayPointsIssued
  ] = await Promise.all([
    // 总用户数
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    // 今日新增用户
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today),
    // 今日活跃用户
    supabase.from('user_sessions').select('user_id', { count: 'exact', head: true }).gte('last_active', today),
    // 总交易数
    supabase.from('trades').select('id', { count: 'exact', head: true }),
    // 今日交易数
    supabase.from('trades').select('id', { count: 'exact', head: true }).gte('created_at', today),
    // 总交易金额
    supabase.from('trades').select('amount'),
    // 今日交易金额
    supabase.from('trades').select('amount').gte('created_at', today),
    // 总资产
    supabase.from('user_portfolio').select('total_value'),
    // VIP用户数
    supabase.from('user_vip').select('user_id', { count: 'exact', head: true }).gte('current_level', 2),
    // 今日发放积分
    supabase.from('points_transactions').select('points').gte('created_at', today).eq('type', 'earn')
  ]);

  // 计算总交易金额
  const totalVolume = tradeVolume.data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
  const todayVolumeSum = todayVolume.data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
  const totalAssets = assetTotal.data?.reduce((sum: number, a: any) => sum + (a.total_value || 0), 0) || 0;
  const todayPoints = todayPointsIssued.data?.reduce((sum: number, p: any) => sum + (p.points || 0), 0) || 0;

  // 获取最近7天趋势数据
  const { data: dailyUsers } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', weekAgo);

  const { data: dailyTrades } = await supabase
    .from('trades')
    .select('created_at, amount')
    .gte('created_at', weekAgo);

  // 按日期分组
  const userTrend: Record<string, number> = {};
  const tradeTrend: Record<string, { count: number; volume: number }> = {};

  dailyUsers?.forEach((u: any) => {
    const date = u.created_at.split('T')[0];
    userTrend[date] = (userTrend[date] || 0) + 1;
  });

  dailyTrades?.forEach((t: any) => {
    const date = t.created_at.split('T')[0];
    if (!tradeTrend[date]) {
      tradeTrend[date] = { count: 0, volume: 0 };
    }
    tradeTrend[date].count++;
    tradeTrend[date].volume += t.amount || 0;
  });

  return jsonResponse({
    success: true,
    dashboard: {
      users: {
        total: userCount.count || 0,
        today_new: todayNewUsers.count || 0,
        today_active: todayActiveUsers.count || 0
      },
      trades: {
        total: tradeCount.count || 0,
        today: todayTrades.count || 0,
        total_volume: totalVolume,
        today_volume: todayVolumeSum
      },
      assets: {
        total: totalAssets
      },
      vip: {
        total: vipCount.count || 0
      },
      points: {
        today_issued: todayPoints
      },
      trends: {
        users: userTrend,
        trades: tradeTrend
      }
    }
  });
}

/**
 * 用户统计
 */
async function handleUserStats(supabase: any, body: any) {
  const { start_date, end_date, group_by = 'day' } = body;
  
  const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end_date || new Date().toISOString().split('T')[0];

  // 用户增长趋势
  const { data: newUsers } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59');

  // 用户活跃度
  const { data: activeUsers } = await supabase
    .from('user_sessions')
    .select('user_id, last_active')
    .gte('last_active', startDate)
    .lte('last_active', endDate + 'T23:59:59');

  // 用户分布
  const { data: userDevices } = await supabase
    .from('user_devices')
    .select('device_type');

  const { data: userRegions } = await supabase
    .from('profiles')
    .select('region');

  // 按时间分组
  const groupFn = group_by === 'month' 
    ? (d: string) => d.slice(0, 7) 
    : (d: string) => d.split('T')[0];

  const newUsersByDate: Record<string, number> = {};
  const activeUsersByDate: Record<string, Set<string>> = {};

  newUsers?.forEach((u: any) => {
    const key = groupFn(u.created_at);
    newUsersByDate[key] = (newUsersByDate[key] || 0) + 1;
  });

  activeUsers?.forEach((u: any) => {
    const key = groupFn(u.last_active);
    if (!activeUsersByDate[key]) {
      activeUsersByDate[key] = new Set();
    }
    activeUsersByDate[key].add(u.user_id);
  });

  // 设备分布
  const deviceDistribution: Record<string, number> = {};
  userDevices?.forEach((d: any) => {
    deviceDistribution[d.device_type || 'unknown'] = (deviceDistribution[d.device_type || 'unknown'] || 0) + 1;
  });

  // 地区分布
  const regionDistribution: Record<string, number> = {};
  userRegions?.forEach((r: any) => {
    regionDistribution[r.region || 'unknown'] = (regionDistribution[r.region || 'unknown'] || 0) + 1;
  });

  return jsonResponse({
    success: true,
    stats: {
      new_users_trend: newUsersByDate,
      active_users_trend: Object.fromEntries(
        Object.entries(activeUsersByDate).map(([k, v]) => [k, v.size])
      ),
      device_distribution: deviceDistribution,
      region_distribution: regionDistribution,
      total_new_users: newUsers?.length || 0,
      total_active_users: new Set(activeUsers?.map((u: any) => u.user_id)).size || 0
    }
  });
}

/**
 * 交易统计
 */
async function handleTradeStats(supabase: any, body: any) {
  const { start_date, end_date, group_by = 'day' } = body;
  
  const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end_date || new Date().toISOString().split('T')[0];

  // 交易数据
  const { data: trades } = await supabase
    .from('trades')
    .select('created_at, amount, trade_type, symbol, status')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59');

  // 按时间分组
  const groupFn = group_by === 'month' 
    ? (d: string) => d.slice(0, 7) 
    : (d: string) => d.split('T')[0];

  const tradesByDate: Record<string, { count: number; volume: number; buy: number; sell: number }> = {};
  const tradesByType: Record<string, number> = {};
  const tradesBySymbol: Record<string, { count: number; volume: number }> = {};

  trades?.forEach((t: any) => {
    const dateKey = groupFn(t.created_at);
    if (!tradesByDate[dateKey]) {
      tradesByDate[dateKey] = { count: 0, volume: 0, buy: 0, sell: 0 };
    }
    tradesByDate[dateKey].count++;
    tradesByDate[dateKey].volume += t.amount || 0;
    if (t.trade_type === 'buy') {
      tradesByDate[dateKey].buy++;
    } else if (t.trade_type === 'sell') {
      tradesByDate[dateKey].sell++;
    }

    // 按交易类型
    tradesByType[t.trade_type] = (tradesByType[t.trade_type] || 0) + 1;

    // 按股票
    if (t.symbol) {
      if (!tradesBySymbol[t.symbol]) {
        tradesBySymbol[t.symbol] = { count: 0, volume: 0 };
      }
      tradesBySymbol[t.symbol].count++;
      tradesBySymbol[t.symbol].volume += t.amount || 0;
    }
  });

  // 排序热门股票
  const hotStocks = Object.entries(tradesBySymbol)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([symbol, data]) => ({ symbol, ...data }));

  return jsonResponse({
    success: true,
    stats: {
      trades_trend: tradesByDate,
      trades_by_type: tradesByType,
      hot_stocks: hotStocks,
      total_trades: trades?.length || 0,
      total_volume: trades?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0,
      total_buy: trades?.filter((t: any) => t.trade_type === 'buy').length || 0,
      total_sell: trades?.filter((t: any) => t.trade_type === 'sell').length || 0
    }
  });
}

/**
 * 资产统计
 */
async function handleAssetStats(supabase: any, body: any) {
  // 用户资产分布
  const { data: portfolios } = await supabase
    .from('user_portfolio')
    .select('total_value, cash_balance, stock_value, fund_value, wealth_value');

  // 持仓分布
  const { data: holdings } = await supabase
    .from('user_holdings')
    .select('symbol, quantity, market_value');

  // 资产规模分布
  const assetRanges = [
    { label: '1万以下', min: 0, max: 10000 },
    { label: '1-5万', min: 10000, max: 50000 },
    { label: '5-10万', min: 50000, max: 100000 },
    { label: '10-50万', min: 100000, max: 500000 },
    { label: '50万以上', min: 500000, max: Infinity }
  ];

  const assetDistribution = assetRanges.map(range => ({
    label: range.label,
    count: portfolios?.filter((p: any) => p.total_value >= range.min && p.total_value < range.max).length || 0
  }));

  // 持仓分布
  const holdingDistribution: Record<string, { quantity: number; value: number }> = {};
  holdings?.forEach((h: any) => {
    if (!holdingDistribution[h.symbol]) {
      holdingDistribution[h.symbol] = { quantity: 0, value: 0 };
    }
    holdingDistribution[h.symbol].quantity += h.quantity || 0;
    holdingDistribution[h.symbol].value += h.market_value || 0;
  });

  // 总资产
  const totalAssets = portfolios?.reduce((sum: number, p: any) => sum + (p.total_value || 0), 0) || 0;
  const totalCash = portfolios?.reduce((sum: number, p: any) => sum + (p.cash_balance || 0), 0) || 0;
  const totalStock = portfolios?.reduce((sum: number, p: any) => sum + (p.stock_value || 0), 0) || 0;
  const totalFund = portfolios?.reduce((sum: number, p: any) => sum + (p.fund_value || 0), 0) || 0;
  const totalWealth = portfolios?.reduce((sum: number, p: any) => sum + (p.wealth_value || 0), 0) || 0;

  return jsonResponse({
    success: true,
    stats: {
      total_assets: totalAssets,
      asset_composition: {
        cash: totalCash,
        stock: totalStock,
        fund: totalFund,
        wealth: totalWealth
      },
      asset_distribution: assetDistribution,
      top_holdings: Object.entries(holdingDistribution)
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 20)
        .map(([symbol, data]) => ({ symbol, ...data })),
      avg_assets_per_user: portfolios?.length ? totalAssets / portfolios.length : 0
    }
  });
}

/**
 * 收入统计
 */
async function handleRevenueStats(supabase: any, body: any) {
  const { start_date, end_date } = body;
  
  const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end_date || new Date().toISOString().split('T')[0];

  // 手续费收入
  const { data: trades } = await supabase
    .from('trades')
    .select('created_at, fee')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59');

  // 其他收入
  const { data: transactions } = await supabase
    .from('transactions')
    .select('created_at, type, amount')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59');

  // 按日期汇总
  const revenueByDate: Record<string, { fee: number; other: number }> = {};
  
  trades?.forEach((t: any) => {
    const date = t.created_at.split('T')[0];
    if (!revenueByDate[date]) {
      revenueByDate[date] = { fee: 0, other: 0 };
    }
    revenueByDate[date].fee += t.fee || 0;
  });

  transactions?.forEach((t: any) => {
    const date = t.created_at.split('T')[0];
    if (!revenueByDate[date]) {
      revenueByDate[date] = { fee: 0, other: 0 };
    }
    revenueByDate[date].other += t.amount || 0;
  });

  const totalFee = trades?.reduce((sum: number, t: any) => sum + (t.fee || 0), 0) || 0;
  const totalOther = transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

  return jsonResponse({
    success: true,
    stats: {
      revenue_trend: revenueByDate,
      total_fee_revenue: totalFee,
      total_other_revenue: totalOther,
      total_revenue: totalFee + totalOther
    }
  });
}

/**
 * VIP统计
 */
async function handleVipStats(supabase: any) {
  // VIP等级分布
  const { data: vipDistribution } = await supabase
    .from('user_vip')
    .select('current_level');

  const levelDistribution: Record<number, number> = {};
  vipDistribution?.forEach((v: any) => {
    levelDistribution[v.current_level] = (levelDistribution[v.current_level] || 0) + 1;
  });

  // VIP权益使用
  const { data: vipUsage } = await supabase
    .from('vip_benefit_usage')
    .select('benefit_type, used_at')
    .gte('used_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const benefitUsage: Record<string, number> = {};
  vipUsage?.forEach((u: any) => {
    benefitUsage[u.benefit_type] = (benefitUsage[u.benefit_type] || 0) + 1;
  });

  // 升级统计
  const { count: upgradesThisMonth } = await supabase
    .from('vip_upgrade_history')
    .select('*', { count: 'exact', head: true })
    .gte('upgraded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return jsonResponse({
    success: true,
    stats: {
      level_distribution: levelDistribution,
      total_vip_users: vipDistribution?.length || 0,
      vip_penetration: vipDistribution?.filter((v: any) => v.current_level >= 2).length || 0,
      benefit_usage: benefitUsage,
      upgrades_this_month: upgradesThisMonth || 0
    }
  });
}

/**
 * 活动统计
 */
async function handleCampaignStats(supabase: any, body: any) {
  const { campaign_id } = body;

  if (campaign_id) {
    // 单个活动统计
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    const { data: participations } = await supabase
      .from('campaign_participations')
      .select('*')
      .eq('campaign_id', campaign_id);

    return jsonResponse({
      success: true,
      stats: {
        campaign,
        total_participants: participations?.length || 0,
        reward_given: participations?.filter((p: any) => p.reward_received).length || 0,
        participation_trend: {}
      }
    });
  }

  // 所有活动统计
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, campaign_type, status, participant_count, reward_given_count');

  const { data: allParticipations } = await supabase
    .from('campaign_participations')
    .select('campaign_id, participated_at')
    .gte('participated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // 按活动类型统计
  const typeStats: Record<string, { count: number; participants: number }> = {};
  campaigns?.forEach((c: any) => {
    if (!typeStats[c.campaign_type]) {
      typeStats[c.campaign_type] = { count: 0, participants: 0 };
    }
    typeStats[c.campaign_type].count++;
    typeStats[c.campaign_type].participants += c.participant_count || 0;
  });

  return jsonResponse({
    success: true,
    stats: {
      total_campaigns: campaigns?.length || 0,
      active_campaigns: campaigns?.filter((c: any) => c.status === 'active').length || 0,
      type_distribution: typeStats,
      total_participations: allParticipations?.length || 0,
      campaigns
    }
  });
}

/**
 * 积分统计
 */
async function handlePointsStats(supabase: any) {
  // 积分发行与消耗
  const { data: pointsEarned } = await supabase
    .from('points_transactions')
    .select('points, type')
    .eq('type', 'earn');

  const { data: pointsSpent } = await supabase
    .from('points_transactions')
    .select('points, type')
    .eq('type', 'spend');

  // 按来源/用途分类
  const { data: pointsBySource } = await supabase
    .from('points_transactions')
    .select('source, points');

  const sourceDistribution: Record<string, number> = {};
  pointsBySource?.forEach((p: any) => {
    sourceDistribution[p.source || 'unknown'] = (sourceDistribution[p.source || 'unknown'] || 0) + Math.abs(p.points);
  });

  // 兑换统计
  const { data: exchanges } = await supabase
    .from('points_exchange')
    .select('product_id, quantity');

  const productExchanges: Record<string, number> = {};
  exchanges?.forEach((e: any) => {
    productExchanges[e.product_id] = (productExchanges[e.product_id] || 0) + e.quantity || 1;
  });

  const totalEarned = pointsEarned?.reduce((sum: number, p: any) => sum + (p.points || 0), 0) || 0;
  const totalSpent = pointsSpent?.reduce((sum: number, p: any) => sum + Math.abs(p.points || 0), 0) || 0;

  return jsonResponse({
    success: true,
    stats: {
      total_points_earned: totalEarned,
      total_points_spent: totalSpent,
      outstanding_points: totalEarned - totalSpent,
      source_distribution: sourceDistribution,
      total_exchanges: exchanges?.length || 0
    }
  });
}

/**
 * 导出用户数据
 */
async function handleExportUsers(supabase: any, body: any) {
  const { start_date, end_date } = body;
  
  let query = supabase
    .from('profiles')
    .select('id, email, phone, nickname, created_at, last_login, status');

  if (start_date) {
    query = query.gte('created_at', start_date);
  }
  if (end_date) {
    query = query.lte('created_at', end_date + 'T23:59:59');
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse('导出失败', 500);
  }

  return jsonResponse({
    success: true,
    data,
    count: data?.length || 0
  });
}

/**
 * 导出交易数据
 */
async function handleExportTrades(supabase: any, body: any) {
  const { start_date, end_date, user_id } = body;
  
  let query = supabase
    .from('trades')
    .select('id, user_id, symbol, trade_type, quantity, price, amount, fee, status, created_at');

  if (start_date) {
    query = query.gte('created_at', start_date);
  }
  if (end_date) {
    query = query.lte('created_at', end_date + 'T23:59:59');
  }
  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse('导出失败', 500);
  }

  return jsonResponse({
    success: true,
    data,
    count: data?.length || 0
  });
}

/**
 * 导出资产数据
 */
async function handleExportAssets(supabase: any, body: any) {
  const { min_value } = body;
  
  let query = supabase
    .from('user_portfolio')
    .select('user_id, total_value, cash_balance, stock_value, fund_value, wealth_value, updated_at');

  if (min_value) {
    query = query.gte('total_value', min_value);
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse('导出失败', 500);
  }

  return jsonResponse({
    success: true,
    data,
    count: data?.length || 0
  });
}
