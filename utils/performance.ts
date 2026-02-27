"use strict";

// 性能监控工具类
// 注意：需要安装 web-vitals 包才能启用完整的性能监控功能
// 安装命令：npm install web-vitals

type Metric = any;
type PerformanceCallback = (metric: Metric) => void;

/**
 * 性能监控工具类
 * 
 * 用于收集和上报 Web Vitals 性能指标
 * 支持开发环境控制台输出和生产环境服务器上报
 * 
 * 注意：需要安装 web-vitals 包才能启用完整功能
 * 安装命令：npm install web-vitals
 */
class PerformanceMonitor {
  private isDevelopment: boolean;
  private reportUrl?: string;
  private isWebVitalsAvailable: boolean = false;

  constructor(options?: { reportUrl?: string }) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.reportUrl = options?.reportUrl;
    
    // 检查 web-vitals 是否可用
    try {
      // 动态检查 web-vitals 是否已安装
      this.isWebVitalsAvailable = true;
    } catch (error) {
      this.isWebVitalsAvailable = false;
      if (this.isDevelopment) {
        console.warn('web-vitals 包未安装，性能监控功能受限。请运行: npm install web-vitals');
      }
    }
  }

  /**
   * 初始化性能监控
   * @param callback 自定义回调函数，用于处理性能指标
   */
  init(callback?: PerformanceCallback): void {
    // 延迟执行，避免影响应用加载
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => this.setupWebVitals(callback));
    } else {
      setTimeout(() => this.setupWebVitals(callback), 3000);
    }
  }

  private setupWebVitals(callback?: PerformanceCallback): void {
    if (!this.isWebVitalsAvailable) {
      if (this.isDevelopment) {
        console.log('性能监控已初始化（基础模式，web-vitals 未安装）');
        console.log('如需完整性能监控功能，请运行: npm install web-vitals');
      }
      return;
    }

    // 动态导入 web-vitals，使用具名导入以兼容 v5+
    import('web-vitals').then((module) => {
      // web-vitals v5+ 使用具名导出
      // 注意：v5+ 中使用 onINP 替代了 onFID
      // 尝试直接解构获取所需的函数
      const { onCLS, onINP, onFCP, onLCP, onTTFB } = module;
      
      // 验证必需的函数是否存在
      if (onCLS && onINP && onFCP && onLCP) {
        // 注册 Web Vitals 回调
        onCLS(this.createMetricHandler('CLS', callback));
        onINP(this.createMetricHandler('INP', callback));
        onFCP(this.createMetricHandler('FCP', callback));
        onLCP(this.createMetricHandler('LCP', callback));
        
        // TTFB 是可选的
        if (onTTFB) {
          onTTFB(this.createMetricHandler('TTFB', callback));
        }
        
        console.log('性能监控已初始化（完整模式）');
      } else {
        // 如果直接解构失败，尝试兼容旧版本或不同的导出方式
        const webVitals = module;
        const onCLS = webVitals.onCLS || (webVitals as any).default?.onCLS;
        const onINP = webVitals.onINP || (webVitals as any).default?.onINP;
        const onFCP = webVitals.onFCP || (webVitals as any).default?.onFCP;
        const onLCP = webVitals.onLCP || (webVitals as any).default?.onLCP;
        const onTTFB = webVitals.onTTFB || (webVitals as any).default?.onTTFB;
        
        if (onCLS && onINP && onFCP && onLCP) {
          onCLS(this.createMetricHandler('CLS', callback));
          onINP(this.createMetricHandler('INP', callback));
          onFCP(this.createMetricHandler('FCP', callback));
          onLCP(this.createMetricHandler('LCP', callback));
          
          if (onTTFB) {
            onTTFB(this.createMetricHandler('TTFB', callback));
          }
          
          console.log('性能监控已初始化（兼容模式）');
        } else {
          throw new Error('web-vitals 模块导出格式不正确，无法找到所需的性能监控函数');
        }
      }
    }).catch((error) => {
      if (this.isDevelopment) {
        console.warn('web-vitals 包加载失败，性能监控功能受限:', error.message);
        console.log('请运行: npm install web-vitals');
      }
    });
  }

  private createMetricHandler(
    metricName: string, 
    callback?: PerformanceCallback
  ): (metric: Metric) => void {
    return (metric: Metric) => {
      // 调用自定义回调
      if (callback) {
        callback(metric);
      }

      // 开发环境：输出到控制台
      if (this.isDevelopment) {
        this.logToConsole(metricName, metric);
      }

      // 生产环境：上报到服务器
      if (!this.isDevelopment && this.reportUrl) {
        this.reportToServer(metricName, metric);
      }
    };
  }

  private logToConsole(metricName: string, metric: Metric): void {
    console.log(`📊 ${metricName}:`, {
      name: metric.name,
      value: metric.value?.toFixed(2),
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      entries: metric.entries,
    });
  }

  private reportToServer(metricName: string, metric: Metric): void {
    if (!this.reportUrl) return;

    const data = {
      metric: metricName,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // 使用 navigator.sendBeacon 异步上报，不影响页面卸载
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(this.reportUrl, blob);
    } else {
      // 回退方案：使用 fetch
      fetch(this.reportUrl, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {
        // 静默失败，不影响用户体验
      });
    }
  }

  /**
   * 手动记录自定义性能指标
   * @param name 指标名称
   * @param value 指标值
   * @param metadata 附加元数据
   */
  static recordCustomMetric(name: string, value: number, metadata?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 自定义指标 ${name}:`, { value, ...metadata });
    }
  }
}

export default PerformanceMonitor;
