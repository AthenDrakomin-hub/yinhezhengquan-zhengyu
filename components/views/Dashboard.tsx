/**
 * Dashboard 首页
 * 按银河证券官方App首页截图还原
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../lib/constants';
import { imageConfig } from '../../lib/imageConfig';
import { getBanners } from '../../services/contentService';
import { Transaction, Banner } from '../../lib/types';
import { usePerformanceMonitor } from '../../utils/performanceMonitor';
import { supabase } from '../../lib/supabase';
import { 
  WelcomeModal, 
  OnboardingTour, 
  useOnboarding,
  defaultTourSteps 
} from '../shared/OnboardingTour';
import { 
  getHomeNewsData,
  getHotNews,
  getFinancialCalendar,
  HotNewsItem,
  FinancialCalendarItem,
} from '../../services/hotspotService';
import HomeCarousel from '../client/home/HomeCarousel';

// 功能入口配置 - 移除极速开户（已登录用户不需要）
const featureGrid = [
  { id: 'ai-stock', label: 'AI选股', icon: '🤖', bgColor: 'bg-[#6366F1]', badge: 'AI', path: '/client/conditional-orders' },
  { id: 'video', label: '视频专区', icon: '📹', bgColor: 'bg-[#F97316]', path: '/client/video' },
  { id: 'etf', label: 'ETF专区', icon: '📊', bgColor: 'bg-[#EAB308]', badge: 'HOT', path: '/client/etf' },
  { id: 'ipo', label: '新股申购', icon: '🎯', bgColor: 'bg-[#E63946]', badge: 'NEW', path: '/client/ipo' },
  { id: 'margin', label: '融资融券', icon: '💰', bgColor: 'bg-[#F97316]', path: '/client/margin' },
  { id: 'calendar', label: '财富日历', icon: '📅', bgColor: 'bg-[#EAB308]', badge: '10', path: '/client/calendar' },
  { id: 'market', label: '沪深市场', icon: '📈', bgColor: 'bg-[#E63946]', path: '/client/market' },
  { id: 'wealth', label: '稳健理财', icon: '🏦', bgColor: 'bg-[#3B82F6]', path: '/client/wealth-finance' },
  { id: 'all', label: '全部', icon: '⊞', bgColor: 'bg-[#6B7280]', path: 'all' },
];

// 生成相对时间
const getRelativeTimeStr = (minutesAgo: number) => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - minutesAgo);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// 默认快讯数据（作为fallback）
const defaultNewsData = [
  { id: '1', time: '09:15', content: '正在加载最新资讯...' },
];

// 默认看点数据（作为fallback）
const defaultViewpointData = [
  { id: '1', title: '正在加载银河看点...', summary: '', date: '' },
];

// Tab 类型
type NewsTabType = 'viewpoint' | 'news' | 'hot_news' | 'financial_calendar';

// 默认Banner数据
const defaultBanner = {
  tag: '贵金属',
  title: '黄金上涨大周期还有多长？',
  expert: '许之彦',
  avatar: '👨‍💼',
};

interface DashboardProps {
  transactions?: Transaction[];
  onOpenCalendar?: () => void;
  onOpenReports?: () => void;
  onOpenEducation?: () => void;
  onOpenCompliance?: () => void;
  onOpenBanner?: (banner: Banner) => void;
  onOpenNews?: (newsId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = React.memo(({ 
  transactions = [], 
  onOpenCalendar, 
  onOpenReports, 
  onOpenEducation, 
  onOpenCompliance,
  onOpenBanner,
  onOpenNews
}) => {
  const navigate = useNavigate();
  const [viewpointData, setViewpointData] = useState<any[]>(defaultViewpointData);
  const [realtimeNews, setRealtimeNews] = useState<any[]>(defaultNewsData);
  const [hotNews, setHotNews] = useState<HotNewsItem[]>([]);
  const [financialCalendar, setFinancialCalendar] = useState<FinancialCalendarItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [activeTab, setActiveTab] = useState<NewsTabType>('viewpoint');
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  
  // 新用户引导
  const {
    showWelcome,
    showTour,
    handleStartTour,
    handleSkipTour,
    handleCompleteTour,
    handleCloseTour
  } = useOnboarding('client-onboarding-completed');
  
  usePerformanceMonitor('Dashboard');

  // 加载新闻数据
  useEffect(() => {
    const loadNewsData = async () => {
      setLoadingNews(true);
      try {
        // 并行加载所有数据
        const [homeNews, hotNewsData, calendarData] = await Promise.all([
          getHomeNewsData(),
          getHotNews(20),
          getFinancialCalendar(20),
        ]);
        
        if (homeNews.galaxyNews && homeNews.galaxyNews.length > 0) {
          setViewpointData(homeNews.galaxyNews);
        }
        if (homeNews.flashNews && homeNews.flashNews.length > 0) {
          setRealtimeNews(homeNews.flashNews);
        }
        if (hotNewsData && hotNewsData.length > 0) {
          setHotNews(hotNewsData);
        }
        if (calendarData && calendarData.length > 0) {
          setFinancialCalendar(calendarData);
        }
      } catch (error) {
        console.error('加载新闻数据失败:', error);
      } finally {
        setLoadingNews(false);
      }
    };

    loadNewsData();
    
    // 每5分钟刷新一次
    const interval = setInterval(loadNewsData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 获取市场状态
  const getMarketStatus = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay();
    
    // 周末
    if (day === 0 || day === 6) {
      return { status: '休市', color: 'text-[#999999]' };
    }
    
    // 交易时间 9:30-11:30, 13:00-15:00
    if ((hour === 9 && minute >= 30) || (hour === 10) || (hour === 11 && minute < 30)) {
      return { status: '交易中', color: 'text-[#E63946]' };
    }
    if (hour >= 13 && hour < 15) {
      return { status: '交易中', color: 'text-[#E63946]' };
    }
    if (hour < 9 || (hour === 9 && minute < 30)) {
      return { status: '盘前', color: 'text-[#F97316]' };
    }
    
    return { status: '休市', color: 'text-[#999999]' };
  };

  const marketStatus = getMarketStatus();

  // 处理功能入口点击
  const handleFeatureClick = (featureId: string, path?: string) => {
    // 找到对应的功能配置
    const feature = featureGrid.find(f => f.id === featureId);
    
    if (featureId === 'all') {
      setShowAllFeatures(true);
      return;
    }
    
    if (feature?.path && feature.path !== 'all') {
      navigate(feature.path);
      return;
    }
    
    // 兼容旧的回调方式
    switch (featureId) {
      case 'calendar':
        onOpenCalendar?.();
        break;
      default:
        console.log('Feature clicked:', featureId);
    }
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-20">
      {/* 首页轮播图 */}
      <section className="mx-4 mt-2">
        <HomeCarousel 
          onSlideClick={(slide) => {
            if (slide.link) {
              navigate(slide.link);
            }
          }}
        />
      </section>
      
      {/* 功能入口网格 - 2行5列（9个入口+全部） */}
      <section className="bg-white mx-4 rounded-xl shadow-sm p-4 mt-2">
        <div className="grid grid-cols-5 gap-y-4 gap-x-2">
          {featureGrid.map((feature) => (
            <button
              key={feature.id}
              onClick={() => handleFeatureClick(feature.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={`relative w-11 h-11 rounded-xl ${feature.bgColor} flex items-center justify-center text-white text-lg shadow-sm`}>
                {feature.icon}
                {feature.badge && (
                  <span className="absolute -top-1 -right-1 bg-[#E63946] text-white text-[8px] px-1 rounded font-bold">
                    {feature.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#333333] font-medium">{feature.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Banner卡片 */}
      <section className="mx-4 mt-3">
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="inline-block bg-[#E63946] text-white text-[10px] px-1.5 py-0.5 rounded font-medium mb-2">
                {defaultBanner.tag}
              </span>
              <h3 className="text-white text-base font-semibold leading-tight">
                {defaultBanner.title}
              </h3>
              <p className="text-white/60 text-xs mt-2">
                投资有风险，入市需谨慎
              </p>
            </div>
            <div className="flex flex-col items-center ml-3">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">
                {defaultBanner.avatar}
              </div>
              <span className="text-white/80 text-xs mt-1 writing-vertical">{defaultBanner.expert}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 行情状态卡片 */}
      <section className="mx-4 mt-3">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${marketStatus.color}`}>{marketStatus.status}</span>
              <span className="text-sm font-semibold text-[#333333]">反转又反转</span>
            </div>
            <div className="flex items-center gap-2 text-[#666666]">
              <span className="text-xs">融资余额</span>
              <span className="text-xs text-[#999999]">03-12</span>
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 资讯区 */}
      <section className="mx-4 mt-3">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Tab切换 - 4个Tab */}
          <div className="flex items-center border-b border-[#F0F0F0] overflow-x-auto">
            <button
              onClick={() => setActiveTab('viewpoint')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold relative ${
                activeTab === 'viewpoint' ? 'text-[#333333]' : 'text-[#999999]'
              }`}
            >
              银河看点
              {activeTab === 'viewpoint' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold relative ${
                activeTab === 'news' ? 'text-[#333333]' : 'text-[#999999]'
              }`}
            >
              7x24快讯
              {activeTab === 'news' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('hot_news')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold relative ${
                activeTab === 'hot_news' ? 'text-[#333333]' : 'text-[#999999]'
              }`}
            >
              热点资讯
              {activeTab === 'hot_news' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('financial_calendar')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold relative ${
                activeTab === 'financial_calendar' ? 'text-[#333333]' : 'text-[#999999]'
              }`}
            >
              财经日历
              {activeTab === 'financial_calendar' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
              )}
            </button>
          </div>

          {/* 内容列表 */}
          <div className="divide-y divide-[#F0F0F0] max-h-[400px] overflow-y-auto">
            {loadingNews ? (
              <div className="px-4 py-8 text-center text-sm text-[#999999]">
                加载中...
              </div>
            ) : activeTab === 'viewpoint' ? (
              // 银河看点列表
              viewpointData.map((item) => (
                <div 
                  key={item.id} 
                  className="px-4 py-3 cursor-pointer hover:bg-[#FAFAFA]"
                  onClick={() => onOpenNews?.(item.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-[#333333] font-medium leading-relaxed line-clamp-2">
                        {item.title}
                      </p>
                      {item.summary && (
                        <p className="text-xs text-[#999999] mt-1 line-clamp-1">{item.summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-[#E63946] bg-[#E63946]/10 px-1.5 py-0.5 rounded">
                          {item.source || '银河证券'}
                        </span>
                        <span className="text-[10px] text-[#999999]">{item.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : activeTab === 'news' ? (
              // 7x24快讯列表（使用 today_hotspot 表数据）
              realtimeNews.map((item: any) => {
                // 获取快讯前缀标签
                const getPrefixTag = () => {
                  // 优先使用 category，其次使用 sentiment
                  const category = item.category || item.type || '';
                  const sentiment = item.sentiment || '';
                  
                  // 根据分类或情感返回标签样式
                  if (category.includes('公告') || category.includes('公司')) {
                    return { text: '公告', color: 'bg-[#3B82F6] text-white' };
                  }
                  if (category.includes('利好') || sentiment === 'positive') {
                    return { text: '利好', color: 'bg-[#22C55E] text-white' };
                  }
                  if (category.includes('利空') || sentiment === 'negative') {
                    return { text: '利空', color: 'bg-[#E63946] text-white' };
                  }
                  if (category.includes('数据') || category.includes('统计')) {
                    return { text: '数据', color: 'bg-[#8B5CF6] text-white' };
                  }
                  if (category.includes('政策') || category.includes('央行')) {
                    return { text: '政策', color: 'bg-[#F97316] text-white' };
                  }
                  if (category.includes('国际') || category.includes('外盘')) {
                    return { text: '国际', color: 'bg-[#06B6D4] text-white' };
                  }
                  if (category.includes('新股') || category.includes('IPO')) {
                    return { text: '新股', color: 'bg-[#EC4899] text-white' };
                  }
                  // 默认快讯标签
                  return { text: '快讯', color: 'bg-[#E63946] text-white' };
                };
                
                const tag = getPrefixTag();
                
                return (
                  <div 
                    key={item.id} 
                    className="px-4 py-3 cursor-pointer hover:bg-[#FAFAFA]"
                  >
                    <div className="flex gap-3">
                      <span className="text-xs text-[#999999] shrink-0 w-12">{item.time || item.date || ''}</span>
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${tag.color}`}>
                            {tag.text}
                          </span>
                          <p className="text-sm text-[#333333] leading-relaxed flex-1">
                            {item.title || item.content}
                          </p>
                        </div>
                        {item.keywords && (
                          <p className="text-xs text-[#999999] mt-1 ml-10">{item.keywords}</p>
                        )}
                        {item.heat && (
                          <span className="text-[10px] text-[#F97316] mt-1 ml-10 inline-block">🔥 {item.heat}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : activeTab === 'hot_news' ? (
              // 热点资讯列表
              hotNews.map((item) => (
                <div 
                  key={item.id} 
                  className="px-4 py-3 cursor-pointer hover:bg-[#FAFAFA]"
                  onClick={() => {
                    if (item.link) {
                      window.open(item.link, '_blank');
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{
                        backgroundColor: item.rank <= 3 ? '#E63946' : item.rank <= 10 ? '#F97316' : '#999',
                      }}
                    >
                      {item.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#333333] font-medium leading-relaxed line-clamp-2">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#999999]">
                        <span>{item.publish_time}</span>
                        {item.heat && (
                          <span className="text-[#F97316]">🔥 {item.heat}</span>
                        )}
                        <span className="px-1 py-0.5 bg-[#F5F5F5] rounded">
                          {item.source === 'ths' ? '同花顺' : '韭研公社'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // 财经日历列表
              financialCalendar.map((item, index) => (
                <div 
                  key={item.id || index} 
                  className="px-4 py-3 hover:bg-[#FAFAFA]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 text-center">
                      <div className="text-base font-bold text-[#3B82F6]">
                        {item.date?.split('-')[2] || '--'}
                      </div>
                      <div className="text-[10px] text-[#999999]">
                        {item.date?.split('-').slice(0, 2).join('-') || ''}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#333333] leading-relaxed">
                        {item.event}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 查看更多 - 点击跳转到热点汇总页 */}
          <button 
            onClick={() => navigate('/client/hotspot')}
            className="w-full py-3 text-center text-xs text-[#0066CC] border-t border-[#F0F0F0]"
          >
            查看更多热点
          </button>
        </div>
      </section>
      
      {/* 全部功能弹窗 */}
      {showAllFeatures && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={() => setShowAllFeatures(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-t-2xl p-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#333333]">全部功能</h3>
              <button 
                onClick={() => setShowAllFeatures(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {[
                { id: 'ai-stock', label: 'AI选股', icon: '🤖', bgColor: 'bg-[#6366F1]', path: '/client/conditional-orders' },
                { id: 'video', label: '视频专区', icon: '📹', bgColor: 'bg-[#F97316]', path: '/client/video' },
                { id: 'etf', label: 'ETF专区', icon: '📊', bgColor: 'bg-[#EAB308]', path: '/client/etf' },
                { id: 'ipo', label: '新股申购', icon: '🎯', bgColor: 'bg-[#E63946]', path: '/client/ipo' },
                { id: 'margin', label: '融资融券', icon: '💰', bgColor: 'bg-[#F97316]', path: '/client/margin' },
                { id: 'calendar', label: '财富日历', icon: '📅', bgColor: 'bg-[#EAB308]', path: '/client/calendar' },
                { id: 'market', label: '沪深市场', icon: '📈', bgColor: 'bg-[#E63946]', path: '/client/market' },
                { id: 'wealth', label: '稳健理财', icon: '🏦', bgColor: 'bg-[#3B82F6]', path: '/client/wealth-finance' },
                { id: 'trade', label: '股票交易', icon: '💹', bgColor: 'bg-[#10B981]', path: '/client/trade' },
                { id: 'block', label: '大宗交易', icon: '🏢', bgColor: 'bg-[#8B5CF6]', path: '/client/block-trade' },
                { id: 'reports', label: '研报中心', icon: '📑', bgColor: 'bg-[#EC4899]', path: '/client/reports' },
                { id: 'education', label: '投教中心', icon: '📚', bgColor: 'bg-[#14B8A6]', path: '/client/education' },
              ].map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => {
                    navigate(feature.path);
                    setShowAllFeatures(false);
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center text-white text-xl shadow-sm`}>
                    {feature.icon}
                  </div>
                  <span className="text-xs text-[#333333]">{feature.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 新用户引导 */}
      <WelcomeModal
        isOpen={showWelcome}
        onStartTour={handleStartTour}
        onSkip={handleSkipTour}
      />
      <OnboardingTour
        steps={defaultTourSteps}
        isOpen={showTour}
        onClose={handleCloseTour}
        onComplete={handleCompleteTour}
      />
    </div>
  );
});

export default Dashboard;
