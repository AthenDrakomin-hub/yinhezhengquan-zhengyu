/**
 * 智能选股服务
 * 从数据库获取股票基础数据，结合行情API进行筛选
 * 
 * 注意：基本面数据（PE、PB、ROE等）需要从财务数据库获取
 * 当前版本：行情数据为真实API，基本面数据标记为待完善
 */

import { supabase } from '@/lib/supabase';
import { marketApi } from './marketApi';

export interface SmartPickStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  turnoverRate: number;
  pe: number;
  pb: number;
  marketCap: number;
  industry: string;
  roe?: number;
  netProfitGrowth?: number;
  dividendYield?: number;
  totalShares?: number;
  circShares?: number;
}

export interface FilterCondition {
  field: string;
  operator: '>' | '<' | '=' | 'between';
  value: number | [number, number];
}

// 缓存股票列表
let cachedStocks: SmartPickStock[] = [];
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30分钟

/**
 * 获取股票列表（从数据库）
 * 
 * 数据来源说明：
 * - 行情数据（price, change, changePercent）：真实API（东方财富）
 * - 基本面数据（pe, pb, roe）：需要财务数据库表，当前标记为0
 */
export async function getStockList(): Promise<SmartPickStock[]> {
  // 检查缓存
  if (cachedStocks.length > 0 && Date.now() - cacheTime < CACHE_TTL) {
    return cachedStocks;
  }

  try {
    // 从数据库获取股票基础信息（包含基本面数据）
    const { data: stocks, error } = await supabase
      .from('stocks')
      .select('code, name, industry, total_shares, circ_shares, pe, pb, roe, net_profit_growth, dividend_yield, turnover_rate')
      .limit(500); // 限制500只

    if (error) {
      console.error('[smartPickService] 获取股票列表失败:', error);
      return []; // 返回空数组，不使用假数据
    }

    if (!stocks || stocks.length === 0) {
      console.warn('[smartPickService] 数据库无股票数据，请先同步股票基础信息');
      return []; // 返回空数组，不使用假数据
    }

    // 获取实时行情
    const symbols = stocks.map(s => s.code);
    const quotes = await marketApi.getBatchStocks(symbols, 'CN');

    // 合并数据
    const result: SmartPickStock[] = stocks.map(stock => {
      const quote = quotes.find(q => q.symbol === stock.code);
      
      // 使用数据库中的基本面数据，如果不存在则标记为0（表示数据待完善）
      const pe = stock.pe || 0;
      const pb = stock.pb || 0;
      const roe = stock.roe || 0;
      const netProfitGrowth = stock.net_profit_growth || 0;
      const dividendYield = stock.dividend_yield || 0;
      const turnoverRate = stock.turnover_rate || 0;
      const marketCap = (stock.total_shares || 0) * (quote?.price || 0);

      return {
        symbol: stock.code,
        name: stock.name,
        price: quote?.price || 0,
        change: quote?.change || 0,
        changePercent: quote?.changePercent || 0,
        volume: 0,
        turnoverRate,
        pe: Math.round(pe * 10) / 10,
        pb: Math.round(pb * 100) / 100,
        marketCap,
        industry: stock.industry || '其他',
        roe: Math.round(roe * 10) / 10,
        netProfitGrowth: Math.round(netProfitGrowth * 10) / 10,
        dividendYield: Math.round(dividendYield * 10) / 10,
        totalShares: stock.total_shares,
        circShares: stock.circ_shares,
      };
    }).filter(s => s.price > 0);

    // 更新缓存
    cachedStocks = result;
    cacheTime = Date.now();

    console.log(`[smartPickService] 获取到 ${result.length} 只股票数据`);
    return result;
  } catch (error) {
    console.error('[smartPickService] 获取股票列表失败:', error);
    return []; // 返回空数组，不使用假数据
  }
}

/**
 * 执行选股筛选
 */
export async function executeFilter(conditions: FilterCondition[]): Promise<SmartPickStock[]> {
  const stocks = await getStockList();

  return stocks.filter(stock => {
    return conditions.every(condition => {
      const value = (stock as any)[condition.field];
      if (value === undefined) return true;

      switch (condition.operator) {
        case '>':
          return value > condition.value;
        case '<':
          return value < condition.value;
        case '=':
          return value === condition.value;
        case 'between':
          if (Array.isArray(condition.value)) {
            return value >= condition.value[0] && value <= condition.value[1];
          }
          return true;
        default:
          return true;
      }
    });
  });
}

/**
 * 应用预设策略
 */
export async function applyPresetStrategy(strategyId: string): Promise<SmartPickStock[]> {
  const stocks = await getStockList();

  switch (strategyId) {
    case 'value':
      // 价值投资：低估值、高分红
      return stocks.filter(s => s.pe > 0 && s.pe < 20 && s.pb > 0 && s.pb < 3 && (s.dividendYield || 0) > 2);
    
    case 'growth':
      // 成长优选：高增长
      return stocks.filter(s => (s.netProfitGrowth || 0) > 20 && s.changePercent > 0);
    
    case 'momentum':
      // 趋势跟踪：强势股
      return stocks.filter(s => s.changePercent > 2 && s.turnoverRate > 1);
    
    case 'dividend':
      // 红利策略：高分红
      return stocks.filter(s => (s.dividendYield || 0) > 4 && s.pe > 0 && s.pe < 15);
    
    case 'lowvol':
      // 低波策略：波动小
      return stocks.filter(s => Math.abs(s.changePercent) < 2);
    
    case 'quality':
      // 质量优选：高ROE
      return stocks.filter(s => (s.roe || 0) > 15 && s.pe > 0 && s.pe < 30);
    
    default:
      return stocks;
  }
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  cachedStocks = [];
  cacheTime = 0;
}
