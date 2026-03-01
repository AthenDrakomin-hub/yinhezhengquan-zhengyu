import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface QueuedRequest {
  id: string;
  type: 'TRADE' | 'CANCEL' | 'UPDATE';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueueService {
  private queue: QueuedRequest[] = [];
  private isOnline: boolean = navigator.onLine;
  private processing: boolean = false;
  private readonly STORAGE_KEY = 'offline_queue';
  private readonly MAX_RETRY = 3;

  constructor() {
    this.loadQueue();
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      console.log('网络已恢复，开始处理离线队列');
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('网络已断开，启用离线模式');
      this.isOnline = false;
    });
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('加载离线队列失败:', error);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('保存离线队列失败:', error);
    }
  }

  /**
   * 添加请求到队列
   */
  enqueue(type: QueuedRequest['type'], data: any): string {
    const request: QueuedRequest = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(request);
    this.saveQueue();

    if (this.isOnline) {
      this.processQueue();
    }

    return request.id;
  }

  /**
   * 处理队列
   */
  private async processQueue() {
    if (this.processing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.isOnline) {
      const request = this.queue[0];

      try {
        await this.executeRequest(request);
        this.queue.shift(); // 成功后移除
        this.saveQueue();
      } catch (error) {
        console.error('处理离线请求失败:', error);
        request.retryCount++;

        if (request.retryCount >= this.MAX_RETRY) {
          console.error('请求重试次数超限，移除:', request);
          this.queue.shift();
          this.saveQueue();
        } else {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    this.processing = false;
  }

  /**
   * 执行请求
   */
  private async executeRequest(request: QueuedRequest) {
    switch (request.type) {
      case 'TRADE':
        return await this.executeTrade(request.data);
      case 'CANCEL':
        return await this.executeCancel(request.data);
      case 'UPDATE':
        return await this.executeUpdate(request.data);
      default:
        throw new Error('未知的请求类型');
    }
  }

  private async executeTrade(data: any) {
    const { data: result, error } = await supabase.functions.invoke('create-trade-order', {
      body: data
    });
    if (error) throw error;
    return result;
  }

  private async executeCancel(data: any) {
    const { data: result, error } = await supabase.rpc('cancel_trade_order', data);
    if (error) throw error;
    return result;
  }

  private async executeUpdate(data: any) {
    const { error } = await supabase.from(data.table).update(data.updates).eq('id', data.id);
    if (error) throw error;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      processing: this.processing
    };
  }

  /**
   * 清空队列
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineQueue = new OfflineQueueService();

/**
 * 网络状态Hook
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
      const status = offlineQueue.getQueueStatus();
      setQueueLength(status.queueLength);
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const interval = setInterval(updateStatus, 1000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, queueLength };
}
