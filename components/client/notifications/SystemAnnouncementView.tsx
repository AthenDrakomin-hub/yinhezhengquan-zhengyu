/**
 * 系统公告页面
 * 显示系统公告和通知
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService, { UserNotification } from '../../../services/notificationService';

interface SystemAnnouncementViewProps {
  onBack?: () => void;
}

const SystemAnnouncementView: React.FC<SystemAnnouncementViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<UserNotification | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载系统公告
  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取 SYSTEM 和 ANNOUNCEMENT 类型的通知
      const [systemData, announcementData] = await Promise.all([
        notificationService.getNotifications({
          type: 'SYSTEM',
          filter,
          limit: 50,
        }),
        notificationService.getNotifications({
          type: 'ANNOUNCEMENT',
          filter,
          limit: 50,
        }),
      ]);

      // 合并并按时间排序
      const allAnnouncements = [...systemData, ...announcementData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setAnnouncements(allAnnouncements);
    } catch (err) {
      console.error('加载系统公告失败:', err);
      setError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  // 查看公告详情
  const handleViewAnnouncement = async (announcement: UserNotification) => {
    setSelectedAnnouncement(announcement);
    
    // 标记已读
    if (!announcement.is_read) {
      try {
        await notificationService.markAsRead(announcement.id);
        setAnnouncements(prev =>
          prev.map(a => a.id === announcement.id ? { ...a, is_read: true } : a)
        );
      } catch (err) {
        console.error('标记已读失败:', err);
      }
    }
  };

  // 全部标记已读
  const handleMarkAllRead = async () => {
    try {
      const unread = announcements.filter(a => !a.is_read);
      await Promise.all(unread.map(a => notificationService.markAsRead(a.id)));
      setAnnouncements(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (err) {
      console.error('批量标记已读失败:', err);
    }
  };

  // 获取公告类型标签
  const getTypeTag = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return { text: '公告', color: 'bg-[#E63946] text-white' };
      case 'SYSTEM':
        return { text: '系统', color: 'bg-[#0066CC] text-white' };
      case 'RISK_WARNING':
        return { text: '风险提示', color: 'bg-[#F97316] text-white' };
      default:
        return { text: '通知', color: 'bg-[#666666] text-white' };
    }
  };

  // 获取优先级图标
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'NORMAL':
        return '🟢';
      default:
        return '⚪';
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
  };

  // 未读数量
  const unreadCount = announcements.filter(a => !a.is_read).length;

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
            <span className="text-base font-medium">系统公告</span>
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
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="text-[#999999] text-sm mt-3">暂无系统公告</p>
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0F0]">
          {announcements.map((announcement) => {
            const tag = getTypeTag(announcement.notification_type);
            const priorityIcon = getPriorityIcon(announcement.priority);
            
            return (
              <div 
                key={announcement.id}
                onClick={() => handleViewAnnouncement(announcement)}
                className={`bg-white px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !announcement.is_read ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 未读标记 */}
                  {!announcement.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#E63946] mt-2 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {/* 优先级和类型标签 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{priorityIcon}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${tag.color}`}>
                        {tag.text}
                      </span>
                      {announcement.priority === 'URGENT' && (
                        <span className="text-xs text-[#E63946] font-medium">紧急</span>
                      )}
                    </div>
                    
                    {/* 标题 */}
                    <h3 className="text-sm font-medium text-[#333333] mb-1 line-clamp-2">
                      {announcement.title}
                    </h3>
                    
                    {/* 摘要 */}
                    <p className="text-xs text-[#666666] mb-2 line-clamp-2">
                      {announcement.content}
                    </p>
                    
                    {/* 时间 */}
                    <span className="text-xs text-[#999999]">
                      {formatTime(announcement.created_at)}
                    </span>
                  </div>
                  
                  <svg className="w-4 h-4 text-[#CCCCCC] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 公告详情弹窗 */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded ${getTypeTag(selectedAnnouncement.notification_type).color}`}>
                  {getTypeTag(selectedAnnouncement.notification_type).text}
                </span>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-[#999999]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 公告内容 */}
            <div className="p-4">
              <h2 className="text-lg font-semibold text-[#333333] mb-3">
                {selectedAnnouncement.title}
              </h2>
              
              <div className="text-xs text-[#999999] mb-4">
                发布时间：{new Date(selectedAnnouncement.created_at).toLocaleString('zh-CN')}
              </div>
              
              <div className="text-sm text-[#333333] leading-relaxed whitespace-pre-wrap">
                {selectedAnnouncement.content}
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="w-full h-10 bg-[#0066CC] text-white rounded-lg text-sm font-medium"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAnnouncementView;
