/**
 * 涨停板数据服务
 * 通过 proxy-market Edge Function 获取涨停板数据
 */

import { marketApi, LimitUpStock } from './marketApi';

export interface LimitUpData {
  symbol: string;
  name: string;
  market: string;
  stockType: string;
  currentPrice: number;
  preClose: number;
  limitUpPrice: number;
  limitDownPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  buyOneVolume: number;
  buyOnePrice: number;
  isLimitUp: boolean;
  timestamp: string;
}

/**
 * 判断股票类型
 */
function getStockType(symbol: string, name: string): string {
  if (name.includes('ST') || name.includes('*ST')) return 'ST';
  if (symbol.startsWith('300') || symbol.startsWith('301')) return 'GEM';
  if (symbol.startsWith('688') || symbol.startsWith('689')) return 'STAR';
  return 'NORMAL';
}

/**
 * 计算涨停价
 */
function calculateLimitUpPrice(preClose: number, stockType: string): number {
  const limitPercent = stockType === 'ST' ? 0.05 : 
                       (stockType === 'GEM' || stockType === 'STAR') ? 0.20 : 0.10;
  return Number((preClose * (1 + limitPercent)).toFixed(2));
}

/**
 * 计算跌停价
 */
function calculateLimitDownPrice(preClose: number, stockType: string): number {
  const limitPercent = stockType === 'ST' ? 0.05 : 
                       (stockType === 'GEM' || stockType === 'STAR') ? 0.20 : 0.10;
  return Number((preClose * (1 - limitPercent)).toFixed(2));
}

/**
 * 获取涨停股票列表
 */
export async function getLimitUpList(): Promise<LimitUpData[]> {
  try {
    // 通过 Edge Function 代理获取涨停板数据
    const stocks = await marketApi.getLimitUpStocks();
    
    // 转换数据格式
    return stocks.map(stock => {
      const stockType = getStockType(stock.symbol, stock.name);
      const preClose = stock.price / (1 + stock.changePercent / 100);
      const limitUpPrice = calculateLimitUpPrice(preClose, stockType);
      const limitDownPrice = calculateLimitDownPrice(preClose, stockType);
      
      return {
        symbol: stock.symbol,
        name: stock.name,
        market: 'CN',
        stockType,
        currentPrice: stock.price,
        preClose,
        limitUpPrice,
        limitDownPrice,
        change: stock.price - preClose,
        changePercent: stock.changePercent,
        volume: 0, // 涨停板列表不返回成交量
        turnover: 0,
        buyOneVolume: 0,
        buyOnePrice: limitUpPrice,
        isLimitUp: stock.changePercent >= 9.9, // 接近涨停
        timestamp: new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('[limitUpService] 获取涨停板数据失败:', error);
    return [];
  }
}

/**
 * 获取单只股票的涨停板数据
 */
export async function getLimitUpData(symbol: string): Promise<LimitUpData | null> {
  try {
    const list = await getLimitUpList();
    return list.find(item => item.symbol === symbol) || null;
  } catch (error) {
    console.error('获取涨停板数据失败:', error);
    return null;
  }
}

/**
 * 计算涨停价（根据股票类型）- 导出函数
 */
export { calculateLimitUpPrice, calculateLimitDownPrice };
