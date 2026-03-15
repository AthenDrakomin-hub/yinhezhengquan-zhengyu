/**
 * 成交回报页面
 * 显示用户的交易成交记录通知
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService, { UserNotification } from '../../../services/notificationService';
import { tradeService } from '../../../services/tradeService';

interface TradeAlertViewProps {
  onBack?: () => void;
}

const TradeAlertView: React.FC<TradeAlertViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [error, setError] = useState<string | null>(null);

  // 加载成交回报
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getNotifications({
        type: 'TRADE',
        filter,
        limit: 100,
      });
      setNotifications(data);
    } catch (err) {
      console.error('加载成交回报失败:', err);
      setError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  // 标记已读
  const handleMarkRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  // 全部标记已读
  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => notificationService.markAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('批量标记已读失败:', err);
    }
  };

  // 解析成交详情
  const parseTradeDetail = (notification: UserNotification) => {
    try {
      if (notification.related_type === 'trade' && notification.related_id) {
        // 从通知内容解析交易信息
        const content = notification.content || '';
        return {
          hasDetail: true,
          tradeId: notification.related_id,
        };
      }
    } catch {
      // 忽略解析错误
    }
    return { hasDetail: false };
  };

  // 获取交易类型标签
  const getTradeTypeTag = (notification: UserNotification) => {
    const title = notification.title.toLowerCase();
    if (title.includes('买入') || title.includes('buy')) {
      return { text: '买入', color: 'bg-[#E63946] text-white' };
    } else if (title.includes('卖出') || title.includes('sell')) {
      return { text: '卖出', color: 'bg-[#22C55E] text-white' };
    }
    return { text: '成交', color: 'bg-[#0066CC] text-white' };
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      // 今天
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  // 未读数量
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-12">
          <button 
            onClick={() => onBack ? onBack() : navigate(-1)}
            className="flex items-center text-[#333333]"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-base font-medium">成交回报</span>
          </button>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[#0066CC] px-2 py-1"
              >
                全部已读
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-[#0066CC] px-2 py-1"
            >
              刷新
            </button>
          </div>
        </div>
      </header>

      {/* 筛选标签 */}
      <div className="bg-white px-4 py-2 flex gap-3 border-b border-gray-100">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm ${
            filter === 'all' 
              ? 'bg-[#0066CC] text-white' 
              : 'bg-[#F5F5F5] text-[#666666]'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-full text-sm flex items-center gap-1 ${
            filter === 'unread' 
              ? 'bg-[#0066CC] text-white' 
              : 'bg-[#F5F5F5] text-[#666666]'
          }`}
        >
          未读
          {unreadCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              filter === 'unread' ? 'bg-white/20' : 'bg-[#E63946] text-white'
            }`}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 加载中 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0066CC] border-t-transparent"></div>
          <p className="text-[#999999] text-sm mt-3">加载中...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-[#999999] text-sm mt-3">暂无成交回报</p>
          <p className="text-[#CCCCCC] text-xs mt-1">交易成交后会在此提醒您</p>
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0F0]">
          {notifications.map((notification) => {
            const tag = getTradeTypeTag(notification);
            const detail = parseTradeDetail(notification);
            
            return (
              <div 
                key={notification.id}
                className={`bg-white px-4 py-3 ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                onClick={() => !notification.is_read && handleMarkRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {/* 未读标记 */}
                  {!notification.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#0066CC] mt-2 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {/* 标题行 */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${tag.color}`}>
                        {tag.text}
                      </span>
                      <span className="text-sm font-medium text-[#333333] truncate">
                        {notification.title}
                      </span>
                    </div>
                    
                    {/* 内容 */}
                    <p className="text-sm text-[#666666] mb-2 line-clamp-2">
                      {notification.content}
                    </p>
                    
                    {/* 时间 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#999999]">
                        {formatTime(notification.created_at)}
                      </span>
                      {detail.hasDetail && (
                        <button className="text-xs text-[#0066CC] flex items-center gap-0.5">
                          查看详情
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部说明 */}
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-[#999999]">成交回报会在交易完成后实时推送</p>
      </div>
    </div>
  );
};

export default TradeAlertView;
