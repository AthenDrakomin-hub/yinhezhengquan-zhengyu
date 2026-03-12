/**
 * 交易系统共享模块入口
 * 
 * 使用方式：
 * import { ... } from '../_shared/mod.ts'
 */

// 类型定义
export * from './types.ts'

// 响应工具
export * from './response.ts'

// 认证模块
export * from './auth.ts'

// 管理员验证模块
export * from './admin.ts'

// 验证工具
export * from './validation.ts'

// 缓存模块
export {
  // 基础操作
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  getOrSetCache,
  
  // TTL 配置
  CacheTTL,
  MarketCachePrefix,
  
  // 规则缓存
  clearTradeRulesCache,
  
  // 限流
  checkRateLimit,
  
  // 数据同步缓存清除
  clearIPOCache,
  clearStockCache,
  clearMarketCache,
  clearNewsCache,
  clearAllCache,
} from './cache.ts'

// 数据库操作
export * from './database.ts'

// 交易核心逻辑
export * from './trading.ts'
