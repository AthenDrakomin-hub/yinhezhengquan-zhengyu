/**
 * 获取涨停板数据 Edge Function
 * 通过 QVeris API 获取实时行情并判断涨停板
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS 头配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, origin, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

// QVeris API 配置
const QVERIS_BASE_URL = 'https://qveris.ai/api/v1';
const QVERIS_TOOL_ID = 'ths_ifind.real_time_quotation.v1';
const QVERIS_SEARCH_ID = '53d0b764-aa04-41ad-96e5-e839d24c08b4';

interface QVerisQuote {
  thscode: string;
  time: string;
  tradeDate: string;
  tradeTime: string;
  preClose: number;
  open: number;
  high: number;
  low: number;
  latest: number;
  latestAmount: number;
  latestVolume: number;
  avgPrice: number;
  change: number;
  changeRatio: number;
  upperLimit: number;
  downLimit: number;
  amount: number;
  volume: number;
  turnoverRatio: number;
  sellVolume: number;
  buyVolume: number;
  totalShares: number;
  totalCapital: number;
  pb: number;
  riseDayCount: number;
  suspensionFlag: string;
  tradeStatus: string;
  mv: number;
  vol_ratio: number;
  committee: number;
  commission_diff: number;
  pe_ttm: number | null;
  pbr_lf: number;
  swing: number;
  lastest_price: number;
  af_backward: number;
}

interface QVerisResponse {
  status_code: number;
  data: QVerisQuote[][];
  metadata: {
    codes: string;
    effective_codes: string;
    used_stripped_codes: boolean;
    count: number;
    has_results: boolean;
    result_count_for_billing: number;
  };
}

interface QVerisExecutionResult {
  success: boolean;
  result: QVerisResponse;
  error_message?: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  preClose: number;
  open: number;
  high: number;
  low: number;
  price: number;
  change: number;
  changePercent: number;
  upperLimit: number;
  downLimit: number;
  volume: number;
  amount: number;
  turnoverRate: number;
  buyVolume: number;
  sellVolume: number;
  tradeStatus: string;
  timestamp: string;
}

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
 * 判断股票类型
 */
function getStockType(symbol: string): StockType {
  // ST股票判断：代码中包含ST或*ST
  if (symbol.includes('ST') || symbol.includes('*')) {
    return StockType.ST;
  }

  // 创业板判断：代码以3开头（深圳创业板）
  if (symbol.startsWith('3')) {
    return StockType.GEM;
  }

  // 科创板判断：代码以688开头（上海科创板）
  if (symbol.startsWith('688')) {
    return StockType.STAR;
  }

  // 默认为普通股票
  return StockType.NORMAL;
}

/**
 * 计算涨停价
 */
function calculateLimitUpPrice(preClose: number, stockType: StockType): number {
  let limitPercent: number;

  switch (stockType) {
    case StockType.ST:
      limitPercent = 0.05; // ST股票 5%
      break;
    case StockType.GEM:
    case StockType.STAR:
      limitPercent = 0.20; // 创业板、科创板 20%
      break;
    default:
      limitPercent = 0.10; // 普通股票 10%
  }

  return preClose * (1 + limitPercent);
}

/**
 * 计算跌停价
 */
function calculateLimitDownPrice(preClose: number, stockType: StockType): number {
  let limitPercent: number;

  switch (stockType) {
    case StockType.ST:
      limitPercent = 0.05; // ST股票 5%
      break;
    case StockType.GEM:
    case StockType.STAR:
      limitPercent = 0.20; // 创业板、科创板 20%
      break;
    default:
      limitPercent = 0.10; // 普通股票 10%
  }

  return preClose * (1 - limitPercent);
}

/**
 * 获取股票市场
 */
function getMarket(symbol: string): string {
  if (symbol.startsWith('6')) {
    return 'SH'; // 上海
  } else {
    return 'SZ'; // 深圳
  }
}

/**
 * 格式化股票代码
 */
function formatSymbol(symbol: string): string | null {
  // 如果已经包含后缀，直接返回
  if (symbol.includes('.')) {
    return symbol;
  }

  // 根据首位数字判断市场
  if (symbol.startsWith('6')) {
    return `${symbol}.SH`; // 上海
  } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
    return `${symbol}.SZ`; // 深圳
  }

  return null;
}

/**
 * 转换 QVeris 数据格式
 */
