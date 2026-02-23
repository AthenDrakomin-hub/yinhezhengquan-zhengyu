import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { integrationService } from '@/services/integrationService';

const AdminIntegrationPanel: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const fetchKeys = async () => {
    setFetchLoading(true);
    try {
      const data = await integrationService.getApiKeys();
      setApiKeys(data || []);
    } catch (err) {
      console.error('获取 API Key 失败:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleTestApi = async () => {
    setLoading(true);
    try {
      const result = await integrationService.testApi('/api/market/quotes', {
        market_type: 'CN',
        stock_codes: ['600000']
      });
      setTestResult(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setTestResult('测试失败: ' + err.message);
    } finally {
      setLoading(false);
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
                  <td className="py-4 text-xs font-black text-industrial-800">{key.username || key.id}</td>
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
                    <button className="text-[10px] font-black text-accent-red uppercase hover:underline">禁用</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Tester Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="industrial-card p-8">
          <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest mb-6">接口在线测试</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">接口路径</label>
              <select className="industrial-input">
                <option>/api/market/quotes</option>
                <option>/api/trades/basic/buy</option>
                <option>/api/holdings/query</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">请求参数 (JSON)</label>
              <textarea 
                className="industrial-input h-32 font-mono text-xs"
                defaultValue={`{\n  "symbol": "600000",\n  "market": "CN"\n}`}
              />
            </div>
            <button 
              onClick={handleTestApi}
              disabled={loading}
              className="industrial-button-primary w-full"
            >
              <ICONS.Zap size={16} /> {loading ? '请求中...' : '发起测试请求'}
            </button>
          </div>
        </div>

        <div className="industrial-card p-8 bg-industrial-900">
          <h3 className="text-sm font-black text-industrial-100 uppercase tracking-widest mb-6">响应结果</h3>
          {testResult ? (
            <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto">
              {testResult}
            </pre>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs font-bold text-industrial-600 uppercase tracking-widest">等待请求...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminIntegrationPanel;
