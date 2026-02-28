import { supabase, isDemoMode } from '@/lib/supabase';
import {
  MOCK_REPORTS,
  MOCK_EDUCATION,
  MOCK_TICKETS,
  MOCK_CALENDAR,
  MOCK_IPO_STOCKS,
  BANNER_MOCK,
} from '@/constants';
import type {
  ResearchReport,
  EducationTopic,
  SupportTicket,
  CalendarEvent,
  Stock,
  Banner,
} from '@/types';

/**
 * 内容服务 - 从 Supabase 数据库获取内容，失败时返回空数组
 */

// ==================== 研报 ====================
export const getReports = async (): Promise<ResearchReport[]> => {
  if (isDemoMode) {
    console.warn('演示模式：返回空研报数据');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    // 如果数据库为空，返回空数组
    if (!data || data.length === 0) {
      console.warn('数据库无研报数据，返回空数组');
      return [];
    }

    // 转换数据库格式到前端类型
    return data.map((report) => ({
      id: report.id,
      title: report.title,
      author: report.author,
      date: report.date,
      summary: report.summary,
      content: report.content || '',
      category: report.category as '个股' | '行业' | '宏观' | '策略',
      sentiment: report.sentiment as '看多' | '中性' | '看空',
      tags: report.tags || [],
    }));
  } catch (error) {
    console.error('获取研报失败:', error);
    console.warn('数据库查询失败，返回空数组');
    return [];
  }
};

// ==================== 投教内容 ====================
export const getEducationTopics = async (): Promise<EducationTopic[]> => {
  if (isDemoMode) {
    console.warn('演示模式：返回空投教数据');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('education_topics')
      .select('*')
      .eq('is_published', true)
      .order('order', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn('数据库无投教内容，返回空数组');
      return [];
    }

    return data.map((topic) => ({
      id: topic.id,
      title: topic.title,
      category: topic.category,
      image: topic.image || '',
      duration: topic.duration || '',
    }));
  } catch (error) {
    console.error('获取投教内容失败:', error);
    console.warn('数据库查询失败，返回空数组');
    return [];
  }
};

// ==================== 客服工单 ====================
export const getSupportTickets = async (userId?: string): Promise<SupportTicket[]> => {
  if (isDemoMode) {
    console.warn('演示模式：使用模拟工单数据');
    return MOCK_TICKETS;
  }

  try {
    let query = supabase.from('support_tickets').select('*');

    // 如果不是管理员，只获取自己的工单
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'admin' && userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('last_update', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn('数据库无工单数据，回退到模拟数据');
      return MOCK_TICKETS;
    }

    return data.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status as 'IN_PROGRESS' | 'CLOSED' | 'OPEN',
      lastUpdate: ticket.last_update,
    }));
  } catch (error) {
    console.error('获取工单失败:', error);
    console.warn('回退到模拟工单数据');
    return MOCK_TICKETS;
  }
};

// ==================== 日历事件 ====================
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  if (isDemoMode) {
    console.warn('演示模式：使用模拟日历数据');
    return MOCK_CALENDAR;
  }

  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn('数据库无日历事件，回退到模拟数据');
      return MOCK_CALENDAR;
    }

    return data.map((event) => ({
      id: event.id,
      date: event.date,
      title: event.title,
      type: event.type,
      time: event.time || undefined,
      markets: event.markets || [],
    }));
  } catch (error) {
    console.error('获取日历事件失败:', error);
    console.warn('回退到模拟日历数据');
    return MOCK_CALENDAR;
  }
};

// ==================== 新股信息 ====================
export const getIPOs = async (): Promise<Stock[]> => {
  if (isDemoMode) {
    console.warn('演示模式：使用模拟新股数据');
    return MOCK_IPO_STOCKS;
  }

  try {
    const { data, error } = await supabase
      .from('ipos')
      .select('*')
      .order('listing_date', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn('数据库无新股信息，回退到模拟数据');
      return MOCK_IPO_STOCKS;
    }

    return data.map((ipo) => ({
      symbol: ipo.symbol,
      name: ipo.name,
      price: ipo.price || 0,
      change: ipo.change || 0,
      changePercent: ipo.change_percent || 0,
      market: ipo.market as 'CN' | 'HK' | 'US' | 'BOND' | 'FUND',
      sparkline: [],
      logoUrl: undefined,
    }));
  } catch (error) {
    console.error('获取新股信息失败:', error);
    console.warn('回退到模拟新股数据');
    return MOCK_IPO_STOCKS;
  }
};



// ==================== 横幅公告 ====================
export const getBanners = async (): Promise<Banner[]> => {
  if (isDemoMode) {
    console.warn('演示模式：使用模拟横幅数据');
    return BANNER_MOCK;
  }

  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn('数据库无横幅公告，回退到模拟数据');
      return BANNER_MOCK;
    }

    return data.map((banner) => ({
      id: banner.id,
      title: banner.title,
      desc: banner.desc,
      img: banner.img,
      category: banner.category,
      date: banner.date,
      content: banner.content,
      relatedSymbol: banner.related_symbol || undefined,
      isActive: banner.is_active,
      position: banner.position,
    }));
  } catch (error) {
    console.error('获取横幅公告失败:', error);
    console.warn('回退到模拟横幅数据');
    return BANNER_MOCK;
  }
};

