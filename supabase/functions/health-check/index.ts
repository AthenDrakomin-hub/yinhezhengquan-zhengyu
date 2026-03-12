import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Redis 配置
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')!
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!

// 告警 Webhook URL（可选配置）
const ALERT_WEBHOOK_URL = Deno.env.get('ALERT_WEBHOOK_URL') // Slack/Discord/企业微信 Webhook
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') // 邮件告警（需要邮件服务）

// 健康检查结果缓存键
const HEALTH_CHECK_KEY = 'health:status'
const HEALTH_CHECK_TTL = 300 // 5分钟

interface HealthStatus {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    redis: { status: boolean; latency?: number; error?: string };
    eastmoney: { status: boolean; latency?: number; error?: string };
    edgeFunction: { status: boolean; latency?: number; error?: string };
  };
  uptime: number;
  version: string;
}

// Redis 连接检查
async function checkRedis(): Promise<{ status: boolean; latency?: number; error?: string }> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return { status: false, error: 'Redis credentials not configured' }
  }
  
  const start = Date.now()
  try {
    const response = await fetch(`${REDIS_URL}/ping`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    })
    const data = await response.json()
    const latency = Date.now() - start
    
    if (data.result === 'PONG' || response.ok) {
      return { status: true, latency }
    }
    return { status: false, error: 'Redis ping failed' }
  } catch (error: any) {
    return { status: false, error: error.message }
  }
}

// 东方财富 API 检查
async function checkEastmoneyAPI(): Promise<{ status: boolean; latency?: number; error?: string }> {
  const start = Date.now()
  try {
    const response = await fetch('https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=1.600519', {
      headers: { 'Referer': 'https://quote.eastmoney.com/' },
      signal: AbortSignal.timeout(5000) // 5秒超时
    })
    
    const data = await response.json()
    const latency = Date.now() - start
    
    if (data?.data?.diff?.length > 0) {
      return { status: true, latency }
    }
    return { status: false, error: 'Invalid response from Eastmoney API' }
  } catch (error: any) {
    return { status: false, error: error.message }
  }
}

// Edge Function 自检
async function checkEdgeFunction(): Promise<{ status: boolean; latency?: number; error?: string }> {
  const start = Date.now()
  try {
    // 调用 proxy-market 进行自检
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const response = await fetch(`${supabaseUrl}/functions/v1/proxy-market?action=realtime&market=CN&symbols=600519`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const data = await response.json()
    const latency = Date.now() - start
    
    if (data?.success && data?.data) {
      return { status: true, latency }
    }
    return { status: false, error: 'Invalid response from proxy-market' }
  } catch (error: any) {
    return { status: false, error: error.message }
  }
}

// 发送告警
async function sendAlert(status: HealthStatus): Promise<void> {
  const message = {
    title: `🚨 行情服务健康检查告警`,
    timestamp: status.timestamp,
    status: status.status,
    checks: Object.entries(status.checks)
      .map(([name, result]) => `${name}: ${result.status ? '✅' : '❌'} ${result.error || `(${result.latency}ms)`}`)
      .join('\n'),
    details: status.checks
  }
  
  // Webhook 告警
  if (ALERT_WEBHOOK_URL) {
    try {
      // 支持多种 Webhook 格式
      const isSlack = ALERT_WEBHOOK_URL.includes('slack')
      const isDiscord = ALERT_WEBHOOK_URL.includes('discord')
      const isWeChat = ALERT_WEBHOOK_URL.includes('qyapi') // 企业微信
      
      let payload: any = { text: `${message.title}\n${message.checks}` }
      
      if (isSlack) {
        payload = {
          text: message.title,
          attachments: [{
            color: status.status === 'unhealthy' ? 'danger' : 'warning',
            fields: Object.entries(status.checks).map(([name, result]) => ({
              title: name,
              value: result.status ? `✅ OK (${result.latency}ms)` : `❌ ${result.error}`,
              short: true
            }))
          }]
        }
      } else if (isDiscord) {
        payload = {
          content: message.title,
          embeds: [{
            color: status.status === 'unhealthy' ? 15158332 : 16776960,
            fields: Object.entries(status.checks).map(([name, result]) => ({
              name,
              value: result.status ? `✅ OK (${result.latency}ms)` : `❌ ${result.error}`,
              inline: true
            }))
          }]
        }
      } else if (isWeChat) {
        payload = {
          msgtype: 'markdown',
          markdown: {
            content: `## ${message.title}\n> 状态: **${status.status}**\n> 时间: ${status.timestamp}\n\n${message.checks.replace(/\n/g, '\n> ')}`
          }
        }
      }
      
      await fetch(ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      console.error('[health-check] 发送告警失败:', error)
    }
  }
  
  // 邮件告警（如果有配置邮件服务）
  // if (ALERT_EMAIL) { ... }
  
  // 写入日志
  console.error('[health-check] 服务异常:', JSON.stringify(status, null, 2))
}

// 保存健康状态到 Redis
async function saveHealthStatus(status: HealthStatus): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) return
  
  try {
    await fetch(`${REDIS_URL}/setex/${encodeURIComponent(`galaxy:${HEALTH_CHECK_KEY}`)}/${HEALTH_CHECK_TTL}/${encodeURIComponent(JSON.stringify(status))}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    })
  } catch {
    // 静默失败
  }
}

// 获取上次健康状态
async function getLastHealthStatus(): Promise<HealthStatus | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null
  
  try {
    const response = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`galaxy:${HEALTH_CHECK_KEY}`)}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    })
    const data = await response.json()
    return data.result ? JSON.parse(data.result) : null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    // 执行所有检查
    const [redisCheck, eastmoneyCheck, edgeCheck] = await Promise.all([
      checkRedis(),
      checkEastmoneyAPI(),
      checkEdgeFunction()
    ])
    
    // 判断整体状态
    const allChecks = [redisCheck, eastmoneyCheck, edgeCheck]
    const healthyCount = allChecks.filter(c => c.status).length
    
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyCount === 3) {
      status = 'healthy'
    } else if (healthyCount >= 1) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }
    
    const healthStatus: HealthStatus = {
      timestamp: new Date().toISOString(),
      status,
      checks: {
        redis: redisCheck,
        eastmoney: eastmoneyCheck,
        edgeFunction: edgeCheck
      },
      uptime: Date.now() - startTime,
      version: '1.0.0'
    }
    
    // 保存状态
    await saveHealthStatus(healthStatus)
    
    // 如果状态恶化，发送告警
    const lastStatus = await getLastHealthStatus()
    if (status === 'unhealthy' || 
        (status === 'degraded' && lastStatus?.status === 'healthy')) {
      await sendAlert(healthStatus)
    }
    
    // 返回结果
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503
    
    return new Response(JSON.stringify(healthStatus, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: httpStatus
    })
    
  } catch (error: any) {
    const errorStatus: HealthStatus = {
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      checks: {
        redis: { status: false, error: 'Check failed' },
        eastmoney: { status: false, error: 'Check failed' },
        edgeFunction: { status: false, error: 'Check failed' }
      },
      uptime: Date.now() - startTime,
      version: '1.0.0'
    }
    
    await sendAlert(errorStatus)
    
    return new Response(JSON.stringify({ error: error.message, ...errorStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
