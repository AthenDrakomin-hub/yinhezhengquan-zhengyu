/**
 * 页面预加载工具
 * 用于预加载高频访问的页面组件
 */

import { ComponentType } from 'react';

// 预加载任务队列
const preloadQueue: Array<() => Promise<void>> = [];
let isProcessing = false;

/**
 * 预加载配置
 */
export const preloadConfig = {
  // 高频页面（首页加载后预加载）
  highPriority: [
    () => import('../components/views/MarketView'),
    () => import('../components/views/TradePanel'),
    () => import('../components/views/WealthView'),
    () => import('../components/views/ProfileView'),
  ],
  // 中频页面（空闲时预加载）
  mediumPriority: [
    () => import('../components/client/market/StockDetailView'),
    () => import('../components/client/trading/HoldingsView'),
    () => import('../components/client/analysis/AssetAnalysisView'),
    () => import('../components/client/settings/SettingsOverview'),
  ],
  // 低频页面（按需预加载）
  lowPriority: [
    () => import('../components/client/trading/IPOView'),
    () => import('../components/client/calendar/InvestmentCalendarView'),
    () => import('../components/client/reports/ResearchReportsView'),
  ],
};

/**
 * 执行预加载队列
 */
const processQueue = async () => {
  if (isProcessing || preloadQueue.length === 0) return;
  
  isProcessing = true;
  
  while (preloadQueue.length > 0) {
    const task = preloadQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.warn('[预加载] 任务执行失败:', error);
      }
      // 每个任务之间间隔一小段时间，避免阻塞主线程
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  isProcessing = false;
};

/**
 * 添加预加载任务到队列
 */
const addToQueue = (task: () => Promise<void>) => {
  preloadQueue.push(task);
  processQueue();
};

/**
 * 预加载单个组件
 */
export const preloadComponent = (
  loader: () => Promise<{ default: ComponentType<any> }>
) => {
  addToQueue(async () => {
    try {
      await loader();
    } catch (error) {
      console.warn('[预加载] 组件加载失败:', error);
    }
  });
};

/**
 * 预加载多个组件
 */
export const preloadComponents = (
  loaders: Array<() => Promise<{ default: ComponentType<any> }>>
) => {
  loaders.forEach(loader => preloadComponent(loader));
};

/**
 * 初始化预加载
 * 在应用启动后调用
 */
export const initializePreload = () => {
  // 等待主线程空闲后再开始预加载
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // 先预加载高频页面
      preloadComponents(preloadConfig.highPriority);
      
      // 延迟预加载中频页面
      setTimeout(() => {
        preloadComponents(preloadConfig.mediumPriority);
      }, 2000);
      
      // 更延迟预加载低频页面
      setTimeout(() => {
        preloadComponents(preloadConfig.lowPriority);
      }, 5000);
    });
  } else {
    // 不支持 requestIdleCallback 时使用 setTimeout
    setTimeout(() => {
      preloadComponents(preloadConfig.highPriority);
    }, 1000);
    
    setTimeout(() => {
      preloadComponents(preloadConfig.mediumPriority);
    }, 3000);
    
    setTimeout(() => {
      preloadComponents(preloadConfig.lowPriority);
    }, 6000);
  }
};

/**
 * 根据用户行为预加载
 * 当用户悬停在导航链接上时预加载对应页面
 */
export const preloadOnIntent = (path: string) => {
  const pathToLoader: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
    '/client/market': () => import('../components/views/MarketView'),
    '/client/trade': () => import('../components/views/TradePanel'),
    '/client/wealth': () => import('../components/views/WealthView'),
    '/client/profile': () => import('../components/views/ProfileView'),
    '/client/settings': () => import('../components/views/SettingsView'),
    '/client/analysis': () => import('../components/client/analysis/AssetAnalysisView'),
    '/client/holdings': () => import('../components/client/trading/HoldingsView'),
    '/client/ipo': () => import('../components/client/trading/IPOView'),
  };
  
  const loader = pathToLoader[path];
  if (loader) {
    preloadComponent(loader);
  }
};

export default {
  initializePreload,
  preloadComponent,
  preloadComponents,
  preloadOnIntent,
  preloadConfig,
};
