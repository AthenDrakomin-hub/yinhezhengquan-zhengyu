import { supabase, isDemoMode } from '../lib/supabase';
import { SupportTicket, Message } from '../types';

// 模拟数据
const MOCK_MESSAGES: Message[] = [
  { id: 'msg1', ticketId: 'T-9921', senderId: 'user-id-001', senderType: 'user', content: '您好，我想咨询一下两融账户展期的问题。', isRead: true, createdAt: '2025-03-26T10:00:00Z' },
  { id: 'msg2', ticketId: 'T-9921', senderId: 'admin-id-001', senderType: 'admin', content: '您好，我是客服专员。请提供您的账户信息和具体需求。', isRead: true, createdAt: '2025-03-26T10:05:00Z' },
  { id: 'msg3', ticketId: 'T-9921', senderId: 'user-id-001', senderType: 'user', content: '我的账户是ZY-USER-001，需要将两融账户展期3个月。', isRead: false, createdAt: '2025-03-26T10:10:00Z' },
];

export const chatService = {
  /**
   * 获取或创建用户的活动工单
   * @param userId 用户ID
   * @returns 工单对象
   */
  async getOrCreateActiveTicket(userId: string): Promise<SupportTicket> {
    if (isDemoMode) {
      console.warn('演示模式：使用模拟工单数据');
      return {
        id: 'T-9921',
        subject: '两融账户展期申请审核',
        status: 'IN_PROGRESS',
        lastUpdate: '2025-03-26',
        userId: 'user-id-001',
        lastMessageAt: '2025-03-26T10:10:00Z',
        unreadCountUser: 0,
        unreadCountAdmin: 1,
      };
    }

    try {
      // 查找用户最近的活动工单（OPEN 或 IN_PROGRESS）
      const { data: activeTickets, error: findError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .order('last_message_at', { ascending: false })
        .limit(1);

      if (findError) throw findError;

      if (activeTickets && activeTickets.length > 0) {
        return {
          id: activeTickets[0].id,
          subject: activeTickets[0].subject,
          status: activeTickets[0].status as 'OPEN' | 'IN_PROGRESS' | 'CLOSED',
          lastUpdate: activeTickets[0].last_update,
          userId: activeTickets[0].user_id,
          lastMessageAt: activeTickets[0].last_message_at,
          unreadCountUser: activeTickets[0].unread_count_user || 0,
          unreadCountAdmin: activeTickets[0].unread_count_admin || 0,
        };
      }

      // 没有活动工单，创建新的
      const newTicketId = `T-${Date.now().toString().slice(-6)}`;
      const { data: newTicket, error: createError } = await supabase
        .from('support_tickets')
        .insert({
          id: newTicketId,
          subject: '咨询',
          status: 'OPEN',
          last_update: new Date().toISOString().split('T')[0],
          user_id: userId,
          last_message_at: new Date().toISOString(),
          unread_count_user: 0,
          unread_count_admin: 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      return {
        id: newTicket.id,
        subject: newTicket.subject,
        status: newTicket.status as 'OPEN' | 'IN_PROGRESS' | 'CLOSED',
        lastUpdate: newTicket.last_update,
        userId: newTicket.user_id,
        lastMessageAt: newTicket.last_message_at,
        unreadCountUser: newTicket.unread_count_user || 0,
        unreadCountAdmin: newTicket.unread_count_admin || 0,
      };
    } catch (error) {
      console.error('获取或创建工单失败:', error);
      throw error;
    }
  },

  /**
   * 获取工单的所有消息
   * @param ticketId 工单ID
   * @returns 消息列表
   */
  async getMessages(ticketId: string): Promise<Message[]> {
    if (isDemoMode) {
      console.warn('演示模式：使用模拟消息数据');
      return MOCK_MESSAGES.filter(msg => msg.ticketId === ticketId);
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(msg => ({
        id: msg.id,
        ticketId: msg.ticket_id,
        senderId: msg.sender_id,
        senderType: msg.sender_type as 'user' | 'admin',
        content: msg.content,
        isRead: msg.is_read,
        createdAt: msg.created_at,
      }));
    } catch (error) {
      console.error('获取消息失败:', error);
      return [];
    }
  },

  /**
   * 发送消息
   * @param ticketId 工单ID
   * @param senderId 发送者ID
   * @param senderType 发送者类型
   * @param content 消息内容
   * @returns 新创建的消息
   */
  async sendMessage(
    ticketId: string,
    senderId: string,
    senderType: 'user' | 'admin',
    content: string
  ): Promise<Message> {
    if (isDemoMode) {
      console.warn('演示模式：模拟发送消息');
      const newMsg: Message = {
        id: `msg${Date.now()}`,
        ticketId,
        senderId,
        senderType,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      MOCK_MESSAGES.push(newMsg);
      return newMsg;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          sender_id: senderId,
          sender_type: senderType,
          content: content.trim(),
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        ticketId: data.ticket_id,
        senderId: data.sender_id,
        senderType: data.sender_type as 'user' | 'admin',
        content: data.content,
        isRead: data.is_read,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  },

  /**
   * 标记消息为已读
   * @param ticketId 工单ID
   * @param readerId 阅读者ID
   * @param readerType 阅读者类型
   * @returns 更新的消息数量
   */
  async markMessagesAsRead(
    ticketId: string,
    readerId: string,
    readerType: 'user' | 'admin'
  ): Promise<number> {
    if (isDemoMode) {
      console.warn('演示模式：模拟标记消息为已读');
      const targetSenderType = readerType === 'user' ? 'admin' : 'user';
      let count = 0;
      MOCK_MESSAGES.forEach(msg => {
        if (msg.ticketId === ticketId && msg.senderType === targetSenderType && !msg.isRead) {
          msg.isRead = true;
          count++;
        }
      });
      return count;
    }

    try {
      // 确定要标记的消息发送者类型
      const targetSenderType = readerType === 'user' ? 'admin' : 'user';

      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('ticket_id', ticketId)
        .eq('sender_type', targetSenderType)
        .eq('is_read', false)
        .select();

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('标记消息为已读失败:', error);
      return 0;
    }
  },

  /**
   * 获取所有工单（管理员用）
   * @returns 工单列表，包含用户信息
   */
  async getAllTicketsForAdmin(): Promise<any[]> {
    if (isDemoMode) {
      console.warn('演示模式：使用模拟工单数据');
      return [
        {
          id: 'T-9921',
          subject: '两融账户展期申请审核',
          status: 'IN_PROGRESS',
          lastUpdate: '2025-03-26',
          userId: 'user-id-001',
          username: '证裕用户',
          email: 'user@zhengyu.com',
          lastMessageAt: '2025-03-26T10:10:00Z',
          unreadCountUser: 0,
          unreadCountAdmin: 1,
          messageCount: 3,
        },
      ];
    }

    try {
      // 第一步：获取所有工单
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      if (!tickets || tickets.length === 0) return [];

      // 第二步：收集所有用户ID并查询profiles
      const userIds = tickets.map(ticket => ticket.user_id).filter(Boolean);
      const profilesMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('获取用户信息失败:', profilesError);
        } else if (profiles) {
          profiles.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }
      }

      // 第三步：获取每个工单的消息数量并合并数据
      const ticketsWithCounts = await Promise.all(
        tickets.map(async (ticket) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id);

          const profile = profilesMap.get(ticket.user_id);
          
          return {
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status,
            lastUpdate: ticket.last_update,
            userId: ticket.user_id,
            username: profile?.username || '未知用户',
            email: profile?.email || '未知邮箱',
            lastMessageAt: ticket.last_message_at,
            unreadCountUser: ticket.unread_count_user || 0,
            unreadCountAdmin: ticket.unread_count_admin || 0,
            messageCount: count || 0,
          };
        })
      );

      return ticketsWithCounts;
    } catch (error) {
      console.error('获取所有工单失败:', error);
      return [];
    }
  },

  /**
   * 更新工单状态
   * @param ticketId 工单ID
   * @param status 新状态
   * @returns 更新后的工单
   */
  async updateTicketStatus(
    ticketId: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
  ): Promise<SupportTicket | null> {
    if (isDemoMode) {
      console.warn('演示模式：模拟更新工单状态');
      return {
        id: ticketId,
        subject: '两融账户展期申请审核',
        status,
        lastUpdate: new Date().toISOString().split('T')[0],
        userId: 'user-id-001',
        lastMessageAt: new Date().toISOString(),
        unreadCountUser: 0,
        unreadCountAdmin: 0,
      };
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({
          status,
          last_update: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        subject: data.subject,
        status: data.status as 'OPEN' | 'IN_PROGRESS' | 'CLOSED',
        lastUpdate: data.last_update,
        userId: data.user_id,
        lastMessageAt: data.last_message_at,
        unreadCountUser: data.unread_count_user || 0,
        unreadCountAdmin: data.unread_count_admin || 0,
      };
    } catch (error) {
      console.error('更新工单状态失败:', error);
      return null;
    }
  },

  /**
   * 获取用户的未读消息总数
   * @param userId 用户ID
   * @returns 未读消息总数
   */
  async getUserUnreadCount(userId: string): Promise<number> {
    if (isDemoMode) {
      console.warn('演示模式：使用模拟未读计数');
      return MOCK_MESSAGES.filter(
        msg => msg.senderType === 'admin' && !msg.isRead
      ).length;
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('unread_count_user')
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).reduce((sum, ticket) => sum + (ticket.unread_count_user || 0), 0);
    } catch (error) {
      console.error('获取用户未读计数失败:', error);
      return 0;
    }
  },

  /**
   * 获取管理员的未读消息总数
   * @returns 管理员未读消息总数
   */
  async getAdminUnreadCount(): Promise<number> {
    if (isDemoMode) {
      console.warn('演示模式：使用模拟未读计数');
      return MOCK_MESSAGES.filter(
        msg => msg.senderType === 'user' && !msg.isRead
      ).length;
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('unread_count_admin');

      if (error) throw error;

      return (data || []).reduce((sum, ticket) => sum + (ticket.unread_count_admin || 0), 0);
    } catch (error) {
      console.error('获取管理员未读计数失败:', error);
      return 0;
    }
  },

  /**
   * 订阅工单消息变化
   * @param ticketId 工单ID
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  subscribeToMessages(ticketId: string, callback: (payload: any) => void) {
    if (isDemoMode) {
      console.warn('演示模式：模拟消息订阅');
      // 模拟实时消息
      const interval = setInterval(() => {
        // 演示模式下不实际推送消息
      }, 5000);
      return () => clearInterval(interval);
    }

    const subscription = supabase
      .channel(`messages:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  /**
   * 订阅工单列表变化（管理员用）
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  subscribeToTickets(callback: (payload: any) => void) {
    if (isDemoMode) {
      console.warn('演示模式：模拟工单订阅');
      // 模拟实时工单更新
      const interval = setInterval(() => {
        // 演示模式下不实际推送更新
      }, 10000);
      return () => clearInterval(interval);
    }

    const subscription = supabase
      .channel('tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
};
