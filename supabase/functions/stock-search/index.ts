/**
 * 股票搜索 Edge Function
 * 支持按代码或名称搜索，结果缓存 1 小时
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { 
  getCache, 
  setCache, 
  CacheTTL 
} from "../_shared/cache.ts"
import { 
  jsonResponse, 
  errorResponse,
  CORS_HEADERS 
} from "../_shared/response.ts"

// 股票搜索结果类型
interface StockSearchResult {
  symbol: string
  name: string
  market: 'CN' | 'HK'
  type: string
  exchange?: string
}

/**
 * 使用腾讯行情API搜索股票
 */
async function searchByTencentAPI(keyword: string): Promise<StockSearchResult[]> {
  const results: StockSearchResult[] = []
  const cleanKeyword = keyword.replace(/^(sh|sz|hk|SH|SZ|HK)/i, '')
  
  // 如果是数字代码
  if (/^\d+$/.test(cleanKeyword)) {
    const prefixes: Array<{ prefix: string; market: 'CN' | 'HK'; exchange: string }> = []
    
    if (cleanKeyword.startsWith('6')) {
      prefixes.push({ prefix: 'sh', market: 'CN', exchange: '上交所' })
    } else if (cleanKeyword.startsWith('0') || cleanKeyword.startsWith('3')) {
      prefixes.push({ prefix: 'sz', market: 'CN', exchange: '深交所' })
    } else if (cleanKeyword.length === 5) {
      prefixes.push({ prefix: 'hk', market: 'HK', exchange: '港交所' })
    } else {
      // 尝试所有市场
      prefixes.push(
        { prefix: 'sh', market: 'CN', exchange: '上交所' },
        { prefix: 'sz', market: 'CN', exchange: '深交所' },
        { prefix: 'hk', market: 'HK', exchange: '港交所' }
      )
    }
    
    const queries = prefixes.map(p => `${p.prefix}${cleanKeyword}`).join(',')
    const url = `https://qt.gtimg.cn/q=${queries}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': '*/*',
          'Referer': 'https://gu.qq.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      
      const text = await response.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        if (line.includes('v_pv_none_match')) continue
        
        const match = line.match(/v_(\w+)="(.+)"/)
        if (!match) continue
        
        const code = match[1]
        const data = match[2]
        const fields = data.split('~')
        if (fields.length < 3) continue
        
        const name = fields[1]
        const symbol = fields[2]
        
        let market: 'CN' | 'HK' = 'CN'
        let exchange = ''
        if (code.startsWith('hk')) {
          market = 'HK'
          exchange = '港交所'
        } else if (code.startsWith('sh')) {
          market = 'CN'
          exchange = '上交所'
        } else if (code.startsWith('sz')) {
          market = 'CN'
          exchange = '深交所'
        }
        
        if (name && symbol) {
          results.push({ symbol, name, market, type: '股票', exchange })
        }
      }
    } catch (error) {
      console.error('[stock-search] 腾讯财经查询失败:', error)
    }
  }
  
  return results
}

/**
 * 使用东方财富API搜索
 */
async function searchByEastmoneyAPI(keyword: string): Promise<StockSearchResult[]> {
  const results: StockSearchResult[] = []
  const cleanKeyword = keyword.replace(/^(sh|sz|hk|SH|SZ|HK)/i, '')
  
  if (/^\d+$/.test(cleanKeyword)) {
    let marketCode = '0'
    if (cleanKeyword.startsWith('6')) {
      marketCode = '1'
    } else if (cleanKeyword.length === 5) {
      marketCode = '116' // 港股
    }
    
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=${marketCode}.${cleanKeyword}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://quote.eastmoney.com/',
        },
      })
      
      const data = await response.json()
      
      if (data?.data?.diff && Array.isArray(data.data.diff)) {
        for (const item of data.data.diff) {
          const symbol = item.f12
          const name = item.f14
          
          if (symbol && name) {
            results.push({
              symbol,
              name,
              market: cleanKeyword.length === 5 ? 'HK' : 'CN',
              type: '股票',
              exchange: symbol.startsWith('6') ? '上交所' : symbol.startsWith('3') ? '深交所' : '港交所',
            })
          }
        }
      }
    } catch (error) {
      console.error('[stock-search] 东方财富查询失败:', error)
    }
  }
  
  return results
}

/**
 * 搜索股票（带缓存）
 */
async function searchStocks(keyword: string, market: string): Promise<StockSearchResult[]> {
  const cacheKey = `search:${market}:${keyword.toLowerCase()}`
  
  // 尝试从缓存获取
  const cached = await getCache<StockSearchResult[]>(cacheKey)
  if (cached) {
    console.log(`[stock-search] 缓存命中: ${keyword}`)
    return cached
  }
  
  // 缓存未命中，调用 API
  let results: StockSearchResult[] = []
  
  // 策略1: 腾讯API
  results = await searchByTencentAPI(keyword)
  
  // 策略2: 东方财富API（备用）
  if (results.length === 0) {
    results = await searchByEastmoneyAPI(keyword)
  }
  
  // 市场过滤
  if (market && market !== 'ALL') {
    results = results.filter(r => r.market === market)
  }
  
  // 限制结果数量
  const limitedResults = results.slice(0, 20)
  
  // 写入缓存（1小时）
  if (limitedResults.length > 0) {
    await setCache(cacheKey, limitedResults, CacheTTL.STOCK / 24) // 1小时
  }
  
  return limitedResults
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    let keyword = ''
    let market: 'CN' | 'HK' | 'ALL' = 'ALL'
    
    if (req.method === 'GET') {
      const url = new URL(req.url)
      keyword = url.searchParams.get('keyword') || url.searchParams.get('q') || ''
      market = (url.searchParams.get('market') as 'CN' | 'HK' | 'ALL') || 'ALL'
    } else {
      const body = await req.json()
      keyword = body.keyword || body.q || ''
      market = body.market || 'ALL'
    }
    
    if (!keyword || keyword.trim().length === 0) {
      return jsonResponse({ success: true, results: [] })
    }

    const results = await searchStocks(keyword.trim(), market)
    
    console.log(`[stock-search] "${keyword}" -> ${results.length} results`)
    
    return jsonResponse({ 
      success: true, 
      results,
      count: results.length,
    })

  } catch (error: any) {
    console.error('[stock-search] 错误:', error)
    return errorResponse(error.message)
  }
})
