/**
 * 资讯详情页面
 * 优化版本 - 直接从数据库获取新闻详情
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { LazyImage } from '../../shared/LazyImage';

interface NewsDetail {
  id: string;
  title: string;
  link: string | null;
  publish_time: string | null;
  heat: string | null;
  source: string;
  crawl_time: string;
  rank: number;
}

interface NewsDetailViewProps {
  newsId?: string;
  onBack?: () => void;
}

const NewsDetailView: React.FC<NewsDetailViewProps> = ({ newsId: propNewsId, onBack: propOnBack }) => {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  
  const newsId = propNewsId || params.newsId;
  const onBack = propOnBack || (() => navigate(-1));

  const [news, setNews] = useState<NewsDetail | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [views, setViews] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // 加载新闻详情
  const loadNewsDetail = useCallback(async () => {
    if (!newsId) {
      setError('资讯ID无效');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 从数据库获取新闻详情
      const { data, error: fetchError } = await supabase
        .from('hot_news')
        .select('*')
        .eq('id', newsId)
        .single();

      if (fetchError) {
        console.error('获取新闻详情失败:', fetchError);
        setError('资讯不存在或已删除');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('资讯不存在');
        setLoading(false);
        return;
      }

      setNews(data as NewsDetail);
      
      // 设置阅读量（基于热度值）
      const heatValue = parseInt(data.heat) || 0;
      setViews(heatValue * 100 + Math.floor(Math.random() * 100));

      // 获取相关新闻（同来源的其他新闻）
      const { data: relatedData } = await supabase
        .from('hot_news')
        .select('*')
        .eq('source', data.source)
        .neq('id', newsId)
        .order('crawl_time', { ascending: false })
        .limit(5);

      setRelatedNews((relatedData || []) as NewsDetail[]);

      // 检查是否已收藏
      if (user) {
        const { data: bookmarkData } = await supabase
          .from('user_bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('news_id', newsId)
          .maybeSingle();
        
        setIsBookmarked(!!bookmarkData);
      }

    } catch (err) {
      console.error('加载新闻详情失败:', err);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [newsId, user]);

  useEffect(() => {
    loadNewsDetail();
  }, [loadNewsDetail]);

  // 收藏/取消收藏
  const handleBookmark = async () => {
    if (!user) {
      // 未登录提示
      return;
    }

    try {
      if (isBookmarked) {
        // 取消收藏
        await supabase
          .from('user_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('news_id', newsId);
        
        setIsBookmarked(false);
      } else {
        // 添加收藏
        await supabase
          .from('user_bookmarks')
          .insert({
            user_id: user.id,
            news_id: newsId,
            news_title: news?.title,
            news_source: news?.source,
          });
        
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
    }
  };

  // 分享功能
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: news?.title || '银河证券资讯',
          text: news?.title,
          url: window.location.href,
        });
      } catch {
        // 用户取消分享
      }
    } else {
      // 复制链接
      navigator.clipboard.writeText(window.location.href);
      setShowShareMenu(true);
      setTimeout(() => setShowShareMenu(false), 2000);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取来源名称
  const getSourceName = (source: string) => {
    return source === 'ths' ? '同花顺' : '韭研公社';
  };

  // 获取来源颜色
  const getSourceColor = (source: string) => {
    return source === 'ths' 
      ? 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/20'
      : 'bg-[#0066CC]/10 text-[#0066CC] border-[#0066CC]/20';
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        {/* 头部 */}
        <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-base font-medium text-[var(--color-text-primary)]">资讯详情</span>
          </div>
        </header>
        
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0066CC] border-t-transparent mx-auto"></div>
            <p className="text-sm text-[var(--color-text-muted)] mt-3">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !news) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-base font-medium text-[var(--color-text-primary)]">资讯详情</span>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <svg className="w-16 h-16 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[var(--color-text-muted)] mt-3">{error || '资讯不存在'}</p>
          <button 
            onClick={loadNewsDetail}
            className="mt-4 px-6 py-2 bg-[#0066CC] text-white text-sm rounded-lg"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* 头部 */}
      <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-base font-medium text-[var(--color-text-primary)]">资讯详情</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 收藏按钮 */}
            <button 
              onClick={handleBookmark}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isBookmarked 
                  ? 'bg-[#E63946]/10 text-[#E63946]' 
                  : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
              }`}
            >
              <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            
            {/* 分享按钮 */}
            <button 
              onClick={handleShare}
              className="w-8 h-8 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[#0066CC] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 分享成功提示 */}
        {showShareMenu && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#333333] text-white text-xs rounded-lg shadow-lg">
            链接已复制
          </div>
        )}
      </header>

      {/* 内容区域 */}
      <div className="pb-20">
        {/* 来源标签 */}
        <div className="px-4 pt-4">
          <span className={`text-xs px-2 py-1 rounded border ${getSourceColor(news.source)}`}>
            {getSourceName(news.source)} · 热榜第 {news.rank} 位
          </span>
        </div>

        {/* 标题 */}
        <div className="px-4 pt-4">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-relaxed">
            {news.title}
          </h1>
        </div>

        {/* 元信息 */}
        <div className="px-4 pt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(news.crawl_time)}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(news.crawl_time)}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{views.toLocaleString()} 阅读</span>
          </div>
          {news.heat && (
            <div className="flex items-center gap-1 text-[#E63946]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span>热度 {news.heat}</span>
            </div>
          )}
        </div>

        {/* 分割线 */}
        <div className="mx-4 mt-4 h-px bg-[var(--color-border)]"></div>

        {/* 新闻正文 */}
        <div className="px-4 py-6">
          <div className="text-[15px] text-[var(--color-text-secondary)] leading-relaxed">
            <p className="mb-4">{news.title}</p>
            
            {news.publish_time && (
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                发布时间：{news.publish_time}
              </p>
            )}
            
            <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)] mb-3">
                📌 此资讯来源于{getSourceName(news.source)}热门榜单
              </p>
              {news.link && (
                <a 
                  href={news.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#0066CC] hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  查看原文详情
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 风险提示 */}
        <div className="mx-4 mb-6 bg-[#FFF7ED] dark:bg-[#F97316]/10 rounded-xl p-4 border border-[#FED7AA] dark:border-[#F97316]/20">
          <div className="flex items-start gap-2">
            <span className="text-[#F97316]">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-[#92400E] dark:text-[#F97316] mb-1">风险提示</h4>
              <p className="text-xs text-[#92400E]/80 dark:text-[#F97316]/80">
                股市有风险，投资需谨慎。本资讯仅供参考，不构成投资建议。请根据自身风险承受能力做出投资决策。
              </p>
            </div>
          </div>
        </div>

        {/* 相关资讯 */}
        {relatedNews.length > 0 && (
          <div className="px-4 pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">相关资讯</h3>
            <div className="space-y-3">
              {relatedNews.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/client/news/${item.id}`)}
                  className="w-full text-left p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[#0066CC]/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-[var(--color-bg)] flex items-center justify-center shrink-0 text-xs text-[var(--color-text-muted)]">
                      {item.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-text-primary)] line-clamp-2 text-left">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {formatDate(item.crawl_time)} · {getSourceName(item.source)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-3 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBookmark}
            className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              isBookmarked 
                ? 'bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/20' 
                : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
            }`}
          >
            <svg className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isBookmarked ? '已收藏' : '收藏'}
          </button>
          
          <button 
            onClick={handleShare}
            className="flex-1 h-10 rounded-lg bg-[#0066CC] text-white flex items-center justify-center gap-2 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            分享
          </button>
          
          {news.link && (
            <a 
              href={news.link}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              原文
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsDetailView;
