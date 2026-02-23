import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { integrationService } from '@/services/integrationService';
import { supabase } from '@/lib/supabase';

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
    setTestResult(null);
    try {
      // 1. 获取一个API Key进行测试
      if (apiKeys.length === 0) {
        setTestResult('失败：暂无API Key可测试');
        return;
      }

      const testKey = apiKeys[0];
      
      // 2. 校验API Key是否存在、是否禁用
      if (testKey.status !== 'ACTIVE') {
        setTestResult(`失败：API Key无效（已禁用）`);
        
        // 记录审计日志
        await supabase.from('admin_operation_logs').insert({
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          operate_type: 'API_KEY_VALIDATE',
          target_user_id: testKey.id,
          operate_content: { 
            api_key: testKey.api_key,
            status: testKey.status,
            result: 'FAILED',
            reason: 'API Key已禁用'
          },
          ip_address: 'N/A'
        });
        
        return;
      }

      // 3. 模拟调用核心接口，校验是否符合当前交易规则
      // 使用validate-trade-rule函数测试衍生品规则（使用合规的杠杆值10）
      const { data: ruleCheck, error: ruleError } = await supabase.functions.invoke('validate-trade-rule', {
        body: {
          order_type: 'DERIVATIVES',
          order_params: {
            quantity: 100,
            leverage: 10, // 使用合规的杠杆值，测试成功场景
            amount: 10000
          }
        }
      });

      if (ruleError) {
        setTestResult(`失败：API Key有效但规则校验失败：${ruleError.message}`);
        
        // 记录审计日志
        await supabase.from('admin_operation_logs').insert({
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          operate_type: 'API_KEY_VALIDATE',
          target_user_id: testKey.id,
          operate_content: { 
            api_key: testKey.api_key,
            status: testKey.status,
            result: 'FAILED',
            reason: `规则校验失败：${ruleError.message}`
          },
          ip_address: 'N/A'
        });
        
        return;
      }

      // 4. 检查规则校验结果
      if (!ruleCheck.valid) {
        setTestResult(`失败：API Key有效但规则校验失败：${ruleCheck.error}`);
        
        // 记录审计日志
        await supabase.from('admin_operation_logs').insert({
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          operate_type: 'API_KEY_VALIDATE',
          target_user_id: testKey.id,
          operate_content: { 
            api_key: testKey.api_key,
            status: testKey.status,
            result: 'FAILED',
            reason: `规则校验失败：${ruleCheck.error}`
          },
          ip_address: 'N/A'
        });
        
        return;
      }

      // 5. 成功情况
      setTestResult('成功：API Key有效 + 规则校验通过');
      
      // 记录审计日志
      await supabase.from('admin_operation_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        operate_type: 'API_KEY_VALIDATE',
        target_user_id: testKey.id,
        operate_content: { 
          api_key: testKey.api_key,
          status: testKey.status,
          result: 'SUCCESS',
          rule_type: 'DERIVATIVES',
          checked_at: ruleCheck.checked_at
        },
        ip_address: 'N/A'
      });

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

      {/* 一键校验功能 */}
      <div className="industrial-card p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">API 一键校验</h3>
            <p className="text-xs text-industrial-400 font-bold mt-1">校验 API Key 有效性及规则合规性</p>
          </div>
          <button 
            onClick={handleTestApi}
            disabled={loading}
            className="industrial-button-primary"
          >
            <ICONS.Zap size={16} /> {loading ? '校验中...' : '执行一键校验'}
          </button>
        </div>
        
        {testResult && (
          <div className="mt-6 p-4 bg-industrial-50 rounded-lg border border-industrial-200">
            <h4 className="text-xs font-black text-industrial-800 uppercase mb-2">校验结果</h4>
            <div className={`text-sm font-bold ${testResult.includes('成功') ? 'text-emerald-600' : 'text-red-600'}`}>
              {testResult}
            </div>
            <p className="text-[10px] text-industrial-400 mt-2">
              校验内容：API Key 有效性 + 交易规则合规性
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminIntegrationPanel;
