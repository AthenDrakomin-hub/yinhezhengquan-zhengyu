/**
 * 登录 Edge Function
 * 支持登录失败限制（防暴力破解）和审计日志
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 登录失败限制配置
const LOGIN_LIMIT = {
  MAX_ATTEMPTS: 5,        // 最大尝试次数
  LOCKOUT_DURATION: 900,  // 锁定时间（秒），15分钟
  WINDOW_DURATION: 3600,  // 统计窗口（秒），1小时
}

// 内存缓存（简单实现，生产环境建议使用 Redis）
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>()

// 清理过期记录
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.firstAttempt > LOGIN_LIMIT.WINDOW_DURATION * 1000) {
      loginAttempts.delete(key)
    }
  }
}, 60000) // 每分钟清理一次

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  // 获取客户端标识（IP 或设备指纹）
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const deviceId = req.headers.get('x-device-id') || ''

  try {
    const { email, password } = await req.json()
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: '邮箱和密码必填' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 检查是否被锁定
    const lockKey = `${clientIp}:${email}`
    const attempts = loginAttempts.get(lockKey)
    const now = Date.now()

    if (attempts) {
      // 检查是否在锁定期内
      if (attempts.lockedUntil && now < attempts.lockedUntil) {
        const remainingTime = Math.ceil((attempts.lockedUntil - now) / 1000 / 60)
        await logLoginAttempt(email, clientIp, userAgent, false, '账户锁定中', deviceId)
        return new Response(JSON.stringify({ 
          error: `尝试次数过多，请 ${remainingTime} 分钟后再试`,
          code: 'ACCOUNT_LOCKED',
          remainingTime
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 检查是否超过最大尝试次数
      if (attempts.count >= LOGIN_LIMIT.MAX_ATTEMPTS) {
        const lockedUntil = now + LOGIN_LIMIT.LOCKOUT_DURATION * 1000
        loginAttempts.set(lockKey, { ...attempts, lockedUntil })
        
        await logLoginAttempt(email, clientIp, userAgent, false, '超过最大尝试次数', deviceId)
        return new Response(JSON.stringify({ 
          error: `尝试次数过多，请 15 分钟后再试`,
          code: 'TOO_MANY_ATTEMPTS'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 连接数据库
    const databaseUrl = Deno.env.get('POSTGRES_URL')!
    const { Pool } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const pool = new Pool(databaseUrl, 1)
    const client = await pool.connect()

    try {
      // 1. 验证用户是否存在
      const userResult = await client.queryObject`
        SELECT id, email, encrypted_password, is_locked, locked_until
        FROM auth.users 
        WHERE email = ${email}
      `
      
      if (userResult.rows.length === 0) {
        // 记录失败尝试
        recordFailedAttempt(lockKey)
        await logLoginAttempt(email, clientIp, userAgent, false, '用户不存在', deviceId)
        
        return new Response(JSON.stringify({ 
          error: '用户名或密码错误',
          code: 'INVALID_CREDENTIALS'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const user = userResult.rows[0] as any

      // 2. 检查账户是否被锁定
      if (user.is_locked && user.locked_until && new Date(user.locked_until) > new Date()) {
        await logLoginAttempt(email, clientIp, userAgent, false, '账户已被锁定', deviceId)
        return new Response(JSON.stringify({ 
          error: '账户已被锁定，请联系客服',
          code: 'ACCOUNT_LOCKED'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 3. 验证密码
      const pwResult = await client.queryObject`
        SELECT crypt(${password}, encrypted_password) = encrypted_password as valid
        FROM auth.users WHERE email = ${email}
      `
      
      if (!pwResult.rows[0]?.valid) {
        // 记录失败尝试
        recordFailedAttempt(lockKey)
        await logLoginAttempt(email, clientIp, userAgent, false, '密码错误', deviceId)
        
        // 返回剩余尝试次数
        const currentAttempts = loginAttempts.get(lockKey)?.count || 1
        const remaining = LOGIN_LIMIT.MAX_ATTEMPTS - currentAttempts
        
        return new Response(JSON.stringify({ 
          error: '用户名或密码错误',
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: remaining > 0 ? remaining : 0
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 4. 登录成功，清除失败记录
      loginAttempts.delete(lockKey)
      
      // 清除账户锁定状态
      await client.queryObject`
        UPDATE auth.users 
        SET is_locked = false, locked_until = null
        WHERE id = ${user.id}
      `

      // 5. 获取 profile
      const profileResult = await client.queryObject`
        SELECT id, email, username, admin_level, status, is_admin
        FROM public.profiles
        WHERE id = ${user.id}
      `
      
      const profile = profileResult.rows[0]

      // 6. 创建会话
      const sessionResult = await client.queryObject`
        INSERT INTO auth.sessions (user_id, expires_at)
        VALUES (${user.id}, NOW() + INTERVAL '24 hours')
        RETURNING id::text as session_id
      `

      // 7. 记录成功登录
      await logLoginAttempt(email, clientIp, userAgent, true, '登录成功', deviceId, user.id)

      // 8. 更新最后登录时间
      await client.queryObject`
        UPDATE public.profiles 
        SET last_login_at = NOW(), last_login_ip = ${clientIp}
        WHERE id = ${user.id}
      `

      const responseTime = Date.now() - startTime
      console.log(`[登录成功] email=${email}, ip=${clientIp}, time=${responseTime}ms`)

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          ...profile
        },
        session_id: sessionResult.rows[0]?.session_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } finally {
      client.release()
      await pool.end()
    }

  } catch (err: any) {
    console.error('登录错误:', err)
    
    // 记录系统错误
    await logLoginAttempt('unknown', clientIp, userAgent, false, `系统错误: ${err.message}`, deviceId)
    
    return new Response(JSON.stringify({ 
      error: '服务器错误，请稍后重试',
      code: 'SERVER_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/**
 * 记录失败的登录尝试
 */
function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const attempts = loginAttempts.get(key)
  
  if (attempts) {
    // 检查是否在统计窗口内
    if (now - attempts.firstAttempt < LOGIN_LIMIT.WINDOW_DURATION * 1000) {
      loginAttempts.set(key, { ...attempts, count: attempts.count + 1 })
    } else {
      // 重置计数
      loginAttempts.set(key, { count: 1, firstAttempt: now })
    }
  } else {
    loginAttempts.set(key, { count: 1, firstAttempt: now })
  }
}

/**
 * 记录登录尝试日志
 */
async function logLoginAttempt(
  email: string,
  ip: string,
  userAgent: string,
  success: boolean,
  message: string,
  deviceId: string,
  userId?: string
): Promise<void> {
  try {
    const databaseUrl = Deno.env.get('POSTGRES_URL')!
    const { Pool } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const pool = new Pool(databaseUrl, 1)
    const client = await pool.connect()

    try {
      // 插入登录审计日志
      await client.queryObject`
        INSERT INTO login_audit_logs (
          email, user_id, ip_address, user_agent, device_id,
          success, message, created_at
        ) VALUES (
          ${email}, ${userId || null}, ${ip}, ${userAgent}, ${deviceId || null},
          ${success}, ${message}, NOW()
        )
      `
    } finally {
      client.release()
      await pool.end()
    }
  } catch (error) {
    console.error('记录登录日志失败:', error)
  }
}
