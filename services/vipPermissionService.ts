/**
 * VIP 权限检查服务
 * 
 * 权限规则：
 * - VIP用户可以使用VIP功能
 * - 管理员可以使用VIP功能
 * - 普通用户无法使用VIP功能
 */

import { supabase } from '../lib/supabase';

// VIP等级定义
export type VipLevel = 0 | 1 | 2 | 3 | 4 | 5;

// 用户权限信息
export interface UserPermission {
  isVip: boolean;
  vipLevel: VipLevel;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canUseVipFeatures: boolean;
  vipExpireAt?: string;
}

// 权限检查结果
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: 'not_vip' | 'vip_expired' | 'success';
  message?: string;
}

/**
 * 获取用户权限信息
 */
export async function getUserPermission(userId?: string): Promise<UserPermission> {
  const defaultPermission: UserPermission = {
    isVip: false,
    vipLevel: 0,
    isAdmin: false,
    isSuperAdmin: false,
    canUseVipFeatures: false,
  };

  try {
    // 获取当前用户ID
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return defaultPermission;
      targetUserId = user.id;
    }

    // 并行获取用户VIP信息和Profile信息
    const [vipResult, profileResult] = await Promise.all([
      supabase
        .from('user_vip')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('admin_level')
        .eq('id', targetUserId)
        .maybeSingle(),
    ]);

    // 解析VIP信息
    const vipData = vipResult.data;
    const profileData = profileResult.data;

    // 检查是否为管理员
    const adminLevel = profileData?.admin_level;
    const isAdmin = adminLevel === 'admin' || adminLevel === 'super_admin';
    const isSuperAdmin = adminLevel === 'super_admin';

    // 检查VIP状态
    const vipLevel = (vipData?.level || 0) as VipLevel;
    const isVip = vipLevel > 0;
    
    // 检查VIP是否过期
    let vipExpired = false;
    if (vipData?.expire_at) {
      const expireAt = new Date(vipData.expire_at);
      vipExpired = expireAt < new Date();
    }

    // 综合判断：管理员或VIP用户可以使用VIP功能
    const canUseVipFeatures = isAdmin || (isVip && !vipExpired);

    return {
      isVip: isVip && !vipExpired,
      vipLevel: vipExpired ? 0 : vipLevel,
      isAdmin,
      isSuperAdmin,
      canUseVipFeatures,
      vipExpireAt: vipData?.expire_at,
    };
  } catch (error) {
    console.error('获取用户权限失败:', error);
    return defaultPermission;
  }
}

/**
 * 检查用户是否有VIP功能权限
 */
export async function checkVipPermission(requiredLevel: VipLevel = 1): Promise<PermissionCheckResult> {
  const permission = await getUserPermission();

  // 管理员直接放行
  if (permission.isAdmin) {
    return {
      allowed: true,
      reason: 'success',
      message: '管理员权限',
    };
  }

  // 检查VIP等级
  if (permission.vipLevel < requiredLevel) {
    return {
      allowed: false,
      reason: 'not_vip',
      message: `该功能需要VIP${requiredLevel}及以上等级`,
    };
  }

  // 检查VIP是否过期
  if (permission.vipExpireAt) {
    const expireAt = new Date(permission.vipExpireAt);
    if (expireAt < new Date()) {
      return {
        allowed: false,
        reason: 'vip_expired',
        message: '您的VIP已过期，请续费后使用',
      };
    }
  }

  return {
    allowed: true,
    reason: 'success',
    message: '权限验证通过',
  };
}

/**
 * 快速检查当前用户是否可以使用VIP功能
 */
export async function canUseVipFeatures(): Promise<boolean> {
  const permission = await getUserPermission();
  return permission.canUseVipFeatures;
}

/**
 * 获取VIP等级名称
 */
export function getVipLevelName(level: VipLevel): string {
  const names: Record<VipLevel, string> = {
    0: '普通用户',
    1: '白银VIP',
    2: '黄金VIP',
    3: '铂金VIP',
    4: '钻石VIP',
    5: '至尊VIP',
  };
  return names[level] || '普通用户';
}

/**
 * 获取VIP等级颜色
 */
export function getVipLevelColor(level: VipLevel): string {
  const colors: Record<VipLevel, string> = {
    0: '#999999',
    1: '#C0C0C0', // 银色
    2: '#FFD700', // 金色
    3: '#E5E4E2', // 铂金
    4: '#B9F2FF', // 钻石蓝
    5: '#9B59B6', // 紫色
  };
  return colors[level] || '#999999';
}

/**
 * React Hook: 使用VIP权限检查
 */
export function useVipPermission() {
  const [permission, setPermission] = React.useState<UserPermission>({
    isVip: false,
    vipLevel: 0,
    isAdmin: false,
    isSuperAdmin: false,
    canUseVipFeatures: false,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getUserPermission()
      .then(setPermission)
      .finally(() => setLoading(false));
  }, []);

  const checkAccess = React.useCallback(async () => {
    const result = await checkVipPermission();
    return result;
  }, []);

  return {
    ...permission,
    loading,
    checkAccess,
    levelName: getVipLevelName(permission.vipLevel),
    levelColor: getVipLevelColor(permission.vipLevel),
  };
}

// 需要导入React
import React from 'react';
