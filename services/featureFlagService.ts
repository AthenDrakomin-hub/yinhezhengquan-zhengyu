/**
 * 功能开关服务 - 管理端对客户端的颗粒度控制
 */
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// 功能配置类型
export interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  is_enabled: boolean;
  category: 'GENERAL' | 'TRADING' | 'MARKET' | 'CONTENT' | 'ADMIN';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 用户功能权限类型
export interface UserFeaturePermission {
  id: string;
  user_id: string;
  feature_key: string;
  is_enabled: boolean;
  custom_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 功能分类
export const FEATURE_CATEGORIES = [
  { value: 'GENERAL', label: '通用功能', icon: '⚙️' },
  { value: 'TRADING', label: '交易功能', icon: '📈' },
  { value: 'MARKET', label: '行情功能', icon: '📊' },
  { value: 'CONTENT', label: '内容功能', icon: '📚' },
  { value: 'ADMIN', label: '管理功能', icon: '🔐' },
] as const;

/**
 * 获取所有功能配置（管理端）
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('category')
    .order('feature_name');

  if (error) {
    console.error('获取功能配置失败:', error);
    return [];
  }

  return data || [];
}

/**
 * 获取已启用的功能列表（客户端）
 */
export async function getEnabledFeatures(): Promise<string[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('feature_key')
    .eq('is_enabled', true);

  if (error) {
    console.error('获取启用功能失败:', error);
    return [];
  }

  return data?.map(f => f.feature_key) || [];
}

/**
 * 检查单个功能是否启用
 */
export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
  // 先检查用户级别权限
  const { data: userData } = await supabase.auth.getUser();
  
  if (userData.user) {
    const { data: userPerm } = await supabase
      .from('user_feature_permissions')
      .select('is_enabled')
      .eq('user_id', userData.user.id)
      .eq('feature_key', featureKey)
      .single();
    
    if (userPerm !== null) {
      return userPerm.is_enabled;
    }
  }

  // 再检查全局配置
  const { data, error } = await supabase
    .from('feature_flags')
    .select('is_enabled')
    .eq('feature_key', featureKey)
    .single();

  if (error || !data) {
    return true; // 默认启用
  }

  return data.is_enabled;
}

/**
 * 批量检查功能是否启用
 */
export async function checkFeatures(featureKeys: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  const { data, error } = await supabase
    .from('feature_flags')
    .select('feature_key, is_enabled')
    .in('feature_key', featureKeys);

  if (error) {
    console.error('批量检查功能失败:', error);
    featureKeys.forEach(key => results[key] = true);
    return results;
  }

  const flagMap = new Map(data?.map(f => [f.feature_key, f.is_enabled]) || []);

  for (const key of featureKeys) {
    results[key] = flagMap.get(key) ?? true;
  }

  return results;
}

/**
 * 更新功能开关（管理端）
 */
export async function updateFeatureFlag(
  featureKey: string,
  updates: Partial<{
    is_enabled: boolean;
    config: Record<string, any>;
    description: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('feature_flags')
    .update(updates)
    .eq('feature_key', featureKey);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 设置用户功能权限（管理端）
 */
export async function setUserFeaturePermission(
  userId: string,
  featureKey: string,
  isEnabled: boolean,
  customConfig?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_feature_permissions')
    .upsert({
      user_id: userId,
      feature_key: featureKey,
      is_enabled: isEnabled,
      custom_config: customConfig || {},
    }, { onConflict: 'user_id,feature_key' });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 获取用户所有功能权限（管理端）
 */
export async function getUserFeaturePermissions(userId: string): Promise<UserFeaturePermission[]> {
  const { data, error } = await supabase
    .from('user_feature_permissions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('获取用户权限失败:', error);
    return [];
  }

  return data || [];
}

/**
 * 删除用户功能权限（恢复使用全局配置）
 */
export async function removeUserFeaturePermission(
  userId: string,
  featureKey: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_feature_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('feature_key', featureKey);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 批量更新功能开关（管理端）
 */
export async function batchUpdateFeatureFlags(
  updates: Array<{ feature_key: string; is_enabled: boolean }>
): Promise<{ success: boolean; error?: string }> {
  for (const update of updates) {
    const result = await updateFeatureFlag(update.feature_key, { is_enabled: update.is_enabled });
    if (!result.success) {
      return result;
    }
  }
  return { success: true };
}

/**
 * 创建新功能配置（管理端）
 */
export async function createFeatureFlag(flag: {
  feature_key: string;
  feature_name: string;
  description?: string;
  category?: 'GENERAL' | 'TRADING' | 'MARKET' | 'CONTENT' | 'ADMIN';
  is_enabled?: boolean;
  config?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('feature_flags')
    .insert(flag);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
