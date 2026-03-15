/**
 * 撮合引擎监控组件
 * 
 * 功能：
 * 1. 实时显示撮合状态
 * 2. 订阅撮合日志变化
 * 3. 显示关键指标
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// 撮合日志接口
interface MatchLog {
  id: string;
  batch_id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  total_orders: number;
  matched_count: number;
  failed_count: number;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
}

// 统计接口
interface MatchStats {
  todayBatches: number;
  todayOrders: number;
  todayMatched: number;
  avgDuration: number;
  successRate: number;
}

interface MatchOrdersMonitorProps {
  compact?: boolean;  // 紧凑模式
  showHistory?: boolean;  // 显示历史记录
  maxHistoryItems?: number;  // 历史记录数量
}

const MatchOrdersMonitor: React.FC<MatchOrdersMonitorProps> = ({
  compact = false,
  showHistory = true,
  maxHistoryItems = 5
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<MatchLog[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('match_logs')
        .select('*')
        .gte('started_at', today);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const totalOrders = data.reduce((sum, log) => sum + (log.total_orders || 0), 0);
        const totalMatched = data.reduce((sum, log) => sum + (log.matched_count || 0), 0);
        const totalFailed = data.reduce((sum, log) => sum + (log.failed_count || 0), 0);
        
        const statsData: MatchStats = {
          todayBatches: data.length,
          todayOrders: totalOrders,
          todayMatched: totalMatched,
          avgDuration: data.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / data.length,
          successRate: totalOrders > 0 ? (totalMatched / totalOrders * 100) : 0
        };
        setStats(statsData);
      } else {
        setStats({
          todayBatches: 0,
          todayOrders: 0,
          todayMatched: 0,
          avgDuration: 0,
          successRate: 0
        });
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载历史日志
  const loadLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('match_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(maxHistoryItems);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  }, [maxHistoryItems]);

  // 订阅撮合日志变化
  useEffect(() => {
    loadStats();
    loadLogs();

    // 订阅 Realtime
    const channel = supabase.channel('match-logs-monitor');
    
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'match_logs'
      },
      (payload) => {
        console.log('[Monitor] 新撮合记录:', payload);
        loadStats();
        loadLogs();
      }
    );

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    return () => {
      channel.unsubscribe();
    };
  }, [loadStats, loadLogs]);

  // 格式化持续时间
  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 紧凑模式
  if (compact) {
    return (
      <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#22C55E]' : 'bg-[#999999]'}`} />
          <span className="text-xs text-[#666666]">撮合引擎</span>
        </div>
        
        {stats && (
          <>
            <div className="text-xs">
              <span className="text-[#999999]">今日</span>
              <span className="ml-1 text-[#333333] font-medium">{stats.todayMatched}/{stats.todayOrders}</span>
            </div>
            <div className="text-xs">
              <span className="text-[#999999]">成功率</span>
              <span className={`ml-1 font-medium ${stats.successRate >= 80 ? 'text-[#22C55E]' : 'text-[#F97316]'}`}>
                {stats.successRate.toFixed(1)}%
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4">
        <div className="animate-pulse flex items-center justify-between">
          <div className="h-4 bg-[#F0F0F0] rounded w-24"></div>
          <div className="h-4 bg-[#F0F0F0] rounded w-12"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[#333333]">撮合引擎监控</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-[#999999]'}`} />
        </div>
        <button
          onClick={() => { loadStats(); loadLogs(); }}
          className="text-xs text-[#0066CC]"
        >
          刷新
        </button>
      </div>

      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-3 gap-px bg-[#F0F0F0]">
          <div className="bg-white p-3 text-center">
            <p className="text-lg font-bold text-[#333333]">{stats.todayBatches}</p>
            <p className="text-xs text-[#999999]">今日批次</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-lg font-bold text-[#0066CC]">{stats.todayMatched}</p>
            <p className="text-xs text-[#999999]">匹配成功</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className={`text-lg font-bold ${stats.successRate >= 80 ? 'text-[#22C55E]' : 'text-[#F97316]'}`}>
              {stats.successRate.toFixed(0)}%
            </p>
            <p className="text-xs text-[#999999]">成功率</p>
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {showHistory && logs.length > 0 && (
        <div className="divide-y divide-[#F0F0F0]">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  log.status === 'COMPLETED' ? 'bg-[#22C55E]' :
                  log.status === 'RUNNING' ? 'bg-[#3B82F6] animate-pulse' :
                  'bg-[#E63946]'
                }`} />
                <div>
                  <p className="text-xs text-[#333333]">
                    {log.matched_count}/{log.total_orders} 订单匹配
                  </p>
                  <p className="text-xs text-[#999999]">
                    {formatTime(log.started_at)}
                    {log.duration_ms && ` · ${formatDuration(log.duration_ms)}`}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-medium ${
                log.status === 'COMPLETED' ? 'text-[#22C55E]' :
                log.status === 'RUNNING' ? 'text-[#3B82F6]' :
                'text-[#E63946]'
              }`}>
                {log.status === 'COMPLETED' ? '完成' :
                 log.status === 'RUNNING' ? '运行中' : '失败'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {showHistory && logs.length === 0 && (
        <div className="px-4 py-8 text-center">
          <svg className="w-12 h-12 mx-auto text-[#CCCCCC] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-[#999999]">暂无撮合记录</p>
        </div>
      )}
    </div>
  );
};

export default MatchOrdersMonitor;
