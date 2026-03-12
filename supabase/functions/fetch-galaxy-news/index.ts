/**
 * 银河证券新闻获取 Edge Function
 * 
 * @module fetch-galaxy-news
 * @description 获取新闻数据，支持定时刷新和 Redis 缓存
 * 
 * 触发方式：
 * 1. 前端调用（读取缓存）
 * 2. pg_cron 定时刷新（每30分钟）
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import {
  // 响应
  jsonResponse,
  optionsResponse,
  
  // 缓存
  getCache,
  setCache,
  clearNewsCache,
  CacheTTL,
} from '../_shared/mod.ts'

// CORS 头
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 缓存键
const CACHE_KEY = 'galaxy_news'

// ==================== 授权验证 ====================

function verifyAuth(req: Request): { authorized: boolean; source: string } {
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    return { authorized: true, source: 'jwt' }
  }
  
  const userAgent = req.headers.get('user-agent') || ''
  if (userAgent.includes('pg_cron') || userAgent.includes('pg_net')) {
    return { authorized: true, source: 'internal' }
  }
  
  const triggerSource = req.headers.get('x-trigger-source')
  if (triggerSource === 'scheduled') {
    return { authorized: true, source: 'cron' }
  }
  
  const host = req.headers.get('host') || ''
  if (host.includes('localhost')) {
    return { authorized: true, source: 'local' }
  }
  
  return { authorized: true, source: 'anonymous' }
}

// ==================== 新闻获取 ====================

async function fetchNewsFromDatabase(supabase: any) {
  const { data: news, error } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('获取新闻失败:', error)
    return []
  }

  return (news || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    content: item.content,
    category: item.category,
    imageUrl: item.image_url,
    source: item.source,
    author: item.author,
    sentiment: item.sentiment,
    views: item.views,
    date: item.published_at?.split('T')[0] || item.created_at?.split('T')[0],
    time: item.published_at?.split('T')[1]?.slice(0, 5) || '',
    publishedAt: item.published_at,
  }))
}

// ==================== 主服务 ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { source } = verifyAuth(req)
    const url = new URL(req.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true' ||
                         source === 'cron' || 
                         source === 'internal'
    
    // 1. 如果不是强制刷新，先尝试从缓存读取
    if (!forceRefresh) {
      const cached = await getCache<any[]>(CACHE_KEY)
      if (cached && cached.length > 0) {
        console.log('📦 从缓存返回新闻数据')
        return jsonResponse({
          success: true,
          news: cached,
          count: cached.length,
          source: 'cache',
          lastUpdated: new Date().toISOString(),
        })
      }
    }
    
    // 2. 从数据库获取新闻
    console.log('📡 从数据库获取新闻数据...')
    const news = await fetchNewsFromDatabase(supabase)
    
    // 3. 写入 Redis 缓存
    if (news.length > 0) {
      await setCache(CACHE_KEY, news, CacheTTL.NEWS)
      console.log(`📥 已缓存 ${news.length} 条新闻`)
    }
    
    // 4. 返回结果
    return jsonResponse({
      success: true,
      news,
      count: news.length,
      source: 'database',
      lastUpdated: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('获取银河新闻失败:', error)
    
    // 返回空数据而不是错误
    return jsonResponse({
      success: true,
      news: [],
      count: 0,
      source: 'error',
      message: '暂无新闻数据'
    })
  }
})
