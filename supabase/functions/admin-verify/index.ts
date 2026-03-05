// Edge Function: admin-verify
// 部署路径：supabase/functions/admin-verify/index.ts
// 功能：验证管理员IP白名单（登录前访问控制）

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 安全配置
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// 速率限制配置
const RATE_LIMIT_WINDOW = 60; // 60秒窗口
const RATE_LIMIT_MAX_REQUESTS = 100; // 最大请求数
const ipRequestCounts = new Map<string, { count: number, resetTime: number }>();

// CIDR匹配工具函数
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    if (!cidr.includes('/')) {
      return ip === cidr;
    }

    const [cidrIP, maskBits] = cidr.split('/');
    const mask = parseInt(maskBits, 10);
    
    // 将IP地址转换为32位整数
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

// 检查IP是否在白名单中（支持CIDR）
function isIPAllowed(clientIP: string, allowedIps: string[]): boolean {
  // 首先检查精确匹配
  if (allowedIps.includes(clientIP)) {
    return true;
  }
  
  // 检查CIDR匹配
  for (const cidr of allowedIps.filter(ip => ip.includes('/'))) {
    if (isIPInCIDR(clientIP, cidr)) {
      return true;
    }
  }
  
  // 检查前缀匹配（向后兼容）
  for (const prefix of allowedIps.filter(ip => ip.endsWith('.'))) {
    if (clientIP.startsWith(prefix)) {
      return true;
    }
  }
  
  return false;
}

// 速率限制检查
function checkRateLimit(clientIP: string): { allowed: boolean, remaining: number } {
  const now = Math.floor(Date.now() / 1000);
  const clientData = ipRequestCounts.get(clientIP);
  
  if (!clientData || clientData.resetTime < now) {
    // 新客户端或窗口重置
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
  // 处理浏览器预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 获取真实 IP (处理代理层)
    const xForwardedFor = req.headers.get("x-forwarded-for");
    const clientIP = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "unknown";
    
    // 2. 速率限制检查
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          error: 'rate_limit_exceeded',
          message: '请求过于频繁，请稍后再试'
        }),
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

    // 3. 读取IP白名单配置
    const allowedIpsRaw = Deno.env.get("ADMIN_ALLOWED_IPS") || "";
    const allowedIps = allowedIpsRaw.split(",").map(ip => ip.trim()).filter(ip => ip.length > 0);

    // 4. IP白名单验证
    const isAllowed = isIPAllowed(clientIP, allowedIps);
    
    if (!isAllowed) {
      // 不返回具体IP信息，避免信息泄露
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          error: 'ip_not_allowed',
          message: '访问被拒绝'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. 返回成功响应（不包含具体IP信息）
    return new Response(
      JSON.stringify({ 
        allowed: true,
        message: '访问已授权'
      }),
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
      JSON.stringify({ 
        error: 'internal_server_error',
        message: '服务器内部错误'
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})