import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/services/contentService';
import { CalendarEvent } from '@/types';

const AdminCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    title: '',
    type: '',
    time: '',
    markets: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getCalendarEvents();
      setEvents(data || []);
    } catch (err) {
      console.error('获取日历事件失败:', err);
      alert('获取日历事件失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.title || !formData.type) {
      alert('请填写日期、标题和类型');
      return;
    }
    setSubmitting(true);
    try {
      await createCalendarEvent(formData);
      alert('日历事件创建成功！');
      setIsCreateModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (!formData.date || !formData.title || !formData.type) {
      alert('请填写日期、标题和类型');
      return;
    }
    setSubmitting(true);
    try {
      await updateCalendarEvent(selectedEvent.id, formData);
      alert('日历事件更新成功！');
      setIsEditModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('确定要删除该日历事件吗？此操作不可逆。')) return;
    try {
      await deleteCalendarEvent(id);
      alert('日历事件已删除');
      fetchEvents();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">日历事件列表</h3>
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchEvents}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="industrial-button-primary" onClick={() => {
            setFormData({
              date: '',
              title: '',
              type: '',
              time: '',
              markets: [],
            });
            setIsCreateModalOpen(true);
          }}>
            <ICONS.Plus size={16} /> 新建日历事件
          </button>
        </div>
      </div>

      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">日期</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">标题</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">类型</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">时间</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">市场</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无日历事件</td></tr>
              ) : events.map((event) => (
                <tr key={event.id} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{event.date}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{event.title}</td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {event.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{event.time || '-'}</td>
                  <td className="px-6 py-4">
                    {event.markets && event.markets.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {event.markets.map(m => (
                          <span key={m} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-industrial-200 text-industrial-600">
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedEvent(event);
                          setFormData({
                            date: event.date,
                            title: event.title,
                            type: event.type,
                            time: event.time || '',
                            markets: event.markets || [],
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-[10px] font-black text-accent-red uppercase hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 创建模态框 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-lg p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">新建日历事件</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="industrial-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">日期</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">类型</label>
                  <input required type="text" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="industrial-input" placeholder="例如：宏观、财报、活动" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">时间</label>
                <input type="text" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="industrial-input" placeholder="例如：02:00" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">市场（逗号分隔）</label>
                <input type="text" value={formData.markets.join(',')} onChange={e => setFormData({...formData, markets: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="industrial-input" placeholder="例如：CN, HK, US" />
              </div>

              <button disabled={submitting} type="submit" className="w-full mt-4 industrial-button-primary">
                {submitting ? '创建中...' : '确认创建'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 编辑模态框 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-lg p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">编辑日历事件</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="industrial-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">日期</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">类型</label>
                  <input required type="text" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="industrial-input" placeholder="例如：宏观、财报、活动" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">时间</label>
                <input type="text" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="industrial-input" placeholder="例如：02:00" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">市场（逗号分隔）</label>
                <input type="text" value={formData.markets.join(',')} onChange={e => setFormData({...formData, markets: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="industrial-input" placeholder="例如：CN, HK, US" />
              </div>

              <button disabled={submitting} type="submit" className="w-full mt-4 industrial-button-primary">
                {submitting ? '保存中...' : '确认修改'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
