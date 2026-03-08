/**
 * 涨停板数据服务
 * 通过 Supabase Edge Function 获取实时行情数据并判断涨停板
 * 优先从数据库获取，失败时使用模拟数据
 */

import { supabase } from '../lib/supabase';

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
 * 股票类型枚举
 */
enum StockType {
  NORMAL = 'NORMAL',  // 普通股票（主板）
  ST = 'ST',          // ST股票（5%涨跌幅）
  GEM = 'GEM',        // 创业板（20%涨跌幅）
  STAR = 'STAR',      // 科创板（20%涨跌幅）
}

/**
 * 获取默认股票列表（热门股票）
 */
function getDefaultStockList(): string[] {
  return [
    '600519', // 贵州茅台
    '000001', // 平安银行
    '600000', // 浦发银行
    '000002', // 万科A
    '600036', // 招商银行
    '601318', // 中国平安
    '000333', // 美的集团
    '600276', // 恒瑞医药
    '002594', // 比亚迪
    '600887', // 伊利股份
    '601888', // 中国中免
    '002415', // 海康威视
    '600309', // 万华化学
    '601012', // 隆基绿能
    '300750', // 宁德时代
  ];
}

/**
 * 获取单只股票的涨停板数据（通过 Supabase Edge Function）
 */
export async function getLimitUpData(symbol: string): Promise<LimitUpData> {
  try {
    const list = await getLimitUpList([symbol]);
    
    if (list.length === 0) {
      throw new Error(`未找到 ${symbol} 的涨停数据`);
    }
    
    return list[0];
  } catch (error) {
    console.error('获取涨停板数据失败:', error);
    throw error;
  }
}

/**
 * 生成模拟涨停数据（当外部API不可用时使用）
 */
function generateMockLimitUpData(symbols: string[]): LimitUpData[] {
  const stockNames: Record<string, string> = {
    '600519': '贵州茅台',
    '000001': '平安银行',
    '600000': '浦发银行',
    '000002': '万科A',
    '600036': '招商银行',
    '601318': '中国平安',
    '000333': '美的集团',
    '600276': '恒瑞医药',
    '002594': '比亚迪',
    '600887': '伊利股份',
    '601888': '中国中免',
    '002415': '海康威视',
    '600309': '万华化学',
    '601012': '隆基绿能',
    '300750': '宁德时代',
  };

  return symbols.map((symbol, index) => {
    const stockType = symbol.startsWith('3') ? 'GEM' : symbol.startsWith('688') ? 'STAR' : 'NORMAL';
    const preClose = 10 + Math.random() * 100;
    const limitPercent = stockType === 'GEM' || stockType === 'STAR' ? 0.20 : 0.10;
    const isLimitUp = index < 3; // 前3只模拟涨停
    const changePercent = isLimitUp ? limitPercent * 100 : (Math.random() - 0.5) * 20;
    const currentPrice = preClose * (1 + changePercent / 100);
    
    return {
      symbol,
      name: stockNames[symbol] || `股票${symbol}`,
      market: symbol.startsWith('6') ? 'SH' : 'SZ',
      stockType,
      currentPrice: Number(currentPrice.toFixed(2)),
      preClose: Number(preClose.toFixed(2)),
      limitUpPrice: Number((preClose * (1 + limitPercent)).toFixed(2)),
      limitDownPrice: Number((preClose * (1 - limitPercent)).toFixed(2)),
      change: Number((currentPrice - preClose).toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 100000000),
      turnover: Math.floor(Math.random() * 1000000000),
      buyOneVolume: Math.floor(Math.random() * 100000),
      buyOnePrice: Number(currentPrice.toFixed(2)),
      isLimitUp,
      timestamp: new Date().toISOString(),
    };
  });
}

// 银禾数据代理服务地址（本地开发）
const YINHE_API_URL = import.meta.env.VITE_YINHE_API_URL || 'http://localhost:8080';

/**
 * 获取所有涨停股票列表
 * 优先级：数据库 -> 银禾数据代理服务 -> Edge Function -> 模拟数据
 *
 * @param symbols - 可选，指定要查询的股票列表。如果不提供，使用默认列表
 * @returns 涨停股票列表
 */
