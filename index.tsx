
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import PerformanceMonitor from './utils/performance';

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

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
