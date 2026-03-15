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
 * - index: 指数行情
 * 
 * 优化特性：
 * - 重试机制：支持自动重试，指数退避
 * - 超时控制：每个请求独立超时
 * - 缓存降级：主源失败时尝试备用缓存
 * - 多数据源：东方财富 + 新浪财经备用
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import {
  // 响应工具
  jsonResponse,
  optionsResponse,
  
  // 缓存工具
  getCache,
  setCache,
  setCacheWithStale,
  getStaleCache,
  CacheTTL,
  MarketCachePrefix,
  
  // 网络请求工具
  fetchWithRetry,
  fetchJsonWithRetry,
  FetchPresets,
} from './_shared/mod.ts'

// ==================== 通用请求配置 ====================

/** 默认请求头部（模拟浏览器） */
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://quote.eastmoney.com/',
}

// ==================== 东方财富 API ====================

async function fetchBatchQuote(secids: string): Promise<any> {
  if (!secids) {
    throw new Error('secids 参数不能为空')
  }
  
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=${secids}`
  return fetchJsonWithRetry(url, { headers: DEFAULT_HEADERS }, ...Object.values(FetchPresets.realtime))
}

async function fetchFullQuote(secid: string): Promise<any> {
  if (!secid) {
    throw new Error('secid 参数不能为空')
  }
  
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f43,f169,f170,f46,f44,f51,f168,f47,f48,f60,f45,f52,f50,f49,f171,f113&fltt=2`
  return fetchJsonWithRetry(url, { headers: DEFAULT_HEADERS }, ...Object.values(FetchPresets.realtime))
}

async function fetchOrderBook(secid: string): Promise<any> {
  if (!secid) {
    throw new Error('secid 参数不能为空')
  }
  
  const url = `https://push2.eastmoney.com/api/qt/stock/get?fltt=2&fields=f2,f3,f4,f12,f14,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28,f29,f30,f31,f32,f33,f34,f35,f36,f37,f38,f39,f40&secid=${secid}`
  return fetchJsonWithRetry(url, { headers: DEFAULT_HEADERS }, ...Object.values(FetchPresets.realtime))
}

async function fetchKline(secid: string, days: number): Promise<any> {
  if (!secid) {
    throw new Error('secid 参数不能为空')
  }
  
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?cb=&secid=${secid}&fields1=f1,f2,f3,f4,f5&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=101&fqt=1&end=20500101&lmt=${days}&ut=fa5fd1943c7b386f172d6893dbfba10b`
  return fetchJsonWithRetry(url, { headers: DEFAULT_HEADERS }, ...Object.values(FetchPresets.kline))
}

async function fetchLimitUpStocks(): Promise<any> {
  const url = 'https://push2.eastmoney.com/api/qt/clist/get?fid=f3&po=1&pz=100&pn=1&np=1&fltt=2&inft=4&fields=f12,f14,f2,f3,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205,f124,f128,f136&fs=b:MK0021,b:MK0022,b:MK0023,b:MK0024'
  return fetchJsonWithRetry(url, { headers: DEFAULT_HEADERS }, ...Object.values(FetchPresets.standard))
}

async function fetchNews(pageSize: number): Promise<any> {
  const url = `https://np-listapi.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=0&pageSize=${pageSize}&req_trace=${Date.now()}`
  return fetchJsonWithRetry(url, { headers: { ...DEFAULT_HEADERS, 'Referer': 'https://www.eastmoney.com/' } }, ...Object.values(FetchPresets.news))
}

async function fetchStockNews(symbol: string, pageSize: number): Promise<any> {
  if (!symbol) {
    throw new Error('symbol 参数不能为空')
  }
  
  const url = `https://searchapi.eastmoney.com/bussiness/web/QuotationLabelSearch?keyword=${symbol}&type=news&page_index=1&page_size=${pageSize}&sortEnd=${Date.now()}`
  return fetchJsonWithRetry(url, { headers: { ...DEFAULT_HEADERS, 'Referer': 'https://so.eastmoney.com/' } }, ...Object.values(FetchPresets.news))
}

async function fetchStockNotice(symbol: string, pageSize: number): Promise<any> {
  if (!symbol) {
    throw new Error('symbol 参数不能为空')
  }
  
  let annType = 'SHA,SA'
  if (symbol.length === 5) {
    annType = 'HKSZ,HK'
  }
  const url = `https://np-anotice-stock.eastmoney.com/api/security/ann?cb=&sr=-1&page_size=${pageSize}&page_index=1&ann_type=${annType}&stock_list=${symbol}&f_node=0&s_node=0`
  return fetchJsonWithRetry(url, { headers: { ...DEFAULT_HEADERS, 'Referer': 'https://data.eastmoney.com/' } }, ...Object.values(FetchPresets.news))
}

