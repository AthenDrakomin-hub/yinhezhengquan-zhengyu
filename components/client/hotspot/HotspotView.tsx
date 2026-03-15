/**
 * 热点汇总页面
 * 展示热点资讯、今日热点、财经日历、公社热帖
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFire, FaCalendarAlt, FaUsers, FaBolt, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';
import {
  getHotNews,
  getTodayHotspot,
  getFinancialCalendar,
  getCommunityPosts,
  HotNewsItem,
  TodayHotspotItem,
  FinancialCalendarItem,
  CommunityPostItem,
} from '../../../services/hotspotService';

type TabType = 'hot_news' | 'today_hotspot' | 'financial_calendar' | 'community_posts';

interface HotspotViewProps {
  onBack?: () => void;
}

const HotspotView: React.FC<HotspotViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('hot_news');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 数据状态
  const [hotNews, setHotNews] = useState<HotNewsItem[]>([]);
  const [todayHotspot, setTodayHotspot] = useState<TodayHotspotItem[]>([]);
  const [financialCalendar, setFinancialCalendar] = useState<FinancialCalendarItem[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPostItem[]>([]);

  // 加载数据
  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [news, hotspot, calendar, posts] = await Promise.all([
        getHotNews(50),
        getTodayHotspot(30),
        getFinancialCalendar(50),
        getCommunityPosts(50),
      ]);

      setHotNews(news);
      setTodayHotspot(hotspot);
      setFinancialCalendar(calendar);
      setCommunityPosts(posts);
    } catch (error) {
      console.error('加载热点数据失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 获取当前Tab数据
  const getCurrentData = () => {
    switch (activeTab) {
      case 'hot_news':
        return hotNews;
      case 'today_hotspot':
        return todayHotspot;
      case 'financial_calendar':
        return financialCalendar;
      case 'community_posts':
        return communityPosts;
      default:
        return [];
    }
  };

  // Tab配置
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; color: string }> = [
    { id: 'hot_news', label: '热点资讯', icon: <FaBolt />, color: '#E63946' },
    { id: 'today_hotspot', label: '今日热点', icon: <FaFire />, color: '#F97316' },
    { id: 'financial_calendar', label: '财经日历', icon: <FaCalendarAlt />, color: '#3B82F6' },
    { id: 'community_posts', label: '公社热帖', icon: <FaUsers />, color: '#8B5CF6' },
  ];

  // 渲染热点资讯列表
  const renderHotNewsList = () => (
    <div className="divide-y divide-gray-100">
      {hotNews.map((item, index) => (
        <div
          key={item.id}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => {
            if (item.link) {
              window.open(item.link, '_blank');
            }
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                backgroundColor: item.rank <= 3 ? '#E63946' : item.rank <= 10 ? '#F97316' : '#999',
              }}
            >
              {item.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium leading-relaxed">{item.title}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{item.publish_time}</span>
                {item.heat && (
                  <span className="text-orange-500">🔥 {item.heat}</span>
                )}
                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                  {item.source === 'ths' ? '同花顺' : '韭研公社'}
                </span>
              </div>
            </div>
            {item.link && (
              <FaExternalLinkAlt className="flex-shrink-0 text-gray-400 text-xs" />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染今日热点列表
  const renderTodayHotspotList = () => (
    <div className="divide-y divide-gray-100">
      {todayHotspot.map((item, index) => (
        <div
          key={item.id}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium">{item.title}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{item.date}</span>
                {item.heat && <span className="text-orange-500">🔥 {item.heat}</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染财经日历列表
  const renderFinancialCalendarList = () => (
    <div className="divide-y divide-gray-100">
      {financialCalendar.map((item, index) => (
        <div key={item.id || index} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 text-center">
              <div className="text-lg font-bold text-blue-600">{item.date?.split('-')[2] || '--'}</div>
              <div className="text-[10px] text-gray-500">{item.date?.split('-').slice(0, 2).join('-') || ''}</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{item.event}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染公社热帖列表
  const renderCommunityPostsList = () => (
    <div className="divide-y divide-gray-100">
      {communityPosts.map((item) => (
        <div
          key={item.id}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => {
            if (item.link) {
              window.open(item.link, '_blank');
            }
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                backgroundColor: item.rank <= 3 ? '#8B5CF6' : item.rank <= 10 ? '#A78BFA' : '#999',
              }}
            >
              {item.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium">{item.title}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{item.publish_time}</span>
                {item.heat && <span className="text-purple-500">💬 {item.heat}</span>}
              </div>
            </div>
            {item.link && <FaExternalLinkAlt className="flex-shrink-0 text-gray-400 text-xs" />}
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染列表内容
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <FaSpinner className="animate-spin text-2xl text-gray-400" />
        </div>
      );
    }

    const data = getCurrentData();
    if (data.length === 0) {
      return (
        <div className="text-center py-20 text-gray-500">
          暂无数据
        </div>
      );
    }

    switch (activeTab) {
      case 'hot_news':
        return renderHotNewsList();
      case 'today_hotspot':
        return renderTodayHotspotList();
      case 'financial_calendar':
        return renderFinancialCalendarList();
      case 'community_posts':
        return renderCommunityPostsList();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => onBack?.() || navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">热点资讯</h1>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            {refreshing ? (
              <FaSpinner className="animate-spin text-gray-400" />
            ) : (
              <span className="text-sm text-blue-600">刷新</span>
            )}
          </button>
        </div>

        {/* Tab导航 */}
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span style={{ color: activeTab === tab.id ? tab.color : undefined }}>{tab.icon}</span>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: tab.color }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* 内容区 */}
      <main className="flex-1 bg-white">
        {renderContent()}
      </main>

      {/* 数据统计 */}
      {!loading && (
        <footer className="bg-white border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-500">
          共 {getCurrentData().length} 条数据
        </footer>
      )}
    </div>
  );
};

export default HotspotView;
