import React from 'react';
import { BatchIPOPanel } from '../client/trading/BatchIPOPanel';

// 创建一个包装组件以适配路由系统
const WrappedBatchIPOPanel: React.FC = () => {
  return <BatchIPOPanel />;
};

export default WrappedBatchIPOPanel;