/**
 * 订单状态实时订阅 Hook
 * 
 * 功能：
 * 1. 订阅交易订单状态变化
 * 2. 订阅成交记录
 * 3. 订阅通知消息
 * 4. 自动重连和错误处理
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// 订单状态类型（与后端统一）
// PENDING: 待审核（需要审批的订单初始状态）
// SUBMITTED: 已提交（新股申购等）
// MATCHING: 撮合中（正常订单已入撮合池）
// PARTIAL: 部分成交
// SUCCESS: 全部成交
// CANCELLED: 已撤销
// FAILED: 失败
// REJECTED: 已拒绝
export type OrderStatus = 
  | 'PENDING'      // 待审核
  | 'SUBMITTED'    // 已提交
  | 'MATCHING'     // 撮合中
  | 'PARTIAL'      // 部分成交
  | 'SUCCESS'      // 成功
  | 'CANCELLED'    // 已取消
  | 'FAILED'       // 失败
  | 'REJECTED'     // 已拒绝

// 可撤销的订单状态
export const CANCELABLE_STATUSES: OrderStatus[] = ['PENDING', 'SUBMITTED', 'MATCHING', 'PARTIAL']

// 订单变化事件
export interface OrderChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: {
    id: string
    status: OrderStatus
    executed_quantity: number
    executed_amount: number
    price: number
    quantity: number
    stock_code: string
    stock_name: string
    trade_type: 'BUY' | 'SELL'
    [key: string]: any
  }
  old: {
    id: string
    status: OrderStatus
    [key: string]: any
  }
  errors: string | null
}

// 成交记录事件
export interface ExecutionEvent {
  eventType: 'INSERT'
  new: {
    id: string
    buy_trade_id: string | null
    sell_trade_id: string | null
    stock_code: string
    stock_name: string
    match_price: number
    match_quantity: number
    match_amount: number
    matched_at: string
    [key: string]: any
  }
  errors: string | null
}

// 通知事件
export interface NotificationEvent {
  eventType: 'INSERT' | 'UPDATE'
  new: {
    id: string
    type: string
    title: string
    content: string
    is_read: boolean
    data: any
    created_at: string
  }
  errors: string | null
}

// 订阅状态
export type SubscriptionStatus = 
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'

// 订阅选项
export interface UseOrderSubscriptionOptions {
  enableOrders?: boolean        // 订阅订单变化
  enableExecutions?: boolean    // 订阅成交记录
  enableNotifications?: boolean // 订阅通知
  onOrderChange?: (event: OrderChangeEvent) => void
  onExecution?: (event: ExecutionEvent) => void
  onNotification?: (event: NotificationEvent) => void
  onError?: (error: Error) => void
}

// 订阅返回值
export interface UseOrderSubscriptionReturn {
  status: SubscriptionStatus
  isConnected: boolean
  error: Error | null
  reconnect: () => void
  disconnect: () => void
}

/**
 * 订单状态实时订阅 Hook
 */
