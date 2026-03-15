/**
 * 用户待办事项服务
 * 提供待办事项的 CRUD 操作
 */

import { supabase } from '../lib/supabase';
import type { 
  UserTodo, 
  CreateTodoRequest, 
  UpdateTodoRequest, 
  TodoStats,
  TodoType,
  TodoPriority,
  TodoStatus
} from '../lib/types';

// ==================== 待办事项类型配置 ====================

/** 待办类型配置 */
export const TODO_TYPE_CONFIG: Record<TodoType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  defaultActionText: string;
}> = {
  RISK_ASSESSMENT: {
    label: '风险测评',
    icon: '🛡️',
    color: '#F97316',
    bgColor: '#FFF7ED',
    defaultActionText: '立即测评',
  },
  IPO_SUBSCRIPTION: {
    label: '新股申购',
    icon: '📈',
    color: '#EAB308',
    bgColor: '#FEF3C7',
    defaultActionText: '去申购',
  },
  DOCUMENT_UPDATE: {
    label: '资料更新',
    icon: '📝',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    defaultActionText: '去更新',
  },
  AGREEMENT_SIGN: {
    label: '协议签署',
    icon: '✍️',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    defaultActionText: '去签署',
  },
  VERIFICATION: {
    label: '身份验证',
    icon: '🔐',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    defaultActionText: '去验证',
  },
  TRADE_REVIEW: {
    label: '交易复盘',
    icon: '📊',
    color: '#10B981',
    bgColor: '#ECFDF5',
    defaultActionText: '查看详情',
  },
  SYSTEM: {
    label: '系统任务',
    icon: '⚙️',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    defaultActionText: '查看详情',
  },
};

// ==================== 查询操作 ====================

/**
 * 获取用户待办事项列表
 * @param options 查询选项
 */
export async function getUserTodos(options?: {
  status?: TodoStatus;
  priority?: TodoPriority;
  todoType?: TodoType;
  limit?: number;
}): Promise<UserTodo[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('getUserTodos: 用户未登录');
      return [];
    }

    let query = supabase
      .from('user_todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 状态筛选
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    // 优先级筛选
    if (options?.priority) {
      query = query.eq('priority', options.priority);
    }

    // 类型筛选
    if (options?.todoType) {
      query = query.eq('todo_type', options.todoType);
    }

    // 限制数量
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取待办事项失败:', error.message);
      return [];
    }

    return (data || []) as UserTodo[];
  } catch (err) {
    console.error('获取待办事项异常:', (err as Error).message);
    return [];
  }
}

/**
 * 获取用户待办事项统计
 */
export async function getTodoStats(): Promise<TodoStats> {
  const defaultStats: TodoStats = {
    total_count: 0,
    pending_count: 0,
    high_priority_count: 0,
    expired_count: 0,
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return defaultStats;
    }

    const { data, error } = await supabase
      .rpc('get_user_todo_stats', { p_user_id: user.id });

    if (error) {
      console.error('获取待办统计失败:', error.message);
      return defaultStats;
    }

    return (data?.[0] as TodoStats) || defaultStats;
  } catch (err) {
    console.error('获取待办统计异常:', (err as Error).message);
    return defaultStats;
  }
}

/**
 * 根据ID获取单个待办事项
 */
export async function getTodoById(todoId: string): Promise<UserTodo | null> {
  try {
    const { data, error } = await supabase
      .from('user_todos')
      .select('*')
      .eq('id', todoId)
      .maybeSingle();

    if (error) {
      console.error('获取待办事项失败:', error.message);
      return null;
    }

    return data as UserTodo | null;
  } catch (err) {
    console.error('获取待办事项异常:', (err as Error).message);
    return null;
  }
}

// ==================== 创建操作 ====================

/**
 * 创建待办事项
 */
export async function createTodo(request: CreateTodoRequest): Promise<UserTodo | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('createTodo: 用户未登录');
      return null;
    }

    const todoData = {
      ...request,
      user_id: user.id,
      priority: request.priority || 'NORMAL',
      status: 'PENDING' as TodoStatus,
    };

    const { data, error } = await supabase
      .from('user_todos')
      .insert(todoData)
      .select()
      .single();

    if (error) {
      console.error('创建待办事项失败:', error.message);
      return null;
    }

    return data as UserTodo;
  } catch (err) {
    console.error('创建待办事项异常:', (err as Error).message);
    return null;
  }
}

/**
 * 批量创建待办事项
 */
