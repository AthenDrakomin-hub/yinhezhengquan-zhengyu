import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { getBanners, createBanner, updateBanner, deleteBanner } from '@/services/contentService';
import { Banner } from '@/types';

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    desc: '',
    img: '',
    category: '',
    date: '',
    content: '',
    relatedSymbol: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const data = await getBanners();
      setBanners(data || []);
    } catch (err) {
      console.error('获取横幅公告失败:', err);
      alert('获取横幅公告失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.desc || !formData.img || !formData.category || !formData.date) {
      alert('请填写标题、描述、图片、分类和日期');
      return;
    }
    setSubmitting(true);
    try {
      await createBanner(formData);
      alert('横幅公告创建成功！');
      setIsCreateModalOpen(false);
      fetchBanners();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBanner) return;
    if (!formData.title || !formData.desc || !formData.img || !formData.category || !formData.date) {
      alert('请填写标题、描述、图片、分类和日期');
      return;
    }
    setSubmitting(true);
    try {
      await updateBanner(selectedBanner.id, formData);
      alert('横幅公告更新成功！');
      setIsEditModalOpen(false);
      fetchBanners();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('确定要删除该横幅公告吗？此操作不可逆。')) return;
    try {
      await deleteBanner(id);
      alert('横幅公告已删除');
      fetchBanners();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">横幅公告列表</h3>
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchBanners}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="industrial-button-primary" onClick={() => {
            setFormData({
              title: '',
              desc: '',
              img: '',
              category: '',
              date: '',
              content: '',
              relatedSymbol: '',
            });
            setIsCreateModalOpen(true);
          }}>
            <ICONS.Plus size={16} /> 新建横幅公告
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
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">日期</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">图片</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : banners.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无横幅公告</td></tr>
              ) : banners.map((banner) => (
                <tr key={banner.id} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-industrial-700">{banner.title}</p>
                    <p className="text-[9px] text-industrial-400 line-clamp-1">{banner.desc}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {banner.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{banner.date}</td>
                  <td className="px-6 py-4">
                    {banner.img ? (
                      <div className="w-12 h-12 rounded bg-industrial-100 overflow-hidden">
                        <img src={banner.img} alt={banner.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-[9px] text-industrial-400">无图片</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedBanner(banner);
                          setFormData({
                            title: banner.title,
                            desc: banner.desc,
                            img: banner.img,
                            category: banner.category,
                            date: banner.date,
                            content: banner.content,
                            relatedSymbol: banner.relatedSymbol || '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteBanner(banner.id)}
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">新建横幅公告</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateBanner} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="industrial-input" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">描述</label>
                <textarea required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="industrial-input min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">分类</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">日期</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="industrial-input" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">图片URL</label>
                <input required type="text" value={formData.img} onChange={e => setFormData({...formData, img: e.target.value})} className="industrial-input" placeholder="输入图片链接" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">内容</label>
                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="industrial-input min-h-[100px]" placeholder="详细内容" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">关联股票代码</label>
                <input type="text" value={formData.relatedSymbol} onChange={e => setFormData({...formData, relatedSymbol: e.target.value})} className="industrial-input" placeholder="可选，例如：00700" />
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">编辑横幅公告</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateBanner} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="industrial-input" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">描述</label>
                <textarea required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="industrial-input min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">分类</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">日期</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="industrial-input" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">图片URL</label>
                <input required type="text" value={formData.img} onChange={e => setFormData({...formData, img: e.target.value})} className="industrial-input" placeholder="输入图片链接" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">内容</label>
                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="industrial-input min-h-[100px]" placeholder="详细内容" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">关联股票代码</label>
                <input type="text" value={formData.relatedSymbol} onChange={e => setFormData({...formData, relatedSymbol: e.target.value})} className="industrial-input" placeholder="可选，例如：00700" />
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

export default AdminBanners;
