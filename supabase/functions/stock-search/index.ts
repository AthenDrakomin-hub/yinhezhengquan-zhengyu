/**
 * 股票搜索 Edge Function
 * 支持按代码或名称搜索，结果缓存 1 小时
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { 
  getCache, 
  setCache, 
  CacheTTL,
  jsonResponse, 
  errorResponse,
  CORS_HEADERS 
} from './_shared/mod.ts'

// 股票搜索结果类型
interface StockSearchResult {
  symbol: string
  name: string
  market: 'CN' | 'HK'
  type: string
  exchange?: string
}

/**
 * 使用东方财富搜索API（返回 UTF-8 JSON）
 */
async function searchByEastmoneyAPI(keyword: string): Promise<StockSearchResult[]> {
  const results: StockSearchResult[] = []
  
  // 东方财富搜索接口（返回 JSON，UTF-8 编码）
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB4D9E2490D4B&count=20`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Referer': 'https://quote.eastmoney.com/',
      },
    })
    
    const data = await response.json()
    
    if (data?.QuotationCodeTable?.Data && Array.isArray(data.QuotationCodeTable.Data)) {
      for (const item of data.QuotationCodeTable.Data) {
        const symbol = item.Code
        const name = item.Name
        const marketType = item.MarketType  // 1=沪市, 0=深市
        const securityType = item.SecurityType  // 1=A股, 2=B股, etc.
        
        if (!symbol || !name) continue
        
        let market: 'CN' | 'HK' = 'CN'
        let exchange = ''
        
        // 港股判断（代码长度为5位且以数字开头）
        if (symbol.length === 5 && /^[0-9]/.test(symbol) && !symbol.startsWith('6') && !symbol.startsWith('0') && !symbol.startsWith('3')) {
          market = 'HK'
          exchange = '港交所'
        } else if (marketType === '1' || symbol.startsWith('6')) {
          market = 'CN'
          exchange = '上交所'
        } else if (marketType === '0' || symbol.startsWith('0') || symbol.startsWith('3')) {
          market = 'CN'
          exchange = '深交所'
        }
        
        results.push({
          symbol,
          name,
          market,
          type: item.SecurityTypeName || '股票',
          exchange,
        })
      }
    }
  } catch (error) {
    console.error('[stock-search] 东方财富搜索失败:', error)
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
  const results = await searchByEastmoneyAPI(keyword)
  
  // 市场过滤
  if (market && market !== 'ALL') {
    return results.filter(r => r.market === market)
  }
  
  // 限制结果数量
  const limitedResults = results.slice(0, 20)
  
  // 写入缓存（1小时）
  if (limitedResults.length > 0) {
    await setCache(cacheKey, limitedResults, CacheTTL.STOCK / 24)
  }
  
  return limitedResults
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    const { keyword, market = 'ALL' } = body
    
    if (!keyword || typeof keyword !== 'string') {
      return errorResponse('请输入搜索关键词', 400, 400)
    }
    
    const results = await searchStocks(keyword.trim(), market)
    
    return jsonResponse({
      success: true,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error('[stock-search] 处理请求失败:', error)
    return errorResponse('搜索失败，请稍后重试', 500, 500)
  }
})
