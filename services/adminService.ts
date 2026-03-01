import { supabase } from '../lib/supabase';

export const adminService = {
  /**
   * 记录管理员操作日志
   */
  async logAdminOperation(
    operateType: string,
    targetUserId: string | null,
    operateContent: any
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登录');

      const { error } = await supabase.from('admin_operation_logs').insert({
        admin_id: user.id,
        operate_type: operateType,
        target_user_id: targetUserId,
        operate_content: operateContent,
        ip_address: await this.getClientIP()
      });

      if (error) throw error;
    } catch (error) {
      console.error('记录操作日志失败:', error);
    }
  },

  /**
   * 获取客户端IP
   */
  async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  },

  /**
   * 查询审计日志
   */
  async getAuditLogs(filters?: {
    adminId?: string;
    operateType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    try {
      let query = supabase
        .from('admin_operation_logs')
        .select('*, admin:profiles!admin_id(username)')
        .order('created_at', { ascending: false });

      if (filters?.adminId) query = query.eq('admin_id', filters.adminId);
      if (filters?.operateType) query = query.eq('operate_type', filters.operateType);
      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('查询审计日志失败:', error);
      return [];
    }
  },

  /**
   * 导出数据为CSV
   */
  exportToCSV(data: any[], filename: string) {
    if (!data.length) {
      alert('没有数据可导出');
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val).replace(/,/g, ';');
          return String(val).replace(/,/g, ';');
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  },

  /**
   * 干预交易订单
   */
  async interveneOrder(tradeId: string, action: 'APPROVE' | 'REJECT' | 'CANCEL', remark: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登录');

      const { data, error } = await supabase.rpc('admin_intervene_trade', {
        p_trade_id: tradeId,
        p_admin_id: user.id,
        p_action: action,
        p_remark: remark
      });

      if (error) throw error;

      // 记录操作日志
      await this.logAdminOperation('TRADE_INTERVENE', null, {
        trade_id: tradeId,
        action,
        remark
      });

      return data;
    } catch (error: any) {
      console.error('订单干预失败:', error);
      throw error;
    }
  },

  /**
   * 用户资金操作
   */
  async userFundOperation(
    userId: string,
    operationType: 'DEPOSIT' | 'WITHDRAW' | 'FREEZE' | 'UNFREEZE',
    amount: number,
    remark: string
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登录');

      const { data, error } = await supabase.rpc('admin_user_fund_operation', {
        p_user_id: userId,
        p_admin_id: user.id,
        p_operation_type: operationType,
        p_amount: amount,
        p_remark: remark
      });

      if (error) throw error;

      // 记录操作日志
      await this.logAdminOperation('FUND_OPERATION', userId, {
        operation_type: operationType,
        amount,
        remark
      });

      return data;
    } catch (error: any) {
      console.error('资金操作失败:', error);
      throw error;
    }
  },

  /**
   * 更新交易规则
   */
  async updateTradeRule(ruleType: string, config: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登录');

      const { data, error } = await supabase.rpc('admin_update_trade_rules', {
        p_rule_type: ruleType,
        p_config: config,
        p_admin_id: user.id
      });

      if (error) throw error;

      // 记录操作日志
      await this.logAdminOperation('RULE_UPDATE', null, {
        rule_type: ruleType,
        config
      });

      return data;
    } catch (error: any) {
      console.error('更新规则失败:', error);
      throw error;
    }
  },

  /**
   * 搜索用户
   */
  async searchUsers(keyword: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${keyword}%,email.ilike.%${keyword}%,phone.ilike.%${keyword}%`)
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('搜索用户失败:', error);
      return [];
    }
  },

  /**
   * 搜索订单
   */
  async searchOrders(filters: {
    userId?: string;
    symbol?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      let query = supabase
        .from('trades')
        .select('*, user:profiles!user_id(username)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.symbol) query = query.ilike('stock_code', `%${filters.symbol}%`);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('搜索订单失败:', error);
      return [];
    }
  }
};
