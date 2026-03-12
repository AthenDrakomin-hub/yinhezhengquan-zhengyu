/**
 * 股票搜索服务
 * 通过Edge Function代理实现股票搜索，绕过CORS限制
 */

export interface StockSearchResult {
  symbol: string;      // 股票代码
  name: string;        // 股票名称
  market: 'CN' | 'HK'; // 市场
  type: string;        // 类型（股票、指数、ETF等）
  exchange?: string;   // 交易所
}

/**
 * 搜索股票（通过Edge Function代理）
 */
export async function searchStocks(keyword: string, market?: 'CN' | 'HK' | 'ALL'): Promise<StockSearchResult[]> {
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  const trimmedKeyword = keyword.trim();
  
  try {
    // 方案1: 通过Edge Function代理搜索（推荐，绕过CORS）
    const { supabase } = await import('../lib/supabase');
    const { data, error } = await supabase.functions.invoke('stock-search', {
      body: { keyword: trimmedKeyword, market: market || 'ALL' }
    });
    
    if (!error && data?.success && Array.isArray(data.results) && data.results.length > 0) {
      console.log(`[股票搜索] Edge Function找到 ${data.results.length} 条结果`);
      return data.results;
    }
    
    if (error) {
      console.warn('[股票搜索] Edge Function调用失败:', error);
    }
  } catch (error) {
    console.warn('[股票搜索] Edge Function请求失败:', error);
  }
  
  // 方案2: 直接调用腾讯行情API验证股票代码（仅限代码搜索）
  if (/^\d{4,6}$/.test(trimmedKeyword) || /^[A-Za-z]?\d{4,6}$/.test(trimmedKeyword)) {
    try {
      const cleanKeyword = trimmedKeyword.replace(/^(sh|sz|hk|SH|SZ|HK)/i, '');
      const prefixes = ['sz', 'sh', 'hk'];
      const queries = prefixes.map(p => `${p}${cleanKeyword}`).join(',');
      const url = `https://qt.gtimg.cn/q=${queries}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': '*/*',
          'Referer': 'https://gu.qq.com/',
        },
      });
      
      const text = await response.text();
      const results: StockSearchResult[] = [];
      
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.includes('v_pv_none_match')) continue;
        
        const match = line.match(/v_(\w+)="(.+)"/);
        if (!match) continue;
        
        const code = match[1];
        const data = match[2];
        const fields = data.split('~');
        
        if (fields.length < 3) continue;
        
        const name = fields[1];
        const symbol = fields[2];
        
        let stockMarket: 'CN' | 'HK' = 'CN';
        let exchange = '';
        
        if (code.startsWith('hk')) {
          stockMarket = 'HK';
          exchange = '港交所';
        } else if (code.startsWith('sh')) {
          stockMarket = 'CN';
          exchange = '上交所';
        } else if (code.startsWith('sz')) {
          stockMarket = 'CN';
          exchange = '深交所';
        }
        
        // 市场过滤
        if (market && market !== 'ALL' && stockMarket !== market) continue;
        
        if (name && symbol) {
          results.push({
            symbol,
            name,
            market: stockMarket,
            type: '股票',
            exchange,
          });
        }
      }
      
      if (results.length > 0) {
        console.log(`[股票搜索] 腾讯API找到 ${results.length} 条结果`);
        return results;
      }
    } catch (error) {
      console.error('[股票搜索] 腾讯API请求失败:', error);
    }
  }
  
  // 方案3: 使用本地股票列表作为兜底
  try {
    const { STOCK_LIST } = await import('../lib/stockList');
    
    const results: StockSearchResult[] = [];
    const lowerKeyword = trimmedKeyword.toLowerCase();
    
    for (const stock of STOCK_LIST) {
      if (market && market !== 'ALL' && stock.market !== market) continue;
      
      const codeMatch = stock.symbol.toLowerCase().includes(lowerKeyword);
      const nameMatch = stock.name.toLowerCase().includes(lowerKeyword);
      
      if (codeMatch || nameMatch) {
        results.push({
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market,
          type: stock.type === 'stock' ? '股票' : stock.type === 'etf' ? 'ETF' : '指数',
          exchange: stock.market === 'CN' 
            ? (stock.symbol.startsWith('60') || stock.symbol.startsWith('68') ? '上交所' : '深交所')
            : '港交所',
        });
      }
    }
    
    // 排序：代码完全匹配优先
    results.sort((a, b) => {
      const aCodeMatch = a.symbol.toLowerCase() === lowerKeyword;
      const bCodeMatch = b.symbol.toLowerCase() === lowerKeyword;
      if (aCodeMatch && !bCodeMatch) return -1;
      if (!aCodeMatch && bCodeMatch) return 1;
      return 0;
    });
    
    if (results.length > 0) {
      console.log(`[股票搜索] 本地列表找到 ${results.length} 条结果`);
      return results.slice(0, 20);
    }
  } catch (error) {
    console.error('[股票搜索] 本地搜索失败:', error);
  }
  
  return [];
}

/**
 * 根据股票代码搜索
 */
export async function searchBySymbol(symbol: string): Promise<StockSearchResult | null> {
  const results = await searchStocks(symbol);
  return results.find(r => r.symbol === symbol) || null;
}

export default {
  searchStocks,
  searchBySymbol,
};
