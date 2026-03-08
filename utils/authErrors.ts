import { AuthError } from '@supabase/supabase-js';

/**
 * Supabase Auth 错误消息映射表
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Supabase Auth 标准错误
  'Invalid login credentials': '邮箱或密码错误',
  'Email not confirmed': '邮箱未验证，请先检查邮件',
  'Phone not confirmed': '手机号未验证',
  'Too many requests': '请求过于频繁，请稍后再试',
  'Weak password': '密码强度不足，至少需要 6 位字符',
  'User already registered': '该邮箱已注册',
  'User not found': '用户不存在',
  'Invalid token': '验证码无效或已过期',
  'Token expired': '验证码已过期，请重新获取',
  
  // 自定义业务错误
  'PROFILE_NOT_FOUND': '用户资料不存在，请联系管理员',
  'ACCOUNT_PENDING': '账户正在审核中，请等待管理员审批',
  'ACCOUNT_BANNED': '账户已被禁用，请联系客服：95551',
  'INVALID_ROLE': '无权访问此页面',
  'SESSION_EXPIRED': '会话已过期，请重新登录',
  'IP_NOT_ALLOWED': '您的 IP 不在白名单内，无法访问管理后台',
};

/**
 * 统一处理认证相关错误
 * @param error - Supabase Auth 错误或普通 Error
 * @returns 友好的中文错误提示
 */
export function handleAuthError(error: AuthError | Error | unknown): string {
  // Supabase Auth 错误
  if (error instanceof AuthError) {
    return AUTH_ERROR_MESSAGES[error.message] || error.message;
  }
  
  // 普通 Error
  if (error instanceof Error) {
    // 检查是否是自定义错误代码
    const customErrorKey = error.message.split(':')[0].trim();
    if (AUTH_ERROR_MESSAGES[customErrorKey]) {
      return AUTH_ERROR_MESSAGES[customErrorKey];
    }
    
    // 返回原始消息或默认消息
    return AUTH_ERROR_MESSAGES[error.message] || error.message || '操作失败，请稍后重试';
  }
  
  // 未知错误类型
  console.error('未知错误类型:', error);
  return '发生未知错误，请稍后重试';
}

/**
 * 显示错误提示（可选：集成 Toast 系统时使用）
 * @param error - 错误对象
 * @param useAlert - 是否使用 alert（默认 true），false 时可集成 Toast
 */
export function showError(error: unknown, useAlert: boolean = true) {
  const message = handleAuthError(error);
  
  if (useAlert) {
    alert(message);
  } else {
    // TODO: 集成 Toast 系统时替换此处
    console.error('[Auth Error]', message);
  }
  
  return message;
}
