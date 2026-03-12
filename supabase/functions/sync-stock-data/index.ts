/**
 * 股票数据定时同步 Edge Function
 * 
 * 支持的调用方式：
 * 1. 手动触发: POST /sync-stock-data?action=sync_all
 * 2. pg_cron 定时调用（需配置）
 * 3. 外部定时器（GitHub Actions、Vercel Cron 等）
 * 
 * 推荐方案：使用 Vercel Cron 或 GitHub Actions 每日调用
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// 银禾数据 API（免费公开）
const YINHE_BASE_URL = 'https://api.yinhedata.com';

// 初始化 Supabase 客户端
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 获取股票行情
async function fetchQuote(symbol: string) {
  try {
    const response = await fetch(`${YINHE_BASE_URL}/stock/realtime?code=${symbol}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// 获取K线
async function fetchKline(symbol: string, period = 'day', limit = 100) {
  try {
    const response = await fetch(
      `${YINHE_BASE_URL}/stock/kline?code=${symbol}&period=${period}&limit=${limit}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// 获取资金流向
async function fetchMoneyFlow(symbol: string) {
  try {
    const response = await fetch(`${YINHE_BASE_URL}/stock/moneyflow?code=${symbol}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ==================== 同步函数 ====================

async function syncStockInfo(supabase: any, symbol: string) {
  const quoteData = await fetchQuote(symbol);
  if (!quoteData) return { success: false };
  
  const market = /^[06]/.test(symbol) ? 'CN' : 'HK';
  
  const { error } = await supabase.from('stock_info').upsert({
    symbol,
    name: quoteData.name || quoteData.stockName || `股票${symbol}`,
    market,
    price: parseFloat(quoteData.price) || 0,
    change: parseFloat(quoteData.change) || 0,
    change_percent: parseFloat(quoteData.changePercent) || 0,
    prev_close: parseFloat(quoteData.prevClose) || 0,
    open: parseFloat(quoteData.open) || 0,
    high: parseFloat(quoteData.high) || 0,
    low: parseFloat(quoteData.low) || 0,
    volume: parseInt(quoteData.volume) || 0,
    amount: parseFloat(quoteData.amount) || 0,
    pe: parseFloat(quoteData.pe) || null,
    pb: parseFloat(quoteData.pb) || null,
    last_sync_at: new Date().toISOString(),
  }, { onConflict: 'symbol' });
  
  return { success: !error };
}

async function syncKline(supabase: any, symbol: string, period = 'day') {
  const klineData = await fetchKline(symbol, period, 100);
  if (!klineData || !Array.isArray(klineData)) return { success: false, count: 0 };
  
  const records = klineData
    .filter((item: any) => item.time || item.date || item.d)
    .map((item: any) => ({
      symbol,
      period,
      trade_date: (item.time || item.date || item.d).split(' ')[0],
      open: parseFloat(item.open || item.o) || 0,
      high: parseFloat(item.high || item.h) || 0,
      low: parseFloat(item.low || item.l) || 0,
      close: parseFloat(item.close || item.c) || 0,
      volume: parseInt(item.volume || item.v) || 0,
    }));
  
  if (records.length === 0) return { success: false, count: 0 };
  
  const { error } = await supabase
    .from('stock_kline')
    .upsert(records, { onConflict: 'symbol,period,trade_date,trade_time' });
  
  return { success: !error, count: records.length };
}

async function syncMoneyFlow(supabase: any, symbol: string) {
  const flowData = await fetchMoneyFlow(symbol);
  if (!flowData) return { success: false };
  
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase.from('stock_money_flow').upsert({
    symbol,
    trade_date: today,
    main_net_inflow: parseFloat(flowData.mainNetInflow) || 0,
    retail_net_inflow: parseFloat(flowData.retailNetInflow) || 0,
    super_large_net_inflow: parseFloat(flowData.superLargeNetInflow) || 0,
    large_net_inflow: parseFloat(flowData.largeNetInflow) || 0,
    medium_net_inflow: parseFloat(flowData.mediumNetInflow) || 0,
    small_net_inflow: parseFloat(flowData.smallNetInflow) || 0,
  }, { onConflict: 'symbol,trade_date' });
  
  return { success: !error };
}

// 同步用户关注的热门股票（自选股+持仓+热门50）
async function syncActiveStocks(supabase: any, options: { kline?: boolean } = {}) {
  // 获取需要同步的股票列表
  // 1. 用户自选股
  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('symbol');
  
  // 2. 用户持仓
  const { data: positions } = await supabase
    .from('positions')
    .select('stock_code');
  
  // 3. 热门股票（stock_info表中的前50只）
  const { data: hotStocks } = await supabase
    .from('stock_info')
    .select('symbol')
    .limit(50);
  
  // 合并去重
  const symbolSet = new Set<string>();
  
  watchlist?.forEach((w: any) => symbolSet.add(w.symbol));
  positions?.forEach((p: any) => symbolSet.add(p.stock_code));
  hotStocks?.forEach((s: any) => symbolSet.add(s.symbol));
  
  const symbols = Array.from(symbolSet);
  
  if (symbols.length === 0) {
    return { success: true, results: { total: 0, success: 0, failed: 0, details: ['无股票需要同步'] } };
  }
  
  console.log(`[同步] 需要同步 ${symbols.length} 只股票`);
  
  const results = { total: symbols.length, success: 0, failed: 0, details: [] as string[] };
  
  for (const symbol of symbols) {
    const quoteResult = await syncStockInfo(supabase, symbol);
    
    if (options.kline) {
      await syncKline(supabase, symbol, 'day');
    }
    
    await syncMoneyFlow(supabase, symbol);
    
    if (quoteResult.success) {
      results.success++;
    } else {
      results.failed++;
    }
    
    // 延迟避免请求过快
    await new Promise(r => setTimeout(r, 200));
  }
  
  results.details.push(`同步完成: 成功${results.success}, 失败${results.failed}`);
  return { success: true, results };
}

// ==================== 主服务 ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const supabase = getSupabaseClient();
  
  try {
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    
    const action = body.action || url.searchParams.get('action') || 'health';
    const symbol = body.symbol || url.searchParams.get('symbol');
    
    let result: any;
    
    switch (action) {
      case 'sync_info':
        result = symbol ? await syncStockInfo(supabase, symbol) : { success: false, error: '缺少 symbol' };
        break;
        
      case 'sync_kline':
        if (!symbol) {
          result = { success: false, error: '缺少 symbol' };
        } else {
          const period = body.period || 'day';
          result = await syncKline(supabase, symbol, period);
        }
        break;
        
      case 'sync_moneyflow':
        result = symbol ? await syncMoneyFlow(supabase, symbol) : { success: false, error: '缺少 symbol' };
        break;
        
      case 'sync_active':
        result = await syncActiveStocks(supabase, { kline: body.kline });
        break;
        
      case 'health':
      default:
        result = {
          status: 'healthy',
          service: 'sync-stock-data',
          timestamp: new Date().toISOString(),
          endpoints: [
            'GET/POST ?action=health - 健康检查',
            'POST {action:"sync_info", symbol:"600519"} - 同步单只股票',
            'POST {action:"sync_kline", symbol:"600519", period:"day"} - 同步K线',
            'POST {action:"sync_moneyflow", symbol:"600519"} - 同步资金流向',
            'POST {action:"sync_active", kline:true} - 同步活跃股票(自选+持仓+热门)',
          ],
        };
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
