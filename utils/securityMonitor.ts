// 安全监控和日志记录系统
import { supabase } from '../lib/supabase';

// 安全日志级别
export enum SecurityLogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// 安全事件类型
export enum SecurityEventType {
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED_ACCESS = 'AUTH_UNAUTHORIZED_ACCESS',
  TRADE_EXECUTION = 'TRADE_EXECUTION',
  TRADE_DUPLICATE_ATTEMPT = 'TRADE_DUPLICATE_ATTEMPT',
  TRADE_RISK_VIOLATION = 'TRADE_RISK_VIOLATION',
  ADMIN_OPERATION = 'ADMIN_OPERATION',
  ADMIN_PRIVILEGE_ESCALATION = 'ADMIN_PRIVILEGE_ESCALATION',
  DATA_ACCESS_VIOLATION = 'DATA_ACCESS_VIOLATION',
  SYSTEM_ANOMALY = 'SYSTEM_ANOMALY'
}

// 安全日志条目接口
export interface SecurityLogEntry {
  id?: string;
  user_id?: string;
  event_type: SecurityEventType;
  level: SecurityLogLevel;
  message: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

// 安全监控系统
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = import.meta.env.PROD || false;
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  // 记录安全事件
  async logSecurityEvent(entry: Omit<SecurityLogEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      // 添加时间戳和IP信息
      const enrichedEntry: SecurityLogEntry = {
        ...entry,
        ip_address: this.getClientIP(),
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      };

      // 开发环境输出到控制台
      if (!this.isProduction) {
        console.log(`[安全日志] ${entry.level} - ${entry.event_type}: ${entry.message}`, enrichedEntry);
      }

      // 生产环境记录到数据库
      if (this.isProduction) {
        await this.persistSecurityLog(enrichedEntry);
      }

      // 检查是否需要告警
      this.checkForAlerts(enrichedEntry);

    } catch (error) {
      console.error('安全日志记录失败:', error);
      // 即使日志记录失败，也不影响主业务流程
    }
  }

  // 持久化安全日志到数据库
  private async persistSecurityLog(entry: SecurityLogEntry): Promise<void> {
    const { error } = await supabase
      .from('security_logs')
      .insert({
        user_id: entry.user_id,
        event_type: entry.event_type,
        level: entry.level,
        message: entry.message,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        request_id: entry.request_id,
        metadata: entry.metadata
      });

    if (error) {
      console.error('安全日志持久化失败:', error);
      // TODO: 发送到备用日志系统
    }
  }

  // 检查是否需要触发告警
  private checkForAlerts(entry: SecurityLogEntry): void {
    const alertRules = [
      // 高频登录失败
      {
        condition: (e: SecurityLogEntry) => 
          e.event_type === SecurityEventType.AUTH_LOGIN_FAILED &&
          e.level === SecurityLogLevel.WARNING,
        action: () => this.triggerRateLimitAlert(entry)
      },
      // 权限提升尝试
      {
        condition: (e: SecurityLogEntry) => 
          e.event_type === SecurityEventType.ADMIN_PRIVILEGE_ESCALATION,
        action: () => this.triggerPrivilegeEscalationAlert(entry)
      },
      // 重复交易尝试
      {
        condition: (e: SecurityLogEntry) => 
          e.event_type === SecurityEventType.TRADE_DUPLICATE_ATTEMPT &&
          e.level === SecurityLogLevel.WARNING,
        action: () => this.triggerDuplicateTradeAlert(entry)
      },
      // 数据访问违规
      {
        condition: (e: SecurityLogEntry) => 
          e.event_type === SecurityEventType.DATA_ACCESS_VIOLATION,
        action: () => this.triggerDataAccessAlert(entry)
      }
    ];

    for (const rule of alertRules) {
      if (rule.condition(entry)) {
        rule.action();
      }
    }
  }

  // 触发频率限制告警
  private triggerRateLimitAlert(entry: SecurityLogEntry): void {
    console.warn(`[安全告警] 检测到高频登录失败，用户ID: ${entry.user_id}, IP: ${entry.ip_address}`);
    // TODO: 实现实际的告警机制（邮件、短信、Slack等）
  }

  // 触发权限提升告警
  private triggerPrivilegeEscalationAlert(entry: SecurityLogEntry): void {
    console.error(`[安全告警] 检测到权限提升尝试，用户ID: ${entry.user_id}, IP: ${entry.ip_address}`);
    // TODO: 立即通知安全团队
  }

  // 触发重复交易告警
  private triggerDuplicateTradeAlert(entry: SecurityLogEntry): void {
    console.warn(`[安全告警] 检测到重复交易尝试，用户ID: ${entry.user_id}, 交易ID: ${entry.metadata?.transactionId}`);
  }

  // 触发数据访问违规告警
  private triggerDataAccessAlert(entry: SecurityLogEntry): void {
    console.error(`[安全告警] 检测到数据访问违规，用户ID: ${entry.user_id}, IP: ${entry.ip_address}`);
  }

  // 获取客户端IP地址（简化版本）
  private getClientIP(): string {
    // 实际项目中应该通过服务器端获取真实IP
    return '0.0.0.0'; // 占位符
  }

  // 记录用户登录事件
  async logUserLogin(userId: string, success: boolean, requestId?: string): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: success ? SecurityEventType.AUTH_LOGIN : SecurityEventType.AUTH_LOGIN_FAILED,
      level: success ? SecurityLogLevel.INFO : SecurityLogLevel.WARNING,
      message: success ? '用户登录成功' : '用户登录失败',
      request_id: requestId,
      metadata: { login_success: success }
    });
  }

  // 记录用户登出事件
  async logUserLogout(userId: string, requestId?: string): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: SecurityEventType.AUTH_LOGOUT,
      level: SecurityLogLevel.INFO,
      message: '用户登出',
      request_id: requestId
    });
  }

  // 记录交易执行事件
  async logTradeExecution(userId: string, tradeData: any, requestId?: string): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: SecurityEventType.TRADE_EXECUTION,
      level: SecurityLogLevel.INFO,
      message: `用户执行交易: ${tradeData.stock_code}`,
      request_id: requestId,
      metadata: {
        trade_type: tradeData.trade_type,
        stock_code: tradeData.stock_code,
        price: tradeData.price,
        quantity: tradeData.quantity,
        amount: tradeData.price * tradeData.quantity
      }
    });
  }

  // 记录重复交易尝试
  async logDuplicateTradeAttempt(userId: string, transactionId: string, requestId?: string): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: SecurityEventType.TRADE_DUPLICATE_ATTEMPT,
      level: SecurityLogLevel.WARNING,
      message: `检测到重复交易尝试: ${transactionId}`,
      request_id: requestId,
      metadata: { transaction_id: transactionId }
    });
  }

  // 记录管理员操作
  async logAdminOperation(userId: string, operation: string, targetUserId?: string, requestId?: string): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: SecurityEventType.ADMIN_OPERATION,
      level: SecurityLogLevel.INFO,
      message: `管理员执行操作: ${operation}`,
      request_id: requestId,
      metadata: { 
        operation,
        target_user_id: targetUserId 
      }
    });
  }

  // 记录数据访问违规
  async logDataAccessViolation(userId: string, resource: string, requestId?: string): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: SecurityEventType.DATA_ACCESS_VIOLATION,
      level: SecurityLogLevel.ERROR,
      message: `数据访问违规: ${resource}`,
      request_id: requestId,
      metadata: { resource }
    });
  }
}

