import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Redis 配置（从环境变量获取，不会暴露给前端）
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')!
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!

// 缓存时间（秒）
const CACHE_TTL = {
  realtime: 30,      // 实时行情 30秒
  batch: 30,         // 批量行情 30秒
  quote: 30,         // 完整行情 30秒
  limitup: 60,       // 涨停列表 60秒
  orderbook: 5,      // 五档盘口 5秒
  kline: 300,        // K线数据 5分钟
  news: 60,          // 财经快讯 60秒
  stock_news: 120,   // 个股新闻 2分钟
  stock_notice: 300, // 个股公告 5分钟
  hk_quote: 30,      // 港股行情 30秒
}

// Redis 操作
async function redisGet(key: string): Promise<string | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null
  
  try {
    const response = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`galaxy:${key}`)}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    })
    const data = await response.json()
    return data.result
  } catch {
    return null
  }
}

async function redisSet(key: string, value: string, ttl: number): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) return
  
  try {
    await fetch(`${REDIS_URL}/setex/${encodeURIComponent(`galaxy:${key}`)}/${ttl}/${encodeURIComponent(value)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    })
  } catch {
    // 静默失败
  }
}

// ==================== 东方财富 API ====================

// 批量行情（简洁版）
async function fetchBatchQuote(secids: string): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=${secids}`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

// 完整个股行情（含开高低收等）
async function fetchFullQuote(secid: string): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f43,f169,f170,f46,f44,f51,f168,f47,f48,f60,f45,f52,f50,f49,f171,f113&fltt=2`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

// 五档盘口
async function fetchOrderBook(secid: string): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?fltt=2&fields=f2,f3,f4,f12,f14,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28,f29,f30,f31,f32,f33,f34,f35,f36,f37,f38,f39,f40&secid=${secid}`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

// K线数据
async function fetchKline(secid: string, days: number): Promise<any> {
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?cb=&secid=${secid}&fields1=f1,f2,f3,f4,f5&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=101&fqt=1&end=20500101&lmt=${days}&ut=fa5fd1943c7b386f172d6893dbfba10b`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

// 涨停板
async function fetchLimitUpStocks(): Promise<any> {
  const url = 'https://push2.eastmoney.com/api/qt/clist/get?fid=f3&po=1&pz=100&pn=1&np=1&fltt=2&inft=4&fields=f12,f14,f2,f3,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205,f124,f128,f136&fs=b:MK0021,b:MK0022,b:MK0023,b:MK0024'
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

// 财经快讯
async function fetchNews(pageSize: number): Promise<any> {
  const url = `https://np-listapi.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=0&pageSize=${pageSize}&req_trace=${Date.now()}`
  const response = await fetch(url, { headers: { 'Referer': 'https://www.eastmoney.com/' } })
  return response.json()
}

// 个股相关新闻
async function fetchStockNews(symbol: string, pageSize: number): Promise<any> {
  // 通过搜索股票名称获取相关新闻
  const url = `https://searchapi.eastmoney.com/bussiness/web/QuotationLabelSearch?keyword=${symbol}&type=news&page_index=1&page_size=${pageSize}&sortEnd=${Date.now()}`
  const response = await fetch(url, { headers: { 'Referer': 'https://so.eastmoney.com/' } })
  return response.json()
}

// 个股公告
async function fetchStockNotice(symbol: string, pageSize: number): Promise<any> {
  // 根据市场确定 ann_type
  let annType = 'SHA,SA' // A股
  if (symbol.length === 5) {
    annType = 'HKSZ,HK' // 港股
  }
  
  const url = `https://np-anotice-stock.eastmoney.com/api/security/ann?cb=&sr=-1&page_size=${pageSize}&page_index=1&ann_type=${annType}&stock_list=${symbol}&f_node=0&s_node=0`
  const response = await fetch(url, { headers: { 'Referer': 'https://data.eastmoney.com/' } })
  return response.json()
}

// 港股特有数据（如买卖盘）
async function fetchHKOrderBook(symbol: string): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?fltt=2&secid=116.${symbol}&fields=f2,f3,f4,f12,f14,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28,f29,f30,f31,f32,f33,f34,f35,f36,f37,f38`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/hk/' } })
  return response.json()
}

// 成交明细（从分钟K线提取）
async function fetchTradeTicks(secid: string, limit: number): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5&fields2=f51,f52,f53,f54,f55,f56,f57&klt=1&fqt=1&end=20500101&lmt=${limit}&ut=fa5fd1943c7b386f172d6893dbfba10b`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

// 辅助函数：构建 secid
function buildSecid(symbol: string, market: string): string {
  if (market === 'HK') return `116.${symbol}`
  return symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`
}

// ==================== 主服务 ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 支持 GET 请求的 URL 参数和 POST 请求的 body
    let action: string, symbols: string[], market: string, days: number, pageSize: number
    
    if (req.method === 'GET') {
      const url = new URL(req.url)
      action = url.searchParams.get('action') || ''
      symbols = url.searchParams.get('symbols')?.split(',').filter(Boolean) || []
      market = url.searchParams.get('market') || 'CN'
      days = parseInt(url.searchParams.get('days') || '30')
      pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    } else {
      const body = await req.json()
      action = body.action
      symbols = body.symbols || []
      market = body.market || 'CN'
      days = body.days || 30
      pageSize = body.pageSize || 20
    }

    // ==================== 批量行情 ====================
    if (action === 'batch') {
      const cacheKey = `batch:${market}:${symbols.sort().join(',')}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const secids = symbols.map((s: string) => buildSecid(s, market)).join(',')
      const data = await fetchBatchQuote(secids)
      
      const stocks = data?.data?.diff?.map((item: any) => ({
        symbol: item.f12,
        name: item.f14,
        price: item.f2 || 0,
        change: item.f4 || 0,
        changePercent: item.f3 || 0,
        market,
        sparkline: [],
      })) || []
      
      const result = JSON.stringify({ success: true, data: stocks })
      await redisSet(cacheKey, result, CACHE_TTL.batch)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 单只股票实时行情（简洁版）====================
    if (action === 'realtime') {
      const symbol = symbols[0]
      const cacheKey = `realtime:${market}:${symbol}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const secid = buildSecid(symbol, market)
      const data = await fetchBatchQuote(secid)
      
      const item = data?.data?.diff?.[0]
      const stock = item ? {
        symbol: item.f12 || symbol,
        name: item.f14 || symbol,
        price: item.f2 || 0,
        change: item.f4 || 0,
        changePercent: item.f3 || 0,
        market,
        sparkline: [],
      } : null
      
      const result = JSON.stringify({ success: true, data: stock })
      if (stock) await redisSet(cacheKey, result, CACHE_TTL.realtime)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 完整个股行情 ====================
    if (action === 'quote') {
      const symbol = symbols[0]
      const cacheKey = `quote:${market}:${symbol}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const secid = buildSecid(symbol, market)
      const data = await fetchFullQuote(secid)
      
      const d = data?.data
      const quote = d ? {
        symbol: String(d.f57 || symbol),
        name: d.f58 || symbol,
        price: (d.f43 || 0) / 100,
        change: (d.f169 || 0) / 100,
        changePercent: (d.f170 || 0) / 100,
        open: (d.f46 || 0) / 100,
        high: (d.f44 || 0) / 100,
        low: (d.f51 || 0) / 100,
        prevClose: (d.f60 || 0) / 100,
        volume: d.f47 || 0,
        amount: d.f48 || 0,
        market,
        timestamp: new Date().toISOString(),
      } : null
      
      const result = JSON.stringify({ success: true, data: quote })
      if (quote) await redisSet(cacheKey, result, CACHE_TTL.quote)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 五档盘口 ====================
    if (action === 'orderbook') {
      const symbol = symbols[0]
      const cacheKey = `orderbook:${market}:${symbol}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const secid = buildSecid(symbol, market)
      const data = await fetchOrderBook(secid)
      
      const item = data?.data?.diff?.[0]
      const orderBook = item ? {
        bids: [
          { price: item.f19 || 0, volume: item.f20 || 0 },
          { price: item.f21 || 0, volume: item.f22 || 0 },
          { price: item.f23 || 0, volume: item.f24 || 0 },
          { price: item.f25 || 0, volume: item.f26 || 0 },
          { price: item.f27 || 0, volume: item.f28 || 0 },
        ].filter((b: any) => b.price > 0),
        asks: [
          { price: item.f29 || 0, volume: item.f30 || 0 },
          { price: item.f31 || 0, volume: item.f32 || 0 },
          { price: item.f33 || 0, volume: item.f34 || 0 },
          { price: item.f35 || 0, volume: item.f36 || 0 },
          { price: item.f37 || 0, volume: item.f38 || 0 },
        ].filter((a: any) => a.price > 0),
      } : null
      
      const result = JSON.stringify({ 
        success: true, 
        data: orderBook,
        message: orderBook ? undefined : '非交易时间暂无五档数据'
      })
      
      await redisSet(cacheKey, result, orderBook ? CACHE_TTL.orderbook : 60)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== K线数据 ====================
    if (action === 'kline') {
      const symbol = symbols[0]
      const cacheKey = `kline:${market}:${symbol}:${days || 30}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const secid = buildSecid(symbol, market)
      const data = await fetchKline(secid, days || 30)
      
      const klines = data?.data?.klines || []
      const prices = klines.map((k: string) => {
        const parts = k.split(',')
        return parseFloat(parts[2]) || 0
      }).filter((p: number) => p > 0)
      
      const result = JSON.stringify({ success: true, data: prices })
      if (prices.length > 0) await redisSet(cacheKey, result, CACHE_TTL.kline)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 成交明细 ====================
    if (action === 'ticks') {
      const symbol = symbols[0]
      const cacheKey = `ticks:${market}:${symbol}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const secid = buildSecid(symbol, market)
      const data = await fetchTradeTicks(secid, 60)
      
      const klines = data?.data?.klines || []
      const ticks = klines.slice(-30).reverse().map((k: string) => {
        const parts = k.split(',')
        if (parts.length >= 6) {
          const dateTime = parts[0]
          const timeMatch = dateTime.match(/\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/)
          const time = timeMatch ? timeMatch[1] : dateTime.split(' ')[1]?.slice(0, 5) || ''
          const price = parseFloat(parts[2]) || 0
          const volume = parseInt(parts[5]) || 0
          const open = parseFloat(parts[1]) || price
          const direction = price >= open ? 'BUY' : 'SELL'
          
          return { time, price, volume, direction }
        }
        return null
      }).filter((t: any) => t && t.price > 0 && t.volume > 0)
      
      const result = JSON.stringify({ success: true, data: ticks, count: ticks.length })
      if (ticks.length > 0) await redisSet(cacheKey, result, CACHE_TTL.orderbook) // 5秒缓存
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 涨停板 ====================
    if (action === 'limitup') {
      const cacheKey = 'limitup:all'
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const data = await fetchLimitUpStocks()
      
      const stocks = data?.data?.diff?.map((item: any) => ({
        symbol: item.f12,
        name: item.f14,
        price: item.f2 || 0,
        changePercent: item.f3 || 0,
        turnoverRate: item.f8 || 0,
        firstLimitUpTime: item.f75 || '',
        lastLimitUpTime: item.f78 || '',
        openCount: item.f84 || 0,
        industry: item.f128 || '',
      }))?.filter((s: any) => s.changePercent >= 9.5) || [] // 过滤实际涨停
      
      const result = JSON.stringify({ success: true, data: stocks })
      await redisSet(cacheKey, result, CACHE_TTL.limitup)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 财经快讯 ====================
    if (action === 'news') {
      const cacheKey = `news:${pageSize}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const data = await fetchNews(pageSize)
      
      const news = data?.data?.fastNewsList?.map((item: any) => {
        let timeStr = ''
        if (item.showTime) {
          const match = String(item.showTime).match(/\d{2}:\d{2}/)
          timeStr = match ? match[0] : item.showTime
        }
        
        return {
          id: item.code || Math.random().toString(),
          title: item.title || '',
          content: item.summary || item.content || '',
          time: timeStr || new Date().toTimeString().slice(0, 5),
          source: item.source || '财经快讯',
          category: item.columnName || '财经快讯',
          sentiment: item.emotion || 'neutral',
        }
      }) || []
      
      const result = JSON.stringify({ success: true, data: news })
      await redisSet(cacheKey, result, CACHE_TTL.news)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 个股相关新闻 ====================
    if (action === 'stock_news') {
      const symbol = symbols[0]
      const cacheKey = `stock_news:${symbol}:${pageSize}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const data = await fetchStockNews(symbol, pageSize)
      
      const news = data?.data?.news?.map((item: any) => ({
        id: item.code || item.NewsId || Math.random().toString(),
        title: item.title || item.NewsTitle || '',
        content: item.digest || item.summary || '',
        time: item.time || item.ShowTime || '',
        source: item.source || '财经资讯',
        url: item.url || item.NewsUrl || '',
        relatedStocks: item.codes || [],
      })) || []
      
      const result = JSON.stringify({ success: true, data: news })
      await redisSet(cacheKey, result, CACHE_TTL.stock_news)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 个股公告 ====================
    if (action === 'stock_notice') {
      const symbol = symbols[0]
      const cacheKey = `stock_notice:${symbol}:${pageSize}`
      
      const cached = await redisGet(cacheKey)
      if (cached) {
        return new Response(cached, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }, status: 200 })
      }
      
      const data = await fetchStockNotice(symbol, pageSize)
      
      const notices = data?.data?.list?.map((item: any) => ({
        id: item.art_code || Math.random().toString(),
        title: item.title_ch || item.title || '',
        date: item.notice_date || item.display_time || '',
        type: item.columns?.[0]?.column_name || '公告',
        codes: item.codes?.map((c: any) => ({ symbol: c.stock_code, name: c.short_name })) || [],
        url: `https://data.eastmoney.com/notices/detail/${item.art_code}.html`,
      })) || []
      
      const result = JSON.stringify({ success: true, data: notices })
      await redisSet(cacheKey, result, CACHE_TTL.stock_notice)
      
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }, status: 200 })
    }
    
    // ==================== 无效 action ====================
    return new Response(JSON.stringify({ 
      error: 'Invalid action', 
      validActions: ['batch', 'realtime', 'quote', 'orderbook', 'kline', 'ticks', 'limitup', 'news', 'stock_news', 'stock_notice'] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
    
  } catch (error: any) {
    console.error('[proxy-market] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
