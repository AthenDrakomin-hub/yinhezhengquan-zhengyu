/**
 * 搜索配置服务
 * 管理股票搜索规则、关键词过滤、市场限制等
 */

import { supabase } from '../lib/supabase';

// 搜索规则类型
export interface SearchRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: 'keyword' | 'market' | 'stock_type' | 'custom';
  rule_config: Record<string, any>;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 搜索统计
export interface SearchStats {
  total_searches: number;
  unique_keywords: number;
  top_keywords: Array<{ keyword: string; count: number }>;
  no_result_keywords: Array<{ keyword: string; count: number }>;
}

// 市场限制配置
export interface MarketRestriction {
  market: 'CN' | 'HK' | 'US';
  enabled: boolean;
  min_code_length: number;
  max_code_length: number;
  code_pattern: string;
  description: string;
}

// 默认市场限制
export const DEFAULT_MARKET_RESTRICTIONS: MarketRestriction[] = [
  { market: 'CN', enabled: true, min_code_length: 6, max_code_length: 6, code_pattern: '^[0-9]{6}$', description: 'A股市场' },
  { market: 'HK', enabled: true, min_code_length: 5, max_code_length: 5, code_pattern: '^[0-9]{5}$', description: '港股市场' },
  { market: 'US', enabled: false, min_code_length: 1, max_code_length: 5, code_pattern: '^[A-Z]{1,5}$', description: '美股市场' },
];

// 股票类型配置
export interface StockTypeConfig {
  type: string;
  label: string;
  enabled: boolean;
  icon: string;
  description: string;
}

// 默认股票类型
export const DEFAULT_STOCK_TYPES: StockTypeConfig[] = [
  { type: 'stock', label: '股票', enabled: true, icon: '📈', description: 'A股/港股股票' },
  { type: 'index', label: '指数', enabled: true, icon: '📊', description: '大盘指数' },
  { type: 'etf', label: 'ETF', enabled: true, icon: '🎯', description: '交易所交易基金' },
  { type: 'fund', label: '基金', enabled: true, icon: '💰', description: '公募基金' },
  { type: 'bond', label: '债券', enabled: false, icon: '📜', description: '债券产品' },
];

// 敏感词过滤规则
export interface SensitiveWord {
  id: string;
  word: string;
  category: 'political' | 'fraud' | 'sensitive' | 'custom';
  action: 'block' | 'replace' | 'warn';
  replacement?: string;
  is_active: boolean;
}

/**
 * 搜索配置服务
 */
export const searchConfigService = {
  // ==================== 搜索规则管理 ====================
  
  /**
   * 获取所有搜索规则
   */
  async getSearchRules(): Promise<SearchRule[]> {
    try {
      const { data, error } = await supabase
        .from('search_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) {
        console.error('获取搜索规则失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取搜索规则异常:', error);
      return [];
    }
  },

  /**
   * 创建搜索规则
   */
  async createSearchRule(rule: Omit<SearchRule, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: SearchRule; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('search_rules')
        .insert(rule)
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
   * 更新搜索规则
   */
  async updateSearchRule(id: string, updates: Partial<SearchRule>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('search_rules')
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
   * 删除搜索规则
   */
  async deleteSearchRule(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('search_rules')
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

  // ==================== 市场限制管理 ====================

  /**
   * 获取市场限制配置
   */
  async getMarketRestrictions(): Promise<MarketRestriction[]> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'market_restrictions')
        .single();

      if (error || !data) {
        return DEFAULT_MARKET_RESTRICTIONS;
      }

      return JSON.parse(data.value);
    } catch (error) {
      return DEFAULT_MARKET_RESTRICTIONS;
    }
  },

  /**
   * 保存市场限制配置
   */
  async saveMarketRestrictions(restrictions: MarketRestriction[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'market_restrictions',
          value: JSON.stringify(restrictions),
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

  // ==================== 股票类型管理 ====================

  /**
   * 获取股票类型配置
   */
  async getStockTypes(): Promise<StockTypeConfig[]> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'stock_types')
        .single();

      if (error || !data) {
        return DEFAULT_STOCK_TYPES;
      }

      return JSON.parse(data.value);
    } catch (error) {
      return DEFAULT_STOCK_TYPES;
    }
  },

  /**
   * 保存股票类型配置
   */
  async saveStockTypes(types: StockTypeConfig[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'stock_types',
          value: JSON.stringify(types),
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

  // ==================== 敏感词管理 ====================

  /**
   * 获取敏感词列表
   */
  async getSensitiveWords(): Promise<SensitiveWord[]> {
    try {
      const { data, error } = await supabase
        .from('sensitive_words')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取敏感词失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取敏感词异常:', error);
      return [];
    }
  },

  /**
   * 添加敏感词
   */
  async addSensitiveWord(word: Omit<SensitiveWord, 'id'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('sensitive_words')
        .insert(word);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 删除敏感词
   */
  async deleteSensitiveWord(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('sensitive_words')
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

  // ==================== 搜索统计 ====================

  /**
   * 获取搜索统计
   */
  async getSearchStats(days: number = 7): Promise<SearchStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('search_logs')
        .select('keyword, results_count')
        .gte('created_at', startDate.toISOString());

      if (error || !data) {
        return {
          total_searches: 0,
          unique_keywords: 0,
          top_keywords: [],
          no_result_keywords: []
        };
      }

      // 统计关键词
      const keywordMap = new Map<string, number>();
      const noResultMap = new Map<string, number>();

      data.forEach(log => {
        if (log.results_count > 0) {
          keywordMap.set(log.keyword, (keywordMap.get(log.keyword) || 0) + 1);
        } else {
          noResultMap.set(log.keyword, (noResultMap.get(log.keyword) || 0) + 1);
        }
      });

      const topKeywords = Array.from(keywordMap.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const noResultKeywords = Array.from(noResultMap.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        total_searches: data.length,
        unique_keywords: keywordMap.size,
        top_keywords: topKeywords,
        no_result_keywords: noResultKeywords
      };
    } catch (error) {
      return {
        total_searches: 0,
        unique_keywords: 0,
        top_keywords: [],
        no_result_keywords: []
      };
    }
  }
};

export default searchConfigService;
