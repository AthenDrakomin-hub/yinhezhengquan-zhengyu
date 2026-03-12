/**
 * 缓存增强的行情服务
 * 使用数据库缓存减少API调用
 */

import { withCache, cacheService } from './optimizationService';
import { getStockQuote, getMarketOverview } from './marketService';

/**
 * 获取股票行情（带缓存）
 */
export const getCachedStockQuote = withCache(
  getStockQuote,
  (symbol: string) => `stock:quote:${symbol}`,
  10 // 10秒缓存
);

/**
 * 获取市场概览（带缓存）
 */
export const getCachedMarketOverview = withCache(
  getMarketOverview,
  () => 'market:overview',
  30 // 30秒缓存
);

/**
 * 预热缓存
 * 在应用启动时预加载常用数据
 */
export const warmupCache = async () => {
  // 移除硬编码热门股票，改为只预热市场概览
  await getCachedMarketOverview();
};

/**
 * 清除所有行情缓存
 */
export const clearMarketCache = async () => {
  await cacheService.clear('stock:');
  await cacheService.clear('market:');
};