// ==================== 管理员写入函数 ====================
// 以下函数仅限管理员使用，前端应配合权限检查调用

export const createReport = async (report: Omit<ResearchReport, 'id'>) => {
  const { error } = await supabase.from('reports').insert({
    title: report.title,
    author: report.author,
    date: report.date,
    summary: report.summary,
    content: report.content,
    category: report.category,
    sentiment: report.sentiment,
    tags: report.tags || [],
  });

  if (error) throw error;
};

export const updateReport = async (id: string, report: Partial<ResearchReport>) => {
  const { error } = await supabase
    .from('reports')
    .update({
      title: report.title,
      author: report.author,
      date: report.date,
      summary: report.summary,
      content: report.content,
      category: report.category,
      sentiment: report.sentiment,
      tags: report.tags,
    })
    .eq('id', id);

  if (error) throw error;
};

export const deleteReport = async (id: string) => {
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) throw error;
};

// ==================== 投教内容 CRUD ====================
export const createEducationTopic = async (topic: Omit<EducationTopic, 'id'>) => {
  const { error } = await supabase.from('education_topics').insert({
    title: topic.title,
    category: topic.category,
    image: topic.image || '',
    duration: topic.duration || '',
    order: 0,
    is_published: true,
  });

  if (error) throw error;
};

export const updateEducationTopic = async (id: string, topic: Partial<EducationTopic>) => {
  const { error } = await supabase
    .from('education_topics')
    .update({
      title: topic.title,
      category: topic.category,
      image: topic.image,
      duration: topic.duration,
    })
    .eq('id', id);

  if (error) throw error;
};

export const deleteEducationTopic = async (id: string) => {
  const { error } = await supabase.from('education_topics').delete().eq('id', id);
  if (error) throw error;
};

// ==================== 日历事件 CRUD ====================
export const createCalendarEvent = async (event: Omit<CalendarEvent, 'id'>) => {
  const { error } = await supabase.from('calendar_events').insert({
    date: event.date,
    title: event.title,
    type: event.type,
    time: event.time || '',
    markets: event.markets || [],
  });

  if (error) throw error;
};

export const updateCalendarEvent = async (id: string, event: Partial<CalendarEvent>) => {
  const { error } = await supabase
    .from('calendar_events')
    .update({
      date: event.date,
      title: event.title,
      type: event.type,
      time: event.time,
      markets: event.markets,
    })
    .eq('id', id);

  if (error) throw error;
};

export const deleteCalendarEvent = async (id: string) => {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
};

// ==================== 新股信息 CRUD ====================
export const createIPO = async (ipo: Omit<Stock, 'id' | 'sparkline' | 'logoUrl'> & { listing_date: string, status: string }) => {
  const { error } = await supabase.from('ipos').insert({
    symbol: ipo.symbol,
    name: ipo.name,
    price: ipo.price || 0,
    change: ipo.change || 0,
    change_percent: ipo.changePercent || 0,
    market: ipo.market,
    listing_date: ipo.listing_date,
    status: ipo.status || 'UPCOMING',
  });

  if (error) throw error;
};

export const updateIPO = async (id: string, ipo: Partial<Stock> & { listing_date?: string, status?: string }) => {
  const { error } = await supabase
    .from('ipos')
    .update({
      symbol: ipo.symbol,
      name: ipo.name,
      price: ipo.price,
      change: ipo.change,
      change_percent: ipo.changePercent,
      market: ipo.market,
      listing_date: ipo.listing_date,
      status: ipo.status,
    })
    .eq('id', id);

  if (error) throw error;
};

export const deleteIPO = async (id: string) => {
  const { error } = await supabase.from('ipos').delete().eq('id', id);
  if (error) throw error;
};



// ==================== 横幅公告 CRUD ====================
export const createBanner = async (banner: Omit<Banner, 'id'>) => {
  const { error } = await supabase.from('banners').insert({
    title: banner.title,
    desc: banner.desc,
    img: banner.img,
    category: banner.category,
    date: banner.date,
    content: banner.content,
    related_symbol: banner.relatedSymbol || null,
    is_active: true,
    position: 0,
  });

  if (error) throw error;
};

export const updateBanner = async (id: string, banner: Partial<Banner>) => {
  const { error } = await supabase
    .from('banners')
    .update({
      title: banner.title,
      desc: banner.desc,
      img: banner.img,
      category: banner.category,
      date: banner.date,
      content: banner.content,
      related_symbol: banner.relatedSymbol,
      is_active: banner.isActive,
      position: banner.position,
    })
    .eq('id', id);

  if (error) throw error;
};

export const deleteBanner = async (id: string) => {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
};
