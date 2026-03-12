import React, { useState, useEffect, useCallback } from 'react';
import { ICONS } from '../../lib/constants';
import { getBanners } from '../../services/contentService';
import { Transaction, Banner } from '../../lib/types';
import { HotStocksPanel } from '../client/market/HotStocksPanel';
import { SmartRecommendations } from '../client/analysis/SmartRecommendations';
import { usePerformanceMonitor } from '../../utils/performanceMonitor';
import { LazyImage } from '../shared/LazyImage';

// Banner 组件
const BannerImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-brand-800)] flex items-center justify-center">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-[var(--color-primary)]">日斗</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <LazyImage
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        onError={() => setError(true)}
        loading="eager"
      />
    </div>
  );
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

// 默认热门股票数据
const defaultHotStocksData = [
  { id: 'hs-1', symbol: '600519', name: '贵州茅台', price: 1688.00, change: 2.35, volume: '56.8万手' },
  { id: 'hs-2', symbol: '000858', name: '五粮液', price: 156.80, change: 1.28, volume: '42.3万手' },
  { id: 'hs-3', symbol: '601318', name: '中国平安', price: 45.60, change: -0.85, volume: '38.1万手' },
  { id: 'hs-4', symbol: '000333', name: '美的集团', price: 62.30, change: 0.92, volume: '32.5万手' },
  { id: 'hs-5', symbol: '002415', name: '海康威视', price: 32.50, change: -1.15, volume: '28.7万手' },
];

// 默认市场新闻数据
// 获取当前时间的格式化字符串 (HH:MM)
const getCurrentTimeStr = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// 生成相对时间（当前时间减去N分钟）
const getRelativeTimeStr = (minutesAgo: number) => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - minutesAgo);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const defaultNewsData = [
  {
    id: 'news-1',
    title: '央行：稳健货币政策将更加灵活适度',
    content: '中国人民银行表示将继续实施稳健的货币政策，保持流动性合理充裕，加大对实体经济的支持力度。',
    time: getRelativeTimeStr(5),
    source: '财经头条',
    category: '宏观政策',
    sentiment: 'neutral'
  },
  {
    id: 'news-2',
    title: '北向资金今日净流入超50亿元',
    content: '数据显示，北向资金今日全天净流入超过50亿元，其中沪股通净流入30亿元，深股通净流入20亿元。',
    time: getRelativeTimeStr(15),
    source: '财经快讯',
    category: '资金动向',
    sentiment: 'positive'
  },
  {
    id: 'news-3',
    title: '科技板块持续活跃 半导体领涨',
    content: '今日科技板块表现强劲，半导体、芯片概念股集体走强，多只个股涨停。',
    time: getRelativeTimeStr(25),
    source: '证券时报',
    category: '板块异动',
    sentiment: 'positive'
  },
  {
    id: 'news-4',
    title: '新能源汽车销量创新高',
    content: '据中汽协数据，新能源汽车月度销量再次刷新历史记录，同比增长超过80%。',
    time: getRelativeTimeStr(35),
    source: '汽车之家',
    category: '行业动态',
    sentiment: 'positive'
  },
  {
    id: 'news-5',
    title: 'A股三大指数集体收涨',
    content: 'A股三大指数今日集体收涨，沪指涨0.8%，深成指涨1.2%，创业板指涨1.5%。',
    time: getRelativeTimeStr(45),
    source: '新浪财经',
    category: '市场收评',
    sentiment: 'positive'
  },
];

const defaultBanners: Array<{
  id: string;
  title: string;
  category: string;
  desc: string;
  content?: string;
  img?: string;
}> = [
  {
    id: 'default-1',
    title: '银河日斗 · 智能交易单元',
    category: '平台公告',
    desc: '银河证券日斗投资单元全面上线，提供实时行情、智能交易、合规监控等功能',
    content: `尊敬的投资者：

银河证券"日斗"智能交易单元正式上线！

【核心功能】
• 实时行情：覆盖A股、港股市场，支持分时图、K线图、五档行情
• 智能交易：支持普通买卖、新股申购、大宗交易、涨停打板等多种交易模式
• 合规盾牌：实时监测交易行为，确保每一笔交易符合监管要求
• 投教中心：提供专业的投资知识和风险教育内容

【风险提示】
股市有风险，投资需谨慎。请根据自身风险承受能力合理配置资产。

银河证券客户服务热线：95551`,
    img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop&q=80',
  },
  {
    id: 'default-2',
    title: '风控合规 · 实时监测',
    category: '合规公告',
    desc: '合规盾牌实时监测交易行为，确保每一笔交易符合监管要求',
    content: `尊敬的投资者：

银河证券"合规盾牌"系统运行公告

【监测功能】
• 异常报单拦截：自动识别并拦截异常价格、异常数量的委托
• 价格偏离度监控：实时监测委托价格与市场价格的偏离程度
• 持仓集中度审查：定期审查客户持仓集中度，提示风险
• 反洗钱(AML)筛查：对所有交易进行反洗钱合规筛查

【合规提示】
请确保您的交易行为符合《证券法》及相关监管规定，避免违规操作。

银河证券合规部`,
    img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop&q=80',
  },
  {
    id: 'default-3',
    title: '投教中心 · 理财知识',
    category: '投教活动',
    desc: '银河证券投资者教育基地，提供专业的投资知识和风险教育',
    content: `尊敬的投资者：

银河证券投资者教育基地欢迎您！

【课程内容】
• 股票入门基础知识
• 技术分析入门：K线图解读
• 价值投资理念与实践
• 风险管理与仓位控制
• 新股申购全攻略
• 基金定投策略指南

【学习建议】
建议您从基础课程开始学习，逐步提升投资能力。每个课程配有练习题和模拟交易环节。

【风险教育】
投资有风险，入市需谨慎。请根据自身风险承受能力（C1-C5）选择适合的投资产品。

银河证券投教团队`,
    img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop&q=80',
  },
];

