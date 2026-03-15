/**
 * Redis 缓存模块
 * 用于缓存交易规则、审核规则、行情数据等
 */

// Redis 配置
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'trade:'

/**
 * 行情缓存键前缀（与 proxy-market 保持一致）
 */
export const MarketCachePrefix = {
  QUOTE: 'quote:',       // 股票行情
  BATCH: 'batch:',       // 批量行情
  KLINE: 'kline:',       // K线数据
  TICKS: 'ticks:',       // 成交明细
  ORDER_BOOK: 'order:',  // 五档盘口
  NEWS: 'news:',         // 新闻数据
  IPO: 'ipo:',           // IPO 数据
  STOCK: 'stock:',       // 股票基础信息
}

/**
 * 缓存 TTL 配置（秒）
 */
export const CacheTTL = {
  TRADE_RULES: 600,      // 交易规则：10分钟
  APPROVAL_RULES: 600,   // 审核规则：10分钟
  TRADING_HOURS: 3600,   // 交易时段：1小时
  USER_PROFILE: 300,     // 用户档案：5分钟
  QUOTE: 30,             // 实时行情：30秒
  BATCH: 30,             // 批量行情：30秒
  KLINE: 300,            // K线数据：5分钟
  TICKS: 5,              // 成交明细：5秒
  ORDER_BOOK: 5,         // 五档盘口：5秒
  NEWS: 300,             // 新闻数据：5分钟
  IPO: 3600,             // IPO数据：1小时
  STOCK: 86400,          // 股票基础信息：24小时
} as const

/**
 * Redis 请求封装
 */
async function redisCommand(command: string[]): Promise<any> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('[缓存] Redis 未配置，跳过缓存')
    return null
  }
  
  try {
    const response = await fetch(`${REDIS_URL}/${command[0]}/${command.slice(1).map(encodeURIComponent).join('/')}`, {
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
      },
    })
    
    if (!response.ok) {
      console.error('[缓存] Redis 请求失败:', response.status)
      return null
    }
    
    const result = await response.json()
    return result.result
  } catch (error) {
    console.error('[缓存] Redis 异常:', error)
    return null
  }
}

/**
 * 获取缓存
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const fullKey = `${CACHE_PREFIX}${key}`
  const data = await redisCommand(['GET', fullKey])
  
  if (data) {
    try {
      return JSON.parse(data) as T
    } catch {
      return data as T
    }
  }
  
  return null
}

/**
 * 设置缓存
 */
export async function setCache(key: string, value: any, ttl: number): Promise<boolean> {
  const fullKey = `${CACHE_PREFIX}${key}`
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
  
  const result = await redisCommand(['SETEX', fullKey, ttl.toString(), jsonValue])
  return result === 'OK'
}

/**
 * 设置缓存（同时写入备用缓存）
 * 备用缓存 TTL 为正常 TTL 的 10 倍，用于降级
 */
export async function setCacheWithStale(key: string, value: any, ttl: number): Promise<boolean> {
  // 设置正常缓存
  const normalResult = await setCache(key, value, ttl)
  
  // 设置备用缓存（TTL 为正常值的 10 倍，最多 1 小时）
  const staleTtl = Math.min(ttl * 10, 3600)
  const staleKey = `${key}:stale`
  await setCache(staleKey, value, staleTtl)
  
  return normalResult
}

/**
 * 获取备用缓存（用于降级）
 */
export async function getStaleCache<T>(key: string): Promise<T | null> {
  const staleKey = `${key}:stale`
  return getCache<T>(staleKey)
}

/**
 * 删除缓存
 */
export async function deleteCache(key: string): Promise<boolean> {
  const fullKey = `${CACHE_PREFIX}${key}`
  const result = await redisCommand(['DEL', fullKey])
  return result > 0
}

/**
 * 按模式删除缓存
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  const fullPattern = `${CACHE_PREFIX}${pattern}`
  
  // SCAN 查找匹配的键
  const keys = await redisCommand(['KEYS', fullPattern])
  
  if (!keys || keys.length === 0) {
    return 0
  }
  
  // 删除所有匹配的键
  const result = await redisCommand(['DEL', ...keys])
  return result
}

/**
 * 获取或设置缓存（带回调）
 */
export async function getOrSetCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // 尝试从缓存获取
  const cached = await getCache<T>(key)
  if (cached !== null) {
    return cached
  }
  
  // 缓存未命中，执行回调获取数据
  const data = await fetchFn()
  
  // 写入缓存（异步，不阻塞）
  setCache(key, data, ttl).catch(err => {
    console.error('[缓存] 写入失败:', err)
  })
  
  return data
}

