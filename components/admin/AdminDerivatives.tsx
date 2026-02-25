import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { getDerivatives, createDerivative, updateDerivative, deleteDerivative } from '@/services/contentService';
import { Stock } from '@/types';

const AdminDerivatives: React.FC = () => {
  const [derivatives, setDerivatives] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDerivative, setSelectedDerivative] = useState<Stock | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    price: 0,
    change: 0,
    changePercent: 0,
    market: 'FUTURES' as 'CN' | 'HK' | 'US' | 'BOND' | 'FUND' | 'FUTURES',
    type: '',
    underlying: '',
    strike: undefined as number | undefined,
    expiry: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDerivatives = async () => {
    setLoading(true);
    try {
      const data = await getDerivatives();
      setDerivatives(data || []);
    } catch (err) {
      console.error('获取衍生品信息失败:', err);
      alert('获取衍生品信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDerivatives();
  }, []);

  const handleCreateDerivative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.name || !formData.type || !formData.underlying) {
      alert('请填写代码、名称、类型和标的');
      return;
    }
    setSubmitting(true);
    try {
      await createDerivative(formData);
      alert('衍生品创建成功！');
      setIsCreateModalOpen(false);
      fetchDerivatives();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDerivative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDerivative) return;
    if (!formData.symbol || !formData.name || !formData.type || !formData.underlying) {
      alert('请填写代码、名称、类型和标的');
      return;
    }
    setSubmitting(true);
    try {
      await updateDerivative(selectedDerivative.id || '', formData);
      alert('衍生品更新成功！');
      setIsEditModalOpen(false);
      fetchDerivatives();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDerivative = async (id: string) => {
    if (!window.confirm('确定要删除该衍生品吗？此操作不可逆。')) return;
    try {
      await deleteDerivative(id);
      alert('衍生品已删除');
      fetchDerivatives();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">衍生品列表</h3>
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchDerivatives}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="industrial-button-primary" onClick={() => {
            setFormData({
              symbol: '',
              name: '',
              price: 0,
              change: 0,
              changePercent: 0,
              market: 'FUTURES',
              type: '',
              underlying: '',
              strike: undefined,
              expiry: '',
            });
            setIsCreateModalOpen(true);
          }}>
            <ICONS.Plus size={16} /> 新建衍生品
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
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">类型</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : derivatives.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无衍生品</td></tr>
              ) : derivatives.map((derivative) => (
                <tr key={derivative.symbol} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{derivative.symbol}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{derivative.name}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{derivative.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold ${derivative.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {derivative.change >= 0 ? '+' : ''}{derivative.change.toFixed(2)} ({derivative.changePercent >= 0 ? '+' : ''}{derivative.changePercent.toFixed(2)}%)
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {derivative.market}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {/* 类型未知 */}
                      FUTURES
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedDerivative(derivative);
                          setFormData({
                            symbol: derivative.symbol,
                            name: derivative.name,
                            price: derivative.price,
                            change: derivative.change,
                            changePercent: derivative.changePercent,
                            market: derivative.market,
                            type: '',
                            underlying: '',
                            strike: undefined,
                            expiry: '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteDerivative(derivative.id || '')}
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">新建衍生品</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateDerivative} className="space-y-4">
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
                    <option value="FUTURES">FUTURES</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">类型</label>
                  <input required type="text" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="industrial-input" placeholder="例如：期货、期权" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标的</label>
                <input required type="text" value={formData.underlying} onChange={e => setFormData({...formData, underlying: e.target.value})} className="industrial-input" placeholder="例如：沪深300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">行权价</label>
                  <input type="number" step="0.01" value={formData.strike || ''} onChange={e => setFormData({...formData, strike: e.target.value ? parseFloat(e.target.value) : undefined})} className="industrial-input" placeholder="可选" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">到期日</label>
                  <input type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} className="industrial-input" placeholder="可选" />
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
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">编辑衍生品</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateDerivative} className="space-y-4">
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
                    <option value="FUTURES">FUTURES</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">类型</label>
                  <input required type="text" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="industrial-input" placeholder="例如：期货、期权" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">标的</label>
                <input required type="text" value={formData.underlying} onChange={e => setFormData({...formData, underlying: e.target.value})} className="industrial-input" placeholder="例如：沪深300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">行权价</label>
                  <input type="number" step="0.01" value={formData.strike || ''} onChange={e => setFormData({...formData, strike: e.target.value ? parseFloat(e.target.value) : undefined})} className="industrial-input" placeholder="可选" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">到期日</label>
                  <input type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} className="industrial-input" placeholder="可选" />
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

export default AdminDerivatives;
