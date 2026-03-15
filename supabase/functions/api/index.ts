// Supabase Edge Function: 热点数据 API
// 运行时: Deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// 响应辅助函数
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  })
}

// 获取热点资讯（支持获取最新数据或历史数据）
async function getHotNews(params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '50')
  const source = params.get('source')
  const latest = params.get('latest') !== 'false' // 默认只返回最新数据
  
  if (latest) {
    // 获取最新一次爬取的数据
    // 先获取最新的 crawl_time
    const { data: latestData } = await supabase
      .from('hot_news')
      .select('crawl_time')
      .order('crawl_time', { ascending: false })
      .limit(1)
    
    if (latestData && latestData.length > 0) {
      const latestTime = latestData[0].crawl_time
      let query = supabase
        .from('hot_news')
        .select('*')
        .eq('crawl_time', latestTime)
        .order('rank', { ascending: true })
        .limit(limit)
      
      if (source) {
        query = query.eq('source', source)
      }
      
      const { data, error } = await query
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return {
        success: true,
        count: data?.length || 0,
        crawl_time: latestTime,
        data
      }
    }
  }
  
  // 返回所有数据（历史模式）
  let query = supabase
    .from('hot_news')
    .select('*')
    .order('crawl_time', { ascending: false })
    .order('rank', { ascending: true })
    .limit(limit)
  
  if (source) {
    query = query.eq('source', source)
  }
  
  const { data, error } = await query
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return {
    success: true,
    count: data?.length || 0,
    data
  }
}

// 获取今日热点
async function getTodayHotspot(params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '20')
  const date = params.get('date')
  
  let query = supabase
    .from('today_hotspot')
    .select('*')
    .order('crawl_time', { ascending: false })
    .limit(limit)
  
  if (date) {
    query = query.eq('date', date)
  }
  
  const { data, error } = await query
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return {
    success: true,
    count: data?.length || 0,
    data
  }
}

// 获取财经日历
async function getFinancialCalendar(params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '50')
  const date = params.get('date')
  
  let query = supabase
    .from('financial_calendar')
    .select('*')
    .order('date', { ascending: true })
    .limit(limit)
  
  if (date) {
    query = query.eq('date', date)
  }
  
  const { data, error } = await query
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return {
    success: true,
    count: data?.length || 0,
    data
  }
}

// 获取公社热帖
async function getCommunityPosts(params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '50')
  
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('rank', { ascending: true })
    .limit(limit)
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return {
    success: true,
    count: data?.length || 0,
    data
  }
}

// 获取统计数据
async function getStatistics() {
  const [hotNews, todayHotspot, financialCalendar, communityPosts] = await Promise.all([
    supabase.from('hot_news').select('id', { count: 'exact', head: true }),
    supabase.from('today_hotspot').select('id', { count: 'exact', head: true }),
    supabase.from('financial_calendar').select('id', { count: 'exact', head: true }),
    supabase.from('community_posts').select('id', { count: 'exact', head: true })
  ])
  
  return {
    success: true,
    data: {
      hot_news_count: hotNews.count || 0,
      today_hotspot_count: todayHotspot.count || 0,
      financial_calendar_count: financialCalendar.count || 0,
      community_posts_count: communityPosts.count || 0,
      total: (hotNews.count || 0) + (todayHotspot.count || 0) + 
             (financialCalendar.count || 0) + (communityPosts.count || 0)
    }
  }
}

// 获取所有数据（兼容原 hotspot_data.json 格式）
async function getAllData() {
  const [hotNews, todayHotspot, financialCalendar, communityPosts] = await Promise.all([
    supabase.from('hot_news').select('*').order('rank', { ascending: true }),
    supabase.from('today_hotspot').select('*').order('crawl_time', { ascending: false }),
    supabase.from('financial_calendar').select('*').order('date', { ascending: true }),
    supabase.from('community_posts').select('*').order('rank', { ascending: true })
  ])
  
  // 转换为原格式
  const formatHotNews = (data: any[]) => data.map(item => ({
    rank: item.rank?.toString() || '',
    title: item.title,
    link: item.link || '',
    publish_time: item.publish_time || '',
    heat: item.heat || '',
    type: '热点资讯',
    crawl_time: item.crawl_time
  }))
  
  const formatTodayHotspot = (data: any[]) => data.map(item => ({
    date: item.date || '',
    title: item.title,
    keywords: item.keywords || '',
    heat: item.heat || '',
    type: '今日热点',
    crawl_time: item.crawl_time
  }))
  
  const formatFinancialCalendar = (data: any[]) => data.map(item => ({
    date: item.date || '',
    event: item.event,
    type: '财经日历',
    crawl_time: item.crawl_time
  }))
  
  const formatCommunityPosts = (data: any[]) => data.map(item => ({
    rank: item.rank?.toString() || '',
    title: item.title,
    link: item.link || '',
    publish_time: item.publish_time || '',
    heat: item.heat || '',
    type: '公社热帖',
    crawl_time: item.crawl_time
  }))
  
  return {
    '热点资讯': formatHotNews(hotNews.data || []),
    '今日热点': formatTodayHotspot(todayHotspot.data || []),
    '财经日历': formatFinancialCalendar(financialCalendar.data || []),
    '公社热帖': formatCommunityPosts(communityPosts.data || [])
  }
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const url = new URL(req.url)
    const path = url.pathname
    const params = url.searchParams
    
    // 路由处理
    if (path === '/hot_news' || path === '/api/hot_news') {
      return jsonResponse(await getHotNews(params))
    }
    
    if (path === '/today_hotspot' || path === '/api/today_hotspot') {
      return jsonResponse(await getTodayHotspot(params))
    }
    
    if (path === '/financial_calendar' || path === '/api/financial_calendar') {
      return jsonResponse(await getFinancialCalendar(params))
    }
    
    if (path === '/community_posts' || path === '/api/community_posts') {
      return jsonResponse(await getCommunityPosts(params))
    }
    
    if (path === '/statistics' || path === '/api/statistics') {
      return jsonResponse(await getStatistics())
    }
    
    // 获取所有数据（兼容原格式）
    if (path === '/all' || path === '/api/all') {
      return jsonResponse(await getAllData())
    }
    
    // 首页 - API 文档
    return jsonResponse({
      message: '热点数据 API 服务',
      endpoints: {
        '/api/hot_news': {
          method: 'GET',
          description: '获取热点资讯数据',
          params: 'limit (可选), source (可选: ths/jiuyan)'
        },
        '/api/today_hotspot': {
          method: 'GET', 
          description: '获取今日热点数据',
          params: 'limit (可选), date (可选)'
        },
        '/api/financial_calendar': {
          method: 'GET',
          description: '获取财经日历数据',
          params: 'limit (可选), date (可选)'
        },
        '/api/community_posts': {
          method: 'GET',
          description: '获取公社热帖数据',
          params: 'limit (可选)'
        },
        '/api/statistics': {
          method: 'GET',
          description: '获取数据统计'
        },
        '/api/all': {
          method: 'GET',
          description: '获取所有数据（兼容原 hotspot_data.json 格式）'
        }
      }
    })
    
  } catch (error) {
    console.error('API 错误:', error)
    return jsonResponse({
      success: false,
      error: error.message
    }, 500)
  }
})
