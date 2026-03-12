/**
 * 银和数据 API Edge Function
 * 银和数据是免费的公开API，无需API Key
 * 文档: https://yinhedata.com/DataDocs/index.html
 * 
 * 支持的数据类型：
 * - 实时行情：/stock/realtime
 * - 60分钟K线：/stock/kline/60m
 * - 3秒高频tick：/stock/tick
 * - 五档行情：/stock/orderbook
 * 
 * 部署: supabase functions deploy yinhe-data
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// 银和数据公开API基础URL（免费，无需API Key）
const YINHE_BASE_URL = 'https://api.yinhedata.com';

// 响应包装器
const successResponse = (data: unknown, source: string = 'yinhe') => ({
  success: true,
  data,
  source,
  timestamp: new Date().toISOString(),
});

const errorResponse = (message: string, code: number = 500) => ({
  success: false,
  error: message,
  code,
  timestamp: new Date().toISOString(),
});

// ==================== 银和数据API调用 ====================

/**
 * 获取实时行情
 * 文档: https://yinhedata.com/DataDocs/index.html
 */
async function getRealtimeQuote(symbol: string) {
  // 银和数据实时行情接口
  const url = `${YINHE_BASE_URL}/stock/realtime?code=${symbol}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取实时行情失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取批量实时行情
 */
async function getBatchQuotes(symbols: string[]) {
  const codes = symbols.join(',');
  const url = `${YINHE_BASE_URL}/stock/realtime?codes=${codes}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取批量行情失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取K线数据
 * period: 1m, 5m, 15m, 30m, 60m, day, week, month
 */
async function getKline(symbol: string, period: string = 'day', limit: number = 100) {
  const url = `${YINHE_BASE_URL}/stock/kline?code=${symbol}&period=${period}&limit=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取K线数据失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取五档行情
 */
async function getOrderbook(symbol: string) {
  const url = `${YINHE_BASE_URL}/stock/orderbook?code=${symbol}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取五档行情失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取Tick数据（3秒高频）
 */
async function getTickData(symbol: string, date?: string) {
  const dateParam = date || new Date().toISOString().split('T')[0];
  const url = `${YINHE_BASE_URL}/stock/tick?code=${symbol}&date=${dateParam}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取Tick数据失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取资金流向
 */
async function getMoneyFlow(symbol: string) {
  const url = `${YINHE_BASE_URL}/stock/moneyflow?code=${symbol}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取资金流向失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取股票列表
 * market: sh(上海), sz(深圳)
 */
async function getStockList(market: string = 'all') {
  const url = `${YINHE_BASE_URL}/stock/list?market=${market}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取股票列表失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取涨停股票
 */
async function getLimitUp() {
  const url = `${YINHE_BASE_URL}/stock/limitup`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取涨停股票失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取跌停股票
 */
async function getLimitDown() {
  const url = `${YINHE_BASE_URL}/stock/limitdown`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取跌停股票失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取新股申购列表
 */
async function getIPOList() {
  const url = `${YINHE_BASE_URL}/ipo/list`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取新股列表失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取龙虎榜数据
 */
async function getDragonTiger(date?: string) {
  const dateParam = date || new Date().toISOString().split('T')[0];
  const url = `${YINHE_BASE_URL}/market/dragontiger?date=${dateParam}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取龙虎榜失败: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 获取板块行情
 */
async function getSectors() {
  const url = `${YINHE_BASE_URL}/market/sectors`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`获取板块行情失败: ${response.status}`);
  }
  
  return await response.json();
}

// ==================== 路由处理器 ====================

serve(async (req) => {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/functions/v1/yinhe-data', '');
  const method = req.method;

  try {
    // 健康检查
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'yinhe-data',
        message: '银和数据API代理服务运行正常',
        apiType: '免费公开API，无需API Key',
        endpoints: [
          'GET /quote?code=股票代码 - 获取实时行情',
          'GET /quotes?codes=代码1,代码2 - 批量获取行情',
          'GET /kline?code=股票代码&period=周期&limit=数量 - 获取K线',
          'GET /orderbook?code=股票代码 - 获取五档行情',
          'GET /tick?code=股票代码&date=日期 - 获取3秒高频Tick',
          'GET /moneyflow?code=股票代码 - 获取资金流向',
          'GET /stocklist?market=市场 - 获取股票列表',
          'GET /limitup - 获取涨停股',
          'GET /limitdown - 获取跌停股',
          'GET /ipo - 获取新股申购',
          'GET /dragontiger?date=日期 - 获取龙虎榜',
          'GET /sectors - 获取板块行情',
        ],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 获取单只股票实时行情
    if (path === '/quote' && method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response(JSON.stringify(errorResponse('缺少 code 参数', 400)), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await getRealtimeQuote(code);
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 批量获取行情
    if (path === '/quotes' && method === 'GET') {
      const codes = url.searchParams.get('codes');
      if (!codes) {
        return new Response(JSON.stringify(errorResponse('缺少 codes 参数', 400)), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await getBatchQuotes(codes.split(','));
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取K线数据
    if (path === '/kline' && method === 'GET') {
      const code = url.searchParams.get('code');
      const period = url.searchParams.get('period') || 'day';
      const limit = parseInt(url.searchParams.get('limit') || '100');
      
      if (!code) {
        return new Response(JSON.stringify(errorResponse('缺少 code 参数', 400)), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await getKline(code, period, limit);
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取五档行情
    if (path === '/orderbook' && method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response(JSON.stringify(errorResponse('缺少 code 参数', 400)), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await getOrderbook(code);
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取Tick数据（3秒高频）
    if (path === '/tick' && method === 'GET') {
      const code = url.searchParams.get('code');
      const date = url.searchParams.get('date');
      
      if (!code) {
        return new Response(JSON.stringify(errorResponse('缺少 code 参数', 400)), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await getTickData(code, date || undefined);
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取资金流向
    if (path === '/moneyflow' && method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response(JSON.stringify(errorResponse('缺少 code 参数', 400)), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await getMoneyFlow(code);
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取股票列表
    if (path === '/stocklist' && method === 'GET') {
      const market = url.searchParams.get('market') || 'all';
      const data = await getStockList(market);
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取涨停股票
    if (path === '/limitup' && method === 'GET') {
      const data = await getLimitUp();
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取跌停股票
    if (path === '/limitdown' && method === 'GET') {
      const data = await getLimitDown();
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取新股申购
    if (path === '/ipo' && method === 'GET') {
      const data = await getIPOList();
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取龙虎榜
    if (path === '/dragontiger' && method === 'GET') {
      const date = url.searchParams.get('date');
      const data = await getDragonTiger(date || undefined);
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取板块行情
    if (path === '/sectors' && method === 'GET') {
      const data = await getSectors();
      return new Response(JSON.stringify(successResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 未知路由
    return new Response(JSON.stringify(errorResponse('未知的API路径', 404)), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('银和数据API调用错误:', error);
    return new Response(JSON.stringify(errorResponse(error.message || '服务器内部错误', 500)), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
