import { supabase } from '../lib/supabase';
import { Message } from '../lib/types';

// 生成游客ID
const generateGuestId = () => `G-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// 获取或创建游客ID
export const getGuestId = (): string => {
  let guestId = localStorage.getItem('guest_id');
  if (!guestId) {
    guestId = generateGuestId();
    localStorage.setItem('guest_id', guestId);
  }
  return guestId;
};

// 获取访客信息
export const getVisitorInfo = (): { name: string; phone: string } | null => {
  const saved = localStorage.getItem('visitor_info');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

// 保存访客信息
export const saveVisitorInfo = (name: string, phone: string) => {
  localStorage.setItem('visitor_info', JSON.stringify({ name, phone }));
};

// 创建新工单并排队
export const createTicketAndQueue = async (
  guestId: string,
  guestName: string,
  guestPhone: string
): Promise<{ ticketId: string; queuePosition: number }> => {
  try {
    // 生成工单ID
    const ticketId = `T-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    
    // 获取当前排队人数
    const { count } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('queue_status', 'WAITING');
    
    const queuePosition = (count || 0) + 1;

    // 创建工单
    const { error } = await supabase
      .from('support_tickets')
      .insert({
        id: ticketId,
        subject: `在线咨询 - ${guestName}`,
        description: `访客: ${guestName}, 电话: ${guestPhone}`,
        status: 'OPEN',
        priority: 'NORMAL',
        guest_id: guestId,
        guest_name: guestName,
        guest_phone: guestPhone,
        queue_status: 'WAITING',
        last_message_at: new Date().toISOString(),
        unread_count_admin: 1,
      });

    if (error) throw error;

    return { ticketId, queuePosition };
  } catch (error) {
    console.error('创建工单失败:', error);
    throw error;
  }
};

// 检查工单状态
export const checkTicketStatus = async (ticketId: string): Promise<{
  status: 'WAITING' | 'PROCESSING' | 'COMPLETED';
  assignedAdmin?: string;
  queuePosition?: number;
}> => {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('queue_status, assigned_admin_id, created_at')
      .eq('id', ticketId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('工单不存在');

    // 如果是等待中，计算排队位置
    let queuePosition: number | undefined;
    if (data.queue_status === 'WAITING') {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('queue_status', 'WAITING')
        .lt('created_at', data.created_at);
      queuePosition = (count || 0) + 1;
    }

    return {
      status: data.queue_status,
      assignedAdmin: data.assigned_admin_id,
      queuePosition,
    };
  } catch (error) {
    console.error('检查工单状态失败:', error);
    throw error;
  }
};

// 获取工单消息
export const getTicketMessages = async (ticketId: string): Promise<Message[]> => {
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
      senderType: msg.sender_type as 'user' | 'admin' | 'system',
      content: msg.content,
      isRead: msg.is_read,
      createdAt: msg.created_at,
    }));
  } catch (error) {
    console.error('获取消息失败:', error);
    return [];
  }
};

// 发送消息（仅在 PROCESSING 状态允许）
export const sendMessage = async (
  ticketId: string,
  senderId: string,
  senderType: 'user' | 'admin' | 'system',
  content: string
): Promise<Message> => {
  try {
    // 检查工单状态
    const { status } = await checkTicketStatus(ticketId);
    if (status !== 'PROCESSING' && senderType === 'user') {
      throw new Error('客服尚未接入，请稍后再试');
    }

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

    // 更新工单最后消息时间
    await supabase
      .from('support_tickets')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    return {
      id: data.id,
      ticketId: data.ticket_id,
      senderId: data.sender_id,
      senderType: data.sender_type as 'user' | 'admin' | 'system',
      content: data.content,
      isRead: data.is_read,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('发送消息失败:', error);
    throw error;
  }
};

// 订阅工单状态变化
export const subscribeToTicketStatus = (
  ticketId: string,
  callback: (status: 'WAITING' | 'PROCESSING' | 'COMPLETED', assignedAdmin?: string) => void
) => {
  const subscription = supabase
    .channel(`ticket:${ticketId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_tickets',
        filter: `id=eq.${ticketId}`,
      },
      (payload) => {
        const newData = payload.new;
        callback(newData.queue_status, newData.assigned_admin_id);
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

// 订阅新消息
export const subscribeToMessages = (
  ticketId: string,
  callback: (message: Message) => void
) => {
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
      (payload) => {
        const msg = payload.new;
        callback({
          id: msg.id,
          ticketId: msg.ticket_id,
          senderId: msg.sender_id,
          senderType: msg.sender_type as 'user' | 'admin' | 'system',
          content: msg.content,
          isRead: msg.is_read,
          createdAt: msg.created_at,
        });
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

// 获取客服回复（智能回复）
export const getBotReply = async (userMessage: string): Promise<string> => {
  const lowerMsg = userMessage.toLowerCase();
  
  const replies: Record<string, string> = {
    password: '关于密码问题：\n1）请确保使用您在交易系统设置的最新密码；\n2）若遗忘密码，请通过"忘记密码"功能重置，或携带有效身份证件前往营业网点办理。',
    kaihu: '关于开户问题：\n您可以通过我司官网、手机客户端进行线上开户，也可以前往就近营业网点办理。建议提前准备好身份证、银行卡等资料。',
    ren: '已为您转接人工客服，请稍候。人工客服工作时间为工作日 9:00-17:00。您的工单已提交，客服人员将尽快回复您。',
    trade: '关于交易问题：\n1）请确保账户资金充足；\n2）检查交易时间是否在 9:30-11:30 和 13:00-15:00；\n3）确认股票是否在交易状态（非停牌、非涨跌停）。',
    money: '关于资金问题：\n1）可用资金T日卖出股票后可用来买入，T+1日可转出；\n2）请检查是否有未成交的委托占用资金；\n3）融资融券账户需关注维持担保比例。',
    chic: '您可以通过以下方式查询持仓：\n1）登录交易系统查看"我的持仓"；\n2）手机APP首页查看持仓概况；\n3）拨打客服电话 400-888-8888 查询。',
    download: '您可以通过以下方式下载交易软件：\n1）官网 www.chinastock.com.cn 下载中心；\n2）应用商店搜索"中国银河证券"；\n3）扫描官网首页二维码下载。',
  };

  for (const [key, reply] of Object.entries(replies)) {
    if (lowerMsg.includes(key)) return reply;
  }
  
  return '感谢您的咨询。我已记录您的问题，如需进一步帮助，请回复"人工客服"转接人工服务。您也可以拨打客服热线 400-888-8888。';
};
