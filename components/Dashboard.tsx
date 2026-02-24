import React, { useState, useEffect } from 'react';
import { COLORS, BANNER_MOCK, ICONS, MOCK_CALENDAR, MOCK_REPORTS } from '../constants';
import { getGalaxyNews } from '../services/marketService';
import { Transaction, Banner, TradeType } from '../types';

// 图片加载组件：处理加载/错误状态
const BannerImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#00D4AA]/20 to-[#0A1628] flex items-center justify-center">
        <div className="w-12 h-12 bg-[#00D4AA] rounded-2xl flex items-center justify-center font-black text-[#0A1628] opacity-50">ZY</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && <div className="absolute inset-0 bg-[var(--color-surface)] animate-pulse" />}
      <img 
        src={src} 
        alt={alt} 
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
};

// 定义组件Props类型
interface DashboardProps {
  transactions?: Transaction[];
  onOpenCalendar?: () => void;
  onOpenReports?: () => void;
  onOpenEducation?: () => void;
  onOpenCompliance?: () => void;
  onOpenBanner?: (banner: Banner) => void;
}

// 核心Dashboard组件
const Dashboard: React.FC<DashboardProps> = ({ 
  transactions = [], 
  onOpenCalendar, 
  onOpenReports, 
  onOpenEducation, 
  onOpenCompliance,
  onOpenBanner
}) => {
  const [news, setNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  // 获取银河新闻数据
  const fetchNews = async () => {
    setLoadingNews(true);
    try {
      const newsRes = await getGalaxyNews();
      setNews(newsRes || []); // 兜底：避免返回null导致报错
    } catch (err) {
      console.error('获取新闻失败:', err);
      setNews([]);
    } finally {
      setLoadingNews(false);
    }
  };

  // 初始化+定时刷新新闻
  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000); // 5分钟刷新一次
    return () => clearInterval(interval); // 组件卸载清除定时器
  }, []);

  return (
    <div className="space-y-6 animate-slide-up pb-8 pt-4">
      {/* 风险告知栏 */}
      <div className="bg-[#FF6B6B]/10 py-3 px-6 flex items-center gap-4 overflow-hidden border border-[#FF6B6B]/10 rounded-2xl mx-4">
        <div className="bg-[#FF6B6B] text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shrink-0">银河风控</div>
        <div className="animate-marquee whitespace-nowrap text-[11px] font-bold text-[#FF6B6B] tracking-wide">
          证裕单元 Nexus 计划实时合规提示：市场波动加剧，请严格执行止盈止损策略，防范流动性风险。
        </div>
      </div>

      {/* 轮播Banner区 */}
      <section className="px-4">
        <div className="flex overflow-x-auto gap-6 no-scrollbar snap-x">
          {BANNER_MOCK.map((banner) => (
            <div 
              key={banner.id} 
              onClick={() => onOpenBanner?.(banner)}
              className="min-w-[90%] md:min-w-[45%] lg:min-w-[32%] snap-center relative h-56 rounded-4xl overflow-hidden group shadow-2xl border border-[var(--color-border)] cursor-pointer active:scale-[0.98] transition-all"
            >
              <BannerImage src={banner.img} alt={banner.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end">
                <span className="text-[9px] font-black text-[#00D4AA] uppercase tracking-[0.3em] mb-2">{banner.category}</span>
                <h4 className="text-white font-black text-xl leading-tight group-hover:text-[#00D4AA] transition-colors">{banner.title}</h4>
                <p className="text-white/70 text-xs mt-2 font-medium line-clamp-2">{banner.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 功能矩阵区 */}
      <section className="px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-[var(--color-surface)] p-8 rounded-4xl border border-[var(--color-border)] shadow-sm">
          {[
            { id: 'calendar', label: '投资日历', icon: ICONS.Calendar, color: 'text-[#00D4AA] bg-[#00D4AA]/10', action: onOpenCalendar },
            { id: 'reports', label: '证裕研报', icon: ICONS.Book, color: 'text-blue-500 bg-blue-500/10', action: onOpenReports },
            { id: 'edu', label: '投教中心', icon: ICONS.User, color: 'text-purple-500 bg-purple-500/10', action: onOpenEducation },
            { id: 'compliance', label: '合规盾牌', icon: ICONS.Shield, color: 'text-[#FF6B6B] bg-[#FF6B6B]/10', action: onOpenCompliance },
          ].map((feat) => (
            <div 
              key={feat.id} 
              onClick={feat.action}
              className="flex flex-col items-center gap-3 cursor-pointer group active:scale-95 transition-all"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border border-[var(--color-border)] shadow-lg group-hover:scale-110 transition-transform ${feat.color}`}>
                <feat.icon size={28} />
              </div>
              <span className="text-[11px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest text-center">{feat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 实时快讯区 */}
      <section className="px-4">
        <div className="glass-card overflow-hidden rounded-4xl">
          <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-2.5 bg-[#00D4AA] rounded-full animate-pulse shadow-[0_0_10px_#00D4AA]" />
              <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-[0.3em]">银河证券证裕单元 24H 全球实时情报</h3>
            </div>
            <button 
              className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest px-4 py-2 bg-[#00D4AA]/10 rounded-xl hover:bg-[#00D4AA]/20 transition-all" 
              onClick={fetchNews}
            >
              同步情报
            </button>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {loadingNews ? (
              <div className="p-6 text-center text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px]">加载情报中...</div>
            ) : news.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px]">暂无实时情报</div>
            ) : (
              news.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-6 flex gap-6 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer group"
                >
                  <span className="text-[11px] font-mono font-bold text-[var(--color-text-muted)] mt-1">{item.time}</span>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter bg-[var(--color-bg)] px-2 py-0.5 rounded-md border border-[var(--color-border)]">{item.category}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        item.sentiment === 'positive' ? 'bg-[#00D4AA]' : 
                        item.sentiment === 'negative' ? 'bg-[#FF6B6B]' : 
                        'bg-slate-400'
                      }`} />
                    </div>
                    <p className="text-[15px] font-bold text-[var(--color-text-primary)] leading-relaxed group-hover:text-[#00D4AA] transition-colors">{item.title}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 最近交易区 */}
      <section className="px-4">
        <div className="glass-card overflow-hidden rounded-4xl">
          <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
            <div className="flex items-center gap-4">
              <ICONS.Trade size={18} className="text-[#00D4AA]" />
              <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-[0.3em]">最近交易指令</h3>
            </div>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px]">暂无交易记录</div>
            ) : (
              transactions.map((trade) => (
                <div 
                  key={trade.id} 
                  className="p-6 flex justify-between items-center hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                      trade.type === TradeType.BUY ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 
                      trade.type === TradeType.SELL ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]' : 
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {trade.type === TradeType.BUY ? '买' : trade.type === TradeType.SELL ? '卖' : '申'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[var(--color-text-primary)]">{trade.name}</h4>
                      <p className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold">
                        {trade.symbol} · {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black font-mono text-[var(--color-text-primary)]">¥{trade.price.toFixed(2)}</p>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      trade.status === 'SUCCESS' ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 
                      trade.status === 'MATCHING' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-orange-500/10 text-orange-500'
                    }`}>
                      {trade.status === 'SUCCESS' ? '成功' : 
                       trade.status === 'MATCHING' ? '撮合中' : '处理中'}
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
};

export default Dashboard;