export async function createTodos(requests: CreateTodoRequest[]): Promise<UserTodo[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('createTodos: 用户未登录');
      return [];
    }

    const todosData = requests.map(req => ({
      ...req,
      user_id: user.id,
      priority: req.priority || 'NORMAL',
      status: 'PENDING' as TodoStatus,
    }));

    const { data, error } = await supabase
      .from('user_todos')
      .insert(todosData)
      .select();

    if (error) {
      console.error('批量创建待办事项失败:', error.message);
      return [];
    }

    return (data || []) as UserTodo[];
  } catch (err) {
    console.error('批量创建待办事项异常:', (err as Error).message);
    return [];
  }
}

// ==================== 更新操作 ====================

/**
 * 更新待办事项
 */
export async function updateTodo(todoId: string, request: UpdateTodoRequest): Promise<boolean> {
  try {
    const updateData: Record<string, any> = { ...request };
    
    // 如果状态变为完成，记录完成时间
    if (request.status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('user_todos')
      .update(updateData)
      .eq('id', todoId);

    if (error) {
      console.error('更新待办事项失败:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('更新待办事项异常:', (err as Error).message);
    return false;
  }
}

/**
 * 标记待办事项为完成
 */
export async function completeTodo(todoId: string): Promise<boolean> {
  return updateTodo(todoId, { status: 'COMPLETED' });
}

/**
 * 忽略/关闭待办事项
 */
export async function dismissTodo(todoId: string): Promise<boolean> {
  return updateTodo(todoId, { status: 'DISMISSED' });
}

/**
 * 标记待办事项为处理中
 */
export async function markInProgress(todoId: string): Promise<boolean> {
  return updateTodo(todoId, { status: 'IN_PROGRESS' });
}

// ==================== 删除操作 ====================

/**
 * 删除待办事项
 */
export async function deleteTodo(todoId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_todos')
      .delete()
      .eq('id', todoId);

    if (error) {
      console.error('删除待办事项失败:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('删除待办事项异常:', (err as Error).message);
    return false;
  }
}

// ==================== 特殊操作 ====================

/**
 * 清理已完成的待办事项
 */
export async function clearCompletedTodos(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .rpc('delete_completed_todos', { p_user_id: user.id });

    if (error) {
      console.error('清理已完成待办失败:', error.message);
      return 0;
    }

    return data || 0;
  } catch (err) {
    console.error('清理已完成待办异常:', (err as Error).message);
    return 0;
  }
}

/**
 * 执行过期待办事项清理
 */
export async function expireOverdueTodos(): Promise<void> {
  try {
    await supabase.rpc('expire_overdue_todos');
  } catch (err) {
    console.error('执行过期清理异常:', (err as Error).message);
  }
}

// ==================== 自动生成待办事项 ====================

/**
 * 根据用户状态自动生成待办事项
 * 例如：风险测评过期、新股申购提醒等
 */
export async function generateAutoTodos(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. 检查风险测评是否即将过期
    // 这里需要根据实际的业务逻辑来实现
    // 示例：查询用户的 risk_assessment 表，检查过期时间
    
    // 2. 检查是否有新股申购机会
    // 可以从 IPO 相关服务获取数据

    console.log('自动生成待办事项检查完成');
  } catch (err) {
    console.error('自动生成待办事项异常:', (err as Error).message);
  }
}

/**
 * 检查并创建风险测评待办
 */
export async function checkAndCreateRiskAssessmentTodo(): Promise<UserTodo | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 检查是否已存在待处理的风险测评待办
    const { data: existingTodos } = await supabase
      .from('user_todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('todo_type', 'RISK_ASSESSMENT')
      .eq('status', 'PENDING');

    if (existingTodos && existingTodos.length > 0) {
      return existingTodos[0] as UserTodo;
    }

    // 创建新的风险测评待办
    return createTodo({
      todo_type: 'RISK_ASSESSMENT',
      title: '风险测评即将过期',
      description: '您的风险承受能力评估即将过期，请及时更新以确保交易正常进行',
      priority: 'HIGH',
      action_url: '/client/profile/risk-assessment',
      action_text: '立即测评',
    });
  } catch (err) {
    console.error('创建风险测评待办异常:', (err as Error).message);
    return null;
  }
}

/**
 * 创建新股申购提醒待办
 */
export async function createIpoTodo(ipoName: string, ipoCount: number): Promise<UserTodo | null> {
  return createTodo({
    todo_type: 'IPO_SUBSCRIPTION',
    title: '新股申购提醒',
    description: `今日有 ${ipoCount} 只新股可申购，点击查看详情`,
    priority: 'NORMAL',
    action_url: '/client/ipo',
    action_text: '去申购',
    metadata: { ipoName, ipoCount },
  });
}
