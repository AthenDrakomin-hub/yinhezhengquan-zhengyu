/**
 * 理财产品管理服务
 * 管理理财产品、基金、定投产品等
 */

import { supabase } from '../lib/supabase';

// ==================== 类型定义 ====================

// 理财产品完整类型
export interface WealthProduct {
  id: string;
  code: string;
  name: string;
  type: 'deposit' | 'fund' | 'bond' | 'insurance' | 'struct';
  issuer: string;
  expected_return: number | null;
  return_type: 'fixed' | 'floating' | 'benchmark';
  min_amount: number;
  increment: number;
  period_days: number | null;
  period_type: 'day' | 'month' | 'year' | 'flexible';
  risk_level: 1 | 2 | 3 | 4 | 5;
  quota: number;
  max_quota: number | null;
  per_user_limit: number | null;
  status: 'active' | 'inactive' | 'sold_out' | 'expired';
  tag: string | null;
  description: string | null;
  features: string[];
  start_date: string | null;
  end_date: string | null;
  order: number;
  is_featured: boolean;
  vip_only: boolean;
  min_vip_level: number;
  created_at: string;
  updated_at: string;
}

// 基金产品类型
export interface FundProduct {
  id: string;
  code: string;
  name: string;
  type: 'stock' | 'bond' | 'mix' | 'index' | 'money' | 'qdii';
  manager: string;
  company: string;
  nav: number;              // 单位净值
  acc_nav: number;          // 累计净值
  day_growth: number;       // 日涨跌幅
  week_growth: number;      // 近一周
  month_growth: number;     // 近一月
  year_growth: number;      // 近一年
  total_growth: number;     // 成立以来
  risk_level: 1 | 2 | 3 | 4 | 5;
  min_purchase: number;
  purchase_fee: number;
  redemption_fee: number;
  status: 'active' | 'suspend' | 'liquidate';
  tags: string[];
  description: string | null;
  order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

// 定投计划配置
export interface SIPConfig {
  id: string;
  name: string;
  type: 'regular' | 'smart';
  min_amount: number;
  max_amount: number;
  supported_frequencies: ('daily' | 'weekly' | 'biweekly' | 'monthly')[];
  default_frequency: string;
  fee_discount: number;
  enabled: boolean;
  description: string;
}

// 产品类型标签
export const PRODUCT_TYPE_LABELS = {
  deposit: { label: '存款类', icon: '🏦', color: '#3B82F6' },
  fund: { label: '基金类', icon: '📊', color: '#22C55E' },
  bond: { label: '债券类', icon: '📜', color: '#F97316' },
  insurance: { label: '保险类', icon: '🛡️', color: '#8B5CF6' },
  struct: { label: '结构化', icon: '📈', color: '#EC4899' }
};

// 风险等级标签
export const RISK_LEVEL_LABELS = {
  1: { label: '低风险', color: '#22C55E', description: '本金安全性高，收益稳定' },
  2: { label: '中低风险', color: '#3B82F6', description: '本金风险较低，收益波动小' },
  3: { label: '中风险', color: '#F97316', description: '本金有一定风险，收益波动中等' },
  4: { label: '中高风险', color: '#EF4444', description: '本金风险较大，收益波动较大' },
  5: { label: '高风险', color: '#DC2626', description: '本金风险大，收益波动剧烈' }
};

/**
 * 理财产品管理服务
 */
export const wealthProductService = {
  // ==================== 理财产品管理 ====================

  /**
   * 获取理财产品列表
   */
  async getWealthProducts(filters?: {
    type?: string;
    status?: string;
    risk_level?: number;
    featured?: boolean;
  }): Promise<WealthProduct[]> {
    try {
      let query = supabase
        .from('wealth_products')
        .select('*')
        .order('"order"', { ascending: true });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.risk_level) {
        query = query.eq('risk_level', filters.risk_level);
      }
      if (filters?.featured) {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取理财产品失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取理财产品异常:', error);
      return [];
    }
  },

  /**
   * 获取理财产品详情
   */
  async getWealthProduct(id: string): Promise<WealthProduct | null> {
    try {
      const { data, error } = await supabase
        .from('wealth_products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('获取理财产品详情失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('获取理财产品详情异常:', error);
      return null;
    }
  },

  /**
   * 创建理财产品
   */
  async createWealthProduct(product: Omit<WealthProduct, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: WealthProduct; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('wealth_products')
        .insert(product)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 更新理财产品
   */
  async updateWealthProduct(id: string, updates: Partial<WealthProduct>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('wealth_products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 删除理财产品
   */
  async deleteWealthProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('wealth_products')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 批量更新产品排序
   */
  async updateProductOrder(products: Array<{ id: string; order: number }>): Promise<{ success: boolean; error?: string }> {
    try {
      for (const product of products) {
        await supabase
          .from('wealth_products')
          .update({ order: product.order, updated_at: new Date().toISOString() })
          .eq('id', product.id);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // ==================== 基金产品管理 ====================

  /**
   * 获取基金产品列表
   */
  async getFundProducts(filters?: {
    type?: string;
    featured?: boolean;
  }): Promise<FundProduct[]> {
    try {
      let query = supabase
        .from('funds')
        .select('*')
        .order('"order"', { ascending: true });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters?.featured) {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取基金产品失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取基金产品异常:', error);
      return [];
    }
  },

  /**
   * 更新基金产品
   */
  async updateFundProduct(id: string, updates: Partial<FundProduct>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('funds')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // ==================== 定投配置管理 ====================

  /**
   * 获取定投配置
   */
  async getSIPConfigs(): Promise<SIPConfig[]> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'sip_configs')
        .single();

      if (error || !data) {
        // 返回默认配置
        return [
          {
            id: 'regular',
            name: '定时定投',
            type: 'regular',
            min_amount: 100,
            max_amount: 100000,
            supported_frequencies: ['daily', 'weekly', 'biweekly', 'monthly'],
            default_frequency: 'monthly',
            fee_discount: 0.1,
            enabled: true,
            description: '设置周期，自动扣款'
          },
          {
            id: 'smart',
            name: '智能定投',
            type: 'smart',
            min_amount: 100,
            max_amount: 100000,
            supported_frequencies: ['weekly', 'biweekly', 'monthly'],
            default_frequency: 'monthly',
            fee_discount: 0.15,
            enabled: true,
            description: '估值低位多投，高位少投'
          }
        ];
      }

      return JSON.parse(data.value);
    } catch (error) {
      return [];
    }
  },

  /**
   * 保存定投配置
   */
  async saveSIPConfigs(configs: SIPConfig[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'sip_configs',
          value: JSON.stringify(configs),
          updated_at: new Date().toISOString()
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // ==================== 统计数据 ====================

  /**
   * 获取理财产品统计数据
   */
  async getProductStats(): Promise<{
    total: number;
    active: number;
    byType: Record<string, number>;
    byRisk: Record<number, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('wealth_products')
        .select('type, risk_level, status');

      if (error || !data) {
        return { total: 0, active: 0, byType: {}, byRisk: {} };
      }

      const stats = {
        total: data.length,
        active: data.filter(p => p.status === 'active').length,
        byType: {} as Record<string, number>,
        byRisk: {} as Record<number, number>
      };

      data.forEach(p => {
        stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
        stats.byRisk[p.risk_level] = (stats.byRisk[p.risk_level] || 0) + 1;
      });

      return stats;
    } catch (error) {
      return { total: 0, active: 0, byType: {}, byRisk: {} };
    }
  }
};

export default wealthProductService;
