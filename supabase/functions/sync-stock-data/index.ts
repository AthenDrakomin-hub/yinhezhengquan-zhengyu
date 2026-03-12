/**
 * 股票数据定时同步 Edge Function
 * 
 * @module sync-stock-data
 * @description 同步股票基础数据，每日定时运行
 * 
 * 触发方式：
 * 1. pg_cron 定时任务
 * 2. 外部定时器（GitHub Actions、Vercel Cron）
 * 3. 手动触发
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import {
  // 响应
  jsonResponse,
  optionsResponse,
  
  // 缓存
  clearStockCache,
  clearMarketCache,
} from '../_shared/mod.ts'

// CORS 头
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 热门股票列表（默认同步）
const HOT_STOCKS = {
  CN: [
    '600519', '000858', '601318', '000001', '300750',
    '600036', '601166', '600887', '600276', '600900',
    '601398', '601288', '600000', '600016', '601988',
  ],
  HK: [
    '00700', '09988', '03690', '01810', '01024',
    '00941', '02318', '01299', '00883', '00388',
  ]
}

// ==================== 授权验证 ====================

function verifyAuth(req: Request): { authorized: boolean; source: string } {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey && apiKey.length > 10) {
    return { authorized: true, source: 'api-key' }
  }
  
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    return { authorized: true, source: 'jwt' }
  }
  
  const userAgent = req.headers.get('user-agent') || ''
  if (userAgent.includes('pg_cron') || userAgent.includes('pg_net')) {
    return { authorized: true, source: 'internal' }
  }
  
  const triggerSource = req.headers.get('x-trigger-source')
  if (triggerSource === 'scheduled') {
    return { authorized: true, source: 'cron' }
  }
  
  const host = req.headers.get('host') || ''
  if (host.includes('localhost')) {
    return { authorized: true, source: 'local' }
  }
  
  return { authorized: true, source: 'anonymous' }
}

// ==================== 数据获取 ====================

// 从东方财富获取股票信息
async function fetchStockFromEastmoney(symbol: string, market: 'CN' | 'HK') {
  try {
    const secid = market === 'HK' ? `116.${symbol}` : 
                  symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`
    
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f43,f169,f170,f46,f44,f51,f168,f47,f48,f60,f45,f52,f50,f49,f171`
    
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://quote.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data?.data) return null
    
    const d = data.data
    return {
      symbol,
      name: d.f58 || `股票${symbol}`,
      market: market === 'CN' ? 'CN' : 'HK',
      price: d.f43 / 100 || 0,
      change: d.f169 / 100 || 0,
      change_percent: d.f170 / 100 || 0,
      prev_close: d.f60 / 100 || 0,
      open: d.f46 / 100 || 0,
      high: d.f44 / 100 || 0,
      low: d.f51 / 100 || 0,
      volume: d.f47 || 0,
      amount: d.f48 || 0,
      pe: d.f162 || null,
      pb: d.f167 || null,
      total_mv: d.f116 || null,
    }
  } catch (error) {
    console.error(`获取 ${symbol} 数据失败:`, error)
    return null
  }
}

// ==================== 同步函数 ====================

async function syncStockInfo(supabase: any, symbol: string, market: 'CN' | 'HK') {
  const stockData = await fetchStockFromEastmoney(symbol, market)
  if (!stockData) return { success: false, symbol }
  
  const { error } = await supabase.from('stock_info').upsert({
    ...stockData,
    last_sync_at: new Date().toISOString(),
  }, { onConflict: 'symbol' })
  
  if (error) {
    console.error(`同步 ${symbol} 失败:`, error)
    return { success: false, symbol, error: error.message }
  }
  
  return { success: true, symbol, name: stockData.name }
}

// 同步热门股票列表
async function syncHotStocks(supabase: any) {
  const results = { total: 0, success: 0, failed: 0, details: [] as string[] }
  
  // 同步A股热门
  for (const symbol of HOT_STOCKS.CN) {
    const result = await syncStockInfo(supabase, symbol, 'CN')
    results.total++
    if (result.success) {
      results.success++
    } else {
      results.failed++
      results.details.push(`A股 ${symbol} 同步失败`)
    }
    // 延迟避免请求过快
    await new Promise(r => setTimeout(r, 100))
  }
  
  // 同步港股热门
  for (const symbol of HOT_STOCKS.HK) {
    const result = await syncStockInfo(supabase, symbol, 'HK')
    results.total++
    if (result.success) {
      results.success++
    } else {
      results.failed++
      results.details.push(`港股 ${symbol} 同步失败`)
    }
    await new Promise(r => setTimeout(r, 100))
  }
  
  return results
}

// 同步用户关注股票（自选股+持仓）
async function syncUserStocks(supabase: any) {
  // 获取用户自选股
  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('symbol')
    .limit(100)
  
  // 获取用户持仓
  const { data: positions } = await supabase
    .from('positions')
    .select('stock_code, market')
    .limit(100)
  
  // 合并去重
  const symbolSet = new Set<string>()
  watchlist?.forEach((w: any) => symbolSet.add(w.symbol))
  positions?.forEach((p: any) => symbolSet.add(p.stock_code))
  
  const results = { total: 0, success: 0, failed: 0, details: [] as string[] }
  
  for (const symbol of Array.from(symbolSet)) {
    const market: 'CN' | 'HK' = symbol.length === 5 ? 'HK' : 'CN'
    const result = await syncStockInfo(supabase, symbol, market)
    results.total++
    if (result.success) {
      results.success++
    } else {
      results.failed++
    }
    await new Promise(r => setTimeout(r, 100))
  }
  
  return results
}

// ==================== 主服务 ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse()
  }
  
  const startTime = Date.now()
  
  // 授权验证
  const { source } = verifyAuth(req)
  const triggeredBy = source === 'cron' || source === 'internal' ? 'scheduled' : 'manual'
  
  console.log(`🚀 开始同步股票数据... (来源: ${source})`)
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  try {
    const url = new URL(req.url)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    
    const action = body.action || url.searchParams.get('action') || 'sync_hot'
    const symbol = body.symbol || url.searchParams.get('symbol')
    
    let result: any
    
    switch (action) {
      case 'sync_info':
        if (!symbol) {
          result = { success: false, error: '缺少 symbol 参数' }
        } else {
          const market: 'CN' | 'HK' = symbol.length === 5 ? 'HK' : 'CN'
          result = await syncStockInfo(supabase, symbol, market)
          
          // 清除该股票的缓存
          await clearStockCache(symbol)
        }
        break
        
      case 'sync_hot':
        result = await syncHotStocks(supabase)
        break
        
      case 'sync_user':
        result = await syncUserStocks(supabase)
        break
        
      case 'sync_all':
        // 同步热门 + 用户关注
        const hotResult = await syncHotStocks(supabase)
        const userResult = await syncUserStocks(supabase)
        result = {
          success: true,
          hot: hotResult,
          user: userResult,
          total: hotResult.total + userResult.total,
          success_count: hotResult.success + userResult.success,
          failed_count: hotResult.failed + userResult.failed,
        }
        break
        
      case 'health':
      default:
        result = { 
          success: true, 
          message: 'sync-stock-data 服务正常',
          timestamp: new Date().toISOString()
        }
    }
    
    // 成功同步后清除缓存
    if (result.success && ['sync_hot', 'sync_user', 'sync_all'].includes(action)) {
      const clearedCount = await clearStockCache()
      console.log(`🧹 已清除 ${clearedCount} 个股票缓存`)
      result.cache_cleared = clearedCount
    }
    
    const duration = Date.now() - startTime
    result.duration_ms = duration
    result.triggered_by = triggeredBy
    
    console.log(`✅ 股票数据同步完成，耗时 ${duration}ms`)
    
    return jsonResponse(result)
    
  } catch (error: any) {
    console.error('❌ 同步失败:', error)
    return jsonResponse({
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime,
    }, 500)
  }
})
