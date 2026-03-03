// Edge Function: admin-verify
// 部署路径：supabase/functions/admin-verify/index.ts
// 功能：验证管理员权限（仅用于模拟/开发环境，生产环境需要签名验证）

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JwtPayload {
  sub?: string;
  email?: string;
  iat?: number;
  exp?: number;
  role?: string;
}

serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 只接受 GET 请求
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 获取 Authorization header
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: 'missing token', admin: false }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 解码 JWT payload（注意：这里不验证签名，仅用于开发/模拟环境）
    const parts = token.split('.');
    if (parts.length < 2) {
      return new Response(
        JSON.stringify({ ok: false, error: 'invalid token format', admin: false }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Base64 解码
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload: JwtPayload = JSON.parse(jsonPayload);

    console.log('JWT Payload:', {
      sub: payload.sub,
      email: payload.email,
      exp: payload.exp,
    });

    // 验证 sub 字段是否存在（关键！）
    if (!payload.sub) {
      console.error('JWT missing sub claim');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'invalid claim: missing sub claim',
          admin: false 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 简单的管理员验证逻辑（基于邮箱白名单）
    const adminEmails = [
      'admin@zhengyu.com',
      'root@local.dev',
      'superadmin@zhengyu.com',
    ];

    const isAdmin = adminEmails.includes(payload.email || '');

    console.log('Admin verification result:', {
      email: payload.email,
      isAdmin,
      sub: payload.sub,
    });

    // 返回结果
    return new Response(
      JSON.stringify({
        ok: true,
        admin: isAdmin,
        payload: {
          sub: payload.sub,
          email: payload.email,
          iat: payload.iat,
          exp: payload.exp,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err: any) {
    console.error('Edge Function error:', err);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: err.message || 'internal server error',
        admin: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
