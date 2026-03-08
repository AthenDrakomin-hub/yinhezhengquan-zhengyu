/**
 * 日志工具
 * 生产环境自动禁用所有日志输出
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * 日志级别
 */
type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * 日志工具类
 */
class Logger {
  private enabled: boolean;

  constructor() {
    this.enabled = !isProduction;
  }

  /**
   * 检查日志是否启用
   */
  private checkEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 普通日志
   */
  log(...args: any[]): void {
    if (this.checkEnabled()) {
      console.log(...args);
    }
  }

  /**
   * 信息日志
   */
  info(...args: any[]): void {
    if (this.checkEnabled()) {
      console.info(...args);
    }
  }

  /**
   * 警告日志
   */
  warn(...args: any[]): void {
    // 警告日志在生产环境也保留
    console.warn(...args);
  }

  /**
   * 错误日志
   */
  error(...args: any[]): void {
    // 错误日志在生产环境也保留
    console.error(...args);
  }

  /**
   * 调试日志
   */
  debug(...args: any[]): void {
    if (this.checkEnabled()) {
      console.debug(...args);
    }
  }

  /**
   * 分组日志
   */
  group(title: string): void {
    if (this.checkEnabled()) {
      console.group(title);
    }
  }

  /**
   * 分组结束
   */
  groupEnd(): void {
    if (this.checkEnabled()) {
      console.groupEnd();
    }
  }

  /**
   * 性能计时开始
   */
  time(label: string): void {
    if (this.checkEnabled()) {
      console.time(label);
    }
  }

  /**
   * 性能计时结束
   */
  timeEnd(label: string): void {
    if (this.checkEnabled()) {
      console.timeEnd(label);
    }
  }

  /**
   * 表格日志
   */
  table(data: any): void {
    if (this.checkEnabled()) {
      console.table(data);
    }
  }

  /**
   * 启用日志（用于调试）
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用日志
   */
  disable(): void {
    this.enabled = false;
  }
}

// 导出单例
export const logger = new Logger();

// 为了向后兼容，也导出 console 对象（但已经过过滤）
export const safeConsole = {
  log: (...args: any[]) => logger.log(...args),
  info: (...args: any[]) => logger.info(...args),
  warn: (...args: any[]) => logger.warn(...args),
  error: (...args: any[]) => logger.error(...args),
  debug: (...args: any[]) => logger.debug(...args),
  group: (title: string) => logger.group(title),
  groupEnd: () => logger.groupEnd(),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  table: (data: any) => logger.table(data),
};

export default logger;
