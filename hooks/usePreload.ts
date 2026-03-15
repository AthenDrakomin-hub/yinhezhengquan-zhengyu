/**
 * 预加载 Hook
 * 提供组件级别的预加载功能
 */

import { useEffect, useCallback, useRef } from 'react';
import { initializePreload, preloadOnIntent, preloadComponent } from '../utils/preload';

/**
 * 全局初始化 Hook
 * 在应用根组件中使用
 */
export const usePreloadInit = () => {
  const initialized = useRef(false);
  
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializePreload();
    }
  }, []);
};

/**
 * 导航预加载 Hook
 * 在导航组件中使用，悬停时预加载对应页面
 */
export const usePreloadOnHover = () => {
  const handleMouseEnter = useCallback((path: string) => {
    preloadOnIntent(path);
  }, []);
  
  return { onMouseEnter: handleMouseEnter };
};

/**
 * 懒加载组件预加载 Hook
 * 用于手动触发预加载
 */
export const usePreload = (
  loader: () => Promise<{ default: React.ComponentType<any> }>
) => {
  const preloaded = useRef(false);
  
  const preload = useCallback(() => {
    if (!preloaded.current) {
      preloaded.current = true;
      preloadComponent(loader);
    }
  }, [loader]);
  
  return preload;
};

/**
 * 视口预加载 Hook
 * 当组件进入视口时预加载
 */
export const usePreloadInView = (
  loader: () => Promise<{ default: React.ComponentType<any> }>,
  options?: IntersectionObserverInit
) => {
  const ref = useRef<HTMLElement>(null);
  const preloaded = useRef(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element || preloaded.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !preloaded.current) {
            preloaded.current = true;
            preloadComponent(loader);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, ...options }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [loader, options]);
  
  return ref;
};

export default {
  usePreloadInit,
  usePreloadOnHover,
  usePreload,
  usePreloadInView,
};
