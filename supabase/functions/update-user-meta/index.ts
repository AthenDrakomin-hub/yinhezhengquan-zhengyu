/**
 * 更新用户元数据 Edge Function
 * 使用 Service Role Key 通过 Admin API 更新用户
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY') ?? ''
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing configuration' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 使用 Service Role Key 创建客户端
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { email, metadata } = await req.json()
    
    if (!email || !metadata) {
      return new Response(
        JSON.stringify({ error: 'Missing email or metadata' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 获取用户 ID
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('[update-user-meta] List users error:', listError)
      return new Response(
        JSON.stringify({ error: listError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 使用 Admin API 更新用户元数据
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: metadata }
    )

    if (updateError) {
      console.error('[update-user-meta] Update error:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[update-user-meta] Success:', email, metadata)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          user_metadata: updatedUser.user_metadata
        }
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
    
  } catch (error: any) {
    console.error('[update-user-meta] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
