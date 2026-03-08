/**
 * 银禾数据 API Edge Function
 * 代理银禾数据 API，统一处理和缓存
 * 文档: https://yinhedata.com/interface/index.html
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

// 银禾数据 API 基础配置
const YINHE_BASE_URL = 'https://api.yinhedata.com/v1';
const YINHE_API_KEY = Deno.env.get('YINHE_API_KEY') || '';

// 响应包装器
const successResponse = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const errorResponse = (message: string, code: number = 500) => ({
  success: false,
  error: message,
  code,
  timestamp: new Date().toISOString(),
});

// 通用 fetch 封装
async function fetchYinheAPI(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${YINHE_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${YINHE_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }
  
  return await response.json();
}

// 路由处理器
const handlers: Record<string, (req: Request, url: URL) => Promise<Response>> = {
  // 健康检查
  '/health': async () => {
    return new Response(JSON.stringify({
      status: 'healthy',
      service: 'yinhe-data',
      apiKeyConfigured: !!YINHE_API_KEY,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  },

  // 获取股票行情列表
  '/api/quotes': async (req, url) => {
    const symbols = url.searchParams.get('symbols');
    const data = await fetchYinheAPI('/quotes', { symbols: symbols || undefined });
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取单只股票行情
  '/api/quote/:symbol': async (req, url) => {
    const pathParts = url.pathname.split('/');
    const symbol = pathParts[pathParts.length - 1];
    const data = await fetchYinheAPI(`/quote/${symbol}`);
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取涨停股票列表
  '/api/limit-up': async () => {
    const data = await fetchYinheAPI('/market/limit-up');
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取跌停股票列表
  '/api/limit-down': async () => {
    const data = await fetchYinheAPI('/market/limit-down');
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取新股申购列表
  '/api/ipo': async () => {
    const data = await fetchYinheAPI('/ipo/list');
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取K线数据
  '/api/kline/:symbol': async (req, url) => {
    const pathParts = url.pathname.split('/');
    const symbol = pathParts[pathParts.length - 1];
    const period = url.searchParams.get('period') || 'day';
    const limit = url.searchParams.get('limit') || '100';
    const data = await fetchYinheAPI(`/kline/${symbol}`, { period, limit });
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取资金流向
  '/api/money-flow/:symbol': async (req, url) => {
    const pathParts = url.pathname.split('/');
    const symbol = pathParts[pathParts.length - 1];
    const data = await fetchYinheAPI(`/money-flow/${symbol}`);
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取龙虎榜数据
  '/api/dragon-tiger': async (req, url) => {
    const date = url.searchParams.get('date');
    const data = await fetchYinheAPI('/market/dragon-tiger', { date: date || undefined });
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取股票列表
  '/api/stock-list': async (req, url) => {
    const market = url.searchParams.get('market');
    const data = await fetchYinheAPI('/stocks/list', { market: market || undefined });
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取财务数据
  '/api/financial/:symbol': async (req, url) => {
    const pathParts = url.pathname.split('/');
    const symbol = pathParts[pathParts.length - 1];
    const data = await fetchYinheAPI(`/financial/${symbol}`);
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取板块行情
  '/api/sectors': async () => {
    const data = await fetchYinheAPI('/sectors');
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 获取概念板块
  '/api/concepts': async () => {
    const data = await fetchYinheAPI('/concepts');
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  // 搜索股票
  '/api/search': async (req, url) => {
    const keyword = url.searchParams.get('keyword');
    if (!keyword) {
      return new Response(JSON.stringify(errorResponse('缺少 keyword 参数', 400)), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await fetchYinheAPI('/search', { keyword });
    return new Response(JSON.stringify(successResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};

// 路由匹配
function matchRoute(path: string): { handler: keyof typeof handlers; params?: Record<string, string> } | null {
  // 精确匹配
  if (handlers[path]) {
    return { handler: path as keyof typeof handlers };
  }

  // 动态路由匹配
  const patterns = [
    { pattern: /^\/api\/quote\/(.+)$/, handler: '/api/quote/:symbol' },
    { pattern: /^\/api\/kline\/(.+)$/, handler: '/api/kline/:symbol' },
    { pattern: /^\/api\/money-flow\/(.+)$/, handler: '/api/money-flow/:symbol' },
    { pattern: /^\/api\/financial\/(.+)$/, handler: '/api/financial/:symbol' },
  ];

  for (const { pattern, handler } of patterns) {
    const match = path.match(pattern);
    if (match) {
      return { handler: handler as keyof typeof handlers, params: { symbol: match[1] } };
    }
  }

  return null;
}

// 主处理函数
serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // 检查 API Key 配置
    if (!YINHE_API_KEY) {
      return new Response(JSON.stringify(errorResponse('YINHE_API_KEY 未配置')), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 匹配路由
    const routeMatch = matchRoute(path);
    
    if (routeMatch) {
      const handler = handlers[routeMatch.handler];
      if (handler) {
        return await handler(req, url);
      }
    }

    // 404 处理
    return new Response(JSON.stringify(errorResponse('接口不存在', 404)), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(JSON.stringify(errorResponse(error instanceof Error ? error.message : '内部服务器错误')), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
