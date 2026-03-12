/**
 * 投教中心页面 - 客户端
 * 展示股票投资教学文章，支持分类浏览和搜索
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from '@/lib/constants';

// 自定义图标组件
const TimeIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const HeartIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

const ShareIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
import {
  getPublishedEducationTopics,
  getEducationTopicsByCategory,
  searchEducationTopics,
  getEducationTopicById,
  incrementEducationViews,
  likeEducationTopic,
  EDUCATION_CATEGORIES,
  DIFFICULTY_LEVELS,
} from '@/services/educationService';
import type { EducationTopic } from '@/lib/types';
import { LazyImage } from '../../shared/LazyImage';

// 扩展 EducationTopic 类型以包含额外字段
interface EducationArticle extends EducationTopic {
  difficulty?: string;
  author?: string;
  views?: number;
  likes?: number;
  status?: string;
  created_at?: string;
}

// 分类图标映射
const getCategoryIcon = (category: string) => {
  const cat = EDUCATION_CATEGORIES.find(c => c.value === category);
  return cat?.icon || '📚';
};

// 分类名称映射
const getCategoryName = (category: string) => {
  const cat = EDUCATION_CATEGORIES.find(c => c.value === category);
  return cat?.label || category;
};

// 难度名称映射
const getDifficultyName = (difficulty?: string) => {
  const diff = DIFFICULTY_LEVELS.find(d => d.value === difficulty);
  return diff?.label || '入门级';
};

interface EducationCenterViewProps {
  onBack?: () => void;
}

const EducationCenterView: React.FC<EducationCenterViewProps> = ({ onBack }) => {
  const [articles, setArticles] = useState<EducationArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<EducationArticle | null>(null);
  const [showArticleDetail, setShowArticleDetail] = useState(false);

  // 获取文章列表
  const fetchArticles = async () => {
    setLoading(true);
    try {
      let data: EducationArticle[];
      
      if (searchKeyword) {
        data = await searchEducationTopics(searchKeyword);
      } else if (selectedCategory === 'ALL') {
        data = await getPublishedEducationTopics();
      } else {
        data = await getEducationTopicsByCategory(selectedCategory);
      }
      
      setArticles(data);
    } catch (error) {
      console.error('获取投教文章失败:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchKeyword !== undefined) {
        fetchArticles();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 打开文章详情
  const handleOpenArticle = async (article: EducationArticle) => {
    setSelectedArticle(article);
    setShowArticleDetail(true);
    // 增加阅读量
    await incrementEducationViews(article.id);
  };

  // 点赞
  const handleLike = async (id: string) => {
    const result = await likeEducationTopic(id);
    if (result.success && selectedArticle?.id === id) {
      setSelectedArticle(prev => prev ? { ...prev, likes: result.likes } : null);
    }
    // 更新列表中的点赞数
    setArticles(prev => prev.map(a => 
      a.id === id ? { ...a, likes: result.likes || a.likes } : a
    ));
  };

  // 文章详情模态框
  const ArticleDetailModal = () => {
    if (!selectedArticle) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowArticleDetail(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="galaxy-card rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl border border-[var(--color-border)]"
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="relative h-48 bg-gradient-to-br from-[#00D4AA] to-[#0A1628] overflow-hidden">
              {selectedArticle.image ? (
                <LazyImage
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover opacity-50"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl opacity-30">{getCategoryIcon(selectedArticle.category)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowArticleDetail(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition"
              >
                <ICONS.Plus className="rotate-45" size={20} />
              </button>

              {/* 标题 */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getCategoryIcon(selectedArticle.category)}</span>
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">
                    {getCategoryName(selectedArticle.category)}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white leading-tight">{selectedArticle.title}</h2>
              </div>
            </div>

            {/* 元信息 */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {selectedArticle.author && (
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <ICONS.User size={14} />
                  <span>{selectedArticle.author}</span>
                </div>
              )}
              {selectedArticle.difficulty && (
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                    selectedArticle.difficulty === 'BEGINNER' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedArticle.difficulty === 'INTERMEDIATE' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {getDifficultyName(selectedArticle.difficulty)}
                  </span>
                </div>
              )}
              {selectedArticle.duration && (
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <TimeIcon size={14} />
                  <span>{selectedArticle.duration}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <ICONS.Eye size={14} />
                <span>{(selectedArticle.views || 0) + 1} 次阅读</span>
              </div>
            </div>

            {/* 内容 */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-300px)] space-y-6">
              <div className="prose prose-sm max-w-none">
                {(selectedArticle.content || '').split('\n').map((paragraph, idx) => (
                  <p key={idx} className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4 whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
              
              {/* 相关学习资料 */}
              <div className="galaxy-card p-4 space-y-3 bg-[var(--color-surface)]">
                <h4 className="text-[10px] font-black text-[var(--color-text-primary)] uppercase tracking-widest flex items-center gap-2">
                  <ICONS.FileText size={14} /> 相关学习资料
                </h4>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[#00D4AA] transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-[var(--color-text-primary)]">完整学习资料.pdf</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">1.2 MB · PDF文档</div>
                      </div>
                    </div>
                    <ICONS.Download size={16} className="text-[var(--color-text-muted)] group-hover:text-[#00D4AA] transition-colors" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[#00D4AA] transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 11v6M9 14h6"/></svg>
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-[var(--color-text-primary)]">知识点练习题.docx</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">256 KB · Word文档</div>
                      </div>
                    </div>
                    <ICONS.Download size={16} className="text-[var(--color-text-muted)] group-hover:text-[#00D4AA] transition-colors" />
                  </button>
                </div>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(selectedArticle.id)}
                  className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)] hover:text-[#FF6B6B] transition"
                >
                  <HeartIcon size={18} />
                  <span>{selectedArticle.likes || 0}</span>
                </button>
                <button className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)] hover:text-[#00D4AA] transition">
                  <ShareIcon size={18} />
                  <span>分享</span>
                </button>
              </div>
              <button
                onClick={() => setShowArticleDetail(false)}
                className="px-6 py-2 bg-[#00D4AA] text-[#0A1628] text-sm font-black rounded-lg hover:bg-[#00B894] transition"
              >
                返回列表
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-8 text-[var(--color-text-primary)]">
      {/* 头部 */}
      <div className="bg-gradient-to-br from-[#0A1628] to-[#1A2638] text-white px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight">投教中心</h1>
              <p className="text-sm text-white/60">学习投资知识，提升交易技能</p>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="mt-6 relative">
            <ICONS.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索投教文章..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#00D4AA] transition"
            />
          </div>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="sticky top-0 z-10 glass-nav border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition ${
                selectedCategory === 'ALL'
                  ? 'bg-[#00D4AA] text-[#0A1628]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              全部
            </button>
            {EDUCATION_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
                  selectedCategory === cat.value
                    ? 'bg-[#00D4AA] text-[#0A1628]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 文章列表 */}
      <div className="max-w-6xl mx-auto px-6 mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--color-border)] border-t-[#00D4AA]" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-bold text-[var(--color-text-secondary)] mb-2">暂无投教文章</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {searchKeyword ? '没有找到相关文章，换个关键词试试' : '敬请期待更多精彩内容'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleOpenArticle(article)}
                className="galaxy-card rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer group"
              >
                {/* 封面图 */}
                <div className="relative h-40 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-bg)] overflow-hidden">
                  {article.image ? (
                    <LazyImage
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl opacity-40">{getCategoryIcon(article.category)}</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-[var(--color-bg)]/90 backdrop-blur text-[var(--color-text-secondary)] uppercase tracking-wider">
                      {getCategoryName(article.category)}
                    </span>
                  </div>
                </div>

                {/* 内容 */}
                <div className="p-4">
                  <h3 className="font-bold text-[var(--color-text-primary)] mb-2 line-clamp-2 group-hover:text-[#00D4AA] transition">
                    {article.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-3">
                    {(article.content || '').substring(0, 100)}...
                  </p>
                  
                  {/* 元信息 */}
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-3">
                      {article.duration && (
                        <span className="flex items-center gap-1">
                          <TimeIcon size={12} />
                          {article.duration}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ICONS.Eye size={12} />
                        {article.views || 0}
                      </span>
                    </div>
                    {article.difficulty && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        article.difficulty === 'BEGINNER' ? 'bg-emerald-500/20 text-emerald-400' :
                        article.difficulty === 'INTERMEDIATE' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {getDifficultyName(article.difficulty)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 文章详情模态框 */}
      {showArticleDetail && <ArticleDetailModal />}
    </div>
  );
};

export default EducationCenterView;
