import React from 'react';

const SupabaseConnectionCheck: React.FC = () => {
  // 纯前端行情数据源方案不需要Supabase后端连接
  // 直接返回null，避免产生404错误
  return null;
};

export default SupabaseConnectionCheck;