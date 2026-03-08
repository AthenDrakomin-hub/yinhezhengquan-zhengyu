/**
 * 交易错误提示映射
 */
export const TRADE_ERROR_MESSAGES: Record<string, { title: string; detail: string; action?: string }> = {
  // 余额不足
  'INSUFFICIENT_BALANCE': {
    title: '余额不足',
    detail: '您的可用余额不足以完成此次交易，请先充值或减少交易数量',
    action: '前往充值'
  },
  
  // 持仓不足
  'INSUFFICIENT_POSITION': {
    title: '持仓不足',
    detail: '您的可用持仓数量不足，无法完成卖出操作',
    action: '查看持仓'
  },
  
  // 价格偏离
  'PRICE_DEVIATION': {
    title: '价格偏离过大',
    detail: '您的委托价格与当前市场价格偏离超过5%，请重新确认',
    action: '刷新行情'
  },
  
  // 非交易时段
  'NOT_TRADING_TIME': {
    title: '非交易时段',
    detail: '当前不在交易时间内（交易时间：9:30-11:30, 13:00-15:00）',
    action: '查看交易日历'
  },
  
  // 数量不合规
  'INVALID_QUANTITY': {
    title: '交易数量不合规',
    detail: 'A股交易数量必须为100的整数倍（1手=100股）',
    action: '调整数量'
  },
  
  // 超过限额
  'EXCEED_LIMIT': {
    title: '超过交易限额',
    detail: '单笔交易金额超过您的风险等级限额',
    action: '查看限额说明'
  },
  
  // 股票停牌
  'STOCK_SUSPENDED': {
    title: '股票已停牌',
    detail: '该股票当前处于停牌状态，无法交易',
    action: '查看公告'
  },
  
  // 涨跌停
  'LIMIT_UP_DOWN': {
    title: '涨跌停限制',
    detail: '该股票已触及涨跌停板，当前价格无法成交',
    action: '调整价格'
  },
  
  // 网络错误
  'NETWORK_ERROR': {
    title: '网络连接失败',
    detail: '无法连接到服务器，请检查网络连接后重试',
    action: '重试'
  },
  
  // 会话过期
  'SESSION_EXPIRED': {
    title: '登录已过期',
    detail: '您的登录会话已过期，请重新登录',
    action: '重新登录'
  },
  
  // 风控拦截
  'RISK_CONTROL': {
    title: '风控拦截',
    detail: '该交易触发风控规则，已被系统拦截',
    action: '联系客服'
  },
  
  // 重复下单
  'DUPLICATE_ORDER': {
    title: '重复下单',
    detail: '检测到相同的订单正在处理中，请勿重复提交',
    action: '查看订单'
  }
};

/**
 * 获取友好的错误提示
 */
export function getFriendlyErrorMessage(error: any): { title: string; detail: string; action?: string } {
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  
  // 匹配错误类型
  for (const [key, value] of Object.entries(TRADE_ERROR_MESSAGES)) {
    if (errorMessage.includes(key) || errorMessage.includes(value.title)) {
      return value;
    }
  }
  
  // 默认错误提示
  return {
    title: '操作失败',
    detail: errorMessage || '未知错误，请稍后重试',
    action: '重试'
  };
}

/**
 * 显示友好的错误提示
 */
export function showFriendlyError(error: any, onAction?: () => void) {
  const { title, detail, action } = getFriendlyErrorMessage(error);
  
  // 可以使用 toast 或 modal 显示
  if (window.confirm(`${title}\n\n${detail}\n\n${action ? `点击确定${action}` : ''}`)) {
    onAction?.();
  }
}
