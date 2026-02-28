import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // 请根据实际路径调整

const SupabaseConnectionCheck: React.FC = () => {
  // 只在开发环境显示
  if (import.meta.env.PROD) {
    return null;
  }

  const [connectionStatus, setConnectionStatus] = useState<string>('初始化中...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSupabaseConnection = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      setConnectionStatus('检查中 - 正在检查 Supabase 连接...');
      console.log('🔍 开始检查 Supabase 连接...');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '未设置';
      console.log('Supabase URL:', supabaseUrl);

      // 步骤1: 基础网络连接（使用 REST API 根路径）
      setConnectionStatus('检查中 - 验证基础网络连接...');
      const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      if (!anonKey) {
        throw new Error('匿名密钥未配置（VITE_SUPABASE_ANON_KEY/VITE_PUBLIC_SUPABASE_ANON_KEY）');
      }
      const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: controller.signal,
      });
      if (!healthResponse.ok) {
        throw new Error(`基础连接失败: HTTP ${healthResponse.status} - ${healthResponse.statusText}`);
      }
      console.log('✅ 步骤1: 基础网络连接正常');

      // 步骤2: 认证服务可用性（匿名状态允许）
      setConnectionStatus('检查中 - 验证认证服务...');
      const { error: authError } = await supabase.auth.getSession();
      if (authError && authError.message !== 'No current session') {
        throw new Error(`认证服务异常: ${authError.message}`);
      }
      console.log(authError ? 'ℹ️ 步骤2: 认证服务正常（匿名状态）' : '✅ 步骤2: 认证服务正常（已登录）');

      // 步骤3: 数据库连接（替换为安全的自定义表检查，而非系统表）
      setConnectionStatus('检查中 - 测试数据库连接...');
      // 方案：查询自己创建的表（比如 profiles，若不存在则跳过，仅做提示）
      let dbCheckPassed = false;
      const { error: dbError } = await supabase
        .from('profiles') // 替换成你实际创建的业务表（如 users/orders 等）
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);

      if (dbError) {
        if (dbError.message.includes('relation "profiles" does not exist')) {
          // 自定义表不存在，仅警告，不判定连接失败
          console.log('ℹ️ 步骤3: 自定义表 profiles 不存在（非致命错误）');
          dbCheckPassed = true; // 表不存在不代表连接失败
        } else {
          throw new Error(`数据库查询异常: ${dbError.message}`);
        }
      } else {
        console.log('✅ 步骤3: 数据库连接正常');
        dbCheckPassed = true;
      }

      // 所有核心检查通过
      if (dbCheckPassed) {
        setConnectionStatus('✅ 连接成功 - Supabase 所有检查通过！');
        setErrorDetails(null);
      }
    } catch (error) {
      let errMsg = '未知错误';
      if (error instanceof Error) {
        errMsg = error.message;
        if (errMsg.includes('aborted') || errMsg.includes('timeout')) {
          errMsg = '连接超时 - Supabase 服务器无响应（可能网络/限流/IP白名单问题）';
        }
      }
      setConnectionStatus(`❌ 连接失败 - ${errMsg}`);
      setErrorDetails(errMsg);
      console.error('❌ Supabase 连接失败详情:', error);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      console.log('📊 最终状态:', connectionStatus);
      console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
      const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
      console.log('匿名密钥:', anonKey ? '已设置' : '未设置');
    }
  };

  useEffect(() => {
    // 只在初始化时执行一次，移除自动重试的定时器，避免反复执行
    checkSupabaseConnection();

    // 注释掉自动重试的定时器，避免反复执行
    // const retryTimer = setTimeout(() => {
    //   if (connectionStatus.includes('失败') || connectionStatus.includes('初始化')) {
    //     console.log('🔄 重试连接检查...');
    //     checkSupabaseConnection();
    //   }
    // }, 5000);
    // return () => clearTimeout(retryTimer);
  }, []);

  return (
    <div style={{ padding: '20px', margin: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
      <h3>Supabase 连接状态</h3>
      <div style={{ 
        color: connectionStatus.includes('成功') ? 'green' : 
               connectionStatus.includes('失败') ? 'red' : 'orange',
        fontWeight: 'bold',
        margin: '10px 0'
      }}>
        {connectionStatus}
      </div>
      {errorDetails && (
        <div style={{ color: 'red', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
          <strong>错误详情:</strong> {errorDetails}
        </div>
      )}
      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <p>URL: {import.meta.env.VITE_SUPABASE_URL || '未配置'}</p>
        <p>匿名密钥: {import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY ? '已配置' : '未配置'}</p>
      </div>
    </div>
  );
};

export default SupabaseConnectionCheck;