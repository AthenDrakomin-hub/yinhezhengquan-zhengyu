/**
 * 新浪财经IPO数据适配器
 * 从Supabase数据库获取IPO数据
 */

// IPO状态类型
export type IPOStatus = 'UPCOMING' | 'ONGOING' | 'LISTED';

// IPO数据接口
export interface IPOData {
  symbol: string;                    // 股票代码
  name: string;                      // 名称
  listingDate: string;               // 上市日期，格式：YYYY-MM-DD
  issuePrice: number;                // 发行价
  status: IPOStatus;                 // 申购状态
  market?: string;                   // 市场类型：SH（沪市）、SZ（深市）、BJ（北交所）
  subscriptionCode?: string;         // 申购代码
  issueVolume?: number;              // 发行总量(万股)
  onlineIssueVolume?: number;        // 上网发行量(万股)
  peRatio?: number;                  // 市盈率
  issueDate?: string;                // 发行日期
  onlineIssueDate?: string;          // 上网发行日期
  lotteryDate?: string;              // 配号日期
  refundDate?: string;               // 退款日期
  listingDatePlan?: string;          // 计划上市日期
  issueMethod?: string;              // 发行方式
  underwriter?: string;              // 主承销商
  minSubscriptionUnit?: number;      // 最小申购单位
  maxSubscriptionQuantity?: number;  // 个人申购上限(股)
  lockupPeriod?: number;             // 锁定期(月)
}

// 从Supabase数据库获取的IPO数据格式（匹配正确的表结构）
interface SupabaseIPOItem {
  id: string;
  symbol: string;                    // 股票代码
  name: string;                      // 股票名称
  ipo_price: number;                 // 发行价
  market: string;                    // 市场类型 (SH/SZ)
  status: string;                    // 状态 (LISTED/UPCOMING/ONGOING)
  listing_date?: string;             // 上市日期
  subscription_code?: string;        // 申购代码
  issue_volume?: number;             // 发行总量
  online_issue_volume?: number;      // 上网发行量
  pe_ratio?: number;                 // 市盈率
  issue_date?: string;               // 发行日期
  update_time?: string;              // 更新时间
  created_at: string;                // 创建时间
}

/**
 * 映射新浪状态到系统内部状态
 */
function mapSinaStatusToIPOStatus(sinaStatus: string): IPOStatus {
  if (!sinaStatus) return 'UPCOMING';
  
  const status = sinaStatus.trim();
  if (status.includes('申购中') || status.includes('申购')) {
    return 'ONGOING';
  } else if (status.includes('待上市') || status.includes('即将上市')) {
    return 'UPCOMING';
  } else if (status.includes('已上市') || status.includes('上市')) {
    return 'LISTED';
  }
  
  // 默认状态
  return 'UPCOMING';
}

/**
 * 映射Supabase数据库状态到系统内部状态
 */
function mapSupabaseStatusToIPOStatus(dbStatus: string): IPOStatus {
  if (!dbStatus) return 'UPCOMING';
  
  const status = dbStatus.trim().toUpperCase();
  if (status === 'LISTED') return 'LISTED';
  if (status === 'ONGOING') return 'ONGOING';
  if (status === 'UPCOMING') return 'UPCOMING';
  
  return 'UPCOMING';
}



/**
 * 从Supabase数据库获取IPO数据
 * @param page 页码，默认1（目前数据库查询不支持分页，参数保留以保持接口兼容）
 * @param num 每页数量，默认40（目前数据库查询不支持分页，参数保留以保持接口兼容）
 * @returns IPO数据数组，失败时返回空数组
 */
export async function fetchSinaIPOData(page: number = 1, num: number = 40): Promise<IPOData[]> {
  try {
    // 从Supabase数据库获取IPO数据
    const { supabase } = await import('../../lib/supabase');
    
    const { data, error } = await supabase
      .from('ipos')
      .select('*')
      .order('listing_date', { ascending: true }); // 按上市日期排序

    if (error) {
      console.error('从Supabase获取IPO数据失败:', error);
      return [];
    }

    // 转换数据格式
    const ipoList: IPOData[] = [];
    
    for (const item of data) {
      try {
        // 映射数据库字段到IPOData接口
        const ipoData: IPOData = {
          symbol: item.symbol,
          name: item.name,
          listingDate: item.listing_date || '',
          issuePrice: Number(item.ipo_price) || 0,
          status: mapSupabaseStatusToIPOStatus(item.status),
          market: item.market, // SH 或 SZ
          subscriptionCode: item.subscription_code || item.symbol,
          issueVolume: item.issue_volume ? Number(item.issue_volume) : undefined,
          onlineIssueVolume: item.online_issue_volume ? Number(item.online_issue_volume) : undefined,
          peRatio: item.pe_ratio ? Number(item.pe_ratio) : undefined,
          issueDate: item.issue_date || undefined,
          minSubscriptionUnit: 500,
        };

        ipoList.push(ipoData);
      } catch (error) {
        console.warn('解析IPO数据项失败:', error, item);
        // 继续处理其他数据
      }
    }

    console.log(`从Supabase获取到 ${ipoList.length} 条IPO数据`);
    return ipoList;
  } catch (error) {
    console.error('获取IPO数据失败:', error);
    return []; // 返回空数组
  }
}

/**
 * 根据股票代码获取特定IPO数据
 * @param symbol 股票代码
 * @returns 匹配的IPO数据，未找到返回null
 */
export async function fetchSinaIPOBySymbol(symbol: string): Promise<IPOData | null> {
  try {
    const ipoList = await fetchSinaIPOData();
    const matched = ipoList.find(ipo => ipo.symbol === symbol);
    return matched || null;
  } catch (error) {
    console.error(`获取股票 ${symbol} 的IPO数据失败:`, error);
    return null;
  }
}

/**
 * 缓存装饰器（简化版）
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cacheKey: string,
  ttl: number = 5 * 60 * 1000 // 默认5分钟
): T {
  const cache = {
    data: null as any,
    timestamp: 0
  };

  return (async (...args: any[]) => {
    const now = Date.now();
    
    // 检查缓存是否有效
    if (cache.data && now - cache.timestamp < ttl) {
      return cache.data;
    }

    // 调用原始函数
    const result = await fn(...args);
    
    // 更新缓存
    cache.data = result;
    cache.timestamp = now;
    
    return result;
  }) as T;
}

// 带缓存的IPO数据获取函数
export const fetchSinaIPODataWithCache = withCache(fetchSinaIPOData, 'sina_ipo_data');