/**
 * 清除所有交易规则缓存
 */
export async function clearTradeRulesCache(): Promise<void> {
  await deleteCachePattern('rule:*')
  console.log('[缓存] 已清除所有交易规则缓存')
}

/**
 * 简易限流器
 * 每分钟每个用户最多 N 次请求
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number = 30,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate:${action}:${userId}`
  const fullKey = `${CACHE_PREFIX}${key}`
  
  try {
    // 使用 INCR + EXPIRE 实现滑动窗口
    const count = await redisCommand(['INCR', fullKey])
    
    if (count === 1) {
      // 首次访问，设置过期时间
      await redisCommand(['EXPIRE', fullKey, windowSeconds.toString()])
    }
    
    const remaining = Math.max(0, maxRequests - count)
    
    return {
      allowed: count <= maxRequests,
      remaining
    }
  } catch (error) {
    console.error('[限流] 检查失败:', error)
    // 限流检查失败时，默认允许通过
    return { allowed: true, remaining: maxRequests }
  }
}

// ==================== 数据同步缓存清除 ====================

/**
 * 清除 IPO 相关缓存
 */
export async function clearIPOCache(): Promise<number> {
  let count = 0
  
  // 清除 ipo:* 模式的缓存
  count += await deleteCachePattern('ipo:*')
  
  // 清除可能的列表缓存
  count += await deleteCache('ipo_list')
  count += await deleteCache('ipo_upcoming')
  count += await deleteCache('ipo_ongoing')
  
  console.log(`[缓存] 已清除 IPO 缓存: ${count} 个键`)
  return count
}

/**
 * 清除股票基础信息缓存
 */
export async function clearStockCache(symbol?: string): Promise<number> {
  if (symbol) {
    // 清除特定股票的缓存
    let count = 0
    count += await deleteCache(`stock:${symbol}`) ? 1 : 0
    count += await deleteCache(`quote:CN:${symbol}`) ? 1 : 0
    count += await deleteCache(`quote:HK:${symbol}`) ? 1 : 0
    console.log(`[缓存] 已清除股票 ${symbol} 缓存: ${count} 个键`)
    return count
  }
  
  // 清除所有股票相关缓存
  const count = await deleteCachePattern('stock:*')
  console.log(`[缓存] 已清除所有股票缓存: ${count} 个键`)
  return count
}

/**
 * 清除行情缓存
 */
export async function clearMarketCache(market?: 'CN' | 'HK', symbol?: string): Promise<number> {
  if (symbol && market) {
    // 清除特定股票的行情缓存
    let count = 0
    count += await deleteCache(`quote:${market}:${symbol}`) ? 1 : 0
    count += await deleteCache(`kline:${market}:${symbol}:*`) ? 1 : 0
    count += await deleteCache(`ticks:${market}:${symbol}`) ? 1 : 0
    count += await deleteCache(`order:${market}:${symbol}`) ? 1 : 0
    console.log(`[缓存] 已清除 ${market}:${symbol} 行情缓存: ${count} 个键`)
    return count
  }
  
  if (market) {
    // 清除特定市场的行情缓存
    const count = await deleteCachePattern(`${market}:*`)
    console.log(`[缓存] 已清除 ${market} 市场行情缓存: ${count} 个键`)
    return count
  }
  
  // 清除所有行情缓存
  let count = 0
  count += await deleteCachePattern('quote:*')
  count += await deleteCachePattern('kline:*')
  count += await deleteCachePattern('ticks:*')
  count += await deleteCachePattern('order:*')
  count += await deleteCachePattern('batch:*')
  console.log(`[缓存] 已清除所有行情缓存: ${count} 个键`)
  return count
}

/**
 * 清除新闻缓存
 */
export async function clearNewsCache(): Promise<number> {
  let count = 0
  count += await deleteCachePattern('news:*')
  count += await deleteCache('news_list')
  count += await deleteCache('galaxy_news')
  console.log(`[缓存] 已清除新闻缓存: ${count} 个键`)
  return count
}

/**
 * 清除所有缓存（谨慎使用）
 */
export async function clearAllCache(): Promise<number> {
  const count = await deleteCachePattern('*')
  console.log(`[缓存] 已清除所有缓存: ${count} 个键`)
  return count
}
