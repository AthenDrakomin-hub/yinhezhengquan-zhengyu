/**
 * 热点数据服务
 * 直接从数据库获取热点资讯、今日热点、财经日历、公社热帖
 */

import { supabase } from '../lib/supabase';

// ==================== 类型定义 ====================

export interface HotNewsItem {
  id: string;
  rank: number;
  title: string;
  link: string;
  publish_time: string;
  heat: string;
  source: 'ths' | 'jiuyan';
  crawl_time: string;
}

export interface TodayHotspotItem {
  id: string;
  date: string;
  title: string;
  keywords: string;
  heat: string;
  crawl_time: string;
}

export interface FinancialCalendarItem {
  id: string;
  date: string;
  event: string;
  crawl_time: string;
}

export interface CommunityPostItem {
  id: string;
  rank: number;
  title: string;
  link: string;
  publish_time: string;
  heat: string;
  crawl_time: string;
}

export interface HotspotStatistics {
  hot_news_count: number;
  today_hotspot_count: number;
  financial_calendar_count: number;
  community_posts_count: number;
  total: number;
}

// ==================== 简单缓存 ====================

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1分钟

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ==================== 热点资讯 ====================

/**
 * 获取热点资讯
 * @param limit 限制条数，默认50
 * @param source 数据源：ths(同花顺) 或 jiuyan(韭研公社)
 */
export async function getHotNews(
  limit: number = 50, 
  source?: 'ths' | 'jiuyan'
): Promise<HotNewsItem[]> {
  const cacheKey = source ? `hot_news:${source}` : 'hot_news:all';
  
  // 检查缓存
  const cached = getCached<HotNewsItem[]>(cacheKey);
  if (cached) {
    return cached.slice(0, limit);
  }

  try {
    let query = supabase
      .from('hot_news')
      .select('*')
      .order('crawl_time', { ascending: false })
      .order('rank', { ascending: true })
      .limit(100);

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取热点资讯失败:', error);
      return [];
    }

    const result = (data || []) as HotNewsItem[];
    setCache(cacheKey, result);

    return result.slice(0, limit);
  } catch (error) {
    console.error('获取热点资讯失败:', error);
    return [];
  }
}

// ==================== 今日热点 ====================

/**
 * 获取今日热点
 * @param limit 限制条数，默认20
 * @param date 指定日期
 */
export async function getTodayHotspot(
  limit: number = 20,
  date?: string
): Promise<TodayHotspotItem[]> {
  const cacheKey = date ? `today_hotspot:${date}` : 'today_hotspot:all';
  
  // 检查缓存
  const cached = getCached<TodayHotspotItem[]>(cacheKey);
  if (cached) {
    return cached.slice(0, limit);
  }

  try {
    let query = supabase
      .from('today_hotspot')
      .select('*')
      .order('crawl_time', { ascending: false })
      .limit(50);

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取今日热点失败:', error);
      return [];
    }

    const result = (data || []) as TodayHotspotItem[];
    setCache(cacheKey, result);

    return result.slice(0, limit);
  } catch (error) {
    console.error('获取今日热点失败:', error);
    return [];
  }
}

// ==================== 财经日历 ====================

/**
 * 获取财经日历
 * @param limit 限制条数，默认50
 * @param date 指定日期
 */
export async function getFinancialCalendar(
  limit: number = 50,
  date?: string
): Promise<FinancialCalendarItem[]> {
  const cacheKey = date ? `financial_calendar:${date}` : 'financial_calendar:all';
  
  // 检查缓存
  const cached = getCached<FinancialCalendarItem[]>(cacheKey);
  if (cached) {
    return cached.slice(0, limit);
  }

  try {
    let query = supabase
      .from('financial_calendar')
      .select('*')
      .order('date', { ascending: true })
      .limit(100);

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取财经日历失败:', error);
      return [];
    }

    const result = (data || []) as FinancialCalendarItem[];
    setCache(cacheKey, result);

    return result.slice(0, limit);
  } catch (error) {
    console.error('获取财经日历失败:', error);
    return [];
  }
}

// ==================== 公社热帖 ====================

/**
 * 获取公社热帖
 * @param limit 限制条数，默认50
 */
export async function getCommunityPosts(
  limit: number = 50
): Promise<CommunityPostItem[]> {
  // 检查缓存
  const cached = getCached<CommunityPostItem[]>('community_posts');
  if (cached) {
    return cached.slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('crawl_time', { ascending: false })
      .order('rank', { ascending: true })
      .limit(100);

    if (error) {
      console.error('获取公社热帖失败:', error);
      return [];
    }

    const result = (data || []) as CommunityPostItem[];
    setCache('community_posts', result);

    return result.slice(0, limit);
  } catch (error) {
    console.error('获取公社热帖失败:', error);
    return [];
  }
}

// ==================== 统计数据 ====================

/**
 * 获取热点数据统计
 */
export async function getHotspotStatistics(): Promise<HotspotStatistics> {
  try {
    const [hotNews, todayHotspot, financialCalendar, communityPosts] = await Promise.all([
      supabase.from('hot_news').select('id', { count: 'exact', head: true }),
      supabase.from('today_hotspot').select('id', { count: 'exact', head: true }),
      supabase.from('financial_calendar').select('id', { count: 'exact', head: true }),
      supabase.from('community_posts').select('id', { count: 'exact', head: true }),
    ]);

    const stats: HotspotStatistics = {
      hot_news_count: hotNews.count || 0,
      today_hotspot_count: todayHotspot.count || 0,
      financial_calendar_count: financialCalendar.count || 0,
      community_posts_count: communityPosts.count || 0,
      total: 0,
    };
    stats.total = stats.hot_news_count + stats.today_hotspot_count + 
                  stats.financial_calendar_count + stats.community_posts_count;

    return stats;
  } catch (error) {
    console.error('获取热点统计失败:', error);
    return {
      hot_news_count: 0,
      today_hotspot_count: 0,
      financial_calendar_count: 0,
      community_posts_count: 0,
      total: 0,
    };
  }
}

// ==================== 首页数据 ====================

/**
 * 获取快讯数据（别名，兼容旧代码）
 */
export const getFlashNews = getTodayHotspot;

/**
 * 获取首页新闻数据（银河看点 + 7x24快讯）
 */
export async function getHomeNewsData(): Promise<{
  galaxyNews: HotNewsItem[];
  flashNews: TodayHotspotItem[];
}> {
  try {
    const [hotNews, todayHotspot] = await Promise.all([
      getHotNews(20, 'ths'),
      getTodayHotspot(20),
    ]);

    return {
      galaxyNews: hotNews,
      flashNews: todayHotspot,
    };
  } catch (error) {
    console.error('获取首页新闻数据失败:', error);
    return {
      galaxyNews: [],
      flashNews: [],
    };
  }
}

// ==================== 清理缓存 ====================

/**
 * 清理热点数据缓存
 */
export function clearHotspotCache(): void {
  cache.clear();
}

export default {
  getHotNews,
  getTodayHotspot,
  getFinancialCalendar,
  getCommunityPosts,
  getHotspotStatistics,
  getHomeNewsData,
  getFlashNews,
  clearHotspotCache,
};
