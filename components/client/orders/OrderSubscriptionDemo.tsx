/**
 * 订单状态实时推送示例组件
 * 
 * 展示如何使用 useOrderSubscription Hook 监听订单状态变化
 */

import React, { useState, useEffect } from 'react'
import { useOrderSubscription, requestNotificationPermission, OrderStatus } from '@/hooks/useOrderSubscription'
import { ICONS } from '@/lib/constants'

export default function OrderSubscriptionDemo() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [permissionGranted, setPermissionGranted] = useState(false)

  // 使用订单订阅 Hook
  const { status, isConnected, error, reconnect, disconnect } = useOrderSubscription({
    enableOrders: true,
    enableExecutions: true,
    enableNotifications: true,
    onOrderChange: (event) => {
      console.log('订单变化:', event)
      
      // 添加到通知列表
      setNotifications(prev => [{
        id: Date.now(),
        type: 'ORDER',
        title: `订单 ${event.new.stock_name}`,
        content: `状态从 ${event.old.status} 变为 ${event.new.status}`,
        time: new Date().toLocaleTimeString(),
        data: event.new
      }, ...prev].slice(0, 20))
    },
    onExecution: (event) => {
      console.log('成交通知:', event)
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'EXECUTION',
        title: `成交 ${event.new.stock_name}`,
        content: `${event.new.match_quantity}股 @ ¥${event.new.match_price}`,
        time: new Date().toLocaleTimeString(),
        data: event.new
      }, ...prev].slice(0, 20))
    },
    onNotification: (event) => {
      console.log('系统通知:', event)
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'NOTIFICATION',
        title: event.new.title,
        content: event.new.content,
        time: new Date().toLocaleTimeString(),
        data: event.new
      }, ...prev].slice(0, 20))
    },
    onError: (err) => {
      console.error('订阅错误:', err)
    }
  })

  // 请求通知权限
  useEffect(() => {
    requestNotificationPermission().then(granted => {
      setPermissionGranted(granted)
    })
  }, [])

  // 状态指示器
  const statusIndicator = {
    CONNECTING: { color: 'text-yellow-500', text: '连接中...' },
    CONNECTED: { color: 'text-green-500', text: '已连接' },
    DISCONNECTED: { color: 'text-gray-500', text: '已断开' },
    ERROR: { color: 'text-red-500', text: '连接错误' }
  }[status]

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-4">
      {/* 顶部状态栏 */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#333333]">实时订单推送</h1>
            <p className="text-sm text-[#999999] mt-1">监听订单状态变化和成交通知</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 连接状态 */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'CONNECTED' ? 'bg-green-500 animate-pulse' :
                status === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' :
                status === 'ERROR' ? 'bg-red-500' : 'bg-gray-300'
              }`} />
              <span className={`text-sm font-medium ${statusIndicator.color}`}>
                {statusIndicator.text}
              </span>
            </div>

            {/* 操作按钮 */}
            <button
              onClick={isConnected ? disconnect : reconnect}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                isConnected
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              {isConnected ? '断开' : '连接'}
            </button>
          </div>
        </div>

        {/* 通知权限提示 */}
        {!permissionGranted && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <ICONS.AlertCircle size={16} className="text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">浏览器通知未启用</p>
                <p className="text-xs text-yellow-600 mt-1">
                  启用浏览器通知可以在后台接收订单状态提醒
                </p>
              </div>
              <button
                onClick={() => requestNotificationPermission().then(setPermissionGranted)}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium hover:bg-yellow-200"
              >
                启用
              </button>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <ICONS.XCircle size={16} className="text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">连接错误</p>
                <p className="text-xs text-red-600 mt-1">{error.message}</p>
              </div>
              <button
                onClick={reconnect}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#999999]">订单变化</p>
          <p className="text-2xl font-bold text-[#333333] mt-1">
            {notifications.filter(n => n.type === 'ORDER').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#999999]">成交记录</p>
          <p className="text-2xl font-bold text-[#E63946] mt-1">
            {notifications.filter(n => n.type === 'EXECUTION').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#999999]">系统通知</p>
          <p className="text-2xl font-bold text-[#0066CC] mt-1">
            {notifications.filter(n => n.type === 'NOTIFICATION').length}
          </p>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F0F0F0]">
          <h2 className="text-sm font-bold text-[#333333]">实时通知</h2>
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <ICONS.Inbox size={40} className="mx-auto text-[#CCCCCC] mb-3" />
            <p className="text-sm text-[#999999]">暂无通知</p>
            <p className="text-xs text-[#CCCCCC] mt-1">订单状态变化时会实时推送到这里</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* 图标 */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      notification.type === 'ORDER' ? 'bg-blue-50' :
                      notification.type === 'EXECUTION' ? 'bg-green-50' : 'bg-purple-50'
                    }`}>
                      {notification.type === 'ORDER' && (
                        <ICONS.FileText size={20} className="text-blue-600" />
                      )}
                      {notification.type === 'EXECUTION' && (
                        <ICONS.CheckCircle size={20} className="text-green-600" />
                      )}
                      {notification.type === 'NOTIFICATION' && (
                        <ICONS.Bell size={20} className="text-purple-600" />
                      )}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#333333]">
                        {notification.title}
                      </p>
                      <p className="text-xs text-[#666666] mt-1">
                        {notification.content}
                      </p>
                      
                      {/* 详细信息 */}
                      {notification.data && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          {notification.data.stock_code && (
                            <span className="px-2 py-0.5 bg-[#F5F5F5] rounded text-[#666666]">
                              {notification.data.stock_code}
                            </span>
                          )}
                          {notification.data.status && (
                            <OrderStatusBadge status={notification.data.status} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 时间 */}
                  <span className="text-xs text-[#999999] ml-3">
                    {notification.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-[#333333] mb-3">使用说明</h3>
        <div className="space-y-2 text-xs text-[#666666]">
          <p>1. 本组件使用 Supabase Realtime 功能监听数据库变化</p>
          <p>2. 订单状态更新时会自动推送到前端，无需刷新页面</p>
          <p>3. 成交记录会在撮合成功后实时显示</p>
          <p>4. 启用浏览器通知可以在后台接收提醒</p>
        </div>

        <div className="mt-4 p-3 bg-[#F5F5F5] rounded-lg">
          <p className="text-xs font-medium text-[#333333] mb-2">技术实现：</p>
          <ul className="text-xs text-[#666666] space-y-1">
            <li>• Supabase Realtime (PostgreSQL WAL)</li>
            <li>• WebSocket 长连接</li>
            <li>• 自动重连机制</li>
            <li>• 浏览器 Notification API</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * 订单状态徽章
 */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
    PENDING: { label: '待提交', color: 'bg-gray-100 text-gray-600' },
    SUBMITTED: { label: '已提交', color: 'bg-blue-100 text-blue-600' },
    MATCHING: { label: '撮合中', color: 'bg-yellow-100 text-yellow-600' },
    PARTIAL: { label: '部分成交', color: 'bg-orange-100 text-orange-600' },
    SUCCESS: { label: '成功', color: 'bg-green-100 text-green-600' },
    CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
    FAILED: { label: '失败', color: 'bg-red-100 text-red-600' },
    REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-600' }
  }

  const config = statusConfig[status] || statusConfig.PENDING

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
