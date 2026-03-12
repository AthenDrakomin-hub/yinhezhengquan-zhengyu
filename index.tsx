
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './OptimizedApp';
import './index.css';
import PerformanceMonitor from './utils/performance';

// ===== 🔴 强制清除 Service Worker 缓存（临时修复） =====
// 这个代码块必须在应用加载前执行
(async () => {
  if ('serviceWorker' in navigator) {
    try {
      // 1. 注销所有 Service Worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('🗑️ 注销 Service Worker:', registration.scope);
        await registration.unregister();
      }
      
      // 2. 清除所有缓存
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        console.log('🗑️ 清除缓存:', cacheName);
        await caches.delete(cacheName);
      }
      
      console.log('✅ Service Worker 缓存已清除');
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }
})();
// ===== END 强制清除 =====

// 初始化性能监控
const performanceMonitor = new PerformanceMonitor({
  // 生产环境上报端点，可根据需要配置
  // 例如：'https://api.your-domain.com/performance-metrics'
  reportUrl: process.env.NODE_ENV === 'production' 
    ? undefined // 暂时不配置生产环境上报端点，可根据需要启用
    : undefined,
});

// Web Vitals 回调函数
const sendToAnalytics = (metric: any) => {
  // 这里可以集成 Google Analytics、Sentry 等监控服务
  // 目前先输出到控制台，便于调试
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vitals 指标:', metric);
  }
  
  // 示例：集成 Google Analytics（如需启用，请取消注释并配置 GA_ID）
  /*
  if (window.gtag && process.env.REACT_APP_GA_ID) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
  */
};

// 延迟初始化性能监控，避免影响应用加载
setTimeout(() => {
  performanceMonitor.init(sendToAnalytics);
}, 1000);

console.log('🚀 开始加载银河证券应用...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ 找不到root元素');
  throw new Error("Could not find root element to mount to");
}

console.log('✅ 找到root元素，开始创建React根...');

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('✅ React根创建成功，开始渲染应用...');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('✅ 应用渲染完成');

  // 注册 Service Worker（仅在 HTTPS 或 localhost 环境）
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    window.addEventListener('load', async () => {
      try {
        // 强制注销旧的 Service Worker 并清除缓存
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          console.log('🗑️ 注销旧 Service Worker:', registration.scope);
          await registration.unregister();
        }
        
        // 清除所有缓存
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          console.log('🗑️ 清除缓存:', cacheName);
          await caches.delete(cacheName);
        }
        
        console.log('✅ 已清除所有旧缓存，重新注册 Service Worker...');
        
        // 重新注册 Service Worker
        const swUrl = '/service-worker.js?t=' + Date.now(); // 添加时间戳强制刷新
        const registration = await navigator.serviceWorker.register(swUrl);
        console.log('✅ Service Worker 注册成功:', registration.scope);
        
        // 强制激活新的 Service Worker
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // 监听 Service Worker 更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 新的 Service Worker 已安装，正在激活...');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      } catch (error) {
        console.error('❌ Service Worker 操作失败:', error);
      }
    });
  } else {
    console.warn('⚠️ 当前环境不支持 Service Worker');
  }
} catch (error) {
  console.error('❌ React应用渲染失败:', error);
  throw error;
}
