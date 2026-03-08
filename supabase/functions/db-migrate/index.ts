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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 检查是否是管理员
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, admin_level')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && !['admin', 'super_admin'].includes(profile?.admin_level || '')) {
      return new Response(JSON.stringify({ error: '权限不足' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { action } = await req.json()

    switch (action) {
      case 'add_columns':
        return await addColumns(supabaseClient)
      case 'fix_rls':
        return await fixRLS(supabaseClient)
      case 'create_indexes':
        return await createIndexes(supabaseClient)
      case 'check_status':
        return await checkStatus(supabaseClient)
      default:
        throw new Error('Invalid action')
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * 添加缺失的列
 */
async function addColumns(supabase: any) {
  const results: any[] = []

  // profiles 表
  const profileColumns = [
    { name: 'display_name', type: 'TEXT' },
    { name: 'avatar_url', type: 'TEXT' },
    { name: 'balance', type: 'NUMERIC(20, 2) DEFAULT 1000000.00' },
    { name: 'total_equity', type: 'NUMERIC(20, 2) DEFAULT 1000000.00' }
  ]

  for (const col of profileColumns) {
    try {
      await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
      })
      results.push({ table: 'profiles', column: col.name, status: 'success' })
    } catch (e: any) {
      results.push({ table: 'profiles', column: col.name, status: 'error', message: e.message })
    }
  }

  // positions 表
  const positionColumns = [
    { name: 'stock_code', type: 'TEXT' },
    { name: 'stock_name', type: 'TEXT' },
    { name: 'risk_level', type: "TEXT DEFAULT 'LOW'" },
    { name: 'is_forced_sell', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'forced_sell_at', type: 'TIMESTAMPTZ' },
    { name: 'forced_sell_reason', type: 'TEXT' }
  ]

  for (const col of positionColumns) {
    try {
      await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
      })
      results.push({ table: 'positions', column: col.name, status: 'success' })
    } catch (e: any) {
      results.push({ table: 'positions', column: col.name, status: 'error', message: e.message })
    }
  }

  // trades 表
  const tradeColumns = [
    { name: 'filled_at', type: 'TIMESTAMPTZ' },
    { name: 'finish_time', type: 'TIMESTAMPTZ' }
  ]

  for (const col of tradeColumns) {
    try {
      await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
      })
      results.push({ table: 'trades', column: col.name, status: 'success' })
    } catch (e: any) {
      results.push({ table: 'trades', column: col.name, status: 'error', message: e.message })
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

/**
 * 修复 RLS 策略
 */
async function fixRLS(supabase: any) {
  const results: any[] = []

  // user_notifications RLS
  try {
    // 删除旧策略
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users view own notifications" ON public.user_notifications;
        DROP POLICY IF EXISTS "Users update own notifications" ON public.user_notifications;
        DROP POLICY IF EXISTS "Service role insert notifications" ON public.user_notifications;
      `
    })

    // 创建新策略
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users view own notifications" ON public.user_notifications
            FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users update own notifications" ON public.user_notifications
            FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Service role insert notifications" ON public.user_notifications
            FOR INSERT WITH CHECK (true);
      `
    })
    results.push({ table: 'user_notifications', status: 'success' })
  } catch (e: any) {
    results.push({ table: 'user_notifications', status: 'error', message: e.message })
  }

  // force_sell_records RLS
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users view own force_sell_records" ON public.force_sell_records;
        DROP POLICY IF EXISTS "Admins view all force_sell_records" ON public.force_sell_records;
        DROP POLICY IF EXISTS "Admins insert force_sell_records" ON public.force_sell_records;
      `
    })

    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users view own force_sell_records" ON public.force_sell_records
            FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Admins view all force_sell_records" ON public.force_sell_records
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        CREATE POLICY "Admins insert force_sell_records" ON public.force_sell_records
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
      `
    })
    results.push({ table: 'force_sell_records', status: 'success' })
  } catch (e: any) {
    results.push({ table: 'force_sell_records', status: 'error', message: e.message })
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

/**
 * 创建索引
 */
async function createIndexes(supabase: any) {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_positions_risk_level ON public.positions(risk_level)',
    'CREATE INDEX IF NOT EXISTS idx_positions_forced_sell ON public.positions(is_forced_sell) WHERE is_forced_sell = TRUE',
    'CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = FALSE'
  ]

  const results: any[] = []

  for (const sql of indexes) {
    try {
      await supabase.rpc('exec_sql', { sql })
      results.push({ sql, status: 'success' })
    } catch (e: any) {
      results.push({ sql, status: 'error', message: e.message })
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

/**
 * 检查状态
 */
async function checkStatus(supabase: any) {
  const tables = ['profiles', 'assets', 'positions', 'trades', 'user_notifications', 'force_sell_records']
  const status: any = {}

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      status[table] = { exists: !error, count }
    } catch (e) {
      status[table] = { exists: false, error: (e as Error).message }
    }
  }

  return new Response(JSON.stringify({ success: true, status }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
