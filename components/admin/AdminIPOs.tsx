import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { createClient } from '@supabase/supabase-js';

interface IPO {
  id?: string;
  symbol: string;
  name: string;
  market: 'SH' | 'SZ' | 'BJ' | 'HK';
  status: 'UPCOMING' | 'LISTED' | 'CANCELLED';
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const AdminIPOs: React.FC = () => {
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIPO, setSelectedIPO] = useState<IPO | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [showEditForm, setShowEditForm] = useState<boolean>(false);
  
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
  
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchIPOs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ipos')
        .select('*')
        .order('listing_date', { ascending: false });

      if (error) throw error;
      
      const formatData: IPO[] = (data || []).map((item: any) => ({
        id: item.id || '',
        symbol: item.symbol || '',
        name: item.name || '',
        market: item.market || 'SH',
        status: item.status || 'UPCOMING',
        ipo_price: item.ipo_price || 0,
        issue_date: item.issue_date ? new Date(item.issue_date).toISOString().split('T')[0] : '',
        listing_date: item.listing_date ? new Date(item.listing_date).toISOString().split('T')[0] : '',
        subscription_code: item.subscription_code || '',
        issue_volume: item.issue_volume || 0,
        online_issue_volume: item.online_issue_volume || 0,
        pe_ratio: item.pe_ratio || 0,
        change: item.change || 0,
        changePercent: item.changePercent || 0,
      }));

      setIpos(formatData);
    } catch (err) {
      console.error('Failed to fetch IPOs:', err);
      alert('Failed to fetch IPOs: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIPOs();
  }, []);

  const handleCreateIPO = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.symbol || !formData.name || !formData.listing_date) {
      alert('Please fill in symbol, name and listing date');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('ipos')
        .insert({
          ...formData,
          issue_date: formData.issue_date ? new Date(formData.issue_date).toISOString() : null,
          listing_date: formData.listing_date ? new Date(formData.listing_date).toISOString() : null,
        });

      if (error) throw error;
      alert('IPO created successfully');
      setIsCreateModalOpen(false);
      fetchIPOs();
    } catch (err: any) {
      alert(err.message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIPO = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedIPO?.id) return;
    if (!formData.symbol || !formData.name || !formData.listing_date) {
      alert('Please fill in symbol, name and listing date');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('ipos')
        .update({
          ...formData,
          issue_date: formData.issue_date ? new Date(formData.issue_date).toISOString() : null,
          listing_date: formData.listing_date ? new Date(formData.listing_date).toISOString() : null,
        })
        .eq('id', selectedIPO.id);

      if (error) throw error;
      alert('IPO updated successfully');
      setShowEditForm(false);
      fetchIPOs();
    } catch (err: any) {
      alert(err.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIPO = async (id: string) => {
    if (!id || !window.confirm('Are you sure to delete this IPO?')) return;
    try {
      const { error } = await supabase
        .from('ipos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('IPO deleted');
      fetchIPOs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">IPO List</h3>
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchIPOs}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="industrial-button-primary" onClick={() => {
            setFormData({
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
            setIsCreateModalOpen(true);
          }}>
            <ICONS.Plus size={16} /> Create IPO
          </button>
        </div>
      </div>

      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">Symbol</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">Price</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">Market</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">Issue Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">Listing Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">Loading...</td></tr>
              ) : ipos.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">No IPOs</td></tr>
              ) : ipos.map((ipo) => (
                <tr key={ipo.id || ipo.symbol} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{ipo.symbol}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{ipo.name}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{ipo.ipo_price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-industrial-100 text-industrial-600">
                      {ipo.market}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">
                    {ipo.issue_date ? new Date(ipo.issue_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">
                    {ipo.listing_date ? new Date(ipo.listing_date).toLocaleDateString() : 'TBD'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      ipo.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-600' :
                      ipo.status === 'LISTED' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {ipo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedIPO(ipo);
                          setFormData(ipo);
                          setShowEditForm(true);
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteIPO(ipo.id || '')}
                        className="text-[10px] font-black text-accent-red uppercase hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-lg p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">Create IPO</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateIPO} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">Symbol</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.symbol} 
                    onChange={e => setFormData({...formData, symbol: e.target.value})} 
                    className="industrial-input" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">Name</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="industrial-input" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">IPO Price</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={formData.ipo_price} 
                    onChange={e => setFormData({...formData, ipo_price: parseFloat(e.target.value) || 0})} 
                    className="industrial-input" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">Market</label>
                  <select 
                    value={formData.market} 
                    onChange={e => setFormData({...formData, market: e.target.value as IPO['market']})} 
                    className="industrial-input"
                  >
                    <option value="SH">SH</option>
                    <option value="SZ">SZ</option>
                    <option value="BJ">BJ</option>
                    <option value="HK">HK</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">Issue Date</label>
                  <input 
                    type="date" 
                    value={formData.issue_date} 
                    onChange={e => setFormData({...formData, issue_date: e.target.value})} 
                    className="industrial-input" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">Listing Date</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.listing_date} 
                    onChange={e => setFormData({...formData, listing_date: e.target.value})} 
                    className="industrial-input" 
                  />
                </div>
              </div>

              <button disabled={submitting} type="submit" className="w-full mt-4 industrial-button-primary">
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminIPOs;
