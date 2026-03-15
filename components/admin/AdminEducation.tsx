/**
 * 投教内容管理 - 管理端
 * 支持创建、编辑、删除、发布/取消发布投教文章
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import {
  getAllEducationTopics,
  createEducationTopic,
  updateEducationTopic,
  deleteEducationTopic,
  toggleEducationPublish,
  EDUCATION_CATEGORIES,
  DIFFICULTY_LEVELS,
} from '@/services/educationService';
import type { EducationTopic } from '@/lib/types';

// 自定义图标组件
const HeartIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

const EditIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

// 扩展类型
interface EducationArticle extends EducationTopic {
  difficulty?: string;
  author?: string;
  views?: number;
  likes?: number;
  status?: string;
  created_at?: string;
}

const AdminEducation: React.FC = () => {
  const [topics, setTopics] = useState<EducationArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<EducationArticle | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [formData, setFormData] = useState({
    title: '',
    category: 'BASICS',
    difficulty: 'BEGINNER',
    author: '银河证券',
    image: '',
    duration: '',
    content: '',
    is_published: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // 获取所有投教内容
  const fetchTopics = async () => {
    setLoading(true);
    try {
      const data = await getAllEducationTopics();
      setTopics(data as EducationArticle[]);
    } catch (err) {
      console.error('获取投教内容失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  // 筛选后的列表
  const filteredTopics = topics.filter(topic => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PUBLISHED') return topic.is_published;
    if (filterStatus === 'DRAFT') return !topic.is_published;
    return true;
  });

  // 统计数据
  const stats = {
    total: topics.length,
    published: topics.filter(t => t.is_published).length,
    draft: topics.filter(t => !t.is_published).length,
    totalViews: topics.reduce((sum, t) => sum + (t.views || 0), 0),
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      category: 'BASICS',
      difficulty: 'BEGINNER',
      author: '银河证券',
      image: '',
      duration: '',
      content: '',
      is_published: false,
    });
  };

  // 创建投教内容
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('请输入标题');
      return;
    }
    if (!formData.content.trim()) {
      alert('请输入内容');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createEducationTopic({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        difficulty: formData.difficulty,
        author: formData.author,
        image: formData.image,
        duration: formData.duration,
        is_published: formData.is_published,
      });

      if (result.success) {
        alert('投教内容创建成功！');
        setIsCreateModalOpen(false);
        resetForm();
        fetchTopics();
      } else {
        alert(result.error || '创建失败');
      }
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 更新投教内容
  const handleUpdateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;

    setSubmitting(true);
    try {
      const result = await updateEducationTopic(selectedTopic.id, {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        difficulty: formData.difficulty,
        author: formData.author,
        image: formData.image,
        duration: formData.duration,
        is_published: formData.is_published,
      });

      if (result.success) {
        alert('投教内容更新成功！');
        setIsEditModalOpen(false);
        fetchTopics();
      } else {
        alert(result.error || '更新失败');
      }
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除投教内容
  const handleDeleteTopic = async (id: string) => {
    if (!window.confirm('确定要删除该投教内容吗？此操作不可逆。')) return;

    try {
      const result = await deleteEducationTopic(id);
      if (result.success) {
        alert('投教内容已删除');
        fetchTopics();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  // 切换发布状态
  const handleTogglePublish = async (topic: EducationArticle) => {
    const newStatus = !topic.is_published;
    const action = newStatus ? '发布' : '取消发布';

    if (!window.confirm(`确定要${action}"${topic.title}"吗？`)) return;

    try {
      const result = await toggleEducationPublish(topic.id, newStatus);
      if (result.success) {
        alert(`已${action}`);
        fetchTopics();
      } else {
        alert(result.error || `${action}失败`);
      }
    } catch (err: any) {
      alert(err.message || `${action}失败`);
    }
  };

  // 打开编辑模态框
  const openEditModal = (topic: EducationArticle) => {
    setSelectedTopic(topic);
    setFormData({
      title: topic.title,
      category: topic.category || 'BASICS',
      difficulty: topic.difficulty || 'BEGINNER',
      author: topic.author || '银河证券',
      image: topic.image || '',
      duration: topic.duration || '',
      content: topic.content || '',
      is_published: topic.is_published || false,
    });
    setIsEditModalOpen(true);
  };

  // 打开预览模态框
  const openPreviewModal = (topic: EducationArticle) => {
    setSelectedTopic(topic);
    setIsPreviewOpen(true);
  };

  // 获取分类名称
  const getCategoryName = (category: string) => {
    const cat = EDUCATION_CATEGORIES.find(c => c.value === category);
    return cat ? `${cat.icon} ${cat.label}` : category;
  };

  // 获取难度名称
  const getDifficultyName = (difficulty?: string) => {
    const diff = DIFFICULTY_LEVELS.find(d => d.value === difficulty);
    return diff?.label || '入门级';
  };

  // 表单组件
  const TopicForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={isEdit ? handleUpdateTopic : handleCreateTopic} className="space-y-4">
      {/* 标题 */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">
          标题 <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="请输入文章标题"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E63946] transition"
        />
      </div>

      {/* 分类和难度 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">分类</label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E63946] transition"
          >
            {EDUCATION_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">难度</label>
          <select
            value={formData.difficulty}
            onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E63946] transition"
          >
            {DIFFICULTY_LEVELS.map(diff => (
              <option key={diff.value} value={diff.value}>{diff.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 作者和时长 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">作者</label>
          <input
            type="text"
            value={formData.author}
            onChange={e => setFormData({ ...formData, author: e.target.value })}
            placeholder="银河证券"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E63946] transition"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">预计阅读时长</label>
          <input
            type="text"
            value={formData.duration}
            onChange={e => setFormData({ ...formData, duration: e.target.value })}
            placeholder="如：5分钟"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E63946] transition"
          />
        </div>
      </div>

      {/* 封面图片 */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">封面图片URL</label>
        <input
          type="text"
          value={formData.image}
          onChange={e => setFormData({ ...formData, image: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E63946] transition"
        />
      </div>

      {/* 内容 */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">
          内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={formData.content}
          onChange={e => setFormData({ ...formData, content: e.target.value })}
          placeholder="请输入文章内容，支持换行..."
          rows={10}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E63946] transition resize-none"
        />
      </div>

      {/* 发布状态 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, is_published: !formData.is_published })}
          className={`w-12 h-6 rounded-full transition ${
            formData.is_published ? 'bg-[#E63946]' : 'bg-gray-300'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow transform transition ${
            formData.is_published ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
        <span className="text-sm font-bold text-gray-600">
          {formData.is_published ? '立即发布' : '保存为草稿'}
        </span>
      </div>

      {/* 提交按钮 */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => {
            isEdit ? setIsEditModalOpen(false) : setIsCreateModalOpen(false);
            resetForm();
          }}
          className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-6 py-3 rounded-xl bg-[#E63946] text-[var(--color-text-primary)] text-sm font-bold hover:bg-[#C62836] transition disabled:opacity-50"
        >
          {submitting ? '保存中...' : (isEdit ? '保存修改' : '创建文章')}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-gray-800 tracking-tight">投教内容管理</h3>
          <p className="text-xs text-gray-500 mt-1">管理股票投资教学文章的发布</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTopics}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
          >
            <ICONS.Refresh size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#E63946] text-[var(--color-text-primary)] text-sm font-bold hover:bg-[#C62836] transition flex items-center gap-2"
          >
            <ICONS.Plus size={16} /> 新建文章
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-2xl font-black text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">总文章数</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-2xl font-black text-[#E63946]">{stats.published}</div>
          <div className="text-xs text-gray-500 mt-1">已发布</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-2xl font-black text-yellow-500">{stats.draft}</div>
          <div className="text-xs text-gray-500 mt-1">草稿</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-2xl font-black text-blue-500">{stats.totalViews}</div>
          <div className="text-xs text-gray-500 mt-1">总阅读量</div>
        </div>
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2">
        {[
          { value: 'ALL', label: '全部' },
          { value: 'PUBLISHED', label: '已发布' },
          { value: 'DRAFT', label: '草稿' },
        ].map(filter => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value as typeof filterStatus)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              filterStatus === filter.value
                ? 'bg-[#E63946] text-[var(--color-text-primary)]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* 文章列表 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">文章</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">分类</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">难度</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">状态</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">数据</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-[#E63946]" />
                    </div>
                  </td>
                </tr>
              ) : filteredTopics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                    暂无投教内容
                  </td>
                </tr>
              ) : (
                filteredTopics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {topic.image ? (
                          <img src={topic.image} alt={topic.title} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                            {EDUCATION_CATEGORIES.find(c => c.value === topic.category)?.icon || '📚'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-gray-800">{topic.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {topic.author} · {topic.duration || '未知时长'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-600">
                        {getCategoryName(topic.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-1 rounded ${
                        topic.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-600' :
                        topic.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {getDifficultyName(topic.difficulty)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(topic)}
                        className={`text-[9px] font-black px-3 py-1 rounded-full transition ${
                          topic.is_published
                            ? 'bg-[#E63946]/10 text-[#E63946] hover:bg-[#E63946]/20'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {topic.is_published ? '已发布' : '草稿'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <ICONS.Eye size={12} /> {topic.views || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <HeartIcon size={12} /> {topic.likes || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openPreviewModal(topic)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                          title="预览"
                        >
                          <ICONS.Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(topic)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                          title="编辑"
                        >
                          <EditIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                          title="删除"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 创建模态框 */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsCreateModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-8 my-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-800">新建投教文章</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                >
                  <ICONS.Plus className="rotate-45" size={20} />
                </button>
              </div>
              <TopicForm />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 编辑模态框 */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsEditModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-8 my-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-800">编辑投教文章</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                >
                  <ICONS.Plus className="rotate-45" size={20} />
                </button>
              </div>
              <TopicForm isEdit />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 预览模态框 */}
      <AnimatePresence>
        {isPreviewOpen && selectedTopic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="relative h-40 bg-gradient-to-br from-[#E63946] to-[#1E1E1E]">
                {selectedTopic.image ? (
                  <img src={selectedTopic.image} alt={selectedTopic.title} className="w-full h-full object-cover opacity-50" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl opacity-30">{EDUCATION_CATEGORIES.find(c => c.value === selectedTopic.category)?.icon || '📚'}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-[var(--color-text-primary)] hover:bg-white/30 transition"
                >
                  <ICONS.Plus className="rotate-45" size={20} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-xl font-black text-[var(--color-text-primary)]">{selectedTopic.title}</h2>
                </div>
              </div>

              {/* 元信息 */}
              <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-500">{getCategoryName(selectedTopic.category)}</span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                  selectedTopic.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-600' :
                  selectedTopic.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {getDifficultyName(selectedTopic.difficulty)}
                </span>
                <span className="text-xs text-gray-500">{selectedTopic.author}</span>
                <span className="text-xs text-gray-500">{selectedTopic.duration}</span>
              </div>

              {/* 内容 */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-250px)]">
                <div className="prose prose-sm max-w-none">
                  {(selectedTopic.content || '').split('\n').map((p, idx) => (
                    <p key={idx} className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">{p}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEducation;