async function fetchTradeTicks(secid: string, limit: number): Promise<any> {
  if (!secid) {
    throw new Error('secid 参数不能为空')
  }
  
  const url = `https://push2.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5&fields2=f51,f52,f53,f54,f55,f56,f57&klt=1&fqt=1&end=20500101&lmt=${limit}&ut=fa5fd1943c7b386f172d6893dbfba10b`
  return fetchJsonWithRetry(url, { headers: DEFAULT_HEADERS }, ...Object.values(FetchPresets.realtime))
}

/**
 * 获取指数行情（扩展字段）
 */
async function fetchIndexQuotes(secids: string): Promise<any> {
  if (!secids) {
    throw new Error('secids 参数不能为空')
  }
  
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f5,f6,f12,f14,f15,f16,f17,f18,f43,f44,f45,f46,f47,f48,f60,f169,f170&secids=${secids}&ut=fa5fd1943c7b386f172d6893dbfba10b`
  return fetchJsonWithRetry(url, { headers: DEFAULT_HEADERS }, ...Object.values(FetchPresets.realtime))
}

// ==================== 新浪财经备用源 ====================

/**
 * 从新浪财经获取指数行情（备用）
 */
async function fetchIndexFromSina(): Promise<any> {
  const symbols = ['sh000001', 'sz399001', 'sz399006', 'sh000688', 'sh000300', 'sh000016']
  const url = `https://hq.sinajs.cn/list=${symbols.join(',')}`
  
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': 'https://finance.sina.com.cn',
      }
    }, 2, 3000, 500)
    
    const text = await response.text()
    
    // 解析新浪返回的文本格式：var hq_str_sh000001="上证指数,4095.45,-33.65,0.82,...
    const lines = text.split(';').filter(l => l.trim())
    const indices = lines.map(line => {
      const match = line.match(/var hq_str_(\w+)="(.*?)"/)
      if (!match || !match[2]) return null
      
      const code = match[1].replace('sh', '').replace('sz', '')
      const values = match[2].split(',')
      
      if (values.length < 10) return null
      
      return {
        code,
        name: values[0],
        price: parseFloat(values[1]) || 0,
        change: parseFloat(values[2]) || 0,
        changePercent: parseFloat(values[3]) || 0,
        open: parseFloat(values[5]) || 0,
        high: parseFloat(values[4]) || 0,
        low: parseFloat(values[6]) || 0,
        prevClose: parseFloat(values[7]) || 0,
        volume: parseInt(values[8]) || 0,
        amount: parseFloat(values[9]) || 0,
      }
    }).filter(Boolean)
    
    return { data: { diff: indices } }
  } catch (error) {
    console.error('[fetchIndexFromSina] 新浪财经API调用失败:', error)
    throw error
  }
}

/**
 * 从新浪财经获取股票行情（备用）
 */
async function fetchQuoteFromSina(symbol: string, market: string): Promise<any> {
  if (!symbol) {
    throw new Error('symbol 参数不能为空')
  }
  
  // 构建 Sina 股票代码
  let sinaSymbol = symbol
  if (market === 'HK') {
    sinaSymbol = `hk${symbol}`
  } else if (symbol.startsWith('6')) {
    sinaSymbol = `sh${symbol}`
  } else {
    sinaSymbol = `sz${symbol}`
  }
  
  const url = `https://hq.sinajs.cn/list=${sinaSymbol}`
  
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': 'https://finance.sina.com.cn',
      }
    }, 2, 3000, 500)
    
    const text = await response.text()
    const match = text.match(/var hq_str_\w+="(.*?)"/)
    
    if (!match || !match[1]) {
      return null
    }
    
    const values = match[1].split(',')
    
    if (values.length < 10) {
      return null
    }
    
    return {
      symbol,
      name: values[0],
      price: parseFloat(values[1]) || 0,
      change: parseFloat(values[2]) || 0,
      changePercent: parseFloat(values[3]) || 0,
      open: parseFloat(values[5]) || 0,
      high: parseFloat(values[4]) || 0,
      low: parseFloat(values[6]) || 0,
      prevClose: parseFloat(values[7]) || 0,
      volume: parseInt(values[8]) || 0,
      amount: parseFloat(values[9]) || 0,
      market,
      _source: 'sina',
    }
  } catch (error) {
    console.error('[fetchQuoteFromSina] 新浪财经API调用失败:', error)
    throw error
  }
}

