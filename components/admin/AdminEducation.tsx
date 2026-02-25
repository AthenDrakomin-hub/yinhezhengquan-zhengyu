import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { getEducationTopics, createEducationTopic, updateEducationTopic, deleteEducationTopic } from '@/services/contentService';
import { EducationTopic } from '@/types';

const AdminEducation: React.FC = () => {
  const [topics, setTopics] = useState<EducationTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<EducationTopic | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    image: '',
    duration: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const data = await getEducationTopics();
      setTopics(data || []);
    } catch (err) {
      console.error('获取投教内容失败:', err);
      alert('获取投教内容失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      alert('请填写标题和分类');
      return;
    }
    setSubmitting(true);
    try {
      await createEducationTopic(formData);
      alert('投教内容创建成功！');
      setIsCreateModalOpen(false);
      fetchTopics();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;
    if (!formData.title || !formData.category) {
      alert('请填写标题和分类');
      return;
    }
    setSubmitting(true);
    try {
      await updateEducationTopic(selectedTopic.id, formData);
      alert('投教内容更新成功！');
      setIsEditModalOpen(false);
      fetchTopics();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!window.confirm('确定要删除该投教内容吗？此操作不可逆。')) return;
    try {
      await deleteEducationTopic(id);
      alert('投教内容已删除');
      fetchTopics();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">投教内容列表</h3>
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchTopics}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="industrial-button-primary" onClick={() => {
            setFormData({
              title: '',
              category: '',
              image: '',
              duration: '',
            });
            setIsCreateModalOpen(true);
          }}>
            <ICONS.Plus size={16} /> 新建投教内容
          </button>
        </div>
      </div>

      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">标题</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">分类</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">图片</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">时长</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : topics.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无投教内容</td></tr>
              ) : topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-industrial-700">{topic.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {topic.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {topic.image ? (
                      <div className="w-12 h-12 rounded bg-industrial-100 overflow-hidden">
                        <img src={topic.image} alt={topic.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-[9px] text-industrial-400">无图片</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{topic.duration}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedTopic(topic);
                          setFormData({
                            title: topic.title,
                            category: topic.category,
                            image: topic.image,
                            duration: topic.duration,
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteTopic(topic.id)}
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">新建投教内容</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="industrial-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">分类</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">时长</label>
                  <input type="text" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="industrial-input" placeholder="例如：15 mins" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">图片URL</label>
                <input type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="industrial-input" placeholder="可选，输入图片链接" />
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">编辑投教内容</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateTopic} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="industrial-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">分类</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">时长</label>
                  <input type="text" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="industrial-input" placeholder="例如：15 mins" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">图片URL</label>
                <input type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="industrial-input" placeholder="可选，输入图片链接" />
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

export default AdminEducation;
