/**
 * 视频专区
 * 展示金融相关视频内容，涵盖投资教学、市场解读、行业分析等
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface VideoItem {
  id: string;
  title: string;
  cover: string;
  duration: string;
  author: string;
  views: number;
  videoUrl: string;
  category: 'teaching' | 'analysis' | 'news';
}

// 视频数据 - 引用外部视频链接
const videoList: VideoItem[] = [
  {
    id: '1',
    title: '股票入门基础：如何看懂K线图',
    cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '15:32',
    author: '银河投教',
    views: 125600,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'teaching'
  },
  {
    id: '2',
    title: '2024年市场展望与投资策略',
    cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '22:15',
    author: '银河研究',
    views: 89500,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'analysis'
  },
  {
    id: '3',
    title: '新能源行业深度解读',
    cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '18:45',
    author: '行业研究',
    views: 67300,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'analysis'
  },
  {
    id: '4',
    title: '新手必看：股票交易规则详解',
    cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '12:20',
    author: '银河投教',
    views: 156800,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'teaching'
  },
  {
    id: '5',
    title: '今日市场快评：震荡行情如何应对',
    cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '08:30',
    author: '银河研究',
    views: 45200,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'news'
  },
  {
    id: '6',
    title: '基金定投入门指南',
    cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '16:40',
    author: '银河投教',
    views: 98700,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'teaching'
  }
];

// 推荐视频
const recommendedVideos = videoList.slice(0, 3);

interface VideoZoneViewProps {
  onBack?: () => void;
}

const VideoZoneView: React.FC<VideoZoneViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'teaching' | 'analysis' | 'news'>('all');
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);

  // 格式化播放量
  const formatViews = (views: number) => {
    if (views >= 10000) {
      return `${(views / 10000).toFixed(1)}万`;
    }
    return views.toString();
  };

  // 过滤视频
  const filteredVideos = activeTab === 'all' 
    ? videoList 
    : videoList.filter(v => v.category === activeTab);

  // 播放视频
  const handlePlayVideo = (video: VideoItem) => {
    setCurrentVideo(video);
  };

  // 关闭视频播放器
  const handleClosePlayer = () => {
    setCurrentVideo(null);
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
      <section className="bg-white mx-4 mt-3 rounded-xl shadow-sm overflow-hidden">
        <div className="relative">
          <img 
            src={recommendedVideos[0].cover}
            alt={recommendedVideos[0].title}
            className="w-full h-40 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"%3E%3Crect fill="%23E5E5E5" width="400" height="200"/%3E%3Ctext fill="%23999" x="200" y="100" text-anchor="middle" dominant-baseline="middle"%3E视频封面%3C/text%3E%3C/svg%3E';
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
        <div className="space-y-3">
          {filteredVideos.map((video) => (
            <div 
              key={video.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden flex"
            >
              <div 
                className="relative w-32 h-20 shrink-0 cursor-pointer"
                onClick={() => handlePlayVideo(video)}
              >
                <img 
                  src={video.cover}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 80"%3E%3Crect fill="%23E5E5E5" width="128" height="80"/%3E%3Ctext fill="%23999" x="64" y="40" text-anchor="middle" dominant-baseline="middle" font-size="10"%3E封面%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                  {video.duration}
                </span>
              </div>
              <div className="flex-1 p-3 flex flex-col justify-between">
                <h4 className="text-sm font-medium text-[#333333] line-clamp-2">{video.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#999999]">{video.author}</span>
                  <span className="text-xs text-[#999999]">{formatViews(video.views)}播放</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 视频播放器弹窗 */}
      {currentVideo && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* 顶部控制栏 */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <button 
              onClick={handleClosePlayer}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-white text-sm font-medium flex-1 ml-3 truncate">{currentVideo.title}</h3>
          </div>
          
          {/* 视频播放器 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full aspect-video bg-black">
              <iframe
                src={currentVideo.videoUrl}
                title={currentVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          
          {/* 底部信息 */}
          <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-white text-sm">{currentVideo.author}</p>
                <p className="text-white/60 text-xs">{formatViews(currentVideo.views)}次播放</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoZoneView;
