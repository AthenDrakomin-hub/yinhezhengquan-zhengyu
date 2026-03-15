/**
 * 视频专区
 * 展示金融相关视频内容，涵盖投资教学、市场解读、行业分析等
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface VideoItem {
  id: string;
  title: string;
  cover: string;
  duration: string;
  author: string;
  views: number;
  videoUrl: string;
  category: 'teaching' | 'analysis' | 'news';
  description?: string;
}

// 默认视频数据（兜底）
const DEFAULT_VIDEOS: VideoItem[] = [
  {
    id: '1',
    title: '股票入门基础：如何看懂K线图',
    cover: '',
    duration: '15:32',
    author: '银河投教',
    views: 125600,
    videoUrl: '',
    category: 'teaching'
  },
  {
    id: '2',
    title: '2024年市场展望与投资策略',
    cover: '',
    duration: '22:15',
    author: '银河研究',
    views: 89500,
    videoUrl: '',
    category: 'analysis'
  },
  {
    id: '3',
    title: '新能源行业深度解读',
    cover: '',
    duration: '18:45',
    author: '行业研究',
    views: 67300,
    videoUrl: '',
    category: 'analysis'
  },
  {
    id: '4',
    title: '新手必看：股票交易规则详解',
    cover: '',
    duration: '12:20',
    author: '银河投教',
    views: 156800,
    videoUrl: '',
    category: 'teaching'
  }
];

interface VideoZoneViewProps {
  onBack?: () => void;
}

const VideoZoneView: React.FC<VideoZoneViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>(DEFAULT_VIDEOS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'teaching' | 'analysis' | 'news'>('all');
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);

  // 加载视频数据
  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('获取视频列表失败:', error.code);
        // 使用默认数据
        return;
      }

      if (data && data.length > 0) {
        const videoList: VideoItem[] = data.map((v: any) => ({
          id: v.id,
          title: v.title,
          cover: v.cover_url || v.thumbnail_url || '',
          duration: v.duration || '00:00',
          author: v.author || '银河证券',
          views: v.views || 0,
          videoUrl: v.video_url || '',
          category: v.category || 'teaching',
          description: v.description || ''
        }));
        setVideos(videoList);
      }
    } catch (error) {
      console.error('加载视频数据失败:', error);
      // 保持默认数据
    } finally {
      setLoading(false);
    }
  };

  // 记录观看历史
  const recordView = async (videoId: string) => {
    if (!user) return;
    
    try {
      // 更新视频观看量
      await supabase.rpc('increment_video_views', { video_id: videoId });
      
      // 记录观看历史
      await supabase.from('video_view_history').insert({
        user_id: user.id,
        video_id: videoId
      });
    } catch (error) {
      // 静默处理错误
    }
  };

  // 格式化播放量
  const formatViews = (views: number) => {
    if (views >= 10000) {
      return `${(views / 10000).toFixed(1)}万`;
    }
    return views.toString();
  };

  // 过滤视频
  const filteredVideos = activeTab === 'all' 
    ? videos 
    : videos.filter(v => v.category === activeTab);

  // 推荐视频
  const recommendedVideos = videos.slice(0, 3);

  // 播放视频
  const handlePlayVideo = async (video: VideoItem) => {
    setCurrentVideo(video);
    await recordView(video.id);
    
    // 本地更新观看量
    setVideos(prev => prev.map(v => 
      v.id === video.id ? { ...v, views: v.views + 1 } : v
    ));
  };

  // 关闭视频播放器
  const handleClosePlayer = () => {
    setCurrentVideo(null);
  };

  // 默认封面图
  const getDefaultCover = (index: number) => {
    const colors = ['#E63946', '#0066CC', '#22C55E', '#F97316', '#8B5CF6'];
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"%3E%3Crect fill="${encodeURIComponent(colors[index % colors.length])}" width="400" height="200"/%3E%3Ctext fill="%23fff" x="200" y="100" text-anchor="middle" dominant-baseline="middle" font-size="16"%3E视频封面%3C/text%3E%3C/svg%3E`;
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5]">
      {/* 顶部标题栏 */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onBack?.() || navigate(-1)}
            className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#333333]">视频专区</h1>
        </div>
      </header>

      {/* 推荐视频轮播 */}
      {recommendedVideos.length > 0 && (
        <section className="bg-white mx-4 mt-3 rounded-xl shadow-sm overflow-hidden">
          <div className="relative">
            <img 
              src={recommendedVideos[0].cover || getDefaultCover(0)}
              alt={recommendedVideos[0].title}
              className="w-full h-40 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getDefaultCover(0);
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button 
              onClick={() => handlePlayVideo(recommendedVideos[0])}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-[#E63946] ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <span className="inline-block bg-[#E63946] text-white text-[10px] px-1.5 py-0.5 rounded mb-1">
                推荐
              </span>
              <h3 className="text-white text-sm font-semibold">{recommendedVideos[0].title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/80 text-xs">{recommendedVideos[0].author}</span>
                <span className="text-white/60 text-xs">{formatViews(recommendedVideos[0].views)}次播放</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 分类标签 */}
      <section className="bg-white mx-4 mt-3 rounded-xl shadow-sm">
        <div className="flex items-center border-b border-[#F0F0F0]">
          {[
            { key: 'all', label: '全部' },
            { key: 'teaching', label: '投资教学' },
            { key: 'analysis', label: '市场解读' },
            { key: 'news', label: '行业分析' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === tab.key ? 'text-[#333333]' : 'text-[#999999]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 视频列表 */}
      <section className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0066CC] border-t-transparent"></div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#999999]">
            <svg className="w-16 h-16 text-[#CCCCCC] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">暂无视频内容</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVideos.map((video, index) => (
              <div 
                key={video.id}
                onClick={() => handlePlayVideo(video)}
                className="bg-white rounded-xl shadow-sm overflow-hidden flex cursor-pointer active:scale-[0.98] transition-transform"
              >
                {/* 视频封面 */}
                <div className="relative w-32 h-20 shrink-0">
                  <img 
                    src={video.cover || getDefaultCover(index)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getDefaultCover(index);
                    }}
                  />
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">
                    {video.duration}
                  </div>
                </div>
                
                {/* 视频信息 */}
                <div className="flex-1 p-2 flex flex-col justify-between">
                  <h4 className="text-sm font-medium text-[#333333] line-clamp-2">{video.title}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#999999]">{video.author}</span>
                    <span className="text-xs text-[#999999]">{formatViews(video.views)}播放</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 视频播放器弹窗 */}
      {currentVideo && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* 关闭按钮 */}
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={handleClosePlayer}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 视频标题 */}
          <div className="pt-16 px-4 pb-2">
            <h3 className="text-white text-sm font-semibold">{currentVideo.title}</h3>
            <p className="text-white/60 text-xs mt-1">{currentVideo.author} · {formatViews(currentVideo.views)}次播放</p>
          </div>
          
          {/* 视频播放区域 */}
          <div className="flex-1 flex items-center justify-center bg-black">
            {currentVideo.videoUrl ? (
              <iframe 
                src={currentVideo.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="text-center text-white/60">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">视频加载中...</p>
                <p className="text-xs mt-2">请稍后重试或联系客服</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoZoneView;
