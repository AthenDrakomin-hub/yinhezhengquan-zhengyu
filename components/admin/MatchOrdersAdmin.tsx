/**
 * 撮合引擎管理页面
 * 
 * 功能：
 * 1. 执行数据库迁移
 * 2. 手动触发撮合引擎
 * 3. 查看撮合状态和日志
 * 4. 配置定时任务
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/lib/supabase';

// 撮合日志接口
interface MatchLog {
  id: string;
  batch_id: string;
  status: string;
  total_orders: number;
  matched_count: number;
  failed_count: number;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

// 统计接口
interface MatchStats {
  totalBatches: number;
  totalOrders: number;
  totalMatched: number;
  totalFailed: number;
  avgDuration: number;
}

const MatchOrdersAdmin: React.FC = () => {
  const { user } = useAuth();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [logs, setLogs] = useState<MatchLog[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'config'>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 检查管理员权限
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('admin_level')
          .eq('id', user.id)
          .single();
        
        const isAdmin = checkIsAdmin(profile);
        setIsAdminUser(isAdmin);
        
        if (!isAdmin) {
          setMessage({ type: 'error', text: '无权限访问此页面' });
        }
      } catch (error) {
        console.error('检查权限失败:', error);
        setMessage({ type: 'error', text: '权限检查失败' });
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [user]);

  // 加载撮合日志
  const loadLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('match_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  }, []);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('match_logs')
        .select('total_orders, matched_count, failed_count, duration_ms')
        .gte('started_at', today);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const statsData: MatchStats = {
          totalBatches: data.length,
          totalOrders: data.reduce((sum, log) => sum + (log.total_orders || 0), 0),
          totalMatched: data.reduce((sum, log) => sum + (log.matched_count || 0), 0),
          totalFailed: data.reduce((sum, log) => sum + (log.failed_count || 0), 0),
          avgDuration: data.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / data.length
        };
        setStats(statsData);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    if (isAdminUser) {
      loadLogs();
      loadStats();
    }
  }, [isAdminUser, loadLogs, loadStats]);

  // 执行迁移
  const executeMigration = async (migrationName: string) => {
    if (!isAdminUser) return;
    
    setExecuting(true);
    setMessage(null);
    
    try {
      // 调用 Edge Function 执行迁移
      const { data, error } = await supabase.functions.invoke('execute-migration', {
        body: { migration: migrationName }
      });
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: `迁移 ${migrationName} 执行成功` });
      loadLogs();
    } catch (error: any) {
      console.error('执行迁移失败:', error);
      setMessage({ type: 'error', text: `迁移失败: ${error.message}` });
    } finally {
      setExecuting(false);
    }
  };

  // 手动触发撮合
  const triggerMatchOrders = async () => {
    if (!isAdminUser) return;
    
    setExecuting(true);
    setMessage(null);
    
    try {
      // 调用撮合引擎 Edge Function
      const { data, error } = await supabase.functions.invoke('match-orders', {
        body: {}
      });
      
      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: `撮合完成: 处理 ${data?.totalOrders || 0} 个订单，匹配 ${data?.matchedCount || 0} 个` 
      });
      
      // 刷新日志
      loadLogs();
      loadStats();
    } catch (error: any) {
      console.error('触发撮合失败:', error);
      setMessage({ type: 'error', text: `撮合失败: ${error.message}` });
    } finally {
      setExecuting(false);
    }
  };

  // 查看定时任务状态
  const checkCronJobs = async () => {
    try {
      const { data, error } = await supabase.rpc('get_cron_jobs');
      
      if (error) throw error;
      
      console.log('定时任务状态:', data);
      setMessage({ type: 'success', text: `找到 ${data?.length || 0} 个定时任务` });
    } catch (error: any) {
      console.error('查询定时任务失败:', error);
      setMessage({ type: 'error', text: `查询失败: ${error.message}` });
    }
  };

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC]"></div>
      </div>
    );
  }

  // 无权限
  if (!isAdminUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-[#E63946]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-lg text-[#333333] font-medium">无权限访问</p>
          <p className="text-sm text-[#999999] mt-2">此页面仅限管理员访问</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <div className="bg-[#0066CC] px-4 py-3 sticky top-0 z-10">
        <h1 className="text-white text-lg font-semibold">撮合引擎管理</h1>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-[#E5F9EF] text-[#22C55E]' : 'bg-[#FEE2E2] text-[#E63946]'
        }`}>
          {message.text}
        </div>
      )}

      {/* 选项卡 */}
      <div className="bg-white px-4 py-2 flex gap-4 border-b border-[#F0F0F0] sticky top-12 z-10">
        {[
          { key: 'overview', label: '概览' },
          { key: 'logs', label: '日志' },
          { key: 'config', label: '配置' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab.key
                ? 'bg-[#0066CC] text-white'
                : 'text-[#666666] hover:bg-[#F5F5F5]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 概览 */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4">
                <p className="text-xs text-[#999999]">今日撮合批次</p>
                <p className="text-2xl font-bold text-[#333333] mt-1">
                  {stats?.totalBatches || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-xs text-[#999999]">处理订单数</p>
                <p className="text-2xl font-bold text-[#0066CC] mt-1">
                  {stats?.totalOrders || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-xs text-[#999999]">匹配成功</p>
                <p className="text-2xl font-bold text-[#22C55E] mt-1">
                  {stats?.totalMatched || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-xs text-[#999999]">匹配失败</p>
                <p className="text-2xl font-bold text-[#E63946] mt-1">
                  {stats?.totalFailed || 0}
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-[#333333] mb-3">快捷操作</h3>
              
              <button
                onClick={triggerMatchOrders}
                disabled={executing}
                className="w-full py-3 bg-[#0066CC] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? '执行中...' : '手动触发撮合'}
              </button>
              
              <button
                onClick={checkCronJobs}
                className="w-full py-3 bg-[#F5F5F5] text-[#333333] rounded-lg font-medium"
              >
                查看定时任务状态
              </button>
            </div>

            {/* 最近撮合 */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#333333] mb-3">最近撮合记录</h3>
              
              {logs.length === 0 ? (
                <p className="text-sm text-[#999999] text-center py-4">暂无撮合记录</p>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-[#F0F0F0] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[#333333]">
                          {log.matched_count}/{log.total_orders} 订单
                        </p>
                        <p className="text-xs text-[#999999]">
                          {new Date(log.started_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.status === 'COMPLETED' 
                          ? 'bg-[#E5F9EF] text-[#22C55E]' 
                          : log.status === 'RUNNING'
                          ? 'bg-[#E5F0FF] text-[#3B82F6]'
                          : 'bg-[#FEE2E2] text-[#E63946]'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 日志 */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center justify-between">
              <h3 className="text-sm font-medium text-[#333333]">撮合日志</h3>
              <button
                onClick={loadLogs}
                className="text-xs text-[#0066CC]"
              >
                刷新
              </button>
            </div>
            
            {logs.length === 0 ? (
              <div className="p-8 text-center text-[#999999]">暂无日志记录</div>
            ) : (
              <div className="divide-y divide-[#F0F0F0]">
                {logs.map(log => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#333333]">
                        批次: {log.batch_id.slice(0, 8)}...
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.status === 'COMPLETED' 
                          ? 'bg-[#E5F9EF] text-[#22C55E]' 
                          : 'bg-[#FEE2E2] text-[#E63946]'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#666666]">
                      <div>总订单: {log.total_orders}</div>
                      <div>匹配: {log.matched_count}</div>
                      <div>失败: {log.failed_count}</div>
                      <div>耗时: {log.duration_ms}ms</div>
                    </div>
                    
                    {log.error_message && (
                      <div className="mt-2 p-2 bg-[#FEE2E2] rounded text-xs text-[#E63946]">
                        {log.error_message}
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-[#999999]">
                      {new Date(log.started_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 配置 */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* 迁移执行 */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#333333] mb-3">数据库迁移</h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => executeMigration('20250801000000_match_orders_cron')}
                  disabled={executing}
                  className="w-full py-2 bg-[#E5F0FF] text-[#0066CC] rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  执行: 撮合引擎定时任务配置
                </button>
                
                <button
                  onClick={() => executeMigration('20250802000000_enable_realtime')}
                  disabled={executing}
                  className="w-full py-2 bg-[#E5F0FF] text-[#0066CC] rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  执行: Realtime 配置
                </button>
              </div>
              
              <p className="text-xs text-[#999999] mt-3">
                注意：迁移会修改数据库结构，请谨慎操作
              </p>
            </div>

            {/* 环境变量配置 */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#333333] mb-3">环境变量</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#999999]">PROJECT_URL</label>
                  <input
                    type="text"
                    placeholder="https://xxx.supabase.co"
                    className="w-full mt-1 px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-[#999999]">SERVICE_ROLE_KEY</label>
                  <input
                    type="password"
                    placeholder="服务角色密钥"
                    className="w-full mt-1 px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm"
                  />
                </div>
                
                <button
                  disabled
                  className="w-full py-2 bg-[#F5F5F5] text-[#999999] rounded-lg text-sm font-medium"
                >
                  保存配置（需要在 Supabase Dashboard 中设置）
                </button>
              </div>
            </div>

            {/* 定时任务配置 */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#333333] mb-3">定时任务</h3>
              
              <div className="space-y-2 text-sm text-[#666666]">
                <div className="flex items-center justify-between py-2 border-b border-[#F0F0F0]">
                  <span>match-orders-trading-time</span>
                  <span className="text-xs bg-[#E5F9EF] text-[#22C55E] px-2 py-1 rounded">
                    每分钟
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F0F0F0]">
                  <span>cleanup-match-logs-daily</span>
                  <span className="text-xs bg-[#E5F0FF] text-[#3B82F6] px-2 py-1 rounded">
                    每天 02:00
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>cleanup-expired-notifications</span>
                  <span className="text-xs bg-[#E5F0FF] text-[#3B82F6] px-2 py-1 rounded">
                    每天 03:00
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchOrdersAdmin;
