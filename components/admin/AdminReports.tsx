import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { getReports, createReport, updateReport, deleteReport } from '@/services/contentService';
import { ResearchReport } from '@/types';

const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    date: '',
    summary: '',
    content: '',
    category: '个股' as '个股' | '行业' | '宏观' | '策略',
    sentiment: '看多' as '看多' | '中性' | '看空',
    tags: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await getReports();
      setReports(data || []);
    } catch (err) {
      console.error('获取研报列表失败:', err);
      alert('获取研报列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.date || !formData.summary) {
      alert('请填写标题、作者、日期和摘要');
      return;
    }
    setSubmitting(true);
    try {
      await createReport(formData);
      alert('研报创建成功！');
      setIsCreateModalOpen(false);
      fetchReports();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    if (!formData.title || !formData.author || !formData.date || !formData.summary) {
      alert('请填写标题、作者、日期和摘要');
      return;
    }
    setSubmitting(true);
    try {
      await updateReport(selectedReport.id, formData);
      alert('研报更新成功！');
      setIsEditModalOpen(false);
      fetchReports();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('确定要删除该研报吗？此操作不可逆。')) return;
    try {
      await deleteReport(id);
      alert('研报已删除');
      fetchReports();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">研报列表</h3>
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchReports}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="industrial-button-primary" onClick={() => {
            setFormData({
              title: '',
              author: '',
              date: '',
              summary: '',
              content: '',
              category: '个股',
              sentiment: '看多',
              tags: [],
            });
            setIsCreateModalOpen(true);
          }}>
            <ICONS.Plus size={16} /> 新建研报
          </button>
        </div>
      </div>

      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">标题</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">作者</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">日期</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">分类</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">观点</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无研报</td></tr>
              ) : reports.map((report) => (
                <tr key={report.id} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-industrial-700">{report.title}</p>
                    <p className="text-[9px] text-industrial-400 line-clamp-1">{report.summary}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{report.author}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{report.date}</td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {report.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      report.sentiment === '看多' ? 'bg-emerald-50 text-emerald-600' :
                      report.sentiment === '看空' ? 'bg-red-50 text-red-600' :
                      'bg-industrial-100 text-industrial-600'
                    }`}>
                      {report.sentiment}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedReport(report);
                          setFormData({
                            title: report.title,
                            author: report.author,
                            date: report.date,
                            summary: report.summary,
                            content: report.content || '',
                            category: report.category,
                            sentiment: report.sentiment,
                            tags: report.tags || [],
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteReport(report.id)}
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">新建研报</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="industrial-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">作者</label>
                  <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">日期</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="industrial-input" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">摘要</label>
                <textarea required value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} className="industrial-input min-h-[80px]" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">内容</label>
                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="industrial-input min-h-[120px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">分类</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="industrial-input">
                    <option value="个股">个股</option>
                    <option value="行业">行业</option>
                    <option value="宏观">宏观</option>
                    <option value="策略">策略</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">观点</label>
                  <select value={formData.sentiment} onChange={e => setFormData({...formData, sentiment: e.target.value as any})} className="industrial-input">
                    <option value="看多">看多</option>
                    <option value="中性">中性</option>
                    <option value="看空">看空</option>
                  </select>
                </div>
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">编辑研报</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateReport} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="industrial-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">作者</label>
                  <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">日期</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="industrial-input" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">摘要</label>
                <textarea required value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} className="industrial-input min-h-[80px]" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">内容</label>
                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="industrial-input min-h-[120px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">分类</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="industrial-input">
                    <option value="个股">个股</option>
                    <option value="行业">行业</option>
                    <option value="宏观">宏观</option>
                    <option value="策略">策略</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">观点</label>
                  <select value={formData.sentiment} onChange={e => setFormData({...formData, sentiment: e.target.value as any})} className="industrial-input">
                    <option value="看多">看多</option>
                    <option value="中性">中性</option>
                    <option value="看空">看空</option>
                  </select>
                </div>
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

export default AdminReports;
