import { createClient } from "npm:@supabase/supabase-js@2.29.0";

interface ReqBody { 
  action?: string; 
  minutes?: number; 
  api_key?: string;
  sql?: string;
}

console.info('run-sql function starting');

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const EXEC_SQL_API_KEY = Deno.env.get('EXEC_SQL_API_KEY') || '';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase env not configured' }), {
        status: 500, headers: corsHeaders
      });
    }

    const body: ReqBody = await req.json().catch(() => ({} as ReqBody));

    // Simple API key auth: check header first, then body
    const providedKey = req.headers.get('x-exec-api-key') || body.api_key;
    if (!providedKey || providedKey !== EXEC_SQL_API_KEY) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: corsHeaders
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    const action = (body.action || '').toLowerCase();

    if (!action) {
      return new Response(JSON.stringify({ error: 'missing action' }), {
        status: 400, headers: corsHeaders
      });
    }

    // 执行任意 SQL
    if (action === 'execute_sql') {
      const sql = body.sql;
      if (!sql) {
        return new Response(JSON.stringify({ error: 'missing sql parameter' }), {
          status: 400, headers: corsHeaders
        });
      }
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200, headers: corsHeaders
      });
    }

    // 执行查询
    if (action === 'execute_query') {
      const sql = body.sql;
      if (!sql) {
        return new Response(JSON.stringify({ error: 'missing sql parameter' }), {
          status: 400, headers: corsHeaders
        });
      }
      const { data, error } = await supabase.rpc('exec_query', { sql });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200, headers: corsHeaders
      });
    }

    if (action === 'get_active_connections') {
      const { data, error } = await supabase.rpc('exec_get_active_connections');
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({ data }), {
        status: 200, headers: corsHeaders
      });
    }

    if (action === 'recent_activity') {
      const minutes = body.minutes && Number.isFinite(body.minutes) 
        ? Math.max(1, Math.min(1440, body.minutes)) 
        : 60;
      const { data, error } = await supabase.rpc('exec_recent_activity', { p_minutes: minutes });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({ data }), {
        status: 200, headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), {
      status: 400, headers: corsHeaders
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'internal_error', detail: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
