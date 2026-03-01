import React from 'react';
import { useNetworkStatus } from '../services/offlineQueueService';
import { ICONS } from '../constants';

const NetworkStatusBar: React.FC = () => {
  const { isOnline, queueLength } = useNetworkStatus();

  if (isOnline && queueLength === 0) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${isOnline ? 'bg-amber-500' : 'bg-red-500'} text-white py-2 px-4 text-center text-sm font-bold`}>
      {!isOnline && (
        <div className="flex items-center justify-center gap-2">
          <ICONS.WifiOff size={16} />
          网络已断开，订单将在网络恢复后自动提交
        </div>
      )}
      {isOnline && queueLength > 0 && (
        <div className="flex items-center justify-center gap-2">
          <ICONS.RefreshCw size={16} className="animate-spin" />
          正在同步离线订单 ({queueLength} 条)...
        </div>
      )}
    </div>
  );
};

export default NetworkStatusBar;
