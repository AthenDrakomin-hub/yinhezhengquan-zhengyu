/**
 * 管理后台 - 下载管理
 */
import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Edit2, Monitor, Apple, Smartphone, Package, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const platforms = [
  { value: 'windows', label: 'Windows', icon: <Monitor className="w-5 h-5" /> },
  { value: 'macos', label: 'macOS', icon: <Apple className="w-5 h-5" /> },
  { value: 'ios', label: 'iOS', icon: <Apple className="w-5 h-5" /> },
  { value: 'android', label: 'Android', icon: <Smartphone className="w-5 h-5" /> },
];

interface DownloadRecord {
  id: string;
  name: string;
  description: string | null;
  version: string | null;
  file_key: string;
  file_size: number | null;
  file_type: string | null;
  platform: string;
  download_count: number;
  is_active: boolean;
  created_at: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

const AdminDownloads: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '',
    platform: 'windows',
    file_url: '',
    file_size: '',
    file_type: '',
    is_active: true,
  });

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('downloads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setDownloads(data || []);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.file_url.trim()) {
      alert('请填写名称和下载链接');
      return;
    }

    try {
      setSaving(true);
      const data = {
        name: formData.name,
        description: formData.description || null,
        version: formData.version || null,
        platform: formData.platform,
        file_key: formData.file_url,
        file_size: formData.file_size ? parseFloat(formData.file_size) * 1024 * 1024 : null,
        file_type: formData.file_type || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('downloads').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('downloads').insert(data);
        if (error) throw error;
      }

      await loadDownloads();
      handleCloseModal();
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: DownloadRecord) => {
    if (!confirm(`确定删除 "${record.name}"？`)) return;
    const { error } = await supabase.from('downloads').delete().eq('id', record.id);
    if (!error) loadDownloads();
  };

  const handleEdit = (record: DownloadRecord) => {
    setEditingId(record.id);
    setFormData({
      name: record.name,
      description: record.description || '',
      version: record.version || '',
      platform: record.platform,
      file_url: record.file_key,
      file_size: record.file_size ? (record.file_size / 1024 / 1024).toFixed(1) : '',
      file_type: record.file_type || '',
      is_active: record.is_active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', description: '', version: '', platform: 'windows', file_url: '', file_size: '', file_type: '', is_active: true });
  };

  const toggleActive = async (record: DownloadRecord) => {
    await supabase.from('downloads').update({ is_active: !record.is_active }).eq('id', record.id);
    loadDownloads();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">下载管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理软件下载链接</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#E30613] text-white rounded-lg font-medium hover:bg-[#C70510]">
          <Plus className="w-4 h-4" />
          添加下载项
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E30613]" /></div>
      ) : downloads.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">暂无下载项</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">名称</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">平台</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">版本</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">大小</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">下载次数</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">状态</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {downloads.map((record) => {
                const platform = platforms.find(p => p.value === record.platform);
                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{record.name}</div>
                      {record.description && <div className="text-xs text-slate-500 truncate max-w-xs">{record.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {platform?.icon}
                        <span className="text-sm text-slate-600">{platform?.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.version ? `v${record.version}` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatFileSize(record.file_size)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.download_count}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(record)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${record.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {record.is_active ? <><CheckCircle className="w-3 h-3" />启用</> : <><AlertCircle className="w-3 h-3" />禁用</>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(record)} className="p-2 text-slate-500 hover:text-[#E30613] hover:bg-red-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(record)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? '编辑' : '添加下载项'}</h3>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">名称 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613]" placeholder="银河证券·日斗投资交易单元" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613]" placeholder="Windows 一键安装包" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">版本号</label>
                  <input type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613]" placeholder="1.0.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">平台</label>
                  <select value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613]">
                    {platforms.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">下载链接 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613]" placeholder="https://xxx.blob.vercel-storage.com/xxx.exe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">文件大小 (MB)</label>
                  <input type="text" value={formData.file_size} onChange={(e) => setFormData({ ...formData, file_size: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613]" placeholder="84.8" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">文件类型</label>
                  <input type="text" value={formData.file_type} onChange={(e) => setFormData({ ...formData, file_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613]" placeholder="exe / zip" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 text-[#E30613] border-slate-300 rounded" />
                <label htmlFor="is_active" className="text-sm text-slate-700">启用（用户可见）</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
              <button onClick={handleCloseModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#E30613] text-white rounded-lg font-medium hover:bg-[#C70510] disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDownloads;