// ==================== 辅助函数 ====================

function buildSecid(symbol: string, market: string): string {
  if (!symbol) return ''
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
    let body: any = null // 提升 body 变量到外层作用域
    
    if (req.method === 'GET') {
      const url = new URL(req.url)
      action = url.searchParams.get('action') || ''
      symbols = url.searchParams.get('symbols')?.split(',').filter(Boolean) || 
                (url.searchParams.get('code') ? [url.searchParams.get('code')!] : [])
      market = url.searchParams.get('market') || 'CN'
      days = parseInt(url.searchParams.get('days') || '30')
      pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    } else {
      try {
        body = await req.json()
      } catch (error) {
        console.error('[proxy-market] JSON 解析失败:', error)
        return jsonResponse({ success: false, error: '请求体不是有效的JSON格式' }, 400)
      }
      
      action = body.action || ''
      symbols = body.symbols || (body.code ? [body.code] : [])
      market = body.market || 'CN'
      days = body.days || 30
      pageSize = body.pageSize || 20
    }

    // 验证必填参数
    if (!action) {
      return jsonResponse({ 
        error: 'Invalid request', 
        message: 'action 参数是必需的',
        validActions: ['batch', 'realtime', 'quote', 'orderbook', 'kline', 'ticks', 'limitup', 'news', 'stock_news', 'stock_notice', 'index'] 
      }, 400)
    }

    // ==================== 批量行情 ====================
    if (action === 'batch') {
      if (symbols.length === 0) {
        return jsonResponse({ success: false, error: 'symbols 参数不能为空' }, 400)
      }
      
      const cacheKey = `${MarketCachePrefix.BATCH}${market}:${symbols.sort().join(',')}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
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
        await setCacheWithStale(cacheKey, result, CacheTTL.BATCH)
        
        return jsonResponse({ ...result, _cache: 'MISS' })
      } catch (err: any) {
        console.error('[batch] 东方财富API调用失败:', err.message)
        
        // 尝试使用备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[batch] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        // 尝试使用新浪财经备用源
        try {
          console.log('[batch] 尝试使用新浪财经备用源')
          const stocks = await Promise.all(
            symbols.map(symbol => fetchQuoteFromSina(symbol, market))
          )
          
          const validStocks = stocks.filter(Boolean)
          const result = { success: true, data: validStocks, _source: 'sina' }
          
          if (validStocks.length > 0) {
            await setCacheWithStale(cacheKey, result, CacheTTL.BATCH)
          }
          
          return jsonResponse({ ...result, _cache: 'MISS' })
        } catch (sinaErr: any) {
          console.error('[batch] 新浪财经备用源也失败:', sinaErr.message)
        }
        
        return jsonResponse({ 
          success: false, 
          error: '批量行情获取失败',
          message: err.message,
          _sourcesFailed: ['eastmoney', 'sina']
        }, 503)
      }
    }
    
    // ==================== 指数行情 ====================
    if (action === 'index') {
      const cacheKey = 'market:index:all'
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      let data
      try {
        // 先尝试东方财富
        const indexSecids = body?.secids || '1.000001,0.399001,0.899050,1.000688,1.000300,1.000016,0.399006'
        data = await fetchIndexQuotes(indexSecids)
      } catch (err: any) {
        console.warn('[index] 东方财富API失败，尝试新浪备用源:', err.message)
        
        try {
          // 尝试新浪备用源
          data = await fetchIndexFromSina()
        } catch (sinaErr: any) {
          console.error('[index] 新浪备用源也失败:', sinaErr.message)
          
          // 尝试备用缓存
          const stale = await getStaleCache<any>(cacheKey)
          if (stale) {
            console.warn('[index] 使用备用缓存')
            return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
          }
          
          return jsonResponse({ 
            success: false, 
            error: '无法获取指数数据，请稍后重试',
            _sourcesFailed: ['eastmoney', 'sina']
          }, 503)
        }
      }
      
      const indices = data?.data?.diff?.map((item: any) => ({
        code: item.f12 || item.code,
        name: item.f14 || item.name,
        price: item.f2 || item.price || 0,
        change: item.f4 || item.change || 0,
        changePercent: item.f3 || item.changePercent || 0,
        open: item.f17 || item.open || 0,
        high: item.f15 || item.high || 0,
        low: item.f16 || item.low || 0,
        prevClose: item.f60 || item.prevClose || 0,
        volume: item.f5 || item.volume || 0,
        amount: item.f6 || item.amount || 0,
      })) || []
      
      const result = { success: true, data: indices }
      await setCacheWithStale(cacheKey, result, CacheTTL.QUOTE)
      
      return jsonResponse({ ...result, _cache: 'MISS' })
    }
    
    // ==================== 单只股票实时行情 ====================
    if (action === 'realtime') {
      if (symbols.length === 0) {
        return jsonResponse({ success: false, error: 'symbol 参数不能为空' }, 400)
      }
      
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.QUOTE}${market}:${symbol}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
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
        if (stock) await setCacheWithStale(cacheKey, result, CacheTTL.QUOTE)
        
        return jsonResponse({ ...result, _cache: 'MISS' })
      } catch (err: any) {
        console.error('[realtime] 东方财富API调用失败:', err.message)
        
        // 尝试新浪备用源
        try {
          console.log('[realtime] 尝试使用新浪财经备用源')
          const stock = await fetchQuoteFromSina(symbol, market)
          if (stock) {
            const result = { success: true, data: stock }
            await setCacheWithStale(cacheKey, result, CacheTTL.QUOTE)
            return jsonResponse({ ...result, _cache: 'MISS', _source: 'sina' })
          }
        } catch (sinaErr: any) {
          console.error('[realtime] 新浪备用源也失败:', sinaErr.message)
        }
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[realtime] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '无法获取实时行情数据', _sourcesFailed: ['eastmoney', 'sina'] }, 503)
      }
    }
    
    // ==================== 完整个股行情 ====================
    if (action === 'quote') {
      if (symbols.length === 0) {
        return jsonResponse({ success: false, error: 'symbol 参数不能为空' }, 400)
      }
      
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.QUOTE}${market}:${symbol}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
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
        if (quote) await setCacheWithStale(cacheKey, result, CacheTTL.QUOTE)
        
        return jsonResponse({ ...result, _cache: 'MISS' })
      } catch (err: any) {
        console.error('[quote] 东方财富API调用失败:', err.message)
        
        // 尝试新浪备用源
        try {
          console.log('[quote] 尝试使用新浪财经备用源')
          const quote = await fetchQuoteFromSina(symbol, market)
          if (quote) {
            const result = { success: true, data: quote }
            await setCacheWithStale(cacheKey, result, CacheTTL.QUOTE)
            return jsonResponse({ ...result, _cache: 'MISS', _source: 'sina' })
          }
        } catch (sinaErr: any) {
          console.error('[quote] 新浪备用源也失败:', sinaErr.message)
        }
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[quote] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '无法获取个股行情数据', _sourcesFailed: ['eastmoney', 'sina'] }, 503)
      }
    }
    
    // ==================== 五档盘口 ====================
    if (action === 'orderbook') {
      if (symbols.length === 0) {
        return jsonResponse({ success: false, error: 'symbol 参数不能为空' }, 400)
      }
      
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.ORDER_BOOK}${market}:${symbol}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
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
      } catch (err: any) {
        console.error('[orderbook] 东方财富API调用失败:', err.message)
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[orderbook] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '无法获取五档盘口数据', message: err.message }, 503)
      }
    }
    
    // ==================== K线数据 ====================
    if (action === 'kline') {
      if (symbols.length === 0) {
        return jsonResponse({ success: false, error: 'symbol 参数不能为空' }, 400)
      }
      
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.KLINE}${market}:${symbol}:${days || 30}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
        const secid = buildSecid(symbol, market)
        const data = await fetchKline(secid, days || 30)
        
        const klines = data?.data?.klines || []
        const prices = klines.map((k: string) => {
          const parts = k.split(',')
          return parseFloat(parts[2]) || 0
        }).filter((p: number) => p > 0)
        
        const result = { success: true, data: prices }
        if (prices.length > 0) await setCacheWithStale(cacheKey, result, CacheTTL.KLINE)
        
        return jsonResponse({ ...result, _cache: 'MISS' })
      } catch (err: any) {
        console.error('[kline] 东方财富API调用失败:', err.message)
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[kline] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '无法获取K线数据', message: err.message }, 503)
      }
    }
    
    // ==================== 成交明细（已合并原 fetch-trade-ticks）====================
    if (action === 'ticks') {
      if (symbols.length === 0) {
        return jsonResponse({ success: false, error: 'symbol 参数不能为空' }, 400)
      }
      
      const symbol = symbols[0]
      const cacheKey = `${MarketCachePrefix.TICKS}${market}:${symbol}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
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
      } catch (err: any) {
        console.error('[ticks] 东方财富API调用失败:', err.message)
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[ticks] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '无法获取成交明细数据', message: err.message }, 503)
      }
    }
    
    // ==================== 涨停板 ====================
    if (action === 'limitup') {
      const cacheKey = 'limitup:all'
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
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
        await setCacheWithStale(cacheKey, result, CacheTTL.NEWS)
        
        return jsonResponse({ ...result, _cache: 'MISS' })
      } catch (err: any) {
        console.error('[limitup] 东方财富API调用失败:', err.message)
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[limitup] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '无法获取涨停板数据', message: err.message }, 503)
      }
    }
    
    // ==================== 财经快讯 ====================
    if (action === 'news') {
      const cacheKey = `${MarketCachePrefix.NEWS}${pageSize}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
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
        await setCacheWithStale(cacheKey, result, CacheTTL.NEWS)
        
        return jsonResponse({ ...result, _cache: 'MISS' })
      } catch (err: any) {
        console.error('[news] 东方财富API调用失败:', err.message)
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[news] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '无法获取财经快讯', message: err.message }, 503)
      }
    }
    
    // ==================== 个股相关新闻 ====================
    if (action === 'stock_news') {
      if (symbols.length === 0) {
        return jsonResponse({ success: false, error: 'symbol 参数不能为空' }, 400)
      }
      
      const symbol = symbols[0]
      const cacheKey = `stock_news:${symbol}:${pageSize}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
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
        await setCacheWithStale(cacheKey, result, CacheTTL.NEWS * 2)
        
        return jsonResponse({ ...result, _cache: 'MISS' })
      } catch (err: any) {
        console.error('[stock_news] 东方财富API调用失败:', err.message)
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[stock_news] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '无法获取个股新闻', message: err.message }, 503)
      }
    }
    
    // ==================== 个股公告 ====================
    if (action === 'stock_notice') {
      const symbol = symbols[0]
      if (!symbol) {
        return jsonResponse({ success: false, error: '缺少股票代码' }, 400)
      }
      
      const cacheKey = `stock_notice:${symbol}:${pageSize}`
      
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        return jsonResponse({ ...cached, _cache: 'HIT' })
      }
      
      try {
        const data = await fetchStockNotice(symbol, pageSize)
        
        // 安全解析数据
        const list = data?.data?.list || []
        const notices = Array.isArray(list) ? list.map((item: any) => ({
          id: item.art_code || Math.random().toString(),
          title: item.title_ch || item.title || '',
          date: item.notice_date || item.display_time || '',
          type: item.columns?.[0]?.column_name || '公告',
          codes: Array.isArray(item.codes) ? item.codes.map((c: any) => ({ symbol: c.stock_code, name: c.short_name })) : [],
          url: `https://data.eastmoney.com/notices/detail/${item.art_code}.html`,
        })) : []
        
        const result = { success: true, data: notices }
        await setCacheWithStale(cacheKey, result, CacheTTL.NEWS * 5)
        
        return jsonResponse({ ...result, _cache: 'MISS' })
      } catch (err: any) {
        console.error('[stock_notice] 东方财富API调用失败:', err.message)
        
        // 尝试备用缓存
        const stale = await getStaleCache<any>(cacheKey)
        if (stale) {
          console.warn('[stock_notice] 使用备用缓存')
          return jsonResponse({ ...stale, _cache: 'STALE', _error: err.message })
        }
        
        return jsonResponse({ success: false, error: '获取公告失败: ' + err.message }, 500)
      }
    }
    
    // ==================== 无效 action ====================
    return jsonResponse({ 
      error: 'Invalid action', 
      message: `未知的action: ${action}`,
      validActions: ['batch', 'realtime', 'quote', 'orderbook', 'kline', 'ticks', 'limitup', 'news', 'stock_news', 'stock_notice', 'index'] 
    }, 400)
    
  } catch (error: any) {
    console.error('[proxy-market] 未捕获的错误:', error)
    return jsonResponse({ success: false, error: '服务器内部错误', message: error.message }, 500)
  }
})