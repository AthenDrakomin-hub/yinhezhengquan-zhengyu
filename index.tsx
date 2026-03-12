import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './OptimizedApp';
import './index.css';
import PerformanceMonitor from './utils/performance';

// 初始化性能监控
const performanceMonitor = new PerformanceMonitor({
  reportUrl: process.env.NODE_ENV === 'production' 
    ? undefined
    : undefined,
});

// Web Vitals 回调函数
const sendToAnalytics = (metric: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vitals 指标:', metric);
  }
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

  // 仅注册 Service Worker（不在每次加载时注销）
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    window.addEventListener('load', async () => {
      try {
        // 检查是否已有注册的 Service Worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        if (registrations.length > 0) {
          console.log('✅ Service Worker 已存在，跳过注册');
          return;
        }
        
        // 仅在没有 Service Worker 时注册
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('✅ Service Worker 注册成功:', registration.scope);
        
        // 监听 Service Worker 更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 新的 Service Worker 已安装');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      } catch (error) {
        console.error('❌ Service Worker 注册失败:', error);
      }
    });
  } else {
    console.warn('⚠️ 当前环境不支持 Service Worker');
  }
} catch (error) {
  console.error('❌ React应用渲染失败:', error);
  throw error;
}
