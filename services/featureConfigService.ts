/**
 * 功能入口配置服务
 * 管理首页功能入口的顺序、显示/隐藏、图标等
 */

import { supabase } from '../lib/supabase';

// 功能入口配置类型
export interface FeatureEntry {
  id: string;
  key: string;           // 唯一标识
  label: string;         // 显示名称
  icon: string;          // 图标（emoji或图标名）
  bgColor: string;       // 背景颜色
  badge?: string;        // 角标文字
  path: string;          // 跳转路径
  order: number;         // 排序
  visible: boolean;      // 是否显示
  enabled: boolean;      // 是否启用
  group: 'main' | 'more'; // 所属分组
  permission?: string;   // 权限要求
  vip_only?: boolean;    // 仅VIP可见
  description?: string;  // 描述说明
  created_at: string;
  updated_at: string;
}

// 功能分组配置
export interface FeatureGroup {
  id: string;
  key: string;
  label: string;
  max_items: number;     // 最多显示数量
  show_more_button: boolean;
  order: number;
}

// 默认功能入口配置
export const DEFAULT_FEATURE_ENTRIES: Omit<FeatureEntry, 'id' | 'created_at' | 'updated_at'>[] = [
  { key: 'ai-stock', label: 'AI选股', icon: '🤖', bgColor: 'bg-[#6366F1]', badge: 'AI', path: '/client/conditional-orders', order: 1, visible: true, enabled: true, group: 'main' },
  { key: 'video', label: '视频专区', icon: '📹', bgColor: 'bg-[#F97316]', path: '/client/video', order: 2, visible: true, enabled: true, group: 'main' },
  { key: 'etf', label: 'ETF专区', icon: '📊', bgColor: 'bg-[#EAB308]', badge: 'HOT', path: '/client/etf', order: 3, visible: true, enabled: true, group: 'main' },
  { key: 'ipo', label: '新股申购', icon: '🎯', bgColor: 'bg-[#E63946]', badge: 'NEW', path: '/client/ipo', order: 4, visible: true, enabled: true, group: 'main' },
  { key: 'margin', label: '融资融券', icon: '💰', bgColor: 'bg-[#F97316]', path: '/client/margin', order: 5, visible: true, enabled: true, group: 'main' },
  { key: 'calendar', label: '财富日历', icon: '📅', bgColor: 'bg-[#EAB308]', badge: '10', path: '/client/calendar', order: 6, visible: true, enabled: true, group: 'main' },
  { key: 'market', label: '沪深市场', icon: '📈', bgColor: 'bg-[#E63946]', path: '/client/market', order: 7, visible: true, enabled: true, group: 'main' },
  { key: 'wealth', label: '稳健理财', icon: '🏦', bgColor: 'bg-[#3B82F6]', path: '/client/wealth-finance', order: 8, visible: true, enabled: true, group: 'main' },
  { key: 'all', label: '全部', icon: '⊞', bgColor: 'bg-[#6B7280]', path: 'all', order: 9, visible: true, enabled: true, group: 'main' },
  // 更多功能
  { key: 'trade', label: '股票交易', icon: '💹', bgColor: 'bg-[#10B981]', path: '/client/trade', order: 101, visible: true, enabled: true, group: 'more' },
  { key: 'block', label: '大宗交易', icon: '🏢', bgColor: 'bg-[#8B5CF6]', path: '/client/block-trade', order: 102, visible: true, enabled: true, group: 'more' },
  { key: 'reports', label: '研报中心', icon: '📑', bgColor: 'bg-[#EC4899]', path: '/client/reports', order: 103, visible: true, enabled: true, group: 'more' },
  { key: 'education', label: '投教中心', icon: '📚', bgColor: 'bg-[#14B8A6]', path: '/client/education', order: 104, visible: true, enabled: true, group: 'more' },
];

// 默认功能分组
export const DEFAULT_FEATURE_GROUPS: FeatureGroup[] = [
  { id: 'main', key: 'main', label: '主功能区', max_items: 9, show_more_button: true, order: 1 },
  { id: 'more', key: 'more', label: '更多功能', max_items: 12, show_more_button: false, order: 2 },
];

/**
 * 功能入口配置服务
 */
export const featureConfigService = {
  // ==================== 功能入口管理 ====================

  /**
   * 获取所有功能入口配置
   */
  async getFeatureEntries(): Promise<FeatureEntry[]> {
    try {
      const { data, error } = await supabase
        .from('feature_entries')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        console.error('获取功能入口配置失败:', error);
        // 返回默认配置
        return DEFAULT_FEATURE_ENTRIES.map((entry, index) => ({
          ...entry,
          id: `default-${index}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      }

      return data?.length > 0 ? data : DEFAULT_FEATURE_ENTRIES.map((entry, index) => ({
        ...entry,
        id: `default-${index}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('获取功能入口配置异常:', error);
      return DEFAULT_FEATURE_ENTRIES.map((entry, index) => ({
        ...entry,
        id: `default-${index}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    }
  },

  /**
   * 更新功能入口配置
   */
  async updateFeatureEntry(id: string, updates: Partial<FeatureEntry>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('feature_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        // 如果表不存在，尝试保存到system_config
        if (error.code === '42P01') {
          return this.saveToSystemConfig(updates);
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 批量更新功能入口顺序
   */
  async updateFeatureOrder(entries: Array<{ id: string; order: number }>): Promise<{ success: boolean; error?: string }> {
    try {
      for (const entry of entries) {
        await supabase
          .from('feature_entries')
          .update({ order: entry.order, updated_at: new Date().toISOString() })
          .eq('id', entry.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 批量更新功能入口可见性
   */
  async updateFeatureVisibility(entries: Array<{ id: string; visible: boolean }>): Promise<{ success: boolean; error?: string }> {
    try {
      for (const entry of entries) {
        await supabase
          .from('feature_entries')
          .update({ visible: entry.visible, updated_at: new Date().toISOString() })
          .eq('id', entry.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 保存到system_config（备用方案）
   */
  async saveToSystemConfig(entries: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'feature_entries_config',
          value: JSON.stringify(entries),
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
   * 重置为默认配置
   */
  async resetToDefault(): Promise<{ success: boolean; error?: string }> {
    try {
      // 删除现有配置
      await supabase.from('feature_entries').delete().neq('id', '');

      // 插入默认配置
      const defaultEntries = DEFAULT_FEATURE_ENTRIES.map(entry => ({
        ...entry,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('feature_entries')
        .insert(defaultEntries);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // ==================== 功能分组管理 ====================

  /**
   * 获取功能分组配置
   */
  async getFeatureGroups(): Promise<FeatureGroup[]> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'feature_groups')
        .single();

      if (error || !data) {
        return DEFAULT_FEATURE_GROUPS;
      }

      return JSON.parse(data.value);
    } catch (error) {
      return DEFAULT_FEATURE_GROUPS;
    }
  },

  /**
   * 保存功能分组配置
   */
  async saveFeatureGroups(groups: FeatureGroup[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'feature_groups',
          value: JSON.stringify(groups),
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

  // ==================== 前端获取配置 ====================

  /**
   * 获取客户端功能入口配置
   */
  async getClientFeatureEntries(): Promise<FeatureEntry[]> {
    const entries = await this.getFeatureEntries();
    return entries.filter(e => e.visible && e.enabled).sort((a, b) => a.order - b.order);
  }
};

export default featureConfigService;
