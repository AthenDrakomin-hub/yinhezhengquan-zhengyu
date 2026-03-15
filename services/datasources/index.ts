/**
 * 数据源模块入口（轻量化免费方案）
 * 
 * 数据源：东方财富（通过 proxy-market Edge Function）
 * 特点：免费、无需配置、开箱即用
 */

// 导出类型
export * from './types';

// 导出路由器
export { dataSourceRouter, DataSourceRouter } from './router';

// 兼容旧 API
export type { Market, UnifiedQuote, UnifiedKline, UnifiedOrderBook, UnifiedTick, UnifiedNews } from './types';
