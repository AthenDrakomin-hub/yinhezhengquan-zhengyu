/**
 * SQL 执行 Edge Function
 * 直接连接数据库执行 SQL
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sql, params } = await req.json()

    if (!sql) {
      return new Response(JSON.stringify({ error: '缺少 SQL 语句' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 获取数据库连接 URL
    const databaseUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL')
    
    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: '数据库连接配置缺失' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 使用 postgres 库直接连接
    const { Pool } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const pool = new Pool(databaseUrl, 1)
    const client = await pool.connect()

    try {
      const result = await client.queryObject(sql, params || [])
      return new Response(JSON.stringify({ success: true, data: result.rows, rowCount: result.rowCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } finally {
      client.release()
      await pool.end()
    }

  } catch (err: any) {
    console.error('[sql-exec] 错误:', err)
    return new Response(JSON.stringify({ error: err.message || '服务器错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
