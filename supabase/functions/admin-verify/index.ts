// Edge Function: admin-verify (修改版，兼容无 JWT)
// 部署路径：supabase/functions/admin-verify/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 从环境变量获取允许的域名，若未设置则默认允许您的生产域名
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://www.zhengyutouzi.com";
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true', // 允许携带凭证（cookies），但函数不依赖 JWT，保留无妨
};

// 速率限制配置（保持不变）
const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX_REQUESTS = 100;
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

// CIDR匹配工具函数（保持不变）
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    if (!cidr.includes('/')) return ip === cidr;
    const [cidrIP, maskBits] = cidr.split('/');
    const mask = parseInt(maskBits, 10);
    function ipToInt(ip: string): number {
      return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
    }
    const ipInt = ipToInt(ip);
    const cidrInt = ipToInt(cidrIP);
    const maskInt = ~((1 << (32 - mask)) - 1) >>> 0;
    return (ipInt & maskInt) === (cidrInt & maskInt);
  } catch {
    return false;
  }
}

function isIPAllowed(clientIP: string, allowedIps: string[]): boolean {
  if (allowedIps.includes(clientIP)) return true;
  for (const cidr of allowedIps.filter(ip => ip.includes('/'))) {
    if (isIPInCIDR(clientIP, cidr)) return true;
  }
  for (const prefix of allowedIps.filter(ip => ip.endsWith('.'))) {
    if (clientIP.startsWith(prefix)) return true;
  }
  return false;
}

function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number } {
  const now = Math.floor(Date.now() / 1000);
  const clientData = ipRequestCounts.get(clientIP);
  if (!clientData || clientData.resetTime < now) {
    ipRequestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  clientData.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - clientData.count };
}

serve(async (req) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 获取客户端 IP
    const xForwardedFor = req.headers.get("x-forwarded-for");
    const clientIP = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "unknown";

    // 速率限制
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ allowed: false, error: 'rate_limit_exceeded', message: '请求过于频繁' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': RATE_LIMIT_WINDOW.toString(),
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW).toString()
          }
        }
      );
    }

    // 读取 IP 白名单（环境变量）
    const allowedIpsRaw = Deno.env.get("ADMIN_ALLOWED_IPS") || "";
    const allowedIps = allowedIpsRaw.split(",").map(ip => ip.trim()).filter(ip => ip.length > 0);

    // IP 验证
    const isAllowed = isIPAllowed(clientIP, allowedIps);
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ allowed: false, error: 'ip_not_allowed', message: '访问被拒绝' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 成功响应
    return new Response(
      JSON.stringify({ allowed: true, message: '访问已授权' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW).toString()
        }
      }
    );
  } catch (err) {
    console.error('Admin verify error:', err);
    return new Response(
      JSON.stringify({ error: 'internal_server_error', message: '服务器内部错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});