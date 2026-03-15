/**
 * 行情页面
 * 按银河证券官方App行情页面截图还原
 * 包含：顶部导航、指数栏、功能入口、资讯快讯、涨跌分布、股票列表
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stock } from '../../lib/types';
import { getMarketList, getRealtimeStock } from '../../services/marketService';
import { marketApi } from '@/services/marketApi';
import { userService } from '../../services/userService';
import { getTodayHotspot, TodayHotspotItem } from '../../services/hotspotService';
import { getIndexQuotes, StockQuote } from '../../services/stockService';
import { PullToRefreshWrapper } from '../shared/WithPullToRefresh';

interface MarketViewProps {
  onSelectStock?: (symbol: string) => void;
}

interface MarketViewProps {
  onSelectStock?: (symbol: string) => void;
}

const MarketView: React.FC<MarketViewProps> = ({ onSelectStock }) => {
  const navigate = useNavigate();
  
  // 顶部主标签
  const [mainTab, setMainTab] = useState<'self' | 'position' | 'market'>('market');
  // 市场类型标签
  const [marketType, setMarketType] = useState<'A' | 'HK' | 'more'>('A');
  // A股细分标签 & 更多市场标签
  const [aShareType, setAShareType] = useState<'all' | 'star' | 'bse' | 'us' | 'future' | 'bond' | 'fund'>('all');
  // 搜索状态
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // 股票列表
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  // 排序
  const [sortField, setSortField] = useState<'price' | 'change' | 'changePercent'>('changePercent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // 涨跌分布展开状态
  const [showDistribution, setShowDistribution] = useState(true);
  // 快讯数据
  const [newsData, setNewsData] = useState<Array<{ 
    id: string; 
    time: string; 
    content: string; 
    category?: string;
    sentiment?: string;
    heat?: string;
  }>>([]);
  // 指数数据
  const [indices, setIndices] = useState<StockQuote[]>([]);

  // 加载快讯数据
  useEffect(() => {
    const loadNews = async () => {
      try {
        // 使用静态导入的 marketApi
        const news = await marketApi.getNews(5);
        
        if (news && news.length > 0) {
          // 使用 proxy-market 返回的数据
          const formattedNews = news.map((item: any) => ({
            id: item.id,
            time: item.time || '',
            content: item.title || item.content,
            category: item.category,
            sentiment: item.sentiment,
            heat: item.heat,
          }));
          setNewsData(formattedNews);
        } else {
          // 备用：使用 today_hotspot 表数据
          const hotspotNews = await getTodayHotspot(5);
          const formattedNews = hotspotNews.map((item: TodayHotspotItem) => ({
            id: item.id,
            time: item.date || '',
            content: item.title,
            heat: item.heat,
          }));
          setNewsData(formattedNews);
        }
      } catch (error) {
        console.error('加载快讯失败:', error);
        // 备用：使用 today_hotspot 表数据
        try {
          const news = await getTodayHotspot(5);
          const formattedNews = news.map((item: TodayHotspotItem) => ({
            id: item.id,
            time: item.date || '',
            content: item.title,
            heat: item.heat,
          }));
          setNewsData(formattedNews);
        } catch (e) {
          console.error('备用数据源也失败:', e);
        }
      }
    };
    
    loadNews();
    // 每3分钟刷新一次
    const interval = setInterval(loadNews, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 加载指数数据
  useEffect(() => {
    const loadIndices = async () => {
      try {
        const quotes = await getIndexQuotes();
        setIndices(quotes);
      } catch (error) {
        console.error('加载指数数据失败:', error);
      }
    };
    
    loadIndices();
    // 每30秒刷新一次
    const interval = setInterval(loadIndices, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 加载自选股
  const loadWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      const watchlistItems = await userService.getWatchlist();
      if (watchlistItems && watchlistItems.length > 0) {
        const watchlistStocks: Stock[] = [];
        for (const item of watchlistItems) {
          try {
            const symbol = item.symbol;
            const isHK = symbol.length === 5;
            const market = isHK ? 'HK' : 'CN';
            const stock = await getRealtimeStock(symbol, market);
            if (stock) {
              watchlistStocks.push(stock);
            }
          } catch (err) {
            console.warn(`获取自选股 ${item.symbol} 行情失败:`, err);
          }
        }
        setStocks(watchlistStocks);
      } else {
        setStocks([]);
      }
    } catch (error) {
      console.error('加载自选股失败:', error);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载市场行情
  const loadMarketStocks = useCallback(async () => {
    try {
      setLoading(true);
      
      let market: 'CN' | 'HK' | 'STAR' | 'BSE' = 'CN';
      
      // 根据市场类型确定要加载的数据
      if (marketType === 'HK') {
        market = 'HK';
      } else if (marketType === 'A') {
        // A股细分
        if (aShareType === 'star') {
          market = 'STAR';
        } else if (aShareType === 'bse') {
          market = 'BSE';
        } else {
          market = 'CN'; // 京沪深主板
        }
      } else if (marketType === 'more') {
        // 更多市场 - 根据细分选项
        if (aShareType === 'us') {
          // 美股 - 暂时显示A股热门股
          market = 'CN';
        } else if (aShareType === 'future') {
          // 期货 - 暂时显示A股热门股
          market = 'CN';
        } else if (aShareType === 'bond') {
          // 债券 - 暂时显示A股热门股
          market = 'CN';
        } else if (aShareType === 'fund') {
          // 基金 - 暂时显示A股热门股
          market = 'CN';
        } else {
          market = 'CN';
        }
      } else {
        market = 'CN';
      }
      
      const result = await getMarketList(market, 1, 20);
      const stocksData = Array.isArray(result) ? result : (result as any).stocks || [];
      
      // 为不同市场添加标签
      const stocksWithMarket = stocksData.map((stock: Stock) => ({
        ...stock,
        // 根据市场类型添加标识
        marketLabel: marketType === 'more' ? aShareType : undefined
      }));
      
      setStocks(stocksWithMarket);
    } catch (error) {
      console.error('加载行情失败:', error);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, [marketType, aShareType]);

  useEffect(() => {
    if (mainTab === 'self') {
      loadWatchlist();
    } else if (mainTab === 'market') {
      loadMarketStocks();
    } else if (mainTab === 'position') {
      setStocks([]);
      setLoading(false);
    }
  }, [mainTab, loadWatchlist, loadMarketStocks]);

  // 下拉刷新处理
  const handleRefresh = useCallback(async () => {
    // 并行刷新所有数据
    await Promise.all([
      // 刷新快讯
      (async () => {
        try {
          const news = await getTodayHotspot(5);
          const formattedNews = news.map((item: TodayHotspotItem) => ({
            id: item.id,
            time: item.date || '',
            content: item.title,
            heat: item.heat,
          }));
          setNewsData(formattedNews);
        } catch (error) {
          console.error('刷新快讯失败:', error);
        }
      })(),
      // 刷新指数
      (async () => {
        try {
          const quotes = await getIndexQuotes();
          setIndices(quotes);
        } catch (error) {
          console.error('刷新指数失败:', error);
        }
      })(),
      // 刷新股票列表
      (async () => {
        try {
          if (mainTab === 'self') {
            await loadWatchlist();
          } else if (mainTab === 'market') {
            await loadMarketStocks();
          }
        } catch (error) {
          console.error('刷新股票列表失败:', error);
        }
      })(),
    ]);
  }, [mainTab, loadWatchlist, loadMarketStocks]);

  // 排序后的股票列表
  const sortedStocks = useMemo(() => {
    const sorted = [...stocks];
    sorted.sort((a, b) => {
      let aValue = 0, bValue = 0;
      if (sortField === 'price') {
        aValue = a.price;
        bValue = b.price;
      } else if (sortField === 'change') {
        aValue = a.change;
        bValue = b.change;
      } else {
        aValue = a.changePercent;
        bValue = b.changePercent;
      }
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    return sorted;
  }, [stocks, sortField, sortOrder]);

  // 切换排序
  const handleSort = (field: 'price' | 'change' | 'changePercent') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 格式化价格
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // 格式化涨跌幅
  const formatChange = (change: number, isPercent: boolean = false) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${isPercent ? (change * 100).toFixed(2) + '%' : change.toFixed(2)}`;
  };

  // 动态计算涨跌分布（基于当前股票列表）
  const upDownDistribution = useMemo(() => {
    // 如果没有股票数据，返回默认值
    if (!stocks || stocks.length === 0) {
      return {
        up: { count: 0, limitUp: 0 },
        down: { count: 0, limitDown: 0 },
        flat: 0,
        ranges: {
          downLimit: 0,
          downOver8: 0,
          down8to6: 0,
          down6to4: 0,
          down4to2: 0,
          down2to0: 0,
          up0to2: 0,
          up2to4: 0,
          up4to6: 0,
          up6to8: 0,
          upOver8: 0,
          upLimit: 0,
        }
      };
    }

    const ranges = {
      downLimit: 0,
      downOver8: 0,
      down8to6: 0,
      down6to4: 0,
      down4to2: 0,
      down2to0: 0,
      up0to2: 0,
      up2to4: 0,
      up4to6: 0,
      up6to8: 0,
      upOver8: 0,
      upLimit: 0,
    };

    let upCount = 0;
    let downCount = 0;
    let limitUp = 0;
    let limitDown = 0;

    stocks.forEach(stock => {
      const pct = (stock.changePercent || 0);
      
      if (pct > 0) {
        upCount++;
        if (pct >= 9.9) {
          ranges.upLimit++;
          limitUp++;
        } else if (pct >= 8) {
          ranges.upOver8++;
        } else if (pct >= 6) {
          ranges.up6to8++;
        } else if (pct >= 4) {
          ranges.up4to6++;
        } else if (pct >= 2) {
          ranges.up2to4++;
        } else {
          ranges.up0to2++;
        }
      } else if (pct < 0) {
        downCount++;
        if (pct <= -9.9) {
          ranges.downLimit++;
          limitDown++;
        } else if (pct <= -8) {
          ranges.downOver8++;
        } else if (pct <= -6) {
          ranges.down8to6++;
        } else if (pct <= -4) {
          ranges.down6to4++;
        } else if (pct <= -2) {
          ranges.down4to2++;
        } else {
          ranges.down2to0++;
        }
      }
    });

    return {
      up: { count: upCount, limitUp },
      down: { count: downCount, limitDown },
      flat: stocks.length - upCount - downCount,
      ranges,
    };
  }, [stocks]);

  // 获取最大值用于柱状图
  const maxCount = Math.max(
    upDownDistribution.ranges.down2to0,
    upDownDistribution.ranges.up0to2,
    1 // 避免除以0
  );

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh} className="bg-[#F5F5F5]">
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      {/* 顶部红色导航栏 */}
      <div className="bg-[#E63946] px-4 pt-2 pb-3">
        <div className="flex items-center justify-between">
          {/* 分享按钮 */}
          <button className="w-8 h-8 flex items-center justify-center text-white/80">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          
          {/* 主标签 */}
          <div className="flex items-center gap-1">
            {[
              { id: 'self', label: '自选' },
              { id: 'position', label: '持仓' },
              { id: 'market', label: '行情' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  mainTab === tab.id
                    ? 'bg-white text-[#E63946]'
                    : 'bg-transparent text-white/90'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* 搜索按钮 */}
          <button 
            onClick={() => setShowSearch(true)}
            className="w-8 h-8 flex items-center justify-center text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 行情分区导航 - 仅行情Tab显示 */}
      {mainTab === 'market' && (
        <div className="bg-white border-b border-[#F0F0F0]">
          {/* 市场大类 */}
          <div className="px-4 py-2 flex items-center gap-4 border-b border-[#F0F0F0]">
            {[
              { id: 'A', label: 'A股' },
              { id: 'HK', label: '港股通' },
              { id: 'more', label: '更多' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMarketType(tab.id as any)}
                className={`relative py-1.5 text-sm font-medium transition-colors ${
                  marketType === tab.id ? 'text-[#E63946]' : 'text-[#666666]'
                }`}
              >
                {tab.label}
                {marketType === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E63946] rounded-full" />
                )}
              </button>
            ))}
          </div>
          
          {/* A股细分市场 */}
          {marketType === 'A' && (
            <div className="px-4 py-2 flex items-center gap-4">
              {[
                { id: 'all', label: '京沪深' },
                { id: 'star', label: '科创板' },
                { id: 'bse', label: '北交所' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAShareType(tab.id as any)}
                  className={`relative py-1.5 text-xs transition-colors ${
                    aShareType === tab.id ? 'text-[#333333]' : 'text-[#999999]'
                  }`}
                >
                  {tab.label}
                  {aShareType === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E63946] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* 更多市场 */}
          {marketType === 'more' && (
            <div className="px-4 py-2 flex items-center gap-4">
              {[
                { id: 'us', label: '美股' },
                { id: 'future', label: '期货' },
                { id: 'bond', label: '债券' },
                { id: 'fund', label: '基金' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAShareType(tab.id as any)}
                  className={`relative py-1.5 text-xs transition-colors ${
                    aShareType === tab.id ? 'text-[#333333]' : 'text-[#999999]'
                  }`}
                >
                  {tab.label}
                  {aShareType === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E63946] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 指数栏 - 横向滚动 */}
      <div className="bg-white py-3 overflow-x-auto no-scrollbar border-b border-[#F0F0F0]">
        <div className="flex gap-4 px-4">
          {indices.map((index) => (
            <div key={index.code} className="flex-shrink-0 w-24 text-center">
              <p className="text-xs text-[#666666] mb-1">{index.name}</p>
              <p className={`text-lg font-bold ${index.change >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                {formatPrice(index.price)}
              </p>
              <div className="flex justify-between text-xs mt-1 px-1">
                <span className={index.change >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}>
                  {formatChange(index.change)}
                </span>
                <span className={index.changePercent >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}>
                  {formatChange(index.changePercent, true)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 功能入口 - 仅行情Tab显示 */}
      {mainTab === 'market' && (
        <div className="bg-white px-4 py-4 border-b border-[#F0F0F0]">
          <div className="grid grid-cols-4 gap-4">
            <button 
              onClick={() => navigate('/client/market/sectors')}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF0F0] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#E63946]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-xs text-[#333333]">板块</span>
            </button>
            <button 
              onClick={() => navigate('/client/etf')}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-[#E3F2FD] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs text-[#333333]">ETF专区</span>
            </button>
            <button 
              onClick={() => navigate('/client/market/smart-pick')}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-[#E5F9EF] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-xs text-[#333333]">智能选股</span>
            </button>
            <button 
              onClick={() => navigate('/client/ipo')}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF7ED] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-[#333333]">新股申购</span>
            </button>
          </div>
        </div>
      )}

      {/* 资讯快讯 - 仅行情Tab显示 */}
      {mainTab === 'market' && (
        <div className="bg-white px-4 py-3 border-b border-[#F0F0F0]">
          {newsData.length > 0 ? (
            newsData.map((news) => {
              // 获取快讯前缀标签
              const getPrefixTag = () => {
                const category = news.category || '';
                const sentiment = news.sentiment || '';
                
                if (category.includes('公告') || category.includes('公司')) {
                  return { text: '公告', color: 'bg-[#3B82F6]' };
                }
                if (category.includes('利好') || sentiment === 'positive') {
                  return { text: '利好', color: 'bg-[#22C55E]' };
                }
                if (category.includes('利空') || sentiment === 'negative') {
                  return { text: '利空', color: 'bg-[#E63946]' };
                }
                if (category.includes('数据') || category.includes('统计')) {
                  return { text: '数据', color: 'bg-[#8B5CF6]' };
                }
                if (category.includes('政策') || category.includes('央行')) {
                  return { text: '政策', color: 'bg-[#F97316]' };
                }
                if (category.includes('国际') || category.includes('外盘')) {
                  return { text: '国际', color: 'bg-[#06B6D4]' };
                }
                if (category.includes('新股') || category.includes('IPO')) {
                  return { text: '新股', color: 'bg-[#EC4899]' };
                }
                return { text: '快讯', color: 'bg-[#E63946]' };
              };
              
              const tag = getPrefixTag();
              
              return (
                <button 
                  key={news.id} 
                  className="w-full flex items-center gap-2"
                  onClick={() => navigate('/client/hotspot')}
                >
                  <span className={`flex-shrink-0 px-2 py-0.5 ${tag.color} text-white text-xs rounded`}>{tag.text}</span>
                  <span className="flex-1 text-sm text-[#333333] text-left truncate">{news.content}</span>
                  {news.heat && (
                    <span className="flex-shrink-0 text-[10px] text-[#F97316]">🔥{news.heat}</span>
                  )}
                  <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })
          ) : (
            <button className="w-full flex items-center gap-2">
              <span className="flex-shrink-0 px-2 py-0.5 bg-[#E63946] text-white text-xs rounded">快讯</span>
              <span className="flex-1 text-sm text-[#999999] text-left truncate">正在加载快讯...</span>
            </button>
          )}
        </div>
      )}

      {/* 涨跌分布 - 仅行情Tab显示 */}
      {mainTab === 'market' && (
        <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm overflow-hidden">
          {/* 标题栏 */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-[#F0F0F0]">
            <span className="text-sm font-medium text-[#333333]">涨跌分布</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#999999]">03-13 16:01</span>
              <button 
                onClick={() => setShowDistribution(!showDistribution)}
                className="text-xs text-[#0066CC]"
              >
                {showDistribution ? '收起' : '展开'}
              </button>
            </div>
          </div>
          
          {showDistribution && (
            <div className="p-4">
              {/* 涨跌概况 */}
              <div className="flex justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span className="text-xs text-[#666666]">跌停 {upDownDistribution.down.limitDown}</span>
                  <span className="text-xs text-[#666666]">下跌 {upDownDistribution.down.count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#666666]">上涨 {upDownDistribution.up.count}</span>
                  <span className="text-xs text-[#666666]">涨停 {upDownDistribution.up.limitUp}</span>
                  <span className="w-2 h-2 rounded-full bg-[#E63946]" />
                </div>
              </div>
              
              {/* 柱状统计图 */}
              <div className="space-y-2">
                {/* 涨停/跌停 */}
                <div className="flex items-center gap-1">
                  <span className="w-12 text-[10px] text-[#22C55E] text-right">跌停</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden flex justify-end">
                    <div 
                      className="h-full bg-[#22C55E]"
                      style={{ width: `${(upDownDistribution.ranges.downLimit / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.downLimit}</span>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.upLimit}</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#E63946]"
                      style={{ width: `${(upDownDistribution.ranges.upLimit / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-[10px] text-[#E63946]">涨停</span>
                </div>
                
                {/* >8% */}
                <div className="flex items-center gap-1">
                  <span className="w-12 text-[10px] text-[#666666] text-right">&gt;8</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden flex justify-end">
                    <div 
                      className="h-full bg-[#22C55E]/80"
                      style={{ width: `${(upDownDistribution.ranges.downOver8 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.downOver8}</span>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.upOver8}</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#E63946]/80"
                      style={{ width: `${(upDownDistribution.ranges.upOver8 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-[10px] text-[#666666]">&gt;8</span>
                </div>
                
                {/* 6-8% */}
                <div className="flex items-center gap-1">
                  <span className="w-12 text-[10px] text-[#666666] text-right">8-6</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden flex justify-end">
                    <div 
                      className="h-full bg-[#22C55E]/70"
                      style={{ width: `${(upDownDistribution.ranges.down8to6 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.down8to6}</span>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.up6to8}</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#E63946]/70"
                      style={{ width: `${(upDownDistribution.ranges.up6to8 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-[10px] text-[#666666]">6-8</span>
                </div>
                
                {/* 4-6% */}
                <div className="flex items-center gap-1">
                  <span className="w-12 text-[10px] text-[#666666] text-right">6-4</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden flex justify-end">
                    <div 
                      className="h-full bg-[#22C55E]/60"
                      style={{ width: `${(upDownDistribution.ranges.down6to4 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.down6to4}</span>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.up4to6}</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#E63946]/60"
                      style={{ width: `${(upDownDistribution.ranges.up4to6 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-[10px] text-[#666666]">4-6</span>
                </div>
                
                {/* 2-4% */}
                <div className="flex items-center gap-1">
                  <span className="w-12 text-[10px] text-[#666666] text-right">4-2</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden flex justify-end">
                    <div 
                      className="h-full bg-[#22C55E]/50"
                      style={{ width: `${(upDownDistribution.ranges.down4to2 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.down4to2}</span>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.up2to4}</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#E63946]/50"
                      style={{ width: `${(upDownDistribution.ranges.up2to4 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-[10px] text-[#666666]">2-4</span>
                </div>
                
                {/* 0-2% */}
                <div className="flex items-center gap-1">
                  <span className="w-12 text-[10px] text-[#666666] text-right">2-0</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden flex justify-end">
                    <div 
                      className="h-full bg-[#22C55E]/40"
                      style={{ width: `${(upDownDistribution.ranges.down2to0 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.down2to0}</span>
                  <span className="w-8 text-[10px] text-[#666666]">{upDownDistribution.ranges.up0to2}</span>
                  <div className="flex-1 h-4 bg-[#F5F5F5] rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#E63946]/40"
                      style={{ width: `${(upDownDistribution.ranges.up0to2 / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-[10px] text-[#666666]">0-2</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 获取当前市场名称 */}
      {(() => {
        let marketTitle = '股票列表';
        if (marketType === 'A') {
          if (aShareType === 'star') marketTitle = '科创板';
          else if (aShareType === 'bse') marketTitle = '北交所';
          else marketTitle = '京沪深主板';
        } else if (marketType === 'HK') {
          marketTitle = '港股通';
        } else if (marketType === 'more') {
          if (aShareType === 'us') marketTitle = '美股';
          else if (aShareType === 'future') marketTitle = '期货';
          else if (aShareType === 'bond') marketTitle = '债券';
          else if (aShareType === 'fund') marketTitle = '基金';
          else marketTitle = '更多市场';
        }
        return null;
      })()}

      {/* 股票列表 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between py-2 px-4 border-b border-[#F0F0F0]">
          <span className="text-sm font-medium text-[#333333]">
            {mainTab === 'self' && '自选股'}
            {mainTab === 'position' && '持仓'}
            {mainTab === 'market' && (
              <>
                {marketType === 'A' && (aShareType === 'star' ? '科创板' : aShareType === 'bse' ? '北交所' : '京沪深主板')}
                {marketType === 'HK' && '港股通'}
                {marketType === 'more' && (aShareType === 'us' ? '美股' : aShareType === 'future' ? '期货' : aShareType === 'bond' ? '债券' : aShareType === 'fund' ? '基金' : '更多市场')}
              </>
            )}
          </span>
          <span className="text-xs text-[#999999]">
            {sortedStocks.length} 只
          </span>
        </div>
        {/* 表头 */}
        <div className="flex items-center py-3 px-4 border-b border-[#F0F0F0] text-xs text-[#666666]">
          <div className="w-24">名称代码</div>
          <div className="flex-1 text-center">
            {mainTab === 'self' && <span>最新价</span>}
            {mainTab === 'market' && <span>多股</span>}
          </div>
          <div 
            className="w-16 text-right cursor-pointer flex items-center justify-end gap-1"
            onClick={() => handleSort('price')}
          >
            最新价
            <svg className={`w-3 h-3 ${sortField === 'price' ? 'text-[#E63946]' : 'text-[#999999]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div 
            className="w-14 text-right cursor-pointer flex items-center justify-end gap-1"
            onClick={() => handleSort('change')}
          >
            涨跌
            <svg className={`w-3 h-3 ${sortField === 'change' ? 'text-[#E63946]' : 'text-[#999999]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div 
            className="w-14 text-right cursor-pointer flex items-center justify-end gap-1"
            onClick={() => handleSort('changePercent')}
          >
            涨跌幅
            <svg className={`w-3 h-3 ${sortField === 'changePercent' ? 'text-[#E63946]' : 'text-[#999999]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* 股票列表内容 */}
        {loading ? (
          <div className="py-12 text-center text-[#999999]">
            <div className="w-8 h-8 border-2 border-[#E5E5E5] border-t-[#E63946] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : sortedStocks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#999999] text-sm mb-2">
              {mainTab === 'self' && '暂无自选股'}
              {mainTab === 'position' && '暂无持仓'}
              {mainTab === 'market' && '暂无数据'}
            </p>
            {mainTab === 'self' && (
              <button 
                onClick={() => setShowSearch(true)}
                className="text-[#0066CC] text-sm"
              >
                添加自选股
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {sortedStocks.slice(0, 15).map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock?.(stock.symbol)}
                className="flex items-center py-3 px-4 cursor-pointer hover:bg-[#F9F9F9] transition-colors"
              >
                <div className="w-24">
                  <p className="text-sm text-[#333333] font-medium truncate">{stock.name}</p>
                  <p className="text-xs text-[#999999]">{stock.symbol}</p>
                </div>
                <div className="flex-1 text-center">
                  {mainTab === 'market' && <span className="text-xs text-[#CCCCCC]">—</span>}
                </div>
                <div className="w-16 text-right">
                  <p className={`text-sm font-medium ${stock.change >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                    {formatPrice(stock.price)}
                  </p>
                </div>
                <div className="w-14 text-right">
                  <p className={`text-sm ${stock.change >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                    {formatChange(stock.change)}
                  </p>
                </div>
                <div className="w-14 text-right">
                  <p className={`text-sm ${stock.changePercent >= 0 ? 'text-[#E63946]' : 'text-[#22C55E]'}`}>
                    {formatChange(stock.changePercent, true)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 搜索弹窗 */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
          {/* 搜索头部 */}
          <div className="bg-white px-4 py-3 flex items-center gap-3">
            <button onClick={() => setShowSearch(false)} className="text-[#666666]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 bg-[#F5F5F5] rounded-lg px-4 py-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索股票代码或名称"
                className="flex-1 bg-transparent text-[#333333] text-sm outline-none placeholder:text-[#999999]"
                autoFocus
              />
            </div>
          </div>
          
          {/* 搜索内容区 */}
          <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
            <p className="text-[#999999] text-sm text-center">
              输入股票代码或名称搜索
            </p>
          </div>
        </div>
      )}
    </div>
    </PullToRefreshWrapper>
  );
};

export default MarketView;
