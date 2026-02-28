import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { integrationService } from '@/services/integrationService';
import { supabase } from '@/lib/supabase';

const AdminIntegrationPanel: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any[] | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchKeys = async () => {
    setFetchLoading(true);
    try {
      const data = await integrationService.getApiKeys();
      setApiKeys(data || []);
      
      // Fetch audit logs from the database
      const { data: logData, error: logError } = await supabase
        .from('admin_operation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (logError) {
        console.error('获取操作日志失败:', logError);
        // Fallback to empty array if there's an error
        setLogs([]);
      } else {
        setLogs(logData || []);
      }
    } catch (err) {
      console.error('获取 API Key 失败:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleValidate = async (userId: string) => {
    setValidatingId(userId);
    setLoading(true);
    try {
      const result = await integrationService.validateIntegration(userId);
      if (result.success) {
        setValidationResults(result.results);
      } else {
        alert('校验失败: ' + result.error);
      }
    } catch (err: any) {
      alert('校验异常: ' + err.message);
    } finally {
      setLoading(false);
      setValidatingId(null);
    }
  };

  const handleManageKey = async (userId: string, action: 'generate' | 'disable') => {
    try {
      await integrationService.manageApiKey(userId, action);
      await fetchKeys();
      alert(action === 'generate' ? 'API Key 已生成' : 'API Key 已禁用');
    } catch (err: any) {
      alert('操作失败: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* API Keys Section */}
      <div className="industrial-card p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">API 接入密钥</h3>
            <p className="text-xs text-industrial-400 font-bold mt-1">管理外部客户端访问系统的凭证</p>
          </div>
          <button className="industrial-button-primary" onClick={fetchKeys}>
            <ICONS.Market size={16} className={fetchLoading ? 'animate-spin' : ''} /> 刷新列表
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-industrial-200">
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">API Key</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">状态</th>
                <th className="py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {fetchLoading ? (
                <tr><td colSpan={4} className="py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : apiKeys.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-xs font-bold text-industrial-400">暂无 API Key</td></tr>
              ) : apiKeys.map((key) => (
                <tr key={key.id}>
                  <td className="py-4 text-xs font-black text-industrial-800">
                    {key.username}
                    {key.user_id && <p className="text-[9px] text-industrial-400 font-mono">{key.user_id}</p>}
                  </td>
                  <td className="py-4">
                    <code className="text-[10px] font-mono bg-industrial-50 px-2 py-1 rounded border border-industrial-200 text-industrial-600">
                      {key.api_key}
                    </code>
                  </td>
                  <td className="py-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${key.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {key.status === 'ACTIVE' ? '启用中' : '已禁用'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleValidate(key.user_id || key.id)}
                        disabled={loading}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1"
                      >
                        <ICONS.Zap size={10} className={validatingId === (key.user_id || key.id) ? 'animate-pulse' : ''} /> 一键校验
                      </button>
                      <button 
                        onClick={() => handleManageKey(key.user_id || key.id, key.status === 'ACTIVE' ? 'disable' : 'generate')}
                        className={`text-[10px] font-black uppercase hover:underline ${key.status === 'ACTIVE' ? 'text-accent-red' : 'text-emerald-600'}`}
                      >
                        {key.status === 'ACTIVE' ? '禁用' : '启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="industrial-card p-8">
          <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest mb-6">校验报告 (Validation Report)</h3>
          {validationResults ? (
            <div className="space-y-4">
              {validationResults.map((res, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-industrial-50 rounded-xl border border-industrial-200">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      res.status === 'PASS' ? 'bg-emerald-100 text-emerald-600' : 
                      res.status === 'WARN' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {res.status === 'PASS' ? <ICONS.Shield size={16} /> : <ICONS.Zap size={16} />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-industrial-800">{res.item}</p>
                      <p className="text-[10px] text-industrial-400 font-bold">{res.detail}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded ${
                    res.status === 'PASS' ? 'bg-emerald-500 text-white' : 
                    res.status === 'WARN' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {res.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ICONS.Shield size={48} className="mx-auto text-industrial-100 mb-4" />
              <p className="text-xs font-bold text-industrial-400 uppercase tracking-widest">请点击上方“一键校验”开始诊断</p>
            </div>
          )}
        </div>

        <div className="industrial-card p-8">
          <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest mb-6">接入审计日志 (Audit Log)</h3>
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex justify-between items-start p-4 bg-industrial-50 rounded-lg border border-industrial-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-industrial-800 uppercase">{log.operation_type || log.type || 'SYSTEM'}</span>
                    <span className="text-[9px] text-industrial-400 font-bold">{new Date(log.created_at || log.created_at || log.time).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs font-bold text-industrial-600">{log.remark || log.description || log.content || '系统操作记录'}</p>
                </div>
                <ICONS.Shield size={14} className="text-industrial-300" />
              </div>
            ))}
            <button className="w-full mt-4 py-2 text-[10px] font-black text-industrial-400 uppercase tracking-widest hover:text-industrial-800 transition-colors">
              查看完整审计记录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIntegrationPanel;
