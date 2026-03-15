import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

// 通知类型
interface UserNotification {
  id: string;
  user_id: string;
  notification_type: 'SYSTEM' | 'TRADE' | 'FORCE_SELL' | 'APPROVAL' | 'RISK_WARNING' | 'ACCOUNT' | 'ANNOUNCEMENT';
  title: string;
  content: string;
  related_type?: string;
  related_id?: string;
  is_read: boolean;
  read_at?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  expires_at?: string;
  created_at: string;
}

// 通知类型配置
const notificationTypeConfig = {
  SYSTEM: { label: '系统通知', color: 'bg-[var(--color-secondary-light)] text-[var(--color-secondary)] border-[var(--color-secondary)]/30', icon: ICONS.Shield },
  TRADE: { label: '交易通知', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: ICONS.Trade },
  FORCE_SELL: { label: '强制平仓', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: ICONS.AlertTriangle },
  APPROVAL: { label: '审批结果', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: ICONS.Shield },
  RISK_WARNING: { label: '风险预警', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: ICONS.AlertTriangle },
  ACCOUNT: { label: '账户通知', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: ICONS.User },
  ANNOUNCEMENT: { label: '公告', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: ICONS.Info }
};

// 优先级配置
const priorityConfig = {
  LOW: { label: '低', color: 'text-slate-400' },
  NORMAL: { label: '普通', color: 'text-slate-300' },
  HIGH: { label: '高', color: 'text-orange-400' },
  URGENT: { label: '紧急', color: 'text-red-400' }
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // 获取通知列表
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      }

      if (selectedType) {
        query = query.eq('notification_type', selectedType);
      }

      const { data, error } = await query;
      if (!error && data) {
        setNotifications(data as UserNotification[]);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 标记已读
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
        );
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 全部标记已读
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('全部标记已读失败:', error);
    }
  };

  // 实时订阅通知
  useEffect(() => {
    if (!isOpen) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications'
      }, (payload) => {
        const newNotification = payload.new as UserNotification;
        setNotifications(prev => [newNotification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, filter, selectedType]);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  // 未读数量
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-[80vh] galaxy-card rounded-2xl overflow-hidden flex flex-col"
          >
            {/* 头部 */}
            <div className="p-6 border-b border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">通知中心</h2>
                  {unreadCount > 0 && (
                    <p className="text-xs text-emerald-400 font-bold">{unreadCount} 条未读</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <ICONS.Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* 筛选 */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    filter === 'all' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    filter === 'unread' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                  }`}
                >
                  未读
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 transition-colors"
                  >
                    全部已读
                  </button>
                )}
              </div>

              {/* 类型筛选 */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(notificationTypeConfig).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                      selectedType === type ? config.color + ' border' : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 通知列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <ICONS.Info size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-sm text-slate-500">暂无通知</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const typeConfig = notificationTypeConfig[notification.notification_type];
                  const Icon = typeConfig.icon;

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        notification.is_read
                          ? 'bg-white/5 border-white/10'
                          : 'bg-white/10 border-emerald-500/30'
                      }`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-bold text-white truncate">{notification.title}</h4>
                            <span className={`text-[10px] font-bold ${priorityConfig[notification.priority].color}`}>
                              {priorityConfig[notification.priority].label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notification.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                            <span className="text-[10px] text-slate-500">{formatTime(notification.created_at)}</span>
                          </div>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
