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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: operatorProfile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (operatorProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: '权限不足', code: 1001 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { target_user_id, action } = await req.json()

    if (action === 'generate') {
      const apiKey = `zy_live_${Math.random().toString(36).substring(2, 10)}`
      const apiSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      
      const { error } = await supabaseClient
        .from('profiles')
        .update({ api_key: apiKey, api_secret: apiSecret })
        .eq('id', target_user_id)

      if (error) throw error

      return new Response(JSON.stringify({ success: true, apiKey, apiSecret }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ api_key: null, api_secret: null })
        .eq('id', target_user_id)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