function transformQuote(qverisQuote: QVerisQuote): StockQuote {
  const symbol = qverisQuote.thscode; // 600519.SH

  return {
    symbol: symbol.split('.')[0], // 600519
    name: '', // QVeris 不提供股票名称
    preClose: qverisQuote.preClose,
    open: qverisQuote.open,
    high: qverisQuote.high,
    low: qverisQuote.low,
    price: qverisQuote.latest || qverisQuote.lastest_price,
    change: qverisQuote.change,
    changePercent: qverisQuote.changeRatio,
    upperLimit: qverisQuote.upperLimit,
    downLimit: qverisQuote.downLimit,
    volume: qverisQuote.volume,
    amount: qverisQuote.amount,
    turnoverRate: qverisQuote.turnoverRatio,
    buyVolume: qverisQuote.buyVolume,
    sellVolume: qverisQuote.sellVolume,
    tradeStatus: qverisQuote.tradeStatus,
    timestamp: qverisQuote.time,
  };
}

/**
 * 通过 QVeris API 获取股票行情
 */
async function getQuotesFromQVeris(symbols: string[], apiKey: string): Promise<StockQuote[]> {
  try {
    // 转换股票代码格式：600519 -> 600519.SH, 000001 -> 000001.SZ
    const formattedCodes = symbols
      .map(formatSymbol)
      .filter(code => code !== null)
      .join(',');

    if (!formattedCodes) {
      return [];
    }

    console.log(`📡 QVeris 请求: ${formattedCodes}`);

    // 使用 Deno 的 fetch API 调用 QVeris API
    const url = new URL(`${QVERIS_BASE_URL}/tools/execute`);
    url.searchParams.set('tool_id', QVERIS_TOOL_ID);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search_id: QVERIS_SEARCH_ID,
        parameters: { codes: formattedCodes },
        max_response_size: 20480,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QVeris API HTTP 错误: ${response.status} - ${errorText}`);
    }

    const result: QVerisExecutionResult = await response.json();

    if (!result.success) {
      throw new Error(`QVeris API 执行失败: ${result.error_message || 'Unknown error'}`);
    }

    // QVeris 返回的数据结构: { result: { status_code, data, metadata }, success, ... }
    const apiResult = result.result;

    if (!apiResult || apiResult.status_code !== 200 || !apiResult.data) {
      throw new Error(`QVeris API 返回错误: ${apiResult?.status_code || 'Unknown error'}`);
    }

    // 转换数据格式
    const quotes = apiResult.data
      .flat()
      .filter(item => item && item.thscode)
      .map(transformQuote);

    console.log(`✅ QVeris 返回: ${quotes.length} 条数据`);

    return quotes;
  } catch (error) {
    console.error('QVeris API 调用失败:', error);
    throw error;
  }
}

/**
 * 获取涨停板数据
 */
async function getLimitUpList(symbols: string[], apiKey: string): Promise<LimitUpData[]> {
  try {
    // 获取股票行情
    const quotes = await getQuotesFromQVeris(symbols, apiKey);

    // 判断哪些股票涨停
    const limitUpStocks: LimitUpData[] = [];

    for (const quote of quotes) {
      const stockType = getStockType(quote.symbol);
      const limitUpPrice = calculateLimitUpPrice(quote.preClose, stockType);
      const limitDownPrice = calculateLimitDownPrice(quote.preClose, stockType);
      const isLimitUp = Math.abs(quote.price - limitUpPrice) < 0.01; // 允许0.01的误差

      limitUpStocks.push({
        symbol: quote.symbol,
        name: quote.name,
        market: getMarket(quote.symbol),
        stockType: stockType,
        currentPrice: quote.price,
        preClose: quote.preClose,
        limitUpPrice: limitUpPrice,
        limitDownPrice: limitDownPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        volume: quote.volume,
        turnover: quote.amount,
        buyOneVolume: quote.buyVolume,
        buyOnePrice: quote.price,
        isLimitUp: isLimitUp,
        timestamp: quote.timestamp,
      });
    }

    // 筛选真正涨停的股票
    const activeLimitUpStocks = limitUpStocks.filter(stock => stock.isLimitUp);

    console.log(`✅ 发现 ${activeLimitUpStocks.length} 只涨停股票`);

    // 按涨跌幅排序
    return activeLimitUpStocks.sort((a, b) => b.changePercent - a.changePercent);
  } catch (error) {
    console.error('获取涨停板列表失败:', error);
    throw error;
  }
}

serve(async (req) => {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 验证请求方法
    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取请求参数
    let symbols: string[] | undefined;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const symbolsParam = url.searchParams.get('symbols');
      symbols = symbolsParam ? symbolsParam.split(',').map(s => s.trim()) : undefined;
    } else {
      const body = await req.json();
      symbols = body.symbols;
    }

    // 如果没有提供股票列表，使用默认列表
    const stockList = symbols || getDefaultStockList();

    // 获取 QVeris API Key
    const apiKey = Deno.env.get('QVERIS_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'QVERIS_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取涨停板数据
    const limitUpList = await getLimitUpList(stockList, apiKey);

    // 返回结果
    return new Response(
      JSON.stringify({
        success: true,
        data: limitUpList,
        total: limitUpList.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-limit-up function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