export function useOrderSubscription(
  options: UseOrderSubscriptionOptions = {}
): UseOrderSubscriptionReturn {
  const {
    enableOrders = true,
    enableExecutions = true,
    enableNotifications = true,
    onOrderChange,
    onExecution,
    onNotification,
    onError
  } = options

  const { user } = useAuth()
  const [status, setStatus] = useState<SubscriptionStatus>('DISCONNECTED')
  const [error, setError] = useState<Error | null>(null)
  
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 连接状态
  const isConnected = status === 'CONNECTED'

  // 清理连接
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
  }, [])

  // 创建订阅
  const createSubscription = useCallback(() => {
    if (!user?.id) return

    cleanup()
    setStatus('CONNECTING')
    setError(null)

    try {
      // 创建 Realtime 频道
      const channel = supabase.channel(`orders:${user.id}`, {
        config: {
          broadcast: { self: true },
          presence: { key: user.id }
        }
      })

      // 订阅订单变化
      if (enableOrders) {
        channel.on<OrderChangeEvent>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trades',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[Realtime] 订单变化:', payload)
            onOrderChange?.(payload as unknown as OrderChangeEvent)

            // 显示通知
            if (payload.eventType === 'UPDATE') {
              const newRecord = (payload as any).new as OrderChangeEvent['new']
              const oldRecord = (payload as any).old as OrderChangeEvent['old']
              
              // 状态变化时显示通知
              if (newRecord.status !== oldRecord.status) {
                showOrderStatusNotification(newRecord)
              }
            }
          }
        )
      }

      // 订阅成交记录
      if (enableExecutions) {
        channel.on<ExecutionEvent>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trade_executions',
            filter: `or(buy_user_id.eq.${user.id},sell_user_id.eq.${user.id})`
          },
          (payload) => {
            console.log('[Realtime] 成交记录:', payload)
            onExecution?.(payload as unknown as ExecutionEvent)
          }
        )
      }

      // 订阅通知
      if (enableNotifications) {
        channel.on<NotificationEvent>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[Realtime] 新通知:', payload)
            onNotification?.(payload as unknown as NotificationEvent)

            // 显示系统通知
            showSystemNotification((payload as any).new)
          }
        )
      }

      // 订阅状态回调
      channel
        .on('presence', { event: 'sync' }, () => {
          console.log('[Realtime] Presence sync')
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('[Realtime] Presence join:', newPresences)
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('[Realtime] Presence leave:', leftPresences)
        })

      // 订阅连接
      channel.subscribe((status, err) => {
        console.log('[Realtime] 订阅状态:', status)
        
        if (status === 'SUBSCRIBED') {
          setStatus('CONNECTED')
          setError(null)
        } else if (status === 'CLOSED') {
          setStatus('DISCONNECTED')
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('ERROR')
          const errorMsg = typeof err === 'string' ? err : '订阅错误'
          setError(new Error(errorMsg))
          onError?.(new Error(errorMsg))
          
          // 自动重连
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[Realtime] 尝试重连...')
            createSubscription()
          }, 5000)
        }
      })

      channelRef.current = channel

    } catch (err: any) {
      console.error('[Realtime] 创建订阅失败:', err)
      setStatus('ERROR')
      setError(err)
      onError?.(err)
    }
  }, [user?.id, enableOrders, enableExecutions, enableNotifications, onOrderChange, onExecution, onNotification, onError, cleanup])

  // 重连
  const reconnect = useCallback(() => {
    console.log('[Realtime] 手动重连')
    createSubscription()
  }, [createSubscription])

  // 断开连接
  const disconnect = useCallback(() => {
    console.log('[Realtime] 断开连接')
    cleanup()
    setStatus('DISCONNECTED')
  }, [cleanup])

  // 初始化订阅
  useEffect(() => {
    if (user?.id) {
      createSubscription()
    }

    return () => {
      cleanup()
    }
  }, [user?.id, createSubscription, cleanup])

  // 页面可见性变化时重连
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'DISCONNECTED') {
        console.log('[Realtime] 页面可见，尝试重连')
        createSubscription()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status, createSubscription])

  return {
    status,
    isConnected,
    error,
    reconnect,
    disconnect
  }
}

/**
 * 显示订单状态通知
 */
function showOrderStatusNotification(order: any) {
  const statusMessages: Record<string, string> = {
    'MATCHING': '订单正在撮合中',
    'PARTIAL': '订单部分成交',
    'SUCCESS': '订单已全部成交',
    'CANCELLED': '订单已取消',
    'FAILED': '订单失败',
    'REJECTED': '订单被拒绝'
  }

  const message = statusMessages[order.status]
  if (!message) return

  // 使用浏览器通知 API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`订单状态更新`, {
      body: `${order.stock_name}(${order.stock_code}) - ${message}`,
      icon: '/favicon.ico',
      tag: `order-${order.id}`
    })
  }
}

/**
 * 显示系统通知
 */
function showSystemNotification(notification: any) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.content,
      icon: '/favicon.ico',
      tag: notification.id,
      data: notification.data
    })
  }
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    console.warn('通知权限被拒绝')
    return false
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/**
 * 简化的订单订阅 Hook（仅监听状态变化）
 */
export function useOrderStatusChange(
  onStatusChange?: (orderId: string, newStatus: OrderStatus, oldStatus: OrderStatus) => void
) {
  return useOrderSubscription({
    enableOrders: true,
    enableExecutions: false,
    enableNotifications: false,
    onOrderChange: (event) => {
      if (event.eventType === 'UPDATE' && event.new.status !== event.old.status) {
        onStatusChange?.(event.new.id, event.new.status, event.old.status)
      }
    }
  })
}

/**
 * 成交通知 Hook
 */
export function useExecutionNotification(
  onExecution?: (execution: ExecutionEvent['new']) => void
) {
  return useOrderSubscription({
    enableOrders: false,
    enableExecutions: true,
    enableNotifications: false,
    onExecution: (event) => {
      onExecution?.(event.new)
    }
  })
}

export default useOrderSubscription
