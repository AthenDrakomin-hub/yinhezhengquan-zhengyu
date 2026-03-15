/**
 * 待办事项列表页面
 * 展示用户所有待办事项，支持筛选和操作
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserTodo, TodoStatus, TodoType, TodoPriority } from '../../../lib/types';
import { TODO_TYPE_CONFIG, getUserTodos, completeTodo, dismissTodo, deleteTodo, markInProgress } from '../../../services/todoService';

interface TodoListViewProps {
  onBack?: () => void;
}

const TodoListView: React.FC<TodoListViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<UserTodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TodoStatus | 'ALL'>('ALL');
  const [showCompleted, setShowCompleted] = useState(false);

  // 加载待办事项
  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = activeFilter === 'ALL' ? undefined : activeFilter;
      const todosData = await getUserTodos({ 
        status: showCompleted ? undefined : (status || 'PENDING'),
        limit: 50 
      });
      setTodos(todosData);
    } catch (error) {
      console.error('加载待办事项失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, showCompleted]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // 处理待办事项点击
  const handleTodoClick = async (todo: UserTodo) => {
    // 标记为处理中
    if (todo.status === 'PENDING') {
      await markInProgress(todo.id);
    }
    
    // 如果有跳转链接，执行跳转
    if (todo.action_url) {
      navigate(todo.action_url);
    }
  };

  // 完成待办
  const handleComplete = async (todoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const success = await completeTodo(todoId);
    if (success) {
      loadTodos();
    }
  };

  // 忽略待办
  const handleDismiss = async (todoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const success = await dismissTodo(todoId);
    if (success) {
      loadTodos();
    }
  };

  // 删除待办
  const handleDelete = async (todoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('确定要删除此待办事项吗？')) {
      const success = await deleteTodo(todoId);
      if (success) {
        loadTodos();
      }
    }
  };

  // 状态标签颜色
  const getStatusColor = (status: TodoStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-orange-100 text-orange-600';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-600';
      case 'COMPLETED': return 'bg-green-100 text-green-600';
      case 'DISMISSED': return 'bg-gray-100 text-gray-500';
      case 'EXPIRED': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  // 状态标签文字
  const getStatusText = (status: TodoStatus) => {
    switch (status) {
      case 'PENDING': return '待处理';
      case 'IN_PROGRESS': return '处理中';
      case 'COMPLETED': return '已完成';
      case 'DISMISSED': return '已忽略';
      case 'EXPIRED': return '已过期';
      default: return status;
    }
  };

  // 状态排序权重
  const statusOrder: Record<TodoStatus, number> = {
    PENDING: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
    DISMISSED: 3,
    EXPIRED: 4,
  };

  // 优先级排序权重
  const priorityWeight: Record<TodoPriority, number> = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };

  // 排序后的待办事项
  const sortedTodos = [...todos].sort((a, b) => {
    // 先按状态排序（待处理 > 处理中 > 其他）
    const statusDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    if (statusDiff !== 0) return statusDiff;
    
    // 再按优先级排序
    const priorityDiff = (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    
    // 最后按创建时间排序
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-12">
          <button 
            onClick={() => onBack ? onBack() : navigate(-1)}
            className="flex items-center text-[#333333]"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-base font-medium">我的待办</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                showCompleted 
                  ? 'bg-[#0066CC] text-white' 
                  : 'bg-gray-100 text-[#666666]'
              }`}
            >
              {showCompleted ? '显示全部' : '仅待处理'}
            </button>
          </div>
        </div>
      </header>

      {/* 筛选标签 */}
      <div className="bg-white px-4 py-2 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto">
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-[#0066CC] text-white'
                  : 'bg-gray-100 text-[#666666]'
              }`}
            >
              {filter === 'ALL' ? '全部' : getStatusText(filter)}
            </button>
          ))}
        </div>
      </div>

      {/* 待办列表 */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0066CC] border-t-transparent"></div>
            <p className="text-[#999999] text-sm mt-3">加载中...</p>
          </div>
        ) : sortedTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-[#CCCCCC] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[#999999] text-base">暂无待办事项</p>
            <p className="text-[#CCCCCC] text-sm mt-1">您已处理完所有待办</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTodos.map((todo) => {
              const typeConfig = TODO_TYPE_CONFIG[todo.todo_type];
              const isCompleted = todo.status === 'COMPLETED';
              
              return (
                <div
                  key={todo.id}
                  onClick={() => handleTodoClick(todo)}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${
                    isCompleted ? 'opacity-60' : ''
                  } ${todo.action_url ? 'cursor-pointer hover:shadow-md' : ''}`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* 类型图标 */}
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: typeConfig.bgColor }}
                      >
                        {typeConfig.icon}
                      </div>
                      
                      {/* 内容区 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-sm font-medium ${isCompleted ? 'line-through text-[#999999]' : 'text-[#333333]'}`}>
                            {todo.title}
                          </h3>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(todo.status)}`}>
                            {getStatusText(todo.status)}
                          </span>
                        </div>
                        
                        {todo.description && (
                          <p className="text-xs text-[#999999] mb-2 line-clamp-2">
                            {todo.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-[10px] text-[#CCCCCC]">
                          <span>{typeConfig.label}</span>
                          <span>·</span>
                          <span>
                            {new Date(todo.created_at).toLocaleDateString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {todo.expires_at && (
                            <>
                              <span>·</span>
                              <span className="text-orange-500">
                                截止: {new Date(todo.expires_at).toLocaleDateString('zh-CN')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-50">
                      {todo.status !== 'COMPLETED' && todo.status !== 'DISMISSED' && (
                        <>
                          <button
                            onClick={(e) => handleDismiss(todo.id, e)}
                            className="px-3 py-1 text-xs text-[#999999] bg-gray-100 rounded-full"
                          >
                            忽略
                          </button>
                          <button
                            onClick={(e) => handleComplete(todo.id, e)}
                            className="px-3 py-1 text-xs text-white bg-[#10B981] rounded-full"
                          >
                            完成
                          </button>
                          {todo.action_url && todo.action_text && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(todo.action_url!);
                              }}
                              className="px-3 py-1 text-xs text-white bg-[#0066CC] rounded-full"
                            >
                              {todo.action_text}
                            </button>
                          )}
                        </>
                      )}
                      {(todo.status === 'COMPLETED' || todo.status === 'DISMISSED') && (
                        <button
                          onClick={(e) => handleDelete(todo.id, e)}
                          className="px-3 py-1 text-xs text-red-500 bg-red-50 rounded-full"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoListView;
