/**
 * 资产快照服务
 * 用于记录和查询用户资产历史数据
 */
import { supabase } from '@/lib/supabase';

export interface AssetSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_equity: number;
  available_balance: number;
  frozen_balance: number;
  market_value: number;
  daily_profit: number;
  daily_profit_rate: number;
  total_profit?: number;
  total_profit_rate?: number;
  holdings_snapshot: Array<{
    symbol: string;
    name: string;
    quantity: number;
    available_quantity: number;
    average_price: number;
    current_price: number;
    market_value: number;
  }>;
  created_at: string;
}

export interface AssetHistoryData {
  date: string;
  equity: number;
  balance: number;
  profit: number;
  profitRate?: number;
}

/**
 * 获取用户资产历史数据
 */
export async function getAssetHistory(days: number = 30): Promise<AssetHistoryData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('asset_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  if (error) throw error;

  return (data || []).map(snapshot => ({
    date: snapshot.snapshot_date,
    equity: snapshot.total_equity,
    balance: snapshot.available_balance,
    profit: snapshot.daily_profit,
    profitRate: snapshot.daily_profit_rate
  }));
}

/**
 * 获取资产快照详情
 */
export async function getAssetSnapshots(options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AssetSnapshot[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  let query = supabase
    .from('asset_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: false });

  if (options?.startDate) {
    query = query.gte('snapshot_date', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('snapshot_date', options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

/**
 * 获取最新资产快照
 */
export async function getLatestSnapshot(): Promise<AssetSnapshot | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('asset_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * 手动记录资产快照
 */
export async function recordSnapshot(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 调用数据库函数记录快照
  const { error } = await supabase.rpc('record_daily_asset_snapshot', {
    p_user_id: user.id
  });

  if (error) throw error;
}

/**
 * 获取资产统计摘要
 */
export async function getAssetSummary(): Promise<{
  totalEquity: number;
  totalProfit: number;
  totalProfitRate: number;
  avgDailyProfit: number;
  maxDailyProfit: number;
  maxDailyLoss: number;
  profitableDays: number;
  lossDays: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('asset_snapshots')
    .select('total_equity, daily_profit, daily_profit_rate')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: false })
    .limit(30);

  if (error) throw error;

  if (!data || data.length === 0) {
    return {
      totalEquity: 0,
      totalProfit: 0,
      totalProfitRate: 0,
      avgDailyProfit: 0,
      maxDailyProfit: 0,
      maxDailyLoss: 0,
      profitableDays: 0,
      lossDays: 0
    };
  }

  const profits = data.map(d => d.daily_profit || 0);
  const profitRates = data.map(d => d.daily_profit_rate || 0);
  
  return {
    totalEquity: data[0]?.total_equity || 0,
    totalProfit: profits.reduce((a, b) => a + b, 0),
    totalProfitRate: profitRates.reduce((a, b) => a + b, 0),
    avgDailyProfit: profits.reduce((a, b) => a + b, 0) / profits.length,
    maxDailyProfit: Math.max(...profits),
    maxDailyLoss: Math.min(...profits),
    profitableDays: profits.filter(p => p > 0).length,
    lossDays: profits.filter(p => p < 0).length
  };
}

/**
 * 获取盈亏归因分析
 */
export async function getProfitAttribution(): Promise<{
  topGainers: Array<{ symbol: string; name: string; profit: number }>;
  topLosers: Array<{ symbol: string; name: string; profit: number }>;
  totalFees: number;
  totalInterest: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 获取最新快照中的持仓数据
  const latestSnapshot = await getLatestSnapshot();
  
  if (!latestSnapshot || !latestSnapshot.holdings_snapshot) {
    return {
      topGainers: [],
      topLosers: [],
      totalFees: 0,
      totalInterest: 0
    };
  }

  // 计算每个持仓的盈亏
  const holdingsWithProfit = latestSnapshot.holdings_snapshot.map(h => ({
    symbol: h.symbol,
    name: h.name,
    profit: (h.current_price - h.average_price) * h.quantity
  }));

  // 排序
  const sorted = [...holdingsWithProfit].sort((a, b) => b.profit - a.profit);

  return {
    topGainers: sorted.slice(0, 5),
    topLosers: sorted.slice(-5).reverse(),
    totalFees: 0, // 需要从交易记录计算
    totalInterest: 0 // 需要从资金流水计算
  };
}

export default {
  getAssetHistory,
  getAssetSnapshots,
  getLatestSnapshot,
  recordSnapshot,
  getAssetSummary,
  getProfitAttribution
};
