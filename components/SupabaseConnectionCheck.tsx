import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type ConnectionStatus = 'checking' | 'connected' | 'tables_missing' | 'disconnected';

const SupabaseConnectionCheck: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [message, setMessage] = useState<string>('检查 Supabase 连接...');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('🔍 开始检查 Supabase 连接...');
        console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL || '未设置');
        console.log('是否演示模式:', import.meta.env.VITE_SUPABASE_URL?.includes('placeholder') || !import.meta.env.VITE_SUPABASE_URL);

        // 步骤1: 检查基本连接
        console.log('步骤1: 检查基本连接...');
        const { data: session, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('❌ Supabase 连接失败:', authError);
          setStatus('disconnected');
          setMessage(`连接失败: ${authError.message}`);
          return;
        }

        console.log('✅ 基本连接成功');
        
        // 步骤2: 检查必要的表是否存在
        console.log('步骤2: 检查数据库表...');
        try {
          // 尝试查询 profiles 表（这是应用的关键表）
          // 使用简单的 select * limit 1 查询，避免 count 查询的权限问题
          const { data, error: tableError, count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: false })
            .limit(1);

          console.log('表查询结果:', { data, tableError, count });

          if (tableError) {
            // 将错误对象转换为可读字符串
            const errorString = JSON.stringify(tableError, null, 2);
            const errorMessage = tableError.message || errorString;
            
            console.warn('⚠️  连接到 Supabase，但缺少必要的表或权限不足');
            console.warn('完整错误对象:', errorString);
            console.warn('错误代码:', tableError.code);
            console.warn('错误消息:', tableError.message);
            console.warn('错误详情:', tableError.details);
            console.warn('错误提示:', tableError.hint);
            
            // 检查错误类型
            const isTableMissing = tableError.code === 'PGRST116' || 
                errorMessage.includes('relation') || 
                errorMessage.includes('does not exist') ||
                errorMessage.includes('42P01'); // 表不存在错误代码
                
            const isPermissionError = errorMessage.includes('permission denied') ||
                errorMessage.includes('权限被拒绝') ||
                errorMessage.includes('42501'); // 权限拒绝错误代码
            
            if (isTableMissing || isPermissionError) {
              setStatus('tables_missing');
              setMessage('已连接但表缺失或权限不足，需要运行迁移');
            } else {
              setStatus('disconnected');
              setMessage(`表查询错误: ${errorMessage.substring(0, 100)}...`);
            }
            return;
          }

          console.log('✅ 数据库表存在，查询成功');
          console.log('查询到的数据:', data);
          console.log('记录数量:', count);
          setStatus('connected');
          setMessage('已成功连接到 Supabase 且表存在');
        } catch (tableCheckError: any) {
          console.error('❌ 表检查异常详情:', {
            message: tableCheckError.message,
            stack: tableCheckError.stack,
            originalError: tableCheckError
          });
          
          // 基本连接成功，但表检查失败，可能是表不存在或权限问题
          console.warn('⚠️  连接到 Supabase，但表检查失败（可能表不存在或权限问题）');
          setStatus('tables_missing');
          setMessage(`表检查失败: ${tableCheckError.message || '可能表不存在或权限问题'}`);
        }
      } catch (error: any) {
        console.error('❌ 连接检查失败:', error);
        setStatus('disconnected');
        setMessage(`检查失败: ${error.message}`);
      }
    };

    checkConnection();
  }, []);

  // 状态颜色映射
  const statusColors = {
    checking: 'bg-gray-500',
    connected: 'bg-green-500',
    tables_missing: 'bg-yellow-500',
    disconnected: 'bg-red-500',
  };

  const statusText = {
    checking: '检查中',
    connected: '已连接',
    tables_missing: '表缺失',
    disconnected: '未连接',
  };

  const statusDescriptions = {
    checking: '正在检查 Supabase 连接...',
    connected: '✅ 已成功连接到 Supabase 且数据库表存在',
    tables_missing: '⚠️  已连接到 Supabase，但缺少必要的表（需要运行迁移）',
    disconnected: '❌ 无法连接到 Supabase（检查网络或环境变量）',
  };

  // 在控制台输出状态信息
  useEffect(() => {
    console.log(`Supabase 连接状态: ${statusText[status]} - ${statusDescriptions[status]}`);
    console.log('环境变量 VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || '未设置');
    console.log('环境变量 VITE_PUBLIC_SUPABASE_ANON_KEY:', import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ? '已设置' : '未设置');
  }, [status]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <div 
        className={`w-3 h-3 rounded-full ${statusColors[status]} animate-pulse`}
        title={statusDescriptions[status]}
      />
      <div className="text-xs text-gray-300 hidden md:block">
        {statusText[status]}
      </div>
      <div className="text-xs text-gray-500 hidden lg:block">
        ({message})
      </div>
    </div>
  );
};

export default SupabaseConnectionCheck;
