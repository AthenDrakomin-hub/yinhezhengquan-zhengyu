/**
 * 行情数据代理 Edge Function
 * 
 * @module proxy-market
 * @description 代理东方财富 API，提供统一行情接口，内置 Redis 缓存
 * 
 * 支持的 action：
 * - batch: 批量行情（简洁版）
 * - realtime: 单只股票实时行情
 * - quote: 完整个股行情
 * - orderbook: 五档盘口
 * - kline: K线数据
 * - ticks: 成交明细（已合并原 fetch-trade-ticks）
 * - limitup: 涨停板列表
 * - news: 财经快讯
 * - stock_news: 个股新闻
 * - stock_notice: 个股公告
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import {
  // 响应工具
  jsonResponse,
  optionsResponse,
  
  // 缓存工具
  getCache,
  setCache,
  CacheTTL,
  MarketCachePrefix,
} from '../_shared/mod.ts'

// ==================== 东方财富 API ====================

async function fetchBatchQuote(secids: string): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=${secids}`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

async function fetchFullQuote(secid: string): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f43,f169,f170,f46,f44,f51,f168,f47,f48,f60,f45,f52,f50,f49,f171,f113&fltt=2`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

async function fetchOrderBook(secid: string): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?fltt=2&fields=f2,f3,f4,f12,f14,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28,f29,f30,f31,f32,f33,f34,f35,f36,f37,f38,f39,f40&secid=${secid}`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

async function fetchKline(secid: string, days: number): Promise<any> {
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?cb=&secid=${secid}&fields1=f1,f2,f3,f4,f5&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=101&fqt=1&end=20500101&lmt=${days}&ut=fa5fd1943c7b386f172d6893dbfba10b`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

async function fetchLimitUpStocks(): Promise<any> {
  const url = 'https://push2.eastmoney.com/api/qt/clist/get?fid=f3&po=1&pz=100&pn=1&np=1&fltt=2&inft=4&fields=f12,f14,f2,f3,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205,f124,f128,f136&fs=b:MK0021,b:MK0022,b:MK0023,b:MK0024'
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

async function fetchNews(pageSize: number): Promise<any> {
  const url = `https://np-listapi.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=0&pageSize=${pageSize}&req_trace=${Date.now()}`
  const response = await fetch(url, { headers: { 'Referer': 'https://www.eastmoney.com/' } })
  return response.json()
}

async function fetchStockNews(symbol: string, pageSize: number): Promise<any> {
  const url = `https://searchapi.eastmoney.com/bussiness/web/QuotationLabelSearch?keyword=${symbol}&type=news&page_index=1&page_size=${pageSize}&sortEnd=${Date.now()}`
  const response = await fetch(url, { headers: { 'Referer': 'https://so.eastmoney.com/' } })
  return response.json()
}

async function fetchStockNotice(symbol: string, pageSize: number): Promise<any> {
  let annType = 'SHA,SA'
  if (symbol.length === 5) {
    annType = 'HKSZ,HK'
  }
  const url = `https://np-anotice-stock.eastmoney.com/api/security/ann?cb=&sr=-1&page_size=${pageSize}&page_index=1&ann_type=${annType}&stock_list=${symbol}&f_node=0&s_node=0`
  const response = await fetch(url, { headers: { 'Referer': 'https://data.eastmoney.com/' } })
  return response.json()
}

async function fetchTradeTicks(secid: string, limit: number): Promise<any> {
  const url = `https://push2.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5&fields2=f51,f52,f53,f54,f55,f56,f57&klt=1&fqt=1&end=20500101&lmt=${limit}&ut=fa5fd1943c7b386f172d6893dbfba10b`
  const response = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
  return response.json()
}

// ==================== 辅助函数 ====================

function buildSecid(symbol: string, market: string): string {
  if (market === 'HK') return `116.${symbol}`
  return symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`
}

// ==================== 主服务 ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
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
      const cacheKey = `${MarketCachePrefix.BATCH}${market}:${symbols.sort().join(',')}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      
      const result = { success: true, data: stocks }
      await setCache(cacheKey, result, CacheTTL.BATCH)
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 单只股票实时行情 ====================
    if (action === 'realtime') {
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.QUOTE}${market}:${symbol}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      
      const result = { success: true, data: stock }
      if (stock) await setCache(cacheKey, result, CacheTTL.QUOTE)
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 完整个股行情 ====================
    if (action === 'quote') {
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.QUOTE}${market}:${symbol}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      
      const result = { success: true, data: quote }
      if (quote) await setCache(cacheKey, result, CacheTTL.QUOTE)
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 五档盘口 ====================
    if (action === 'orderbook') {
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.ORDER_BOOK}${market}:${symbol}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      
      const result = { 
        success: true, 
        data: orderBook,
        message: orderBook ? undefined : '非交易时间暂无五档数据'
      }
      
      await setCache(cacheKey, result, orderBook ? CacheTTL.ORDER_BOOK : 60)
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== K线数据 ====================
    if (action === 'kline') {
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.KLINE}${market}:${symbol}:${days || 30}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      const secid = buildSecid(symbol, market)
      const data = await fetchKline(secid, days || 30)
      
      const klines = data?.data?.klines || []
      const prices = klines.map((k: string) => {
        const parts = k.split(',')
        return parseFloat(parts[2]) || 0
      }).filter((p: number) => p > 0)
      
      const result = { success: true, data: prices }
      if (prices.length > 0) await setCache(cacheKey, result, CacheTTL.KLINE)
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 成交明细（已合并原 fetch-trade-ticks）====================
    if (action === 'ticks') {
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.TICKS}${market}:${symbol}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      
      const result = { success: true, data: ticks, count: ticks.length }
      if (ticks.length > 0) await setCache(cacheKey, result, CacheTTL.TICKS)
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 涨停板 ====================
    if (action === 'limitup') {
      const cacheKey = 'limitup:all'
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      }))?.filter((s: any) => s.changePercent >= 9.5) || []
      
      const result = { success: true, data: stocks }
      await setCache(cacheKey, result, CacheTTL.NEWS) // 使用60秒缓存
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 财经快讯 ====================
    if (action === 'news') {
      const cacheKey = `${MarketCachePrefix.NEWS}${pageSize}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      
      const result = { success: true, data: news }
      await setCache(cacheKey, result, CacheTTL.NEWS)
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 个股相关新闻 ====================
    if (action === 'stock_news') {
      const symbol = symbols[0]
      const cacheKey = `stock_news:${symbol}:${pageSize}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      
      const result = { success: true, data: news }
      await setCache(cacheKey, result, CacheTTL.NEWS * 2) // 2分钟
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 个股公告 ====================
    if (action === 'stock_notice') {
      const symbol = symbols[0]
      const cacheKey = `stock_notice:${symbol}:${pageSize}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
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
      
      const result = { success: true, data: notices }
      await setCache(cacheKey, result, CacheTTL.NEWS * 5) // 5分钟
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 无效 action ====================
    return jsonResponse({ 
      error: 'Invalid action', 
      validActions: ['batch', 'realtime', 'quote', 'orderbook', 'kline', 'ticks', 'limitup', 'news', 'stock_news', 'stock_notice'] 
    }, 400)
    
  } catch (error: any) {
    console.error('[proxy-market] Error:', error)
    return jsonResponse({ success: false, error: error.message }, 500)
  }
})
