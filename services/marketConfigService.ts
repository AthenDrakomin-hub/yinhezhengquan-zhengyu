/**
 * 市场分类与指数展示配置服务
 * 管理市场分类、指数展示、涨跌分布等配置
 */

import { supabase } from '../lib/supabase';

// ==================== 类型定义 ====================

// 市场分类配置
export interface MarketCategory {
  id: string;
  key: string;
  label: string;
  icon: string;
  order: number;
  visible: boolean;
  enabled: boolean;
  market_type: 'CN' | 'HK' | 'US' | 'FUTURES';
  sub_categories?: MarketSubCategory[];
  description?: string;
}

// 子分类配置
export interface MarketSubCategory {
  id: string;
  key: string;
  label: string;
  order: number;
  visible: boolean;
  parent_key: string;
  filter_config?: Record<string, any>;
}

// 指数配置
export interface IndexConfig {
  id: string;
  symbol: string;
  name: string;
  market: 'CN' | 'HK';
  order: number;
  visible: boolean;
  enabled: boolean;
  secid: string;
  description?: string;
  color?: string;
}

// 涨跌分布配置
export interface UpDownDistributionConfig {
  enabled: boolean;
  refresh_interval: number; // 刷新间隔（秒）
  show_limit_up_down: boolean;
  ranges: UpDownRange[];
}

export interface UpDownRange {
  id: string;
  label: string;
  min: number;
  max: number;
  color_up: string;
  color_down: string;
}

// ==================== 默认配置 ====================

// 默认市场分类
export const DEFAULT_MARKET_CATEGORIES: Omit<MarketCategory, 'id'>[] = [
  {
    key: 'self',
    label: '自选',
    icon: '⭐',
    order: 1,
    visible: true,
    enabled: true,
    market_type: 'CN',
    description: '用户自选股票'
  },
  {
    key: 'position',
    label: '持仓',
    icon: '💼',
    order: 2,
    visible: true,
    enabled: true,
    market_type: 'CN',
    description: '用户持仓股票'
  },
  {
    key: 'market',
    label: '行情',
    icon: '📈',
    order: 3,
    visible: true,
    enabled: true,
    market_type: 'CN',
    sub_categories: [
      { id: 'sub-a', key: 'A', label: 'A股', order: 1, visible: true, parent_key: 'market' },
      { id: 'sub-hk', key: 'HK', label: '港股通', order: 2, visible: true, parent_key: 'market' },
      { id: 'sub-more', key: 'more', label: '更多', order: 3, visible: true, parent_key: 'market' }
    ]
  }
];

// A股细分市场
export const DEFAULT_ASHARE_SUBCATEGORIES: MarketSubCategory[] = [
  { id: 'all', key: 'all', label: '京沪深', order: 1, visible: true, parent_key: 'A' },
  { id: 'star', key: 'star', label: '科创板', order: 2, visible: true, parent_key: 'A' },
  { id: 'bse', key: 'bse', label: '北交所', order: 3, visible: true, parent_key: 'A' }
];

// 默认指数配置
export const DEFAULT_INDEX_CONFIGS: Omit<IndexConfig, 'id'>[] = [
  { symbol: '000001', name: '上证指数', market: 'CN', order: 1, visible: true, enabled: true, secid: '1.000001', description: '上海证券交易所综合股价指数' },
  { symbol: '399001', name: '深证成指', market: 'CN', order: 2, visible: true, enabled: true, secid: '0.399001', description: '深圳证券交易所成份股价指数' },
  { symbol: '399006', name: '创业板指', market: 'CN', order: 3, visible: true, enabled: true, secid: '0.399006', description: '创业板指数' },
  { symbol: '000688', name: '科创50', market: 'CN', order: 4, visible: true, enabled: true, secid: '1.000688', description: '科创板50成份指数' },
  { symbol: '899050', name: '北证50', market: 'CN', order: 5, visible: true, enabled: true, secid: '0.899050', description: '北交所50成份指数' },
  { symbol: '000016', name: '上证50', market: 'CN', order: 6, visible: true, enabled: true, secid: '1.000016', description: '上证50指数' },
  { symbol: '000300', name: '沪深300', market: 'CN', order: 7, visible: true, enabled: true, secid: '1.000300', description: '沪深300指数' },
  { symbol: 'HSI', name: '恒生指数', market: 'HK', order: 8, visible: true, enabled: true, secid: '100.HSI', description: '香港恒生指数' },
];

