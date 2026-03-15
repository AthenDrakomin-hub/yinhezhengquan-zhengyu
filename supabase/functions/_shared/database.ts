/**
 * 数据库操作模块
 * 封装常用的数据库查询和事务操作
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import type { 
  UserAssets, 
  Position, 
  TradeRule, 
  ApprovalRule, 
  TradingHours,
  UserProfile 
} from './types.ts'
import { getOrSetCache, CacheTTL, deleteCache } from './cache.ts'

// 创建 Supabase 客户端
export function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY') ?? ''
  )
}

// ==================== 用户资产 ====================

/**
 * 获取用户资产
 */
export async function getUserAssets(
  supabase: any, 
  userId: string
): Promise<UserAssets | null> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('[数据库] 获取用户资产失败:', error)
    return null
  }
  
  return data
}

/**
 * 创建默认资产（新用户）
 */
export async function createDefaultAssets(
  supabase: any, 
  userId: string,
  initialBalance = 1000000
): Promise<UserAssets | null> {
  const { data, error } = await supabase
    .from('assets')
    .insert({
      user_id: userId,
      total_balance: initialBalance,
      available_balance: initialBalance,
      frozen_balance: 0,
      market_value: 0,
      total_assets: initialBalance
    })
    .select()
    .single()
  
  if (error) {
    console.error('[数据库] 创建默认资产失败:', error)
    return null
  }
  
  return data
}

/**
 * 冻结资金（RPC 调用，事务安全）
 */
export async function freezeFunds(
  supabase: any,
  userId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('freeze_user_funds', {
    p_user_id: userId,
    p_amount: amount
  })
  
  if (error) {
    console.error('[数据库] 冻结资金失败:', error)
    return { success: false, error: error.message || '冻结资金失败' }
  }
  
  return { success: data === true }
}

/**
 * 解冻资金
 */
export async function unfreezeFunds(
  supabase: any,
  userId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('unfreeze_user_funds', {
    p_user_id: userId,
    p_amount: amount
  })
  
  if (error) {
    console.error('[数据库] 解冻资金失败:', error)
    return { success: false, error: error.message || '解冻资金失败' }
  }
  
  return { success: data === true }
}

// ==================== 持仓管理 ====================

/**
 * 获取用户持仓
 */
export async function getPosition(
  supabase: any, 
  userId: string, 
  stockCode: string
): Promise<Position | null> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', stockCode)
    .maybeSingle()
  
  if (error) {
    console.error('[数据库] 获取持仓失败:', error)
    return null
  }
  
  return data
}

/**
 * 冻结持仓（RPC 调用，事务安全）
 */
export async function freezePosition(
  supabase: any,
  userId: string,
  stockCode: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('freeze_user_position', {
    p_user_id: userId,
    p_stock_code: stockCode,
    p_quantity: quantity
  })
  
  if (error) {
    console.error('[数据库] 冻结持仓失败:', error)
    return { success: false, error: error.message || '冻结持仓失败' }
  }
  
  return { success: data === true }
}

// ==================== 规则查询（带缓存） ====================

/**
 * 获取交易规则（带缓存）
 */
export async function getTradeRule(
  supabase: any, 
  ruleType: string
): Promise<TradeRule | null> {
  const cacheKey = `rule:trade:${ruleType}`
  
  return getOrSetCache(cacheKey, CacheTTL.TRADE_RULES, async () => {
    const { data, error } = await supabase
      .from('trade_rules')
      .select('*')
      .eq('rule_type', ruleType)
      .eq('status', true)
      .maybeSingle()
    
    if (error) {
      console.error('[数据库] 获取交易规则失败:', error)
      return null
    }
    
    return data
  })
}

/**
 * 获取审核规则（带缓存）
 */
export async function getApprovalRule(
  supabase: any, 
  tradeType: string
): Promise<ApprovalRule | null> {
  const cacheKey = `rule:approval:${tradeType}`
  
  return getOrSetCache(cacheKey, CacheTTL.APPROVAL_RULES, async () => {
    const { data, error } = await supabase
      .from('approval_rules')
      .select('*')
      .eq('trade_type', tradeType)
      .eq('status', true)
      .maybeSingle()
    
    if (error) {
      console.error('[数据库] 获取审核规则失败:', error)
      return null
    }
    
    return data
  })
}

/**
 * 获取交易时段（带缓存）
 */
export async function getTradingHours(
  supabase: any, 
  marketType: string
): Promise<TradingHours | null> {
  const cacheKey = `rule:hours:${marketType}`
  
  return getOrSetCache(cacheKey, CacheTTL.TRADING_HOURS, async () => {
    const { data, error } = await supabase
      .from('trading_hours')
      .select('*')
      .eq('market_type', marketType)
      .eq('status', true)
      .maybeSingle()
    
    if (error) {
      console.error('[数据库] 获取交易时段失败:', error)
      return null
    }
    
    return data
  })
}

/**
 * 清除规则缓存
 */
export async function clearRuleCache(ruleType: string): Promise<void> {
  await deleteCache(`rule:trade:${ruleType}`)
  await deleteCache(`rule:approval:${ruleType}`)
}

// ==================== 用户档案 ====================

/**
 * 获取用户档案
 */
export async function getUserProfile(
  supabase: any, 
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, level, role, admin_level')
    .eq('id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('[数据库] 获取用户档案失败:', error)
    return null
  }
  
  return data
}

// ==================== 订单创建 ====================

/**
 * 创建交易订单
 */
export async function createTradeOrder(
  supabase: any,
  params: {
    userId: string
    marketType: string
    tradeType: string
    stockCode: string
    stockName: string
    price: number
    quantity: number
    leverage: number
    fee: number
    needApproval: boolean
    approvalStatus?: string
    status: string
    metadata?: Record<string, any>
  }
): Promise<{ success: boolean; order?: any; error?: string }> {
  const { data, error } = await supabase
    .from('trades')
    .insert({
      user_id: params.userId,
      market_type: params.marketType,
      trade_type: params.tradeType,
      stock_code: params.stockCode,
      stock_name: params.stockName,
      price: params.price,
      quantity: params.quantity,
      leverage: params.leverage,
      fee: params.fee,
      need_approval: params.needApproval,
      approval_status: params.approvalStatus || null,
      status: params.status,
      metadata: params.metadata || {}
    })
    .select()
    .single()
  
  if (error) {
    console.error('[数据库] 创建订单失败:', error)
    return { success: false, error: '创建订单失败' }
  }
  
  return { success: true, order: data }
}

/**
 * 加入撮合池
 */
export async function addToMatchPool(
  supabase: any,
  params: {
    tradeId: string
    userId: string
    marketType: string
    tradeType: string
    stockCode: string
    price: number
    quantity: number
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('trade_match_pool')
    .insert({
      trade_id: params.tradeId,
      user_id: params.userId,
      market_type: params.marketType,
      trade_type: params.tradeType,
      stock_code: params.stockCode,
      price: params.price,
      quantity: params.quantity,
      status: 'MATCHING'
    })
  
  if (error) {
    console.error('[数据库] 加入撮合池失败:', error)
    return { success: false, error: '加入撮合池失败' }
  }
  
  return { success: true }
}
