/**
 * 用户认证模块
 * 支持 JWT 验证和开发环境降级
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { 
  jsonResponse, 
  errorResponse, 
  unauthorizedResponse,
  invalidTokenResponse,
  CORS_HEADERS 
} from './response.ts'

/**
 * 认证结果
 */
export interface AuthResult {
  userId: string | null
  error: Response | null
}

/**
 * 验证用户身份（JWT Token）
 * 
 * 生产环境建议：
 * 1. 部署时不使用 --no-verify-jwt，让 Supabase 网关自动验证
 * 2. 在函数内部调用 getUser 获取用户信息
 * 
 * @param req 请求对象
 * @returns 用户ID或错误响应
 */
export async function authenticateUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization')
  
  // 优先使用 Authorization header
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    
    // 创建认证客户端
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: `Bearer ${token}` } 
        } 
      }
    )
    
    // 验证 Token
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    
    if (authError || !user) {
      console.warn('[认证失败] Token 无效:', authError?.message)
      
      // 开发环境降级：尝试从请求体获取用户ID
      const fallbackResult = await tryFallbackAuth(req)
      if (fallbackResult.userId) {
        console.warn('[开发模式] 使用降级认证，userId:', fallbackResult.userId)
        return fallbackResult
      }
      
      return { userId: null, error: invalidTokenResponse('登录已过期，请重新登录') }
    }
    
    return { userId: user.id, error: null }
  }
  
  // 尝试降级认证
  const fallbackResult = await tryFallbackAuth(req)
  if (fallbackResult.userId) {
    return fallbackResult
  }
  
  return { userId: null, error: unauthorizedResponse('请先登录') }
}

/**
 * 降级认证：从请求体获取用户ID（仅开发环境）
 */
async function tryFallbackAuth(req: Request): Promise<AuthResult> {
  // 检查是否为开发环境
  const env = Deno.env.get('ENVIRONMENT') || Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development'
  
  // 生产环境禁用降级
  if (env === 'production') {
    return { userId: null, error: null }
  }
  
  try {
    const clonedReq = req.clone()
    const body = await clonedReq.json()
    
    if (body.user_id || body.userId) {
      return { userId: body.user_id || body.userId, error: null }
    }
  } catch {
    // 忽略解析错误
  }
  
  return { userId: null, error: null }
}

/**
 * 验证管理员权限
 */
export async function verifyAdmin(
  supabase: any, 
  userId: string
): Promise<{ isAdmin: boolean; adminLevel?: string }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, admin_level')
    .eq('id', userId)
    .maybeSingle()
  
  if (!profile) {
    return { isAdmin: false }
  }
  
  const isAdmin = profile.role === 'admin' || 
    ['admin', 'super_admin'].includes(profile.admin_level || '')
  
  return { 
    isAdmin, 
    adminLevel: profile.admin_level 
  }
}

/**
 * 获取用户档案
 */
export async function getUserProfile(
  supabase: any, 
  userId: string
): Promise<{ level: string; role: string } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, level, role')
    .eq('id', userId)
    .maybeSingle()
  
  return data
}
