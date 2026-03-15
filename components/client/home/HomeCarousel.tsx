/**
 * 首页轮播图组件
 * 银河证券风格轮播图
 */

import React, { useState, useEffect, useCallback } from 'react';
import { imageConfig } from '../../../lib/imageConfig';

interface CarouselSlide {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  tag?: string;
  link?: string;
}

// 默认轮播数据
const defaultSlides: CarouselSlide[] = [
  {
    id: '1',
    image: '/images/banner-1.jpg',
    title: '银河智投',
    subtitle: 'AI驱动的智能投资助手',
    tag: '新功能',
    link: '/client/conditional-orders'
  },
  {
    id: '2',
    image: '/images/banner-2.jpg',
    title: 'ETF专区',
    subtitle: '低成本配置全球资产',
    tag: '热门',
    link: '/client/etf'
  },
  {
    id: '3',
    image: '/images/banner-3.jpg',
    title: '新股申购',
    subtitle: '一键申购，轻松打新',
    tag: 'NEW',
    link: '/client/ipo'
  },
  {
    id: '4',
    image: '/images/banner-4.jpg',
    title: '稳健理财',
    subtitle: '专业理财，稳健收益',
    tag: '精选',
    link: '/client/wealth-finance'
  }
];

interface HomeCarouselProps {
  slides?: CarouselSlide[];
  autoPlay?: boolean;
  interval?: number;
  onSlideClick?: (slide: CarouselSlide) => void;
}

const HomeCarousel: React.FC<HomeCarouselProps> = ({
  slides = defaultSlides,
  autoPlay = true,
  interval = 4000,
  onSlideClick
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 自动播放
  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, slides.length]);

  // 处理指示器点击
  const handleIndicatorClick = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isTransitioning]);

  // 处理滑动
  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    if (direction === 'left') {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isTransitioning, slides.length]);

  // 触摸事件处理
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      handleSwipe(diff > 0 ? 'left' : 'right');
    }
    
    setTouchStart(null);
  };

  const currentSlide = slides[currentIndex];

  return (
    <div 
      className="relative w-full overflow-hidden rounded-xl bg-[#1a1a2e]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 轮播内容 */}
      <div 
        className="relative aspect-[2.5/1] min-h-[140px] md:min-h-[180px]"
        onClick={() => onSlideClick?.(currentSlide)}
      >
        {/* 背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
        
        {/* 装饰元素 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -right-10 w-32 h-32 bg-[#E63946]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-10 w-24 h-24 bg-[#0066CC]/20 rounded-full blur-2xl" />
        </div>

        {/* 内容区域 */}
        <div className="absolute inset-0 flex items-center p-4 md:p-6 z-10">
          <div className="flex-1">
            {/* 标签 */}
            {currentSlide.tag && (
              <span className="inline-block bg-[#E63946] text-white text-[10px] md:text-xs px-2 py-0.5 rounded font-medium mb-2">
                {currentSlide.tag}
              </span>
            )}
            
            {/* 标题 */}
            <h3 className="text-white text-lg md:text-xl font-bold leading-tight mb-1">
              {currentSlide.title}
            </h3>
            
            {/* 副标题 */}
            {currentSlide.subtitle && (
              <p className="text-white/70 text-xs md:text-sm">
                {currentSlide.subtitle}
              </p>
            )}
            
            {/* 查看详情按钮 */}
            {currentSlide.link && (
              <div className="mt-3 inline-flex items-center gap-1 text-white/80 text-xs">
                <span>查看详情</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>

          {/* 右侧装饰图标 */}
          <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm">
            <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        {/* 进度条背景 */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10" />
        <div 
          className="absolute bottom-0 left-0 h-1 bg-[#E63946] transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* 指示器 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              handleIndicatorClick(index);
            }}
            className={`rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'w-4 h-1.5 bg-white' 
                : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`跳转到第 ${index + 1} 张`}
          />
        ))}
      </div>

      {/* 左右箭头（PC端） */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSwipe('right');
        }}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-all z-20"
        aria-label="上一张"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSwipe('left');
        }}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-all z-20"
        aria-label="下一张"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default HomeCarousel;
