/**
 * 下载中心
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Zap, Users, Star, Download, Loader2, Package, Monitor } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ServiceCenterViewProps {
  onBack?: () => void;
}

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
}

const services = [
  { icon: <Zap className="w-6 h-6" />, title: '极速交易', desc: '毫秒级委托下单', color: '#E30613' },
  { icon: <Shield className="w-6 h-6" />, title: '安全可靠', desc: '多重加密防护', color: '#1E40AF' },
  { icon: <Users className="w-6 h-6" />, title: '专属服务', desc: '7x24小时在线', color: '#059669' },
  { icon: <Star className="w-6 h-6" />, title: '专业团队', desc: '投研实力雄厚', color: '#D97706' }
];

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

const ServiceCenterView: React.FC<ServiceCenterViewProps> = ({ onBack }) => {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const { data, error } = await supabase
        .from('downloads')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDownloads(data || []);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (record: DownloadRecord) => {
    setDownloadingId(record.id);
    
    // 外部链接直接打开
    if (record.file_key.startsWith('http')) {
      window.open(record.file_key, '_blank');
      // 更新下载次数
      await supabase
        .from('downloads')
        .update({ download_count: record.download_count + 1 })
        .eq('id', record.id);
      loadDownloads();
      setDownloadingId(null);
      return;
    }
    
    setDownloadingId(null);
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className="text-lg font-bold text-slate-900">下载中心</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-[#E30613]" />
            <span>官方正版 · 安全认证</span>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-red-50/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E30613]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2">银河证券官方软件下载</h2>
            <p className="text-slate-600">安全、稳定、专业的投资交易体验</p>
          </div>

          {/* 特色服务 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {services.map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    {s.icon}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{s.title}</div>
                    <div className="text-xs text-slate-500">{s.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#E30613]" />
            </div>
          )}

          {/* 空状态 */}
          {!loading && downloads.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无可下载的软件</p>
            </div>
          )}

          {/* 下载列表 */}
          {!loading && downloads.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900">Windows 版</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {downloads.map((item) => {
                  const isDownloading = downloadingId === item.id;
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900">{item.name}</h4>
                          {item.version && <span className="text-xs text-slate-400">v{item.version}</span>}
                        </div>
                        {item.file_type && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded uppercase">
                            {item.file_type}
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-sm text-slate-500 mb-3">{item.description}</p>}
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                        <span>{formatFileSize(item.file_size)}</span>
                        <span>{item.download_count} 次下载</span>
                      </div>
                      <button
                        onClick={() => handleDownload(item)}
                        disabled={isDownloading}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
                          isDownloading
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-[#E30613] text-white hover:bg-[#C70510] active:scale-[0.98]'
                        }`}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            下载中...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            立即下载
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCenterView;
