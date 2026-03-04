import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

// 定义接口
interface IPO {
  id?: string;
  symbol: string;
  name: string;
  market: 'SH' | 'SZ';
  status: 'UPCOMING' | 'LISTED' | 'ONGOING'; 
  ipo_price: number;
  issue_date: string;
  listing_date: string;
  subscription_code: string;
  issue_volume: number;
  online_issue_volume: number;
  pe_ratio: number;
  change?: number;
  changePercent?: number;
}

const AdminIPOs: React.FC = () => {
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIPO, setSelectedIPO] = useState<IPO | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [showEditForm, setShowEditForm] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<IPO>({
    symbol: '',
    name: '',
    market: 'SH',
    status: 'UPCOMING',
    ipo_price: 0,
    issue_date: '',
    listing_date: '',
    subscription_code: '',
    issue_volume: 0,
    online_issue_volume: 0,
    pe_ratio: 0,
  });

  const fetchIPOs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ipos')
        .select('*')
        .order('listing_date', { ascending: false });
      if (error) throw error;
      setIpos(data || []);
    } catch (err: any) {
      alert('加载失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIPOs(); }, []);

  const handleSubmit = async (e: React.FormEvent, isUpdate: boolean) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        issue_date: formData.issue_date || null,
        listing_date: formData.listing_date || null,
      };

      const { error } = isUpdate 
        ? await supabase.from('ipos').update(payload).eq('id', selectedIPO?.id)
        : await supabase.from('ipos').insert([payload]);

      if (error) throw error;
      alert(isUpdate ? '更新成功' : '创建成功');
      setIsCreateModalOpen(false);
      setShowEditForm(false);
      fetchIPOs();
    } catch (err: any) {
      alert('操作失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 显式声明返回类型为 JSX.Element，解决“找不到名称”报错
  const renderFormFields = (): React.JSX.Element => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">股票代码</label>
          <input required className="industrial-input w-full" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">股票名称</label>
          <input required className="industrial-input w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">发行价</label>
          <input type="number" step="0.01" className="industrial-input w-full" value={formData.ipo_price} onChange={e => setFormData({...formData, ipo_price: parseFloat(e.target.value) || 0})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">市场</label>
          <select className="industrial-input w-full" value={formData.market} onChange={e => setFormData({...formData, market: e.target.value as any})}>
            <option value="SH">SH (上海)</option>
            <option value="SZ">SZ (深圳)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">状态</label>
          <select className="industrial-input w-full" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
            <option value="UPCOMING">待申购</option>
            <option value="ONGOING">申购中</option>
            <option value="LISTED">已上市</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">上市日期</label>
          <input type="date" className="industrial-input w-full" value={formData.listing_date} onChange={e => setFormData({...formData, listing_date: e.target.value})} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-industrial-800">IPO 管理面板</h2>
        <button className="industrial-button-primary" onClick={() => {
          setFormData({ symbol: '', name: '', market: 'SH', status: 'UPCOMING', ipo_price: 0, issue_date: '', listing_date: '', subscription_code: '', issue_volume: 0, online_issue_volume: 0, pe_ratio: 0 });
          setIsCreateModalOpen(true);
        }}>创建新 IPO</button>
      </div>

      <div className="industrial-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-xs font-bold uppercase text-gray-400">代码/名称</th>
              <th className="p-4 text-xs font-bold uppercase text-gray-400">价格</th>
              <th className="p-4 text-xs font-bold uppercase text-gray-400">状态</th>
              <th className="p-4 text-xs font-bold uppercase text-gray-400">上市日</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {ipos.map(ipo => (
              <tr key={ipo.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-bold">{ipo.symbol} / {ipo.name}</td>
                <td className="p-4 text-blue-600 font-mono">{ipo.ipo_price}</td>
                <td className="p-4"><span className="px-2 py-1 rounded-full text-[10px] font-black bg-gray-100">{ipo.status}</span></td>
                <td className="p-4 text-gray-500">{ipo.listing_date}</td>
                <td className="p-4 text-right space-x-3">
                  <button className="text-blue-500 hover:underline text-xs" onClick={() => { setSelectedIPO(ipo); setFormData(ipo); setShowEditForm(true); }}>编辑</button>
                  <button className="text-red-500 hover:underline text-xs" onClick={async () => { if(confirm('确定删除?')) { await supabase.from('ipos').delete().eq('id', ipo.id); fetchIPOs(); }}}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 弹窗逻辑 */}
      <AnimatePresence>
        {(isCreateModalOpen || showEditForm) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white p-8 rounded-2xl w-full max-w-md">
              <h3 className="text-lg font-black mb-4">{showEditForm ? '编辑 IPO' : '创建 IPO'}</h3>
              <form onSubmit={(e) => handleSubmit(e, showEditForm)}>
                {renderFormFields()}
                <div className="mt-6 flex gap-3">
                  <button type="button" className="flex-1 p-3 bg-gray-100 rounded-xl font-bold" onClick={() => { setIsCreateModalOpen(false); setShowEditForm(false); }}>取消</button>
                  <button type="submit" disabled={submitting} className="flex-1 p-3 bg-industrial-800 text-white rounded-xl font-bold">{submitting ? '提交中...' : '确认'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminIPOs;