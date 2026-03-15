/**
 * 理财产品服务
 * 提供理财产品、基金查询等功能
 */

import { supabase } from '../lib/supabase';

// 理财产品类型常量
export const WEALTH_TYPES: Record<string, string> = {
  deposit: '存款类',
  bond: '债券类',
  fund: '基金类',
  structured: '结构性存款',
};

// 风险等级常量
export const RISK_LEVELS: Record<number, string> = {
  1: '低风险',
  2: '中低风险',
  3: '中风险',
  4: '中高风险',
  5: '高风险',
};

// 理财产品类型
export interface WealthProduct {
  id: string;
  code: string;
  name: string;
  type: string; // deposit/bond/fund/structured
  expected_return?: number;
  return_type?: string;
  min_amount?: number;
  increment?: number;
  period_days?: number;
  period_type?: string;
  risk_level?: number;
  quota?: number;
  max_quota?: number;
  per_user_limit?: number;
  status?: string;
  tag?: string;
  description?: string;
  issuer?: string;
  start_date?: string;
  end_date?: string;
}

// 基金类型
export interface Fund {
  code: string;
  name: string;
  type: string; // STOCK/BOND/MIXED/MONEY/INDEX/ETF
  manager?: string;
  company?: string;
  nav?: number;
  nav_date?: string;
  accumulated_nav?: number;
  day_growth?: number;
  risk_level?: string;
  status?: string;
}

// 缓存
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10分钟

/**
 * 获取理财产品列表
 * @param type 产品类型（可选）
 * @param limit 数量限制
 */
export async function getWealthProducts(type?: string, limit: number = 20): Promise<WealthProduct[]> {
  const cacheKey = `wealth_products:${type || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.slice(0, limit);
  }

  try {
    let query = supabase
      .from('wealth_products')
      .select('*')
      .eq('status', 'ONSALE')
      .order('expected_return', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('获取理财产品失败:', error);
      return [];
    }

    const result = (data || []) as WealthProduct[];
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('获取理财产品失败:', error);
    return [];
  }
}

/**
 * 根据代码获取理财产品
 * @param code 产品代码
 */
export async function getWealthProductByCode(code: string): Promise<WealthProduct | null> {
  try {
    const { data, error } = await supabase
      .from('wealth_products')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      console.error('获取理财产品失败:', error);
      return null;
    }

    return data as WealthProduct;
  } catch (error) {
    console.error('获取理财产品失败:', error);
    return null;
  }
}

/**
 * 获取基金列表
 * @param type 基金类型（可选）
 * @param limit 数量限制
 */
export async function getFunds(type?: string, limit: number = 20): Promise<Fund[]> {
  const cacheKey = `funds:${type || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.slice(0, limit);
  }

  try {
    let query = supabase
      .from('funds')
      .select('*');

    if (type) {
      // 兼容两种表结构：type 或 fund_type
      query = query.or(`type.eq.${type},fund_type.eq.${type}`);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('获取基金列表失败:', error);
      return [];
    }

    // 前端排序，避免依赖数据库列
    const result = (data || []).sort((a: any, b: any) => {
      const growthA = Number(a.day_growth) || Number(a.day_change_rate) || 0;
      const growthB = Number(b.day_growth) || Number(b.day_change_rate) || 0;
      return growthB - growthA;
    }) as Fund[];
    
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('获取基金列表失败:', error);
    return [];
  }
}

/**
 * 根据代码获取基金信息
 * @param code 基金代码
 */
export async function getFundByCode(code: string): Promise<Fund | null> {
  try {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      console.error('获取基金信息失败:', error);
      return null;
    }

    return data as Fund;
  } catch (error) {
    console.error('获取基金信息失败:', error);
    return null;
  }
}

/**
 * 搜索基金
 * @param keyword 关键词
 * @param limit 数量限制
 */
export async function searchFunds(keyword: string, limit: number = 10): Promise<Fund[]> {
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  try {
    const kw = keyword.trim();
    
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .or(`code.ilike.%${kw}%,name.ilike.%${kw}%`)
      .limit(limit);

    if (error) {
      console.error('搜索基金失败:', error);
      return [];
    }

    return (data || []) as Fund[];
  } catch (error) {
    console.error('搜索基金失败:', error);
    return [];
  }
}

/**
 * 获取理财产品类型标签
 */
export function getProductTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    deposit: '存款类',
    bond: '债券类',
    fund: '基金类',
    structured: '结构性存款',
  };
  return labels[type] || type;
}

/**
 * 获取基金类型标签
 */
export function getFundTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    STOCK: '股票型',
    BOND: '债券型',
    MIXED: '混合型',
    MONEY: '货币型',
    INDEX: '指数型',
    ETF: 'ETF',
  };
  return labels[type] || type;
}

/**
 * 获取风险等级标签
 */
export function getRiskLevelLabel(level: number | string): string {
  if (typeof level === 'string') {
    return level;
  }
  const labels: Record<number, string> = {
    1: 'R1 低风险',
    2: 'R2 中低风险',
    3: 'R3 中风险',
    4: 'R4 中高风险',
    5: 'R5 高风险',
  };
  return labels[level] || `R${level}`;
}

export default {
  getWealthProducts,
  getWealthProductByCode,
  getFunds,
  getFundByCode,
  searchFunds,
  getProductTypeLabel,
  getFundTypeLabel,
  getRiskLevelLabel,
};
