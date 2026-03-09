import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, CheckCircle, AlertCircle, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface IPOSyncStatus {
  lastSyncTime: string;
  nextSyncTime: string;
  totalCount: number;
  status: 'success' | 'failed' | 'syncing';
}

interface SyncHistoryRecord {
  id: string;
  sync_time: string;
  status: 'success' | 'failed' | 'partial';
  total_count: number;
  new_count: number;
  updated_count: number;
  error_message: string | null;
  triggered_by: 'manual' | 'scheduled' | 'auto';
}

export const IPOSyncManager = () => {
  const [syncStatus, setSyncStatus] = useState<IPOSyncStatus>({
    lastSyncTime: '未同步',
    nextSyncTime: '每天 08:00',
    totalCount: 0,
    status: 'success'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryRecord[]>([]);

  // 加载同步状态
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      // 获取最近一次同步记录
      const { data, error } = await supabase
        .from('ipo_sync_history')
        .select('*')
        .order('sync_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSyncStatus({
          lastSyncTime: new Date(data.sync_time).toLocaleString('zh-CN'),
          nextSyncTime: '每天 08:00',
          totalCount: data.total_count || 0,
          status: data.status
        });
      }

      // 获取IPO总数
      const { count } = await supabase
        .from('ipos')
        .select('*', { count: 'exact', head: true });

      if (count !== null) {
        setSyncStatus(prev => ({ ...prev, totalCount: count }));
      }
    } catch (error) {
      console.error('加载同步状态失败:', error);
      // 表可能不存在，设置默认值
      setSyncStatus({
        lastSyncTime: '未同步',
        nextSyncTime: '每天 08:00',
        totalCount: 0,
        status: 'success'
      });
    }
  };

  // 手动触发同步
  const handleManualSync = async () => {
    setIsSyncing(true);
    setMessage('正在同步 IPO 数据...');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-ipo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setSyncStatus({
          lastSyncTime: new Date().toLocaleString('zh-CN'),
          nextSyncTime: '每天 08:00',
          totalCount: result.count,
          status: 'success'
        });
        setMessage(`✅ 同步成功！共更新 ${result.count} 条 IPO 数据`);
      } else {
        setSyncStatus({
          ...syncStatus,
          status: 'failed'
        });
        setMessage(`❌ 同步失败：${result.error || '未知错误'}`);
      }
    } catch (error) {
      setSyncStatus({
        ...syncStatus,
        status: 'failed'
      });
      setMessage(`❌ 同步失败：${error instanceof Error ? error.message : '网络错误'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 查看同步历史
  const viewHistory = async () => {
    setShowHistory(!showHistory);
    if (!showHistory && syncHistory.length === 0) {
      setHistoryLoading(true);
      try {
        const { data, error } = await supabase
          .from('ipo_sync_history')
          .select('*')
          .order('sync_time', { ascending: false })
          .limit(20);

        if (data) {
          setSyncHistory(data as SyncHistoryRecord[]);
        }
      } catch (err) {
        console.error('加载历史失败:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  // 删除历史记录
  const deleteHistory = async (id: string) => {
    try {
      await supabase.from('ipo_sync_history').delete().eq('id', id);
      setSyncHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  // 状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return '成功';
      case 'failed': return '失败';
      case 'partial': return '部分成功';
      default: return status;
    }
  };

  const getTriggerText = (trigger: string) => {
    switch (trigger) {
      case 'manual': return '手动触发';
      case 'scheduled': return '定时任务';
      case 'auto': return '自动触发';
      default: return trigger;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl mx-auto">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">IPO 数据同步管理</h2>
            <p className="text-sm text-gray-500">自动同步 + 手动触发</p>
          </div>
        </div>
        
        {/* 状态指示器 */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          syncStatus.status === 'success' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          {syncStatus.status === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`text-sm font-bold ${
            syncStatus.status === 'success' ? 'text-green-600' : 'text-red-600'
          }`}>
            {syncStatus.status === 'success' ? '正常' : '异常'}
          </span>
        </div>
      </div>

      {/* 信息卡片 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-600">上次同步时间</span>
          </div>
          <p className="text-lg font-black text-gray-900">{syncStatus.lastSyncTime}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-green-600" />
            <span className="text-sm font-bold text-gray-600">数据总量</span>
          </div>
          <p className="text-lg font-black text-gray-900">{syncStatus.totalCount} 条</p>
        </div>
      </div>

      {/* 定时任务信息 */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-bold text-gray-600">自动同步设置</span>
        </div>
        <p className="text-sm text-gray-700">
          <span className="font-bold">执行时间：</span>每天 08:00 AM<br />
          <span className="font-bold">数据源：</span>新浪财经 IPO 接口<br />
          <span className="font-bold">存储位置：</span>Supabase ipos 表
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              同步中...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              手动同步
            </>
          )}
        </button>

        <button
          onClick={viewHistory}
          className="flex-1 bg-white border-2 border-gray-200 hover:border-blue-600 text-gray-700 hover:text-blue-600 font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          <Calendar className="w-5 h-5" />
          {showHistory ? '收起历史' : '查看历史'}
        </button>
      </div>

      {/* 同步历史记录 */}
      {showHistory && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-80 overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            同步历史记录
          </h3>
          {historyLoading ? (
            <div className="text-center py-4 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : syncHistory.length === 0 ? (
            <div className="text-center py-4 text-gray-500">暂无同步记录</div>
          ) : (
            <div className="space-y-2">
              {syncHistory.map((record) => (
                <div key={record.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getStatusColor(record.status)}`}>
                        {getStatusText(record.status)}
                      </span>
                      <span className="text-xs text-gray-500">{getTriggerText(record.triggered_by)}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(record.sync_time).toLocaleString('zh-CN')} · 
                      共 {record.total_count} 条 (新增 {record.new_count} / 更新 {record.updated_count})
                    </div>
                    {record.error_message && (
                      <div className="text-xs text-red-500 mt-1">{record.error_message}</div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteHistory(record.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-xl mb-4 ${
          message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <p className="text-sm font-bold">{message}</p>
        </div>
      )}

      {/* 注意事项 */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl">
        <p className="text-sm text-yellow-800">
          <span className="font-bold">注意：</span>
          手动同步会覆盖当前所有 IPO 数据。建议在交易时间外执行，避免影响用户操作。
        </p>
      </div>
    </div>
  );
};

export default IPOSyncManager;
