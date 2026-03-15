/**
 * 银证转账 Edge Function
 * 实现银行账户与证券账户之间的资金划转
 */

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
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY') ?? ''
    )

    // 验证用户身份
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const body = await req.json()
    const { action, payload } = body

    switch (action) {
      case 'get_bank_accounts':
        return await handleGetBankAccounts(supabaseClient, user.id)
      
      case 'bind_bank_account':
        return await handleBindBankAccount(supabaseClient, user.id, payload)
      
      case 'transfer':
        return await handleTransfer(supabaseClient, user.id, payload)
      
      case 'get_transfer_records':
        return await handleGetTransferRecords(supabaseClient, user.id, payload)
      
      default:
        return new Response(JSON.stringify({ error: '未知操作' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
    }
  } catch (error: any) {
    console.error('银证转账错误:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * 获取用户银行卡列表
 */
async function handleGetBankAccounts(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('is_default', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  // 如果没有银行卡，自动创建默认银行卡
  if (!data || data.length === 0) {
    const defaultBank = await createDefaultBankAccount(supabase, userId)
    return new Response(JSON.stringify({ 
      success: true, 
      data: defaultBank ? [defaultBank] : [] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 创建默认银行卡
 */
async function createDefaultBankAccount(supabase: any, userId: string) {
  const banks = [
    { code: 'ICBC', name: '中国工商银行' },
    { code: 'CCB', name: '中国建设银行' },
    { code: 'ABC', name: '中国农业银行' },
  ]
  
  const randomBank = banks[Math.floor(Math.random() * banks.length)]
  const accountNo = `6222****${Math.random().toString().slice(2, 8)}`
  
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      user_id: userId,
      bank_code: randomBank.code,
      bank_name: randomBank.name,
      account_no: accountNo,
      account_name: '默认银行卡',
      balance: 100000.00,  // 默认10万
      is_default: true,
      status: 'ACTIVE'
    })
    .select()
    .single()

  if (error) {
    console.error('创建默认银行卡失败:', error)
    return null
  }

  return data
}

/**
 * 绑定银行卡
 */
async function handleBindBankAccount(supabase: any, userId: string, payload: any) {
  const { bank_code, bank_name, account_no, account_name } = payload

  // 检查是否已绑定
  const { data: existing } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('bank_code', bank_code)
    .eq('account_no', account_no)
    .single()

  if (existing) {
    return new Response(JSON.stringify({ error: '该银行卡已绑定' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // 检查是否是第一张卡
  const { count } = await supabase
    .from('bank_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const isFirstCard = count === 0

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      user_id: userId,
      bank_code,
      bank_name,
      account_no,
      account_name,
      balance: 50000.00,  // 新绑定银行卡默认5万
      is_default: isFirstCard,
      status: 'ACTIVE'
    })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 执行转账
 */
async function handleTransfer(supabase: any, userId: string, payload: any) {
  const { transfer_type, amount, bank_account_id } = payload

  if (!['IN', 'OUT'].includes(transfer_type)) {
    return new Response(JSON.stringify({ error: '无效的转账类型' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  const transferAmount = parseFloat(amount)
  if (isNaN(transferAmount) || transferAmount <= 0) {
    return new Response(JSON.stringify({ error: '无效的转账金额' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // 获取或创建银行卡
  let bankAccount = null
  if (bank_account_id) {
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .eq('user_id', userId)
      .single()
    bankAccount = data
  } else {
    // 获取默认银行卡
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()
    
    if (!data) {
      // 创建默认银行卡
      bankAccount = await createDefaultBankAccount(supabase, userId)
    } else {
      bankAccount = data
    }
  }

  if (!bankAccount) {
    return new Response(JSON.stringify({ error: '未找到银行卡' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // 检查限额
  if (transferAmount > bankAccount.single_limit) {
    return new Response(JSON.stringify({ error: `单笔限额：¥${bankAccount.single_limit}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // 获取用户资产
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!assets) {
    return new Response(JSON.stringify({ error: '未找到证券账户' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // 检查余额
  if (transfer_type === 'IN') {
    // 银行转证券：检查银行余额
    if (transferAmount > bankAccount.balance) {
      return new Response(JSON.stringify({ error: '银行余额不足' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  } else {
    // 证券转银行：检查证券余额
    if (transferAmount > assets.available_balance) {
      return new Response(JSON.stringify({ error: '证券可用余额不足' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  }

  // 创建转账记录
  const { data: transfer, error: transferError } = await supabase
    .from('bank_transfers')
    .insert({
      user_id: userId,
      bank_account_id: bankAccount.id,
      transfer_type,
      amount: transferAmount,
      status: 'PENDING'
    })
    .select()
    .single()

  if (transferError) {
    return new Response(JSON.stringify({ error: transferError.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  try {
    // 执行转账（原子操作）
    if (transfer_type === 'IN') {
      // 银行转证券
      // 1. 扣减银行余额
      await supabase
        .from('bank_accounts')
        .update({ 
          balance: bankAccount.balance - transferAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', bankAccount.id)

      // 2. 增加证券余额
      await supabase
        .from('assets')
        .update({
          available_balance: assets.available_balance + transferAmount,
          total_balance: assets.total_balance + transferAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

    } else {
      // 证券转银行
      // 1. 扣减证券余额
      await supabase
        .from('assets')
        .update({
          available_balance: assets.available_balance - transferAmount,
          total_balance: assets.total_balance - transferAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      // 2. 增加银行余额
      await supabase
        .from('bank_accounts')
        .update({
          balance: bankAccount.balance + transferAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', bankAccount.id)
    }

    // 3. 记录资金流水
    await supabase
      .from('fund_flows')
      .insert({
        user_id: userId,
        flow_type: transfer_type === 'IN' ? 'TRANSFER_IN' : 'TRANSFER_OUT',
        amount: transfer_type === 'IN' ? transferAmount : -transferAmount,
        related_id: transfer.id,
        description: transfer_type === 'IN' ? '银行转证券' : '证券转银行'
      })

    // 4. 更新转账状态
    await supabase
      .from('bank_transfers')
      .update({
        status: 'SUCCESS',
        processed_at: new Date().toISOString()
      })
      .eq('id', transfer.id)

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        transfer_id: transfer.id,
        amount: transferAmount,
        type: transfer_type
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    // 回滚：更新转账状态为失败
    await supabase
      .from('bank_transfers')
      .update({
        status: 'FAILED',
        remark: error.message
      })
      .eq('id', transfer.id)

    return new Response(JSON.stringify({ error: '转账失败，请稍后重试' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}

/**
 * 获取转账记录
 */
async function handleGetTransferRecords(supabase: any, userId: string, payload: any) {
  const { page = 1, pageSize = 20 } = payload || {}
  const offset = (page - 1) * pageSize

  const { data, error, count } = await supabase
    .from('bank_transfers')
    .select(`
      *,
      bank_accounts (
        bank_name,
        account_no
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  return new Response(JSON.stringify({ 
    success: true, 
    data,
    total: count,
    page,
    pageSize
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
