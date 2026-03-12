/**
 * 条件单服务
 * 处理条件单的创建、更新、删除和触发执行
 */
import { supabase } from '@/lib/supabase';
import type { ConditionalOrder } from '@/lib/types';

export interface CreateConditionalOrderParams {
  symbol: string;
  stock_name?: string;
  market_type?: string;
  order_type: 'TP_SL' | 'GRID' | 'PRICE_ALERT';
  
  // 止盈止损
  stop_loss_price?: number;
  take_profit_price?: number;
  
  // 网格交易
  grid_upper_price?: number;
  grid_lower_price?: number;
  grid_count?: number;
  grid_quantity?: number;
  
  // 价格预警
  trigger_price?: number;
  trigger_condition?: 'ABOVE' | 'BELOW';
  
  // 通用
  quantity?: number;
  leverage?: number;
  expires_at?: string;
}

export interface ConditionalOrderWithId extends ConditionalOrder {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * 获取用户的所有条件单
 */
export async function getConditionalOrders(status?: string): Promise<ConditionalOrderWithId[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  let query = supabase
    .from('conditional_orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).map(mapDbToConditionalOrder);
}

/**
 * 获取单个条件单详情
 */
export async function getConditionalOrderById(id: string): Promise<ConditionalOrderWithId | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('conditional_orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data ? mapDbToConditionalOrder(data) : null;
}

/**
 * 创建条件单
 */
export async function createConditionalOrder(params: CreateConditionalOrderParams): Promise<ConditionalOrderWithId> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 验证参数
  validateOrderParams(params);

  const { data, error } = await supabase
    .from('conditional_orders')
    .insert({
      user_id: user.id,
      symbol: params.symbol,
      stock_name: params.stock_name,
      market_type: params.market_type || 'A_SHARE',
      order_type: params.order_type,
      stop_loss_price: params.stop_loss_price,
      take_profit_price: params.take_profit_price,
      grid_upper_price: params.grid_upper_price,
      grid_lower_price: params.grid_lower_price,
      grid_count: params.grid_count,
      grid_quantity: params.grid_quantity,
      trigger_price: params.trigger_price,
      trigger_condition: params.trigger_condition,
      quantity: params.quantity,
      leverage: params.leverage || 1,
      expires_at: params.expires_at,
      status: 'ACTIVE'
    })
    .select()
    .single();

  if (error) throw error;

  // 发送通知
  await sendNotification(user.id, 'SYSTEM', '条件单已创建', 
    `您已成功创建${getOrderTypeName(params.order_type)}条件单，标的：${params.symbol}`);

  return mapDbToConditionalOrder(data);
}

/**
 * 更新条件单
 */
export async function updateConditionalOrder(
  id: string, 
  params: Partial<CreateConditionalOrderParams>
): Promise<ConditionalOrderWithId> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 检查条件单是否存在且属于当前用户
  const existing = await getConditionalOrderById(id);
  if (!existing) throw new Error('条件单不存在');
  if (existing.status !== 'ACTIVE') throw new Error('只能修改活跃状态的条件单');