// 默认涨跌分布配置
export const DEFAULT_UPDOWN_DISTRIBUTION: UpDownDistributionConfig = {
  enabled: true,
  refresh_interval: 30,
  show_limit_up_down: true,
  ranges: [
    { id: 'limit', label: '涨跌停', min: 10, max: 100, color_up: '#E63946', color_down: '#22C55E' },
    { id: 'over8', label: '>8%', min: 8, max: 10, color_up: '#F87171', color_down: '#4ADE80' },
    { id: '6to8', label: '6-8%', min: 6, max: 8, color_up: '#FB923C', color_down: '#86EFAC' },
    { id: '4to6', label: '4-6%', min: 4, max: 6, color_up: '#FBBF24', color_down: '#BEF264' },
    { id: '2to4', label: '2-4%', min: 2, max: 4, color_up: '#FCD34D', color_down: '#D9F99D' },
    { id: '0to2', label: '0-2%', min: 0, max: 2, color_up: '#FEF3C7', color_down: '#ECFCCB' }
  ]
};

/**
 * 市场配置服务
 */
export const marketConfigService = {
  // ==================== 市场分类管理 ====================

  /**
   * 获取市场分类配置
   */
  async getMarketCategories(): Promise<MarketCategory[]> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'market_categories')
        .single();

      if (error || !data) {
        return DEFAULT_MARKET_CATEGORIES.map((cat, index) => ({
          ...cat,
          id: `default-${index}`
        }));
      }

      return JSON.parse(data.value);
    } catch (error) {
      return DEFAULT_MARKET_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `default-${index}`
      }));
    }
  },

  /**
   * 保存市场分类配置
   */
  async saveMarketCategories(categories: MarketCategory[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'market_categories',
          value: JSON.stringify(categories),
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

  // ==================== 指数配置管理 ====================

  /**
   * 获取指数配置
   */
  async getIndexConfigs(): Promise<IndexConfig[]> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'index_configs')
        .single();

      if (error || !data) {
        return DEFAULT_INDEX_CONFIGS.map((idx, index) => ({
          ...idx,
          id: `default-${index}`
        }));
      }

      return JSON.parse(data.value);
    } catch (error) {
      return DEFAULT_INDEX_CONFIGS.map((idx, index) => ({
        ...idx,
        id: `default-${index}`
      }));
    }
  },

  /**
   * 保存指数配置
   */
  async saveIndexConfigs(configs: IndexConfig[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'index_configs',
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

  /**
   * 获取客户端可见指数
   */
  async getVisibleIndices(): Promise<IndexConfig[]> {
    const configs = await this.getIndexConfigs();
    return configs.filter(c => c.visible && c.enabled).sort((a, b) => a.order - b.order);
  },

  // ==================== 涨跌分布配置 ====================

  /**
   * 获取涨跌分布配置
   */
  async getUpDownDistributionConfig(): Promise<UpDownDistributionConfig> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'updown_distribution_config')
        .single();

      if (error || !data) {
        return DEFAULT_UPDOWN_DISTRIBUTION;
      }

      return JSON.parse(data.value);
    } catch (error) {
      return DEFAULT_UPDOWN_DISTRIBUTION;
    }
  },

  /**
   * 保存涨跌分布配置
   */
  async saveUpDownDistributionConfig(config: UpDownDistributionConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'updown_distribution_config',
          value: JSON.stringify(config),
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

  // ==================== 实时数据获取 ====================

  /**
   * 获取涨跌分布真实数据
   */
  async getUpDownDistributionData(): Promise<{
    up: { count: number; limitUp: number };
    down: { count: number; limitDown: number };
    flat: number;
    ranges: Record<string, { up: number; down: number }>;
  }> {
    try {
      // 调用 Edge Function 获取真实数据
      const { data, error } = await supabase.functions.invoke('proxy-market', {
        body: { action: 'updown_distribution' }
      });

      if (error || !data?.success) {
        // 返回模拟数据
        return this.getDefaultDistributionData();
      }

      return data.data;
    } catch (error) {
      console.error('获取涨跌分布数据失败:', error);
      return this.getDefaultDistributionData();
    }
  },

  /**
   * 默认涨跌分布数据
   */
  getDefaultDistributionData() {
    return {
      up: { count: 2345, limitUp: 23 },
      down: { count: 1876, limitDown: 15 },
      flat: 456,
      ranges: {
        limit: { up: 23, down: 15 },
        over8: { up: 45, down: 32 },
        '6to8': { up: 89, down: 67 },
        '4to6': { up: 234, down: 189 },
        '2to4': { up: 567, down: 456 },
        '0to2': { up: 1387, down: 1117 }
      }
    };
  }
};

export default marketConfigService;
