/**
 * 市场判断工具函数
 * 
 * 股票代码规则：
 * - A股代码：6位数字
 *   - 000/001/002/003：深市主板/中小板
 *   - 300/301：创业板
 *   - 600/601/603/605：沪市主板
 *   - 688/689：科创板
 *   - 8开头/4开头：北交所
 * - 港股代码：5位数字（如 00700、09988）
 */

/**
 * 根据股票代码判断市场
 * @param symbol 股票代码
 * @returns 'CN' 或 'HK'
 */
export function getMarketBySymbol(symbol: string): 'CN' | 'HK' {
  if (!symbol) return 'CN';
  
  // 清理股票代码：移除可能的前缀
  const cleanSymbol = symbol.replace(/^(SH|SZ|sh|sz|HK|hk)/, '');
  
  // 港股代码是5位数字，A股代码是6位数字
  if (cleanSymbol.length === 5) {
    return 'HK';
  }
  
  return 'CN';
}

/**
 * 判断是否为港股
 * @param symbol 股票代码
 * @returns boolean
 */
export function isHKStock(symbol: string): boolean {
  return getMarketBySymbol(symbol) === 'HK';
}

/**
 * 判断是否为A股
 * @param symbol 股票代码
 * @returns boolean
 */
export function isCNStock(symbol: string): boolean {
  return getMarketBySymbol(symbol) === 'CN';
}

/**
 * 获取东方财富市场代码
 * @param symbol 股票代码
 * @param market 市场类型
 * @returns 市场代码字符串
 */
export function getEastMoneyMarketCode(symbol: string, market: 'CN' | 'HK'): string {
  if (market === 'HK') return '116';
  
  const cleanSymbol = symbol.replace(/^(SH|SZ|sh|sz|HK|hk)/, '');
  const prefix = cleanSymbol.substring(0, 2);
  
  // 深市：00/30 开头，或北交所 8/4 开头
  if (['00', '30'].includes(prefix) || cleanSymbol.startsWith('8') || cleanSymbol.startsWith('4')) {
    return '0';
  }
  
  // 沪市：60/68 开头
  return '1';
}