const Dashboard: React.FC<DashboardProps> = React.memo(({ 
  transactions = [], 
  onOpenCalendar, 
  onOpenReports, 
  onOpenEducation, 
  onOpenCompliance,
  onOpenBanner,
  onOpenNews
}) => {
  const [banners, setBanners] = useState<typeof defaultBanners>(defaultBanners);
  const [realtimeNews, setRealtimeNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [expandedNews, setExpandedNews] = useState<Set<string>>(new Set());
  
  usePerformanceMonitor('Dashboard');

  const fetchRealtimeNews = useCallback(async () => {
    try {
      // 使用代理路径避免 CORS 问题
      const apiUrl = import.meta.env.DEV 
        ? '/api/eastmoney/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=0&pageSize=20&req_trace=' + Date.now()
        : 'https://np-listapi.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=0&pageSize=20&req_trace=' + Date.now();
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://www.eastmoney.com/',
        },
      });
      
      if (!response.ok) throw new Error('获取快讯失败');
      
      const result = await response.json();
      
      if (result?.data?.fastNewsList && result.data.fastNewsList.length > 0) {
        const formatted = result.data.fastNewsList.map((item: any) => {
          // 从 showTime 提取时间部分 (格式: "2026-03-12 09:19:20" -> "09:19")
          let timeStr = '';
          if (item.showTime) {
            const match = item.showTime.match(/\d{2}:\d{2}/);
            timeStr = match ? match[0] : item.showTime;
          }
          
          return {
            id: item.code || Math.random().toString(),
            title: item.title,
            content: item.summary || item.content || '',
            time: timeStr || getCurrentTimeStr(),
            source: item.source || '财经快讯',
            category: item.columnName || '财经快讯',
            sentiment: item.emotion || 'neutral',
          };
        });
        setRealtimeNews(formatted);
      } else {
        // 如果没有数据，使用默认数据
        setRealtimeNews(defaultNewsData);
      }
    } catch (err) {
      console.warn('获取实时快讯失败:', err);
      // 使用默认数据作为后备
      setRealtimeNews(defaultNewsData);
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const bannerData = await getBanners();
        if (bannerData && bannerData.length > 0) {
          setBanners(bannerData.map(b => ({
            id: b.id,
            title: b.title,
            category: b.category || '平台公告',
            desc: b.subtitle || '',
            content: b.content || b.subtitle || '',
            img: b.imageUrl,
          })));
        }
      } catch (err) {
        console.error('获取横幅失败:', err);
      }
    };
    fetchBanners();
    
    fetchRealtimeNews();
    const interval = setInterval(fetchRealtimeNews, 60000);
    return () => clearInterval(interval);
  }, [fetchRealtimeNews]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 风险提示栏 */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg py-2.5 px-4 flex items-center gap-3 overflow-hidden">
        <div className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-semibold shrink-0 z-10">风险提示</div>
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee whitespace-nowrap text-sm text-orange-700 inline-block">
            市场有风险，投资需谨慎。日斗投资单元实时合规提示：请严格执行止盈止损策略，防范流动性风险。
          </div>
        </div>
      </div>

      {/* 轮播Banner */}
      <section>
        <div className="flex overflow-x-auto gap-4 no-scrollbar snap-x pb-1">
          {banners.map((banner) => (
            <div 
              key={banner.id} 
              onClick={() => onOpenBanner?.({ 
                id: banner.id, 
                title: banner.title, 
                subtitle: banner.desc,
                desc: banner.desc,
                content: banner.content,
                category: banner.category,
                img: banner.img
              })}
              className="min-w-[85%] md:min-w-[45%] lg:min-w-[32%] snap-center relative h-48 rounded-xl overflow-hidden group shadow-sm border border-[var(--color-border)] cursor-pointer hover:shadow-md transition-all"
            >
              <BannerImage src={banner.img} alt={banner.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end">
                <span className="text-xs font-medium text-blue-300 mb-1">{banner.category}</span>
                <h4 className="text-white font-semibold text-lg leading-tight">{banner.title}</h4>
                <p className="text-white/70 text-sm mt-1 line-clamp-2">{banner.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 功能入口 */}
      <section className="py-2">
        <div className="grid grid-cols-4 gap-4 md:gap-6">
          {[
            { id: 'calendar', label: '投资日历', icon: ICONS.Calendar, color: 'bg-blue-50 text-[var(--color-primary)]', action: onOpenCalendar },
            { id: 'reports', label: '日斗研报', icon: ICONS.Book, color: 'bg-purple-50 text-purple-600', action: onOpenReports },
            { id: 'edu', label: '投教中心', icon: ICONS.User, color: 'bg-green-50 text-green-600', action: onOpenEducation },
            { id: 'compliance', label: '合规盾牌', icon: ICONS.Shield, color: 'bg-red-50 text-red-500', action: onOpenCompliance },
          ].map((feat) => (
            <div 
              key={feat.id} 
              onClick={() => feat.action?.()}
              className="flex flex-col items-center gap-2.5 cursor-pointer group"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${feat.color} group-hover:scale-105 transition-transform`}>
                <feat.icon size={24} />
              </div>
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">{feat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 热门股票和智能推荐 */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HotStocksPanel />
          <SmartRecommendations />
        </div>
      </section>

      {/* 实时市场动态 */}
      <section>
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">实时市场动态</h3>
            </div>
            <button 
              className="text-xs text-[var(--color-primary)] font-medium px-3 py-1 bg-blue-50 rounded-md hover:bg-blue-100 transition-all" 
              onClick={fetchRealtimeNews}
            >
              刷新
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loadingNews ? (
              <div className="p-6 text-center text-[var(--color-text-muted)] text-sm">加载中...</div>
            ) : realtimeNews.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-muted)] text-sm">暂无实时动态</div>
            ) : (
              realtimeNews.map((item) => {
                const isExpanded = expandedNews.has(item.id);
                const content = item.content || '';
                const needsCollapse = content.length > 80;
                const displayContent = isExpanded || !needsCollapse ? content : content.slice(0, 80) + '...';
                
                return (
                  <div key={item.id} className="px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors">
                    <div className="flex gap-3">
                      <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 w-14 pt-0.5">
                        {item.time || '--:--'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] leading-relaxed">
                            {item.title}
                          </p>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${
                            item.sentiment === 'positive' ? 'bg-red-500' :
                            item.sentiment === 'negative' ? 'bg-green-500' :
                            'bg-[var(--color-text-muted)]'
                          }`} />
                        </div>
                        {displayContent && (
                          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-1">
                            {displayContent}
                          </p>
                        )}
                        {needsCollapse && (
                          <button
                            onClick={() => {
                              const newSet = new Set(expandedNews);
                              if (isExpanded) {
                                newSet.delete(item.id);
                              } else {
                                newSet.add(item.id);
                              }
                              setExpandedNews(newSet);
                            }}
                            className="text-xs text-[var(--color-primary)] font-medium hover:underline"
                          >
                            {isExpanded ? '收起' : '展开全文'}
                          </button>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg)] px-1.5 py-0.5 rounded">
                            {item.category || '快讯'}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">{item.source}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {realtimeNews.length > 0 && (
            <div className="px-4 py-2 text-center bg-[var(--color-surface)] border-t border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-muted)]">数据每60秒自动刷新</span>
            </div>
          )}
        </div>
      </section>

      {/* 最近交易 */}
      <section>
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
            <ICONS.Trade size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">最近交易指令</h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)] text-sm">暂无交易记录</div>
            ) : (
              transactions.slice(0, 5).map((trade) => (
                <div 
                  key={trade.id} 
                  className="px-4 py-3 flex justify-between items-center hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm ${
                      trade.type === 'BUY' ? 'bg-red-50 text-red-500' : 
                      trade.type === 'SELL' ? 'bg-green-50 text-green-600' : 
                      'bg-blue-50 text-blue-500'
                    }`}>
                      {trade.type === 'BUY' ? '买' : trade.type === 'SELL' ? '卖' : '申'}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{trade.name}</h4>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {trade.symbol} · {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">¥{trade.price.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      trade.status === 'FILLED' || trade.status === 'SUCCESS' ? 'bg-green-50 text-green-600' : 
                      trade.status === 'PENDING' || trade.status === 'MATCHING' ? 'bg-blue-50 text-blue-500' :
                      'bg-orange-50 text-orange-500'
                    }`}>
                      {trade.status === 'FILLED' || trade.status === 'SUCCESS' ? '成功' : 
                       trade.status === 'PENDING' || trade.status === 'MATCHING' ? '撮合中' : '处理中'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
});

export default Dashboard;
