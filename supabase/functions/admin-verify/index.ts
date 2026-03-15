/**
 * 管理员验证 Edge Function
 * 用于验证管理员访问权限（IP 白名单）
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  verifyIPWhitelist,
  getClientIP,
  jsonResponse,
  errorResponse,
  CORS_HEADERS
} from './_shared/mod.ts'

// 速率限制配置
const RATE_LIMIT_WINDOW = 60
const RATE_LIMIT_MAX_REQUESTS = 100
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * 速率限制检查
 */
function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number } {
  const now = Math.floor(Date.now() / 1000)
  const clientData = ipRequestCounts.get(clientIP)
  
  if (!clientData || clientData.resetTime < now) {
    ipRequestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }
  
  clientData.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - clientData.count }
}

// CORS 头
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*"
const corsHeaders = {
  ...CORS_HEADERS,
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Credentials': 'true'
}

serve(async (req) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 获取客户端 IP
    const clientIP = getClientIP(req)

    // 速率限制
    const rateLimit = checkRateLimit(clientIP)
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
      )
    }

    // IP 白名单验证
    const ipResult = verifyIPWhitelist(req)
    
    if (!ipResult.allowed) {
      return new Response(
        JSON.stringify({ allowed: false, error: 'ip_not_allowed', message: ipResult.error || '访问被拒绝' }),
        { 
          status: 403, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          } 
        }
      )
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
    )
  } catch (err) {
    console.error('[admin-verify] 错误:', err)
    return errorResponse('服务器内部错误')
  }
})
