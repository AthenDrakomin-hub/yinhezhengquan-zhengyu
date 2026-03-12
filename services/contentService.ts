/**
 * 内容服务 - 从 Supabase 数据库获取内容
 */
import { supabase } from '@/lib/supabase';
import type {
  ResearchReport,
  SupportTicket,
  CalendarEvent,
  Banner,
} from '@/lib/types';
import { logger } from '@/utils/logger';

/**
 * 内容服务 - 从 Supabase 数据库获取内容
 */

// ==================== 研报 ====================
export const getReports = async (): Promise<ResearchReport[]> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((report) => ({
      id: report.id,
      title: report.title,
      author: report.author,
      date: report.created_at,
      summary: report.summary || report.content?.substring(0, 200) || '',
      content: report.content || '',
      category: report.category as '个股' | '行业' | '宏观' | '策略' || '个股',
      sentiment: report.sentiment as '看多' | '中性' | '看空' || '中性',
      tags: [],
    }));
  } catch (error) {
    logger.error('获取研报失败:', error);
    return [];
  }
};

export const getAllReports = async (): Promise<ResearchReport[]> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('获取所有研报失败:', error);
    return [];
  }
};

export const createReport = async (report: Partial<ResearchReport>) => {
  const { error } = await supabase.from('reports').insert({
    title: report.title,
    author: report.author,
    content: report.content,
    summary: report.summary,
    category: report.category || '个股',
    sentiment: report.sentiment || '中性',
  });
  if (error) throw error;
};

export const updateReport = async (id: string, report: Partial<ResearchReport>) => {
  const { error } = await supabase
    .from('reports')
    .update({
      title: report.title,
      author: report.author,
      content: report.content,
      summary: report.summary,
      category: report.category,
      sentiment: report.sentiment,
    })
    .eq('id', id);
  if (error) throw error;
};

export const deleteReport = async (id: string) => {
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) throw error;
};

// ==================== 工单 ====================
export const getTickets = async (): Promise<SupportTicket[]> => {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((ticket) => ({
      id: ticket.id,
      userId: ticket.user_id,
      type: ticket.ticket_type as 'TECHNICAL' | 'ACCOUNT' | 'TRADE' | 'SUGGESTION' | 'COMPLAINT' | 'OTHER',
      subject: ticket.title,
      description: ticket.description,
      status: ticket.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
      priority: ticket.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      lastUpdate: ticket.updated_at || ticket.created_at,
    }));
  } catch (error) {
    logger.error('获取工单失败:', error);
    return [];
  }
};

export const getTicketsByUser = async (userId: string): Promise<SupportTicket[]> => {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((ticket) => ({
      id: ticket.id,
      userId: ticket.user_id,
      type: ticket.ticket_type as any,
      subject: ticket.title,
      description: ticket.description,
      status: ticket.status as any,
      priority: ticket.priority as any,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      lastUpdate: ticket.updated_at || ticket.created_at,
    }));
  } catch (error) {
    logger.error('获取用户工单失败:', error);
    return [];
  }
};

export const createTicket = async (ticket: {
  user_id: string;
  ticket_type: string;
  title: string;
  description: string;
  priority?: string;
}) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: ticket.user_id,
      ticket_type: ticket.ticket_type,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority || 'NORMAL',
      status: 'OPEN',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTicket = async (id: string, updates: Partial<{
  status: string;
  priority: string;
  assigned_to: string;
}>) => {
  const { error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
};

// ==================== 日历事件 ====================
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((event) => ({
      id: event.id,
      date: event.date,
      title: event.title,
      type: event.type || 'OTHER',
      time: event.time || undefined,
      markets: event.markets || undefined,
    }));
  } catch (error) {
    logger.error('获取日历事件失败:', error);
    return [];
  }
};

export const createCalendarEvent = async (event: {
  date: string;
  title: string;
  type?: string;
  time?: string;
  markets?: string[];
}) => {
  const { error } = await supabase.from('calendar_events').insert({
    date: event.date,
    title: event.title,
    type: event.type || 'OTHER',
    time: event.time,
    markets: event.markets,
  });
  if (error) throw error;
};

export const updateCalendarEvent = async (id: string, event: Partial<{
  date: string;
  title: string;
  type: string;
  time: string;
  markets: string[];
}>) => {
  const { error } = await supabase
    .from('calendar_events')
    .update(event)
    .eq('id', id);
  if (error) throw error;
};

export const deleteCalendarEvent = async (id: string) => {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
};

// ==================== 横幅 ====================
export const getBanners = async (): Promise<Banner[]> => {
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((banner) => ({
      id: banner.id,
      title: banner.title,
      subtitle: banner.description || undefined,
      imageUrl: banner.image_url || undefined,
      linkUrl: banner.link_url || undefined,
      desc: banner.description || '',
      img: banner.image_url || '',
      category: '平台公告',
      date: banner.created_at || new Date().toISOString(),
      content: '',
    }));
  } catch (error) {
    logger.error('获取横幅失败:', error);
    return [];
  }
};

export const getAllBanners = async () => {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createBanner = async (banner: {
  title: string;
  desc?: string;
  img?: string;
  category?: string;
  date?: string;
  content?: string;
  relatedSymbol?: string;
}) => {
  const { error } = await supabase.from('banners').insert({
    title: banner.title,
    description: banner.desc,
    image_url: banner.img,
    is_active: true,
  });
  if (error) throw error;
};

export const updateBanner = async (id: string, banner: Partial<{
  title: string;
  desc: string;
  img: string;
  category: string;
  date: string;
  content: string;
  relatedSymbol: string;
}>) => {
  const { error } = await supabase
    .from('banners')
    .update({
      title: banner.title,
      description: banner.desc,
      image_url: banner.img,
    })
    .eq('id', id);
  if (error) throw error;
};

export const deleteBanner = async (id: string) => {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
};