// 创建安全监控实例
export const securityMonitor = SecurityMonitor.getInstance();

// React Hook for安全监控
export const useSecurityMonitor = () => {
  const logUserActivity = async (userId: string, activity: string) => {
    await securityMonitor.logSecurityEvent({
      user_id: userId,
      event_type: SecurityEventType.SYSTEM_ANOMALY,
      level: SecurityLogLevel.INFO,
      message: `用户活动: ${activity}`,
      metadata: { activity }
    });
  };

  const logSuspiciousActivity = async (userId: string, activity: string, details?: any) => {
    await securityMonitor.logSecurityEvent({
      user_id: userId,
      event_type: SecurityEventType.SYSTEM_ANOMALY,
      level: SecurityLogLevel.WARNING,
      message: `可疑活动: ${activity}`,
      metadata: { 
        activity,
        ...details 
      }
    });
  };

  return {
    logUserActivity,
    logSuspiciousActivity,
    logUserLogin: securityMonitor.logUserLogin.bind(securityMonitor),
    logUserLogout: securityMonitor.logUserLogout.bind(securityMonitor),
    logTradeExecution: securityMonitor.logTradeExecution.bind(securityMonitor),
    logDuplicateTradeAttempt: securityMonitor.logDuplicateTradeAttempt.bind(securityMonitor),
    logAdminOperation: securityMonitor.logAdminOperation.bind(securityMonitor),
    logDataAccessViolation: securityMonitor.logDataAccessViolation.bind(securityMonitor)
  };
};