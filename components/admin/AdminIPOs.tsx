import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { getIPOs, createIPO, updateIPO, deleteIPO } from '@/services/contentService';
import { Stock } from '@/types';

// 扩展Stock类型以包含IPO特有字段
interface IPO extends Stock {
  listing_date?: string;
  status?: string;
}

const AdminIPOs: React.FC = () => {
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIPO, setSelectedIPO] = useState<IPO | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    price: 0,
    change: 0,
    changePercent: 0,
    market: 'CN' as 'CN' | 'HK' | 'US' | 'BOND' | 'FUND',
    listing_date: '',
    status: 'UPCOMING',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchIPOs = async () => {
    setLoading(true);
    try {
      const data = await getIPOs();
      setIpos(data || []);
    } catch (err) {
      console.error('获取新股信息失败:', err);
      alert('获取新股信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIPOs();
  }, []);

  const handleCreateIPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.name || !formData.listing_date) {
      alert('请填写代码、名称和上市日期');
      return;
    }
    setSubmitting(true);
    try {
      await createIPO(formData);
      alert('新股创建成功！');
      setIsCreateModalOpen(false);
      fetchIPOs();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIPO) return;
    if (!formData.symbol || !formData.name || !formData.listing_date) {
      alert('请填写代码、名称和上市日期');
      return;
    }
    setSubmitting(true);
    try {
      await updateIPO(selectedIPO.id || '', formData);
      alert('新股更新成功！');
      setShowEditForm(false);
      fetchIPOs();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIPO = async (id: string) => {
    if (!window.confirm('确定要删除该新股吗？此操作不可逆。')) return;
    try {
      await deleteIPO(id);
      alert('新股已删除');
      fetchIPOs();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">新股列表</h3>
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchIPOs}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="industrial-button-primary" onClick={() => {
            setFormData({
              symbol: '',
              name: '',
              price: 0,
              change: 0,
              changePercent: 0,
              market: 'CN',
              listing_date: '',
              status: 'UPCOMING',
            });
            setIsCreateModalOpen(true);
          }}>
            <ICONS.Plus size={16} /> 新建新股
          </button>
        </div>
      </div>

      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">代码</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">名称</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">价格</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">涨跌</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">市场</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">状态</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : ipos.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无新股</td></tr>
              ) : ipos.map((ipo) => (
                <tr key={ipo.symbol} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{ipo.symbol}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{ipo.name}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{ipo.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold ${ipo.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {ipo.change >= 0 ? '+' : ''}{ipo.change.toFixed(2)} ({ipo.changePercent >= 0 ? '+' : ''}{ipo.changePercent.toFixed(2)}%)
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {ipo.market}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {formData.status || 'UPCOMING'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedIPO(ipo);
                          setFormData({
                            symbol: ipo.symbol,
                            name: ipo.name,
                            price: ipo.price,
                            change: ipo.change,
                            changePercent: ipo.changePercent,
                            market: ipo.market,
                            listing_date: ipo.listing_date || '',
                            status: ipo.status || 'UPCOMING',
                          });
                          setShowEditForm(true);
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteIPO(ipo.id || '')}
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">新建新股</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateIPO} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">代码</label>
                  <input required type="text" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">名称</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="industrial-input" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">价格</label>
                  <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">涨跌</label>
                  <input type="number" step="0.01" value={formData.change} onChange={e => setFormData({...formData, change: parseFloat(e.target.value) || 0})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">涨跌幅%</label>
                  <input type="number" step="0.01" value={formData.changePercent} onChange={e => setFormData({...formData, changePercent: parseFloat(e.target.value) || 0})} className="industrial-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">市场</label>
                  <select value={formData.market} onChange={e => setFormData({...formData, market: e.target.value as any})} className="industrial-input">
                    <option value="CN">CN</option>
                    <option value="HK">HK</option>
                    <option value="US">US</option>
                    <option value="BOND">BOND</option>
                    <option value="FUND">FUND</option>

                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">上市日期</label>
                  <input required type="date" value={formData.listing_date} onChange={e => setFormData({...formData, listing_date: e.target.value})} className="industrial-input" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">状态</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="industrial-input">
                  <option value="UPCOMING">即将上市</option>
                  <option value="LISTED">已上市</option>
                  <option value="CANCELLED">已取消</option>
                </select>
              </div>

              <button disabled={submitting} type="submit" className="w-full mt-4 industrial-button-primary">
                {submitting ? '创建中...' : '确认创建'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 编辑表单 */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-industrial-900 p-6 rounded-2xl border border-industrial-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">编辑新股</h3>
              <button onClick={() => setShowEditForm(false)} className="text-industrial-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateIPO}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">代码</label>
                  <input required value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">名称</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">价格</label>
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">涨跌</label>
                  <input type="number" step="0.01" value={formData.change} onChange={e => setFormData({...formData, change: parseFloat(e.target.value) || 0})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">涨跌幅%</label>
                  <input type="number" step="0.01" value={formData.changePercent} onChange={e => setFormData({...formData, changePercent: parseFloat(e.target.value) || 0})} className="industrial-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">市场</label>
                  <select value={formData.market} onChange={e => setFormData({...formData, market: e.target.value as any})} className="industrial-input">
                    <option value="CN">CN</option>
                    <option value="HK">HK</option>
                    <option value="US">US</option>
                    <option value="BOND">BOND</option>
                    <option value="FUND">FUND</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">上市日期</label>
                  <input required type="date" value={formData.listing_date} onChange={e => setFormData({...formData, listing_date: e.target.value})} className="industrial-input" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">状态</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="industrial-input">
                  <option value="UPCOMING">即将上市</option>
                  <option value="LISTED">已上市</option>
                  <option value="CANCELLED">已取消</option>
                </select>
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

export default AdminIPOs;
