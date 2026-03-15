"use strict";

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';
import { getGalaxyNews } from '../../../services/marketService';
import { LazyImage } from '../../shared/LazyImage';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  date: string;
  time?: string;
  url?: string;
  category: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  imageUrl?: string;
  source?: string;
  author?: string;
  views?: number;
}

interface NewsDetailViewProps {
  newsId?: string;
  onBack?: () => void;
}

const NewsDetailView: React.FC<NewsDetailViewProps> = ({ newsId: propNewsId, onBack: propOnBack }) => {
  const navigate = useNavigate();
  const params = useParams();
  const newsId = propNewsId || params.newsId;
  const onBack = propOnBack || (() => navigate(-1));

  const [news, setNews] = useState<NewsItem | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNewsDetail();
  }, [newsId]);

  const loadNewsDetail = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 获取所有新闻并找到当前新闻
      const allNews = await getGalaxyNews();
      
      if (!allNews || allNews.length === 0) {
        setError('暂无新闻数据');
        setLoading(false);
        return;
      }

      // 查找当前新闻
      const currentNews = allNews.find((n: NewsItem) => n.id === newsId);
      
      if (!currentNews) {
        // 如果没有找到特定ID的新闻，显示第一条
        setNews(allNews[0]);
      } else {
        setNews(currentNews);
      }

      // 设置相关新闻（排除当前新闻）
      const related = allNews
        .filter((n: NewsItem) => n.id !== newsId)
        .slice(0, 5);
      setRelatedNews(related);
      
    } catch (err) {
      console.error('加载新闻详情失败:', err);
      setError('加载新闻详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-[#E63946]/20 text-[#E63946] border-[#E63946]/30';
      case 'negative': return 'bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getSentimentText = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '利好';
      case 'negative': return '利空';
      default: return '中性';
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      '市场': 'bg-[var(--color-secondary-light)] text-[var(--color-secondary)] border-[var(--color-secondary)]/30',
      '策略': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      '科技': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      '公告': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      '财报': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return colors[category || ''] || 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]';
  };

  // 生成新闻内容（如果没有详细内容，基于摘要生成）
  const generateFullContent = (newsItem: NewsItem) => {
    if (newsItem.content) return newsItem.content;
    
    return `${newsItem.summary}

【市场影响】
该消息对市场情绪产生${getSentimentText(newsItem.sentiment)}影响，投资者需关注后续发展。银河证券研究院将持续跟踪该事件对相关板块的潜在影响。

【投资建议】
建议投资者保持理性，根据自身风险承受能力做出投资决策。具体投资策略请咨询您的专属理财顾问或拨打客服热线95551。

【风险提示】
股市有风险，投资需谨慎。本资讯仅供参考，不构成投资建议。`;
  };

  if (loading) {
    return (
      <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
        <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <ICONS.ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">新闻详情</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63946]"></div>
        </div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
        <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <ICONS.ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">新闻详情</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <ICONS.AlertCircle size={48} className="text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-muted)] font-bold">{error || '新闻未找到'}</p>
          <button 
            onClick={loadNewsDetail}
            className="mt-4 px-6 py-2 rounded-xl bg-[#E63946] text-[#1E1E1E] font-black text-xs uppercase"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)]">
      {/* 头部 */}
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
          <ICONS.ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black uppercase tracking-[0.2em] truncate">资讯详情</h1>
        </div>
        {news.url && (
          <a 
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[#E63946] transition-all"
            title="查看原文"
          >
            <ICONS.Globe size={18} />
          </a>
        )}
      </header>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* 新闻头图 */}
        {news.imageUrl ? (
          <div className="relative w-full h-48 md:h-64">
            <LazyImage
              src={news.imageUrl}
              alt={news.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-32 bg-gradient-to-br from-[#E63946]/20 to-[#1E1E1E] flex items-center justify-center">
            <div className="text-center">
              <ICONS.Book size={40} className="text-[#E63946]/50 mx-auto mb-2" />
              <span className="text-[10px] font-black text-[#E63946]/50 uppercase tracking-widest">Galaxy News</span>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6 -mt-8 relative z-10">
          {/* 标题和标签 */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`text-[9px] font-black px-2 py-1 rounded border ${getCategoryColor(news.category)}`}>
                {news.category || '资讯'}
              </span>
              {news.sentiment && (
                <span className={`text-[9px] font-black px-2 py-1 rounded border ${getSentimentColor(news.sentiment)}`}>
                  {getSentimentText(news.sentiment)}
                </span>
              )}
            </div>
            
            <h1 className="text-xl md:text-2xl font-black text-[var(--color-text-primary)] leading-tight">
              {news.title}
            </h1>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-[var(--color-text-muted)]">
              <div className="flex items-center gap-1">
                <ICONS.Calendar size={12} />
                <span>{formatDate(news.date)}</span>
              </div>
              {news.time && (
                <div className="flex items-center gap-1">
                  <ICONS.Clock size={12} />
                  <span>{news.time}</span>
                </div>
              )}
              {news.source && (
                <div className="flex items-center gap-1">
                  <ICONS.Globe size={12} />
                  <span>{news.source}</span>
                </div>
              )}
              {news.author && (
                <div className="flex items-center gap-1">
                  <ICONS.User size={12} />
                  <span>{news.author}</span>
                </div>
              )}
              {news.views !== undefined && (
                <div className="flex items-center gap-1">
                  <ICONS.Eye size={12} />
                  <span>{news.views.toLocaleString()} 阅读</span>
                </div>
              )}
            </div>
          </div>

          {/* 分割线 */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

          {/* 新闻内容 */}
          <div className="prose prose-invert max-w-none">
            <div className="text-[15px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
              {generateFullContent(news)}
            </div>
          </div>

          {/* 分享按钮 */}
          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => navigator.share?.({ title: news.title, text: news.summary, url: window.location.href }).catch(() => {})}
              className="flex-1 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest hover:border-[#E63946]/30 transition-all flex items-center justify-center gap-2"
            >
              <ICONS.Share size={14} />
              分享资讯
            </button>
            <button 
              onClick={() => {
                if (news.url) window.open(news.url, '_blank');
              }}
              disabled={!news.url}
              className="flex-1 py-3 rounded-xl bg-[#E63946]/10 border border-[#E63946]/20 text-[10px] font-black uppercase tracking-widest text-[#E63946] hover:bg-[#E63946]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ICONS.ExternalLink size={14} />
              查看原文
            </button>
          </div>

          {/* 相关新闻 */}
          {relatedNews.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-[var(--color-border)]">
              <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-[0.2em]">相关资讯</h3>
              <div className="space-y-3">
                {relatedNews.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/client/news/${item.id}`)}
                    className="w-full text-left p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[#E63946]/30 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      {item.imageUrl ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                          <LazyImage src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-[var(--color-bg)] flex items-center justify-center shrink-0">
                          <ICONS.Book size={20} className="text-[var(--color-text-muted)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${getCategoryColor(item.category)}`}>
                          {item.category || '资讯'}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] mt-1 group-hover:text-[#E63946] transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{formatDate(item.date)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsDetailView;
