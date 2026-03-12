import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 使用 SERVICE_ROLE_KEY 直接访问数据库，不需要用户 JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 从数据库获取真实新闻数据
    const { data: news, error } = await supabaseClient
      .from('news')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(20)

    if (error) {
      // 如果表不存在或其他错误，返回空数据而不是错误
      console.warn('获取新闻失败:', error.message)
      return new Response(JSON.stringify({ 
        success: true, 
        news: [],
        count: 0,
        lastUpdated: new Date().toISOString(),
        source: 'Galaxy Securities Database',
        message: '暂无新闻数据'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 格式化新闻数据
    const formattedNews = (news || []).map(item => ({
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

    return new Response(JSON.stringify({ 
      success: true, 
      news: formattedNews,
      count: formattedNews.length,
      lastUpdated: new Date().toISOString(),
      source: 'Galaxy Securities Database'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('获取银河新闻失败:', error)
    // 返回空数据而不是错误
    return new Response(JSON.stringify({ 
      success: true,
      news: [],
      count: 0,
      message: '暂无新闻数据'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
