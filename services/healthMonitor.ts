/**
 * 健康监控服务
 * 用于监控行情服务、缓存服务的可用性
 */

import { supabase } from '@/lib/supabase';

export interface HealthStatus {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    redis: { status: boolean; latency?: number; error?: string };
    eastmoney: { status: boolean; latency?: number; error?: string };
    edgeFunction: { status: boolean; latency?: number; error?: string };
  };
  uptime: number;
  version: string;
}

export interface AlertConfig {
  webhookUrl?: string;
  email?: string;
  onUnhealthy?: (status: HealthStatus) => void;
  onDegraded?: (status: HealthStatus) => void;
  onRecovered?: (status: HealthStatus) => void;
}

class HealthMonitor {
  private lastStatus: HealthStatus | null = null;
  private alertConfig: AlertConfig = {};
  private checkInterval: number | null = null;
  
  /**
   * 配置告警
   */
  configure(config: AlertConfig) {
    this.alertConfig = config;
  }
  
  /**
   * 获取当前健康状态
   */
  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const { data, error } = await supabase.functions.invoke('health-check', {
        method: 'GET'
      });
      
      if (error) throw error;
      return data as HealthStatus;
    } catch (error: any) {
      return {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        checks: {
          redis: { status: false, error: error.message },
          eastmoney: { status: false, error: error.message },
          edgeFunction: { status: false, error: error.message }
        },
        uptime: 0,
        version: 'unknown'
      };
    }
  }
  
  /**
   * 执行健康检查并触发告警
   */
  async check(): Promise<HealthStatus> {
    const status = await this.getHealthStatus();
    
    // 状态变化时触发告警
    if (this.lastStatus) {
      if (status.status === 'unhealthy' && this.lastStatus.status !== 'unhealthy') {
        this.alertConfig.onUnhealthy?.(status);
        await this.sendAlert('unhealthy', status);
      } else if (status.status === 'degraded' && this.lastStatus.status === 'healthy') {
        this.alertConfig.onDegraded?.(status);
      } else if (status.status === 'healthy' && this.lastStatus.status !== 'healthy') {
        this.alertConfig.onRecovered?.(status);
      }
    }
    
    this.lastStatus = status;
    return status;
  }
  
  /**
   * 启动定时健康检查
   */
  startPeriodicCheck(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      this.stopPeriodicCheck();
    }
    
    // 立即执行一次
    this.check();
    
    // 定时执行
    this.checkInterval = window.setInterval(() => {
      this.check();
    }, intervalMs);
    
    console.log(`[HealthMonitor] 已启动定时健康检查，间隔 ${intervalMs / 1000} 秒`);
  }
  
  /**
   * 停止定时健康检查
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[HealthMonitor] 已停止定时健康检查');
    }
  }
  
  /**
   * 发送告警
   */
  private async sendAlert(level: 'unhealthy' | 'degraded', status: HealthStatus): Promise<void> {
    const { webhookUrl, onUnhealthy, onDegraded } = this.alertConfig;
    
    // 回调告警
    if (level === 'unhealthy') {
      onUnhealthy?.(status);
    } else {
      onDegraded?.(status);
    }
    
    // Webhook 告警
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 行情服务${level === 'unhealthy' ? '严重异常' : '性能下降'}`,
            status,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('[HealthMonitor] 发送告警失败:', error);
      }
    }
  }
  
  /**
   * 获取上次状态
   */
  getLastStatus(): HealthStatus | null {
    return this.lastStatus;
  }
  
  /**
   * 检查服务是否可用
   */
  async isServiceAvailable(): Promise<boolean> {
    const status = await this.getHealthStatus();
    return status.status !== 'unhealthy';
  }
}

// 导出单例
export const healthMonitor = new HealthMonitor();

// 便捷方法
export const checkHealth = () => healthMonitor.check();
export const getHealthStatus = () => healthMonitor.getHealthStatus();
export const startHealthMonitor = (interval?: number) => healthMonitor.startPeriodicCheck(interval);
export const stopHealthMonitor = () => healthMonitor.stopPeriodicCheck();

export default healthMonitor;
