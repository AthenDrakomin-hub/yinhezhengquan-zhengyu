/**
 * 风控服务层
 * 封装风控规则、风险事件相关API调用
 */

import { supabase } from '../lib/supabase';

// 风控规则类型
export interface RiskRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  rule_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  scope: string;
  priority: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// 风险事件类型
export interface RiskEvent {
  id: string;
  user_id: string | null;
  rule_id: string | null;
  event_type: string;
  event_data: Record<string, any>;
  risk_level: string;
  action_taken: string | null;
  handled_by: string | null;
  handled_at: string | null;
  handle_note: string | null;
  created_at: string;
  rule?: RiskRule;
}

// 规则类型配置
export const RULE_TYPES = {
  TRADE_LIMIT: { label: '交易限额', description: '限制单笔或累计交易金额', icon: '💰' },
  PRICE_DEVIATION: { label: '价格偏离', description: '监控价格异常波动', icon: '📊' },
  POSITION_CONCENTRATION: { label: '持仓集中度', description: '监控单一持仓占比', icon: '📈' },
  DAILY_LOSS: { label: '日内亏损', description: '监控日内亏损幅度', icon: '📉' },
  SUSPICIOUS: { label: '可疑行为', description: '异常交易行为检测', icon: '⚠️' },
  FREQUENCY: { label: '交易频率', description: '高频交易限制', icon: '⏱️' },
  WITHDRAWAL: { label: '提现限制', description: '提现金额和频率限制', icon: '🏦' }
};

// 触发动作配置
export const ACTION_TYPES = {
  WARN: { label: '警告', description: '发送警告消息', color: '#F97316' },
  BLOCK: { label: '阻断', description: '阻止交易', color: '#EF4444' },
  REVIEW: { label: '人工审核', description: '提交人工审核', color: '#8B5CF6' },
  FREEZE: { label: '冻结', description: '冻结账户', color: '#DC2626' }
};

// 风险等级配置
export const RISK_LEVELS = {
  low: { label: '低风险', color: '#22C55E', bgColor: '#DCFCE7' },
  medium: { label: '中风险', color: '#F97316', bgColor: '#FFEDD5' },
  high: { label: '高风险', color: '#EF4444', bgColor: '#FEE2E2' },
  critical: { label: '严重', color: '#7C3AED', bgColor: '#EDE9FE' }
};

// 适用范围配置
export const SCOPES = {
  all: { label: '所有用户', description: '适用于所有用户' },
  vip: { label: 'VIP用户', description: '仅适用于VIP用户' },
  non_vip: { label: '非VIP用户', description: '仅适用于非VIP用户' }
};

/**
 * 用户端风控服务
 */
export const riskControlService = {
  /**
   * 获取规则类型配置
   */
  getRuleTypes() {
    return {
      rule_types: RULE_TYPES,
      action_types: ACTION_TYPES,
      risk_levels: RISK_LEVELS
    };
  },

  /**
   * 获取启用的规则列表（公开）
   */
  async getEnabledRules(type?: string): Promise<RiskRule[]> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'list_rules', type, enabled_only: true }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.rules || [];
    } catch (error) {
      console.error('获取规则列表失败:', error);
      return [];
    }
  },

  /**
   * 检查交易风险
   */
  async checkRisk(params: {
    user_id: string;
    trade_type: string;
    amount?: number;
    symbol?: string;
    price?: number;
    quantity?: number;
  }): Promise<{ shouldBlock: boolean; triggeredRules: RiskRule[]; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'check_risk', ...params }
      });

      if (error || !data?.success) {
        return { shouldBlock: false, triggeredRules: [], message: '风控检查失败' };
      }

      return {
        shouldBlock: data.should_block,
        triggeredRules: data.triggered_rules,
        message: data.message
      };
    } catch (error) {
      console.error('风控检查失败:', error);
      return { shouldBlock: false, triggeredRules: [], message: '风控检查异常' };
    }
  }
};

/**
 * 管理员风控服务
 */
export const adminRiskControlService = {
  /**
   * 获取所有规则
   */
  async getRules(type?: string): Promise<RiskRule[]> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'list_rules', type }
      });

      if (error || !data?.success) {
        return [];
      }

      return data.rules || [];
    } catch (error) {
      console.error('获取规则列表失败:', error);
      return [];
    }
  },

  /**
   * 获取规则详情
   */
  async getRuleDetail(ruleId: string): Promise<RiskRule | null> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'get_rule', rule_id: ruleId }
      });

      if (error || !data?.success) {
        return null;
      }

      return data.rule || null;
    } catch (error) {
      console.error('获取规则详情失败:', error);
      return null;
    }
  },

  /**
   * 创建规则
   */
  async createRule(params: Partial<RiskRule>): Promise<{ success: boolean; data?: RiskRule; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'admin_create_rule', ...params }
      });

      if (error) {
        return { success: false, error: error.message || '创建失败' };
      }

      return { success: true, data: data.rule };
    } catch (error: any) {
      console.error('创建规则失败:', error);
      return { success: false, error: error.message || '创建失败，请稍后重试' };
    }
  },

  /**
   * 更新规则
   */
  async updateRule(ruleId: string, updates: Partial<RiskRule>): Promise<{ success: boolean; data?: RiskRule; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'admin_update_rule', rule_id: ruleId, ...updates }
      });

      if (error) {
        return { success: false, error: error.message || '更新失败' };
      }

      return { success: true, data: data.rule };
    } catch (error: any) {
      console.error('更新规则失败:', error);
      return { success: false, error: error.message || '更新失败，请稍后重试' };
    }
  },

  /**
   * 删除规则
   */
  async deleteRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'admin_delete_rule', rule_id: ruleId }
      });

      if (error) {
        return { success: false, error: error.message || '删除失败' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('删除规则失败:', error);
      return { success: false, error: error.message || '删除失败，请稍后重试' };
    }
  },

  /**
   * 切换规则状态
   */
  async toggleRule(ruleId: string, isEnabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'admin_toggle_rule', rule_id: ruleId, is_enabled: isEnabled }
      });

      if (error) {
        return { success: false, error: error.message || '操作失败' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('切换规则状态失败:', error);
      return { success: false, error: error.message || '操作失败，请稍后重试' };
    }
  },

  /**
   * 获取风险事件列表
   */
  async getEvents(params?: {
    risk_level?: string;
    event_type?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ events: RiskEvent[]; pagination: any }> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'list_events', ...params }
      });

      if (error || !data?.success) {
        return { events: [], pagination: {} };
      }

      return {
        events: data.events || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('获取事件列表失败:', error);
      return { events: [], pagination: {} };
    }
  },

  /**
   * 获取事件详情
   */
  async getEventDetail(eventId: string): Promise<RiskEvent | null> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'get_event', event_id: eventId }
      });

      if (error || !data?.success) {
        return null;
      }

      return data.event || null;
    } catch (error) {
      console.error('获取事件详情失败:', error);
      return null;
    }
  },

  /**
   * 处理事件
   */
  async handleEvent(eventId: string, note: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'admin_handle_event', event_id: eventId, handle_note: note }
      });

      if (error) {
        return { success: false, error: error.message || '处理失败' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('处理事件失败:', error);
      return { success: false, error: error.message || '处理失败，请稍后重试' };
    }
  },

  /**
   * 获取事件统计
   */
  async getEventStats(): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-control', {
        body: { action: 'admin_event_stats' }
      });

      if (error || !data?.success) {
        return null;
      }

      return data.stats;
    } catch (error) {
      console.error('获取事件统计失败:', error);
      return null;
    }
  }
};

export default riskControlService;