export async function getLimitUpList(symbols?: string[]): Promise<LimitUpData[]> {
  const stockList = symbols || getDefaultStockList();
  console.log(`🔍 扫描 ${stockList.length} 只股票...`);

  try {
    // 1. 首先尝试从数据库获取
    const { data: dbData, error: dbError } = await supabase
      .from('limit_up_stocks')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('update_time', { ascending: false })
      .limit(50);

    if (!dbError && dbData && dbData.length > 0) {
      console.log(`✅ 从数据库获取 ${dbData.length} 条数据`);
      return dbData.map(item => ({
        symbol: item.symbol,
        name: item.name,
        market: item.market,
        stockType: item.stock_type,
        currentPrice: item.current_price,
        preClose: item.pre_close,
        limitUpPrice: item.limit_up_price,
        limitDownPrice: item.limit_down_price,
        change: item.change,
        changePercent: item.change_percent,
        volume: item.volume,
        turnover: item.turnover,
        buyOneVolume: item.buy_one_volume,
        buyOnePrice: item.buy_one_price,
        isLimitUp: item.is_limit_up,
        timestamp: item.update_time,
      }));
    }

    // 2. 尝试调用银禾数据代理服务
    try {
      const yinheResponse = await fetch(`${YINHE_API_URL}/api/limit-up?symbols=${stockList.join(',')}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (yinheResponse.ok) {
        const yinheData = await yinheResponse.json();
        if (yinheData && yinheData.length > 0) {
          console.log(`✅ 从银禾数据服务获取 ${yinheData.length} 条数据`);
          return yinheData.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market: item.market,
            stockType: item.stockType,
            currentPrice: item.currentPrice,
            preClose: item.preClose,
            limitUpPrice: item.limitUpPrice,
            limitDownPrice: item.limitDownPrice,
            change: item.change,
            changePercent: item.changePercent,
            volume: item.volume,
            turnover: item.turnover,
            buyOneVolume: 0,
            buyOnePrice: item.currentPrice,
            isLimitUp: item.isLimitUp,
            timestamp: item.timestamp,
          }));
        }
      }
    } catch (yinheError) {
      console.log('银禾数据服务不可用，尝试其他数据源');
    }

    // 3. 尝试调用 Edge Function
    const { data, error } = await supabase.functions.invoke('get-limit-up', {
      body: { symbols: stockList },
    });

    if (!error && data?.success && data.data?.length > 0) {
      console.log(`✅ 从 Edge Function 获取 ${data.data.length} 条数据`);
      return data.data;
    }

    // 4. 使用模拟数据
    console.log('⚠️ 外部数据源不可用，使用模拟数据');
    return generateMockLimitUpData(stockList);
    
  } catch (error) {
    console.error('获取涨停板列表失败:', error);
    // 返回模拟数据
    return generateMockLimitUpData(stockList);
  }
}

/**
 * 扫描指定股票列表，返回所有股票的涨停状态
 */
export async function scanStocksForLimitUp(symbols: string[]): Promise<LimitUpData[]> {
  return getLimitUpList(symbols);
}

/**
 * 计算涨停价（根据股票类型）
 */
export function calculateLimitUpPrice(preClose: number, stockType: string = 'NORMAL'): number {
  let limitPercent = 0.10; // 默认10%

  switch (stockType) {
    case 'ST':
      limitPercent = 0.05; // ST股票5%
      break;
    case 'GEM':
      limitPercent = 0.20; // 创业板20%
      break;
    case 'STAR':
      limitPercent = 0.20; // 科创板20%
      break;
    default:
      limitPercent = 0.10; // 普通股票10%
  }

  return Number((preClose * (1 + limitPercent)).toFixed(2));
}

/**
 * 计算跌停价（根据股票类型）
 */
export function calculateLimitDownPrice(preClose: number, stockType: string = 'NORMAL'): number {
  let limitPercent = 0.10; // 默认10%

  switch (stockType) {
    case 'ST':
      limitPercent = 0.05; // ST股票5%
      break;
    case 'GEM':
      limitPercent = 0.20; // 创业板20%
      break;
    case 'STAR':
      limitPercent = 0.20; // 科创板20%
      break;
    default:
      limitPercent = 0.10; // 普通股票10%
  }

  return Number((preClose * (1 - limitPercent)).toFixed(2));
}
