/**
 * 通知管理 - 管理端
 * 管理员可以发送系统通知、查看所有通知记录
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import Pagination from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 15;

interface UserNotification {
  id: string;
  user_id: string;
  notification_type: 'SYSTEM' | 'TRADE' | 'FORCE_SELL' | 'APPROVAL' | 'RISK_WARNING' | 'ACCOUNT' | 'ANNOUNCEMENT';
  title: string;
  content: string;
  is_read: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  created_at: string;
  username?: string;
}

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SYSTEM' | 'TRADE' | 'RISK_WARNING'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // 发送通知表单
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    target: 'all', // 'all' | 'user'
    user_id: '',
    title: '',
    content: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_notifications')
        .select(`
          *,
          profiles!user_notifications_user_id_fkey (username)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter !== 'ALL') {
        query = query.eq('notification_type', filter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        username: item.profiles?.username || '未知用户'
      }));
      
      setNotifications(formattedData);
    } catch (err) {
      console.error('获取通知失败:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!sendForm.title || !sendForm.content) {
      alert('请填写标题和内容');
      return;
    }

    setSending(true);
    try {
      if (sendForm.target === 'all') {
        // 发送给所有用户
        const { data: users } = await supabase
          .from('profiles')
          .select('id');
        
        if (users && users.length > 0) {
          const notifications = users.map(user => ({
            user_id: user.id,
            notification_type: 'SYSTEM',
            title: sendForm.title,
            content: sendForm.content,
            priority: sendForm.priority
          }));
          
          const { error } = await supabase
            .from('user_notifications')
            .insert(notifications);
          
          if (error) throw error;
          
          alert(`已成功发送给 ${users.length} 位用户`);
        }
      } else {
        // 发送给指定用户
        if (!sendForm.user_id) {
          alert('请输入用户ID');
          return;
        }
        
        const { error } = await supabase
          .from('user_notifications')
          .insert({
            user_id: sendForm.user_id,
            notification_type: 'SYSTEM',
            title: sendForm.title,
            content: sendForm.content,
            priority: sendForm.priority
          });
        
        if (error) throw error;
        
        alert('发送成功');
      }
      
      setIsSendModalOpen(false);
      setSendForm({
        target: 'all',
        user_id: '',
        title: '',
        content: '',
        priority: 'NORMAL'
      });
      fetchNotifications();
    } catch (err: any) {
      console.error('发送失败:', err);
      alert('发送失败: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // 筛选
  const filteredNotifications = notifications.filter((n) => {
    if (!searchTerm) return true;
    return (
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 分页
  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'SYSTEM': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'TRADE': 'bg-green-500/20 text-green-400 border-green-500/30',
      'FORCE_SELL': 'bg-red-500/20 text-red-400 border-red-500/30',
      'APPROVAL': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'RISK_WARNING': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'ACCOUNT': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'ANNOUNCEMENT': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const getTypeText = (type: string) => {
    const texts: Record<string, string> = {
      'SYSTEM': '系统',
      'TRADE': '交易',
      'FORCE_SELL': '强平',
      'APPROVAL': '审批',
      'RISK_WARNING': '风险',
      'ACCOUNT': '账户',
      'ANNOUNCEMENT': '公告'
    };
    return texts[type] || type;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'text-slate-400',
      'NORMAL': 'text-slate-300',
      'HIGH': 'text-orange-400',
      'URGENT': 'text-red-400'
    };
    return colors[priority] || 'text-slate-400';
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    if (mins < 1440) return `${Math.floor(mins / 60)}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">通知管理</h1>
          <p className="text-sm text-slate-400 mt-1">发送系统通知和管理所有通知记录</p>
        </div>
        <button
          onClick={() => setIsSendModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <ICONS.Plus size={16} />
          发送通知
        </button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">今日发送</p>
          <p className="text-2xl font-bold text-white">
            {notifications.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">未读</p>
          <p className="text-2xl font-bold text-blue-400">
            {notifications.filter(n => !n.is_read).length}
          </p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">紧急通知</p>
          <p className="text-2xl font-bold text-red-400">
            {notifications.filter(n => n.priority === 'URGENT').length}
          </p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">系统通知</p>
          <p className="text-2xl font-bold text-green-400">
            {notifications.filter(n => n.notification_type === 'SYSTEM').length}
          </p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <input
          type="text"
          placeholder="搜索标题、内容或用户..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          {['ALL', 'SYSTEM', 'TRADE', 'RISK_WARNING'].map((type) => (
            <button
              key={type}
              onClick={() => { setFilter(type as any); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filter === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {type === 'ALL' ? '全部' : getTypeText(type)}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : paginatedNotifications.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ICONS.Info size={48} className="mx-auto mb-4 opacity-50" />
          <p>暂无通知</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedNotifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border transition-all ${
                notification.is_read
                  ? 'bg-slate-800/30 border-slate-700/50'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getTypeColor(notification.notification_type)}`}>
                      {getTypeText(notification.notification_type)}
                    </span>
                    <span className={`text-xs font-bold ${getPriorityColor(notification.priority)}`}>
                      {notification.priority === 'URGENT' ? '🔴 紧急' : notification.priority === 'HIGH' ? '🟠 高优' : ''}
                    </span>
                    {!notification.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <h3 className="text-white font-bold mb-1">{notification.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2">{notification.content}</p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between text-xs text-slate-500">
                <span>接收用户: {notification.username}</span>
                <span>{formatTime(notification.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* 发送通知模态框 */}
      <AnimatePresence>
        {isSendModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsSendModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">发送系统通知</h2>
                <button onClick={() => setIsSendModalOpen(false)} className="text-slate-400 hover:text-white">
                  <ICONS.Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSendForm(prev => ({ ...prev, target: 'all' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      sendForm.target === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    全部用户
                  </button>
                  <button
                    onClick={() => setSendForm(prev => ({ ...prev, target: 'user' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      sendForm.target === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    指定用户
                  </button>
                </div>

                {sendForm.target === 'user' && (
                  <input
                    type="text"
                    placeholder="输入用户ID"
                    value={sendForm.user_id}
                    onChange={(e) => setSendForm(prev => ({ ...prev, user_id: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                )}

                <input
                  type="text"
                  placeholder="通知标题"
                  value={sendForm.title}
                  onChange={(e) => setSendForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />

                <textarea
                  placeholder="通知内容"
                  value={sendForm.content}
                  onChange={(e) => setSendForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />

                <div className="flex gap-2">
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setSendForm(prev => ({ ...prev, priority: priority as any }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                        sendForm.priority === priority
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {priority === 'LOW' ? '低' : priority === 'NORMAL' ? '普通' : priority === 'HIGH' ? '高' : '紧急'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSendNotification}
                  disabled={sending || !sendForm.title || !sendForm.content}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      发送中...
                    </>
                  ) : (
                    '发送通知'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminNotifications;
