/**
 * 管理员验证模块
 * 提供统一的管理员权限验证功能
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { 
  jsonResponse, 
  errorResponse,
  forbiddenResponse,
  CORS_HEADERS 
} from './response.ts'

/**
 * 管理员级别
 */
export type AdminLevel = 'super_admin' | 'admin' | 'user'

/**
 * 管理员验证结果
 */
export interface AdminVerifyResult {
  isValid: boolean
  userId?: string
  adminLevel?: AdminLevel
  error?: Response
}

/**
 * IP 白名单验证结果
 */
export interface IPVerifyResult {
  allowed: boolean
  error?: string
}

/**
 * CIDR 匹配工具函数
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    if (!cidr.includes('/')) return ip === cidr
    
    const [cidrIP, maskBits] = cidr.split('/')
    const mask = parseInt(maskBits, 10)
    
    function ipToInt(ip: string): number {
      return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0
    }
    
    const ipInt = ipToInt(ip)
    const cidrInt = ipToInt(cidrIP)
    const maskInt = ~((1 << (32 - mask)) - 1) >>> 0
    
    return (ipInt & maskInt) === (cidrInt & maskInt)
  } catch {
    return false
  }
}

/**
 * 检查 IP 是否在白名单中
 */
export function isIPAllowed(clientIP: string, allowedIps: string[]): boolean {
  // 空白名单表示允许所有
  if (allowedIps.length === 0) return true
  
  // 精确匹配
  if (allowedIps.includes(clientIP)) return true
  
  // CIDR 匹配
  for (const cidr of allowedIps.filter(ip => ip.includes('/'))) {
    if (isIPInCIDR(clientIP, cidr)) return true
  }
  
  // 前缀匹配
  for (const prefix of allowedIps.filter(ip => ip.endsWith('.'))) {
    if (clientIP.startsWith(prefix)) return true
  }
  
  return false
}

/**
 * 获取客户端真实 IP
 */
export function getClientIP(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for')
  return xForwardedFor ? xForwardedFor.split(',')[0].trim() : 'unknown'
}

/**
 * 验证 IP 白名单
 */
export function verifyIPWhitelist(req: Request): IPVerifyResult {
  const clientIP = getClientIP(req)
  const allowedIpsRaw = Deno.env.get('ADMIN_ALLOWED_IPS') || ''
  const allowedIps = allowedIpsRaw.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0)
  
  // 未配置白名单，允许所有 IP
  if (allowedIps.length === 0) {
    return { allowed: true }
  }
  
  const allowed = isIPAllowed(clientIP, allowedIps)
  
  if (!allowed) {
    console.warn(`[admin] IP ${clientIP} 不在白名单中`)
    return { allowed: false, error: 'IP 不在白名单中' }
  }
  
  return { allowed: true }
}

/**
 * 验证管理员权限（完整验证流程）
 * 1. 验证 JWT Token
 * 2. 验证用户角色
 * 3. 验证管理员级别
 * 4. 可选：验证 IP 白名单
 */
export async function verifyAdminAccess(
  req: Request,
  options: {
    requireSuperAdmin?: boolean
    checkIPWhitelist?: boolean
  } = {}
): Promise<AdminVerifyResult> {
  const { requireSuperAdmin = false, checkIPWhitelist = false } = options
  
  // 可选的 IP 白名单检查
  if (checkIPWhitelist) {
    const ipResult = verifyIPWhitelist(req)
    if (!ipResult.allowed) {
      return {
        isValid: false,
        error: forbiddenResponse(ipResult.error || '访问被拒绝')
      }
    }
  }
  
  // 获取 Authorization header
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
    return {
      isValid: false,
      error: errorResponse('未提供认证信息', 401)
    }
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  // 创建认证客户端
  const authClient = createClient(
    Deno.env.get('VITE_SUPABASE_URL') ?? '',
    Deno.env.get('VITE_SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  
  // 验证 Token
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  
  if (authError || !user) {
    return {
      isValid: false,
      error: errorResponse('登录已过期，请重新登录', 401)
    }
  }
  
  // 创建服务端客户端查询用户档案
  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL') ?? '',
    Deno.env.get('VITE_SUPABASE_SERVICE_KEY') ?? ''
  )
  
  // 查询用户档案
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, admin_level')
    .eq('id', user.id)
    .maybeSingle()
  
  if (profileError) {
    console.error('[admin] 查询用户档案失败:', profileError)
    return {
      isValid: false,
      error: errorResponse('服务器错误', 500)
    }
  }
  
  if (!profile) {
    return {
      isValid: false,
      error: forbiddenResponse('用户档案不存在')
    }
  }
  
  // 验证管理员级别
  const adminLevel = profile.admin_level as AdminLevel
  const isAdmin = profile.role === 'admin' || 
    ['admin', 'super_admin'].includes(adminLevel || '')
  
  if (!isAdmin) {
    return {
      isValid: false,
      error: forbiddenResponse('权限不足')
    }
  }
  
  // 如果需要超级管理员
  if (requireSuperAdmin && adminLevel !== 'super_admin') {
    return {
      isValid: false,
      error: forbiddenResponse('需要超级管理员权限')
    }
  }
  
  return {
    isValid: true,
    userId: user.id,
    adminLevel
  }
}

/**
 * 创建管理员中间件
 * 用于包装需要管理员权限的函数
 */
export function withAdminAuth<T>(
  handler: (req: Request, context: { userId: string; adminLevel: AdminLevel }) => Promise<T>,
  options?: {
    requireSuperAdmin?: boolean
    checkIPWhitelist?: boolean
  }
): (req: Request) => Promise<T | Response> {
  return async (req: Request) => {
    const result = await verifyAdminAccess(req, options)
    
    if (!result.isValid || !result.userId) {
      return result.error!
    }
    
    return handler(req, { userId: result.userId, adminLevel: result.adminLevel! })
  }
}

/**
 * 记录管理员操作日志
 */
export async function logAdminOperation(
  supabase: any,
  params: {
    adminId: string
    operationType: string
    targetType: string
    targetId?: string
    details?: any
    req: Request
  }
): Promise<void> {
  const { adminId, operationType, targetType, targetId, details, req } = params
  
  try {
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId,
      operation_type: operationType,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: getClientIP(req),
      user_agent: req.headers.get('user-agent'),
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[admin] 记录操作日志失败:', error)
  }
}
