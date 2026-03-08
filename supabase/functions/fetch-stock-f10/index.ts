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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 验证用户权限
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError) {
      console.warn('用户未认证:', authError.message)
    }

    // 获取请求参数
    const { symbol, name } = await req.json()

    // 模拟 F10 数据，实际应用中这里会从公开数据源获取
    const mockF10Data = {
      summary: `${name}(${symbol})公司概况：主营业务、经营状况及发展前景分析`,
      valuation: {
        pe: Math.random() * 20 + 10, // 市盈率 10-30
        pb: Math.random() * 3 + 1,   // 市净率 1-4
        dividend_yield: (Math.random() * 3 + 0.5).toFixed(2) + '%' // 股息率
      },
      yield: (Math.random() * 8 + 1).toFixed(2) + '%', // 收益率
      financials: [
        { year: '2024', revenue: '100亿', profit: '10亿', roe: '15%' },
        { year: '2023', revenue: '90亿', profit: '8亿', roe: '12%' },
        { year: '2022', revenue: '80亿', profit: '6亿', roe: '10%' }
      ],
      businessSegments: [
        { name: '主营业务1', percentage: '60%' },
        { name: '主营业务2', percentage: '25%' },
        { name: '其他业务', percentage: '15%' }
      ],
      shareholders: [
        { name: '大股东1', shareholding: '30%', change: '持平' },
        { name: '基金持股', shareholding: '15%', change: '+2%' },
        { name: '散户持股', shareholding: '25%', change: '-1%' }
      ],
      announcements: [
        { title: '关于2024年度分红预案的公告', date: '2025-04-01' },
        { title: '重大合同签订公告', date: '2025-03-15' },
        { title: '高管变动公告', date: '2025-02-20' }
      ],
      lastUpdated: new Date().toISOString()
    }

    // 在实际实现中，这里应该是真正的F10数据获取逻辑
    // 例如：从新浪财经、东方财富等公开API获取数据
    /*
    const response = await fetch(`https://api.example.com/f10/${symbol}`);
    const realF10Data = await response.json();
    */

    return new Response(JSON.stringify({ 
      success: true, 
      f10Data: mockF10Data,
      symbol: symbol,
      name: name,
      lastUpdated: new Date().toISOString(),
      source: 'Public Financial Data Feed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('获取F10数据失败:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      f10Data: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // 即使出错也返回成功状态，避免前端崩溃
    })
  }
})