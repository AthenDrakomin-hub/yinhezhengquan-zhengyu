/**
 * 新浪财经IPO数据适配器
 * 从新浪财经获取IPO数据，替代模拟数据
 */

// IPO状态类型
export type IPOStatus = 'UPCOMING' | 'ONGOING' | 'LISTED';

// IPO数据接口
export interface IPOData {
  symbol: string;        // 股票代码
  name: string;          // 名称
  listingDate: string;   // 上市日期，格式：YYYY-MM-DD
  issuePrice: number;    // 发行价
  status: IPOStatus;     // 申购状态
  market?: string;       // 市场类型：SH（沪市）、SZ（深市）、BJ（北交所）
}

// 新浪财经返回的IPO数据格式（根据文档推测）
interface SinaIPOItem {
  symbol?: string;       // 股票代码，如：002475
  name?: string;         // 股票名称
  listing_date?: string; // 上市日期，格式可能为：2024-03-15
  issue_price?: string | number; // 发行价
  status_text?: string;  // 状态文本，如："申购中"、"待上市"、"已上市"
  market?: string;       // 市场
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
 * 从新浪财经获取IPO数据（通过Edge Function抓取HTML）
 * @param page 页码，默认1（目前Edge Function不支持分页，参数保留以保持接口兼容）
 * @param num 每页数量，默认40（目前Edge Function不支持分页，参数保留以保持接口兼容）
 * @returns IPO数据数组，失败时返回空数组
 */
export async function fetchSinaIPOData(page: number = 1, num: number = 40): Promise<IPOData[]> {
  try {
    // 使用新的Edge Function获取IPO数据
    const functionUrl = 'https://rfnrosyfeivcbkimjlwo.functions.supabase.co/fetch-ipo-data';
    
    const response = await fetch(functionUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://finance.sina.com.cn'
      }
    });

    if (!response.ok) {
      console.warn(`Edge Function请求失败: HTTP ${response.status}`);
      return [];
    }

    const result = await response.json();
    
    // Edge Function返回格式: { success: boolean, data: any[], count: number, timestamp: string }
    if (!result.success || !Array.isArray(result.data)) {
      console.warn('Edge Function返回数据格式异常，期望包含data数组');
      return [];
    }

    // 转换数据格式
    const ipoList: IPOData[] = [];
    
    for (const item of result.data) {
      try {
        // 解析股票代码和名称 - 使用Edge Function返回的字段
        const symbol = item.stockCode || '';
        const name = item.stockCode || ''; // Edge Function没有返回名称字段，暂用股票代码
        
        if (!symbol) {
          continue; // 跳过无效数据（至少需要股票代码）
        }

        // 解析上市日期
        let listingDate = item.listingDate || '';
        // 处理"未定"情况
        if (listingDate === '未定') {
          listingDate = '';
        }
        // 如果日期格式不是YYYY-MM-DD，尝试转换
        if (listingDate && !/^\d{4}-\d{2}-\d{2}$/.test(listingDate)) {
          // 尝试提取日期部分
          const dateMatch = listingDate.match(/(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})/);
          if (dateMatch) {
            const [, year, month, day] = dateMatch;
            listingDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }

        // 解析发行价
        let issuePrice = 0;
        if (item.issuePrice !== undefined && item.issuePrice !== null) {
          if (typeof item.issuePrice === 'string') {
            issuePrice = parseFloat(item.issuePrice);
          } else {
            issuePrice = Number(item.issuePrice);
          }
          if (isNaN(issuePrice)) issuePrice = 0;
        }

        // 映射状态 - Edge Function返回LISTED/UPCOMING，需要转换为系统内部状态
        let status: IPOStatus = 'UPCOMING';
        
        // Edge Function返回的状态
        const edgeStatus = item.status;
        if (edgeStatus === 'LISTED') {
          status = 'LISTED';
        } else if (edgeStatus === 'UPCOMING') {
          // 检查申购日期，判断是否为申购中状态
          const subscribeDate = item.subscribeDate || '';
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // 如果申购日期接近当前日期（3天内），则认为是申购中状态
          if (subscribeDate) {
            try {
              const subDate = new Date(subscribeDate);
              subDate.setHours(0, 0, 0, 0);
              const diffTime = subDate.getTime() - today.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              
              // 如果申购日期在今天或未来3天内，认为是申购中
              if (diffDays >= -1 && diffDays <= 3) {
                status = 'ONGOING';
              } else {
                status = 'UPCOMING';
              }
            } catch (e) {
              // 日期解析失败，保持UPCOMING状态
              status = 'UPCOMING';
            }
          } else {
            status = 'UPCOMING';
          }
        }

        // 确定市场类型 - 使用Edge Function返回的market字段
        let market = item.market;
        if (!market) {
          // 根据股票代码推断市场
          if (symbol.startsWith('0') || symbol.startsWith('3')) {
            market = 'SZ'; // 深市
          } else if (symbol.startsWith('8') || symbol.startsWith('4')) {
            market = 'BJ'; // 北交所
          } else {
            market = 'SH'; // 默认沪市
          }
        }

        ipoList.push({
          symbol,
          name: name || symbol, // 如果名称为空，使用股票代码
          listingDate,
          issuePrice,
          status,
          market
        });
      } catch (error) {
        console.warn('解析IPO数据项失败:', error, item);
        // 继续处理其他数据
      }
    }

    console.log(`从Edge Function获取到 ${ipoList.length} 条IPO数据`);
    return ipoList;
  } catch (error) {
    console.error('获取IPO数据失败，将使用模拟数据:', error);
    return []; // 返回空数组触发降级机制
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
