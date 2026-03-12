/**
 * 通知服务
 * 处理用户通知的获取、已读标记和通知设置
 */
import { supabase } from '@/lib/supabase';

export interface NotificationSetting {
  trade_alerts_enabled: boolean;
  trade_alerts_push: boolean;
  trade_alerts_email: boolean;
  trade_alerts_sms: boolean;
  price_alerts_enabled: boolean;
  price_alerts_push: boolean;
  price_alerts_email: boolean;
  system_news_enabled: boolean;
  system_news_push: boolean;
  system_news_email: boolean;
  risk_warning_enabled: boolean;
  risk_warning_push: boolean;
  risk_warning_email: boolean;
  approval_enabled: boolean;
  approval_push: boolean;
  approval_email: boolean;
  force_sell_enabled: boolean;
  force_sell_push: boolean;
  force_sell_email: boolean;
  force_sell_sms: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_enabled: boolean;
}

export interface UserNotification {
  id: string;
  user_id: string;
  notification_type: 'SYSTEM' | 'TRADE' | 'FORCE_SELL' | 'APPROVAL' | 'RISK_WARNING' | 'ACCOUNT' | 'ANNOUNCEMENT';
  title: string;
  content: string;
  related_type?: string;
  related_id?: string;
  is_read: boolean;
  read_at?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  expires_at?: string;
  created_at: string;
}

const DEFAULT_SETTINGS: NotificationSetting = {
  trade_alerts_enabled: true,
  trade_alerts_push: true,
  trade_alerts_email: false,
  trade_alerts_sms: false,
  price_alerts_enabled: true,
  price_alerts_push: true,
  price_alerts_email: false,
  system_news_enabled: false,
  system_news_push: false,
  system_news_email: true,
  risk_warning_enabled: true,
  risk_warning_push: true,
  risk_warning_email: true,
  approval_enabled: true,
  approval_push: true,
  approval_email: false,
  force_sell_enabled: true,
  force_sell_push: true,
  force_sell_email: true,
  force_sell_sms: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  quiet_hours_enabled: false
};

/**
 * 获取用户通知设置
 */
export async function getNotificationSettings(): Promise<NotificationSetting> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // 如果没有设置记录，创建默认设置
    if (error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('notification_settings')
        .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
        .select()
        .single();

      if (insertError) throw insertError;
      return mapDbToSettings(newData);
    }
    throw error;
  }

  return mapDbToSettings(data);
}

/**
 * 更新用户通知设置
 */
export async function updateNotificationSettings(
  settings: Partial<NotificationSetting>
): Promise<NotificationSetting> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 先确保设置记录存在
  await getNotificationSettings();

  const { data, error } = await supabase
    .from('notification_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;

  return mapDbToSettings(data);
}

/**
 * 获取用户通知列表
 */
export async function getNotifications(options?: {
  filter?: 'all' | 'unread';
  type?: string;
  limit?: number;
}): Promise<UserNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  let query = supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (options?.filter === 'unread') {
    query = query.eq('is_read', false);
  }

  if (options?.type) {
    query = query.eq('notification_type', options.type);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(50);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

/**
 * 标记单个通知为已读
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { error } = await supabase
    .from('user_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { error } = await supabase
    .from('user_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}

/**
 * 删除通知
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { error } = await supabase
    .from('user_notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * 清除所有已读通知
 */
export async function clearReadNotifications(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { error } = await supabase
    .from('user_notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('is_read', true);

  if (error) throw error;
}

/**
 * 发送系统通知
 */
export async function sendSystemNotification(
  userId: string,
  title: string,
  content: string,
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL',
  relatedType?: string,
  relatedId?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      notification_type: 'SYSTEM',
      title,
      content,
      priority,
      related_type: relatedType,
      related_id: relatedId
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * 发送交易通知
 */
export async function sendTradeNotification(
  userId: string,
  title: string,
  content: string,
  relatedType?: string,
  relatedId?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      notification_type: 'TRADE',
      title,
      content,
      priority: 'NORMAL',
      related_type: relatedType,
      related_id: relatedId
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * 发送风险预警通知
 */
export async function sendRiskWarningNotification(
  userId: string,
  title: string,
  content: string,
  priority: 'NORMAL' | 'HIGH' | 'URGENT' = 'HIGH'
): Promise<string> {
  const { data, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      notification_type: 'RISK_WARNING',
      title,
      content,
      priority
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * 数据库映射函数
 */
function mapDbToSettings(data: any): NotificationSetting {
  return {
    trade_alerts_enabled: data.trade_alerts_enabled ?? true,
    trade_alerts_push: data.trade_alerts_push ?? true,
    trade_alerts_email: data.trade_alerts_email ?? false,
    trade_alerts_sms: data.trade_alerts_sms ?? false,
    price_alerts_enabled: data.price_alerts_enabled ?? true,
    price_alerts_push: data.price_alerts_push ?? true,
    price_alerts_email: data.price_alerts_email ?? false,
    system_news_enabled: data.system_news_enabled ?? false,
    system_news_push: data.system_news_push ?? false,
    system_news_email: data.system_news_email ?? true,
    risk_warning_enabled: data.risk_warning_enabled ?? true,
    risk_warning_push: data.risk_warning_push ?? true,
    risk_warning_email: data.risk_warning_email ?? true,
    approval_enabled: data.approval_enabled ?? true,
    approval_push: data.approval_push ?? true,
    approval_email: data.approval_email ?? false,
    force_sell_enabled: data.force_sell_enabled ?? true,
    force_sell_push: data.force_sell_push ?? true,
    force_sell_email: data.force_sell_email ?? true,
    force_sell_sms: data.force_sell_sms ?? true,
    quiet_hours_start: data.quiet_hours_start,
    quiet_hours_end: data.quiet_hours_end,
    quiet_hours_enabled: data.quiet_hours_enabled ?? false
  };
}

export default {
  getNotificationSettings,
  updateNotificationSettings,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  sendSystemNotification,
  sendTradeNotification,
  sendRiskWarningNotification
};
