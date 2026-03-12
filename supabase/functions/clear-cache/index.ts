import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Redis 配置
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')!
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!

// Redis 操作
async function redisDel(key: string): Promise<boolean> {
  if (!REDIS_URL || !REDIS_TOKEN) return false
  
  try {
    const response = await fetch(`${REDIS_URL}/del/${encodeURIComponent(`galaxy:${key}`)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    })
    const data = await response.json()
    return data.result > 0
  } catch {
    return false
  }
}

// 批量删除匹配的键
async function redisDelPattern(pattern: string): Promise<number> {
  if (!REDIS_URL || !REDIS_TOKEN) return 0
  
  try {
    // Upstash Redis 使用 SCAN 命令查找匹配的键
    let cursor = 0
    let deleted = 0
    
    do {
      const scanUrl = `${REDIS_URL}/scan/${cursor}?match=${encodeURIComponent(`galaxy:${pattern}`)}&count=100`
      const response = await fetch(scanUrl, {
        headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
      })
      const data = await response.json()
      
      if (data.result?.[1]?.length > 0) {
        const keys = data.result[1]
        for (const key of keys) {
          // 移除 galaxy: 前缀后删除
          const delKey = key.replace('galaxy:', '')
          if (await redisDel(delKey)) {
            deleted++
          }
        }
      }
      
      cursor = data.result?.[0] || 0
    } while (cursor !== 0)
    
    return deleted
  } catch (error) {
    console.error('[clear-cache] Pattern delete error:', error)
    return 0
  }
}

// 清除所有缓存
async function redisFlushAll(): Promise<boolean> {
  if (!REDIS_URL || !REDIS_TOKEN) return false
  
  try {
    // 使用 FLUSHDB 清除当前数据库
    const response = await fetch(`${REDIS_URL}/flushdb`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    })
    const data = await response.json()
    return data.result === 'OK'
  } catch {
    return false
  }
}

// 预定义的缓存清理模式
const CACHE_PATTERNS: Record<string, string> = {
  'all': '*',                    // 所有缓存
  'quote': 'quote:*',            // 个股行情
  'batch': 'batch:*',            // 批量行情
  'realtime': 'realtime:*',      // 实时行情
  'orderbook': 'orderbook:*',    // 五档盘口
  'kline': 'kline:*',            // K线数据
  'news': 'news:*',              // 新闻快讯
  'stock_news': 'stock_news:*',  // 个股新闻
  'stock_notice': 'stock_notice:*', // 个股公告
  'limitup': 'limitup:*',        // 涨停板
  'stock': 'stock:*',            // 股票基础信息（自定义）
  'trade_rules': 'trade_rules:*', // 交易规则（自定义）
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 仅支持 POST 请求
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed, use POST' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      })
    }

    const body = await req.json()
    const { action, keys, pattern, symbol, market } = body
    
    const results: string[] = []
    let totalDeleted = 0
    
    // ==================== 清除特定键 ====================
    if (keys && Array.isArray(keys)) {
      for (const key of keys) {
        if (await redisDel(key)) {
          results.push(`Deleted: ${key}`)
          totalDeleted++
        } else {
          results.push(`Not found: ${key}`)
        }
      }
    }
    
    // ==================== 清除特定股票的所有缓存 ====================
    if (symbol) {
      const m = market || 'CN'
      const stockPatterns = [
        `quote:${m}:${symbol}`,
        `realtime:${m}:${symbol}`,
        `orderbook:${m}:${symbol}`,
        `kline:${m}:${symbol}:*`,
        `stock_news:${symbol}:*`,
        `stock_notice:${symbol}:*`,
      ]
      
      for (const p of stockPatterns) {
        if (p.includes('*')) {
          const count = await redisDelPattern(p)
          if (count > 0) {
            results.push(`Pattern deleted ${count} keys: ${p}`)
            totalDeleted += count
          }
        } else {
          if (await redisDel(p)) {
            results.push(`Deleted: ${p}`)
            totalDeleted++
          }
        }
      }
    }
    
    // ==================== 按预定义模式清除 ====================
    if (pattern && CACHE_PATTERNS[pattern]) {
      const p = CACHE_PATTERNS[pattern]
      
      if (p === '*') {
        // 清除所有缓存
        if (await redisFlushAll()) {
          results.push('All cache cleared')
          totalDeleted = -1 // 表示全部清除
        }
      } else {
        const count = await redisDelPattern(p)
        results.push(`Pattern deleted ${count} keys: ${p}`)
        totalDeleted += count
      }
    }
    
    // ==================== 自定义模式清除 ====================
    if (pattern && !CACHE_PATTERNS[pattern]) {
      // 当作自定义模式处理
      const count = await redisDelPattern(pattern)
      results.push(`Pattern deleted ${count} keys: ${pattern}`)
      totalDeleted += count
    }
    
    // ==================== 无操作 ====================
    if (!keys && !pattern && !symbol) {
      return new Response(JSON.stringify({ 
        error: 'Missing parameters',
        usage: {
          keys: ['Clear specific cache keys', { keys: ['quote:CN:600519', 'kline:CN:600519:30'] }],
          symbol: ['Clear all cache for a stock', { symbol: '600519', market: 'CN' }],
          pattern: ['Clear by predefined pattern', { 
            patterns: Object.keys(CACHE_PATTERNS),
            example: { pattern: 'quote' }
          }],
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      deleted: totalDeleted,
      details: results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (error: any) {
    console.error('[clear-cache] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
