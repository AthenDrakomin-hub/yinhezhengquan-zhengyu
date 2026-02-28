// Edge Function: admin-trade-rule-update
// Assumptions:
// - Uses Deno.serve and @supabase/supabase-js via npm specifier
// - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are available as env vars

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.info('admin-trade-rule-update starting');
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: '权限不足', code: 1001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { rule_type, config, status } = await req.json();

    const { data: oldRule } = await supabaseClient
      .from('trade_rules')
      .select('*')
      .eq('rule_type', rule_type)
      .single();

    const { data: rule, error } = await supabaseClient
      .from('trade_rules')
      .upsert({
        rule_type,
        config,
        status: status ?? true,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'rule_type' })
      .select()
      .single();

    if (error) throw error;

    await supabaseClient.from('admin_operation_logs').insert({
      admin_id: user.id,
      operate_type: 'TRADE_RULE_UPDATE',
      target_user_id: user.id,
      operate_content: { rule_type, old_config: oldRule?.config, new_config: config },
      ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
    });

    return new Response(JSON.stringify({ success: true, rule }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});