  const { data, error } = await supabase
    .from('conditional_orders')
    .update({
      ...params,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;

  return mapDbToConditionalOrder(data);
}

/**
 * 取消条件单
 */
export async function cancelConditionalOrder(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { error } = await supabase
    .from('conditional_orders')
    .update({
      status: 'CANCELLED',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE');

  if (error) throw error;
}

/**
 * 删除条件单
 */
export async function deleteConditionalOrder(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { error } = await supabase
    .from('conditional_orders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * 验证条件单参数
 */
function validateOrderParams(params: CreateConditionalOrderParams): void {
  if (!params.symbol) throw new Error('股票代码不能为空');

  switch (params.order_type) {
    case 'TP_SL':
      if (!params.stop_loss_price && !params.take_profit_price) {
        throw new Error('止盈止损条件单至少需要设置止损价或止盈价');
      }
      break;
    case 'GRID':
      if (!params.grid_upper_price || !params.grid_lower_price) {
        throw new Error('网格交易需要设置价格上下限');
      }
      if (params.grid_upper_price <= params.grid_lower_price) {
        throw new Error('网格上限必须大于下限');
      }
      break;
    case 'PRICE_ALERT':
      if (!params.trigger_price) {
        throw new Error('价格预警需要设置触发价格');
      }
      break;
  }
}

/**
 * 获取条件单类型名称
 */
function getOrderTypeName(type: string): string {
  const names: Record<string, string> = {
    'TP_SL': '止盈止损',
    'GRID': '网格交易',
    'PRICE_ALERT': '价格预警'
  };
  return names[type] || type;
}

/**
 * 发送通知
 */
async function sendNotification(
  userId: string, 
  type: string, 
  title: string, 
  content: string
): Promise<void> {
  try {
    await supabase.from('user_notifications').insert({
      user_id: userId,
      notification_type: type,
      title,
      content,
      priority: 'NORMAL'
    });
  } catch (error) {
    console.error('发送通知失败:', error);
  }
}

/**
 * 数据库映射函数
 */
function mapDbToConditionalOrder(data: any): ConditionalOrderWithId {
  return {
    id: data.id,
    user_id: data.user_id,
    symbol: data.symbol,
    name: data.stock_name,
    type: data.order_type,
    status: data.status,
    config: {
      stopLoss: data.stop_loss_price,
      takeProfit: data.take_profit_price,
      gridUpper: data.grid_upper_price,
      gridLower: data.grid_lower_price,
      gridCount: data.grid_count,
      baseQty: data.grid_quantity
    },
    triggerPrice: data.trigger_price,
    quantity: data.quantity,
    createdAt: data.created_at,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

/**
 * 检查并触发条件单（供定时任务调用）
 */
export async function checkAndTriggerConditionalOrders(): Promise<void> {
  // 获取所有活跃的条件单
  const { data: orders, error } = await supabase
    .from('conditional_orders')
    .select('*')
    .eq('status', 'ACTIVE');

  if (error || !orders) return;

  for (const order of orders) {
    try {
      // 获取当前价格
      const currentPrice = await getCurrentPrice(order.symbol);
      if (!currentPrice) continue;

      let shouldTrigger = false;

      switch (order.order_type) {
        case 'TP_SL':
          // 止损触发：当前价格 <= 止损价
          if (order.stop_loss_price && currentPrice <= order.stop_loss_price) {
            shouldTrigger = true;
          }
          // 止盈触发：当前价格 >= 止盈价
          if (order.take_profit_price && currentPrice >= order.take_profit_price) {
            shouldTrigger = true;
          }
          break;

        case 'PRICE_ALERT':
          if (order.trigger_condition === 'ABOVE' && currentPrice >= order.trigger_price) {
            shouldTrigger = true;
          } else if (order.trigger_condition === 'BELOW' && currentPrice <= order.trigger_price) {
            shouldTrigger = true;
          }
          break;

        case 'GRID':
          // 网格交易逻辑更复杂，需要单独处理
          break;
      }

      if (shouldTrigger) {
        await triggerOrder(order, currentPrice);
      }
    } catch (err) {
      console.error(`检查条件单 ${order.id} 失败:`, err);
    }
  }
}

/**
 * 触发条件单
 */
async function triggerOrder(order: any, currentPrice: number): Promise<void> {
  // 更新条件单状态
  await supabase
    .from('conditional_orders')
    .update({
      status: 'TRIGGERED',
      triggered_at: new Date().toISOString(),
      triggered_price: currentPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id);

  // 发送通知
  await sendNotification(
    order.user_id,
    'TRADE',
    '条件单已触发',
    `您的${getOrderTypeName(order.order_type)}条件单已触发，标的：${order.symbol}，触发价格：${currentPrice}`
  );
}

/**
 * 获取当前价格（模拟实现）
 */
async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    // 这里应该调用行情服务获取实时价格
    // 暂时返回 null
    return null;
  } catch {
    return null;
  }
}

export default {
  getConditionalOrders,
  getConditionalOrderById,
  createConditionalOrder,
  updateConditionalOrder,
  cancelConditionalOrder,
  deleteConditionalOrder,
  checkAndTriggerConditionalOrders
};
