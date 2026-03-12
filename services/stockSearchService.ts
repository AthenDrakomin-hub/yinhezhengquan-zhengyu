/**
 * 股票搜索服务
 * 接入东方财富搜索API，支持搜索全市场A股和港股
 */

export interface StockSearchResult {
  symbol: string;      // 股票代码
  name: string;        // 股票名称
  market: 'CN' | 'HK'; // 市场
  type: string;        // 类型（股票、指数、ETF等）
  exchange?: string;   // 交易所
}

// 东方财富搜索API（免费、无CORS限制）
const EASTMONEY_SEARCH_URL = 'https://searchapi.eastmoney.com/bussiness/web/QuotationLabelSearch';

// 港股搜索API
const EASTMONEY_HK_SEARCH_URL = 'https://searchapi.eastmoney.com/api/hk/search';

/**
 * 搜索A股股票
 */
async function searchAStocks(keyword: string): Promise<StockSearchResult[]> {
  try {
    const url = `${EASTMONEY_SEARCH_URL}?cb=&keyword=${encodeURIComponent(keyword)}&type=stock&pi=1&ps=30`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Referer': 'https://quote.eastmoney.com/',
      },
    });

    const text = await response.text();
    
    // 解析JSONP响应
    let jsonStr = text;
    if (text.startsWith('(') || text.startsWith('[')) {
      jsonStr = text;
    } else {
      // 移除JSONP回调函数包装
      const match = text.match(/\((.*)\)/);
      if (match) {
        jsonStr = match[1];
      }
    }

    const data = JSON.parse(jsonStr);
    
    if (!data || !data.Data) {
      return [];
    }

    const results: StockSearchResult[] = [];
    
    for (const item of data.Data) {
      if (!item.Code || !item.Name) continue;
      
      // 过滤掉非股票类型
      if (item.Type && !['股票', 'A股', '科创板', '创业板', '主板'].includes(item.Type)) {
        continue;
      }

      // 确定市场类型
      const code = item.Code;
      let market: 'CN' | 'HK' = 'CN';
      let symbol = code;
      
      // A股代码格式化
      if (code.startsWith('SH')) {
        symbol = code.replace('SH', '');
        market = 'CN';
      } else if (code.startsWith('SZ')) {
        symbol = code.replace('SZ', '');
        market = 'CN';
      } else if (code.length === 6 && (code.startsWith('60') || code.startsWith('00') || code.startsWith('30') || code.startsWith('68'))) {
        market = 'CN';
      }

      results.push({
        symbol,
        name: item.Name,
        market,
        type: item.Type || '股票',
        exchange: item.Market,
      });
    }

    return results;
  } catch (error) {
    console.error('搜索A股失败:', error);
    return [];
  }
}

/**
 * 搜索港股
 */
async function searchHKStocks(keyword: string): Promise<StockSearchResult[]> {
  try {
    const url = `${EASTMONEY_HK_SEARCH_URL}?keyword=${encodeURIComponent(keyword)}&type=stock&pi=1&ps=20`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Referer': 'https://quote.eastmoney.com/hk',
      },
    });

    const data = await response.json();
    
    if (!data || !data.Data) {
      return [];
    }

    const results: StockSearchResult[] = [];
    
    for (const item of data.Data) {
      if (!item.Code || !item.Name) continue;

      // 港股代码格式化
      let symbol = item.Code;
      if (symbol.length < 5) {
        symbol = symbol.padStart(5, '0');
      }

      results.push({
        symbol,
        name: item.Name,
        market: 'HK',
        type: item.Type || '股票',
        exchange: 'HKEX',
      });
    }

    return results;
  } catch (error) {
    console.error('搜索港股失败:', error);
    return [];
  }
}

/**
 * 搜索股票（同时搜索A股和港股）
 */
export async function searchStocks(keyword: string, market?: 'CN' | 'HK' | 'ALL'): Promise<StockSearchResult[]> {
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  const trimmedKeyword = keyword.trim();
  
  // 判断搜索范围
  const searchAll = !market || market === 'ALL';
  const searchCN = searchAll || market === 'CN';
  const searchHK = searchAll || market === 'HK';

  // 自动判断：如果关键字是纯数字且以0开头且长度5位，可能是港股
  const isLikelyHK = /^[0-9]{5}$/.test(trimmedKeyword) && trimmedKeyword.startsWith('0');
  
  // 如果关键字明显是港股代码，优先搜索港股
  if (isLikelyHK && searchHK) {
    const hkResults = await searchHKStocks(trimmedKeyword);
    if (hkResults.length > 0) {
      return hkResults;
    }
  }

  // 并行搜索A股和港股
  const promises: Promise<StockSearchResult[]>[] = [];
  
  if (searchCN) {
    promises.push(searchAStocks(trimmedKeyword));
  }
  
  if (searchHK) {
    promises.push(searchHKStocks(trimmedKeyword));
  }

  const results = await Promise.all(promises);
  
  // 合并结果，A股在前
  const allResults: StockSearchResult[] = [];
  for (let i = 0; i < results.length; i++) {
    allResults.push(...results[i]);
  }

  // 去重（按symbol去重）
  const uniqueResults = allResults.filter((item, index, self) => 
    index === self.findIndex(t => t.symbol === item.symbol)
  );

  // 按相关性排序：代码完全匹配优先，名称完全匹配次之
  uniqueResults.sort((a, b) => {
    const aCodeMatch = a.symbol.toLowerCase() === trimmedKeyword.toLowerCase();
    const bCodeMatch = b.symbol.toLowerCase() === trimmedKeyword.toLowerCase();
    const aNameMatch = a.name.includes(trimmedKeyword);
    const bNameMatch = b.name.includes(trimmedKeyword);
    
    if (aCodeMatch && !bCodeMatch) return -1;
    if (!aCodeMatch && bCodeMatch) return 1;
    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;
    
    return 0;
  });

  return uniqueResults.slice(0, 30);
}

/**
 * 根据股票代码获取股票信息
 */
export async function getStockInfo(symbol: string): Promise<StockSearchResult | null> {
  const results = await searchStocks(symbol);
  return results.find(r => r.symbol === symbol) || null;
}

export default {
  searchStocks,
  getStockInfo,
};
