/**
 * 风控管理 Edge Function
 * 功能：风控规则配置、风险事件监控、风控记录管理
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Pool } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import { corsHeaders, jsonResponse, errorResponse, optionsResponse, verifyAdminAccess } from './_shared/mod.ts';

// 数据库连接池（延迟初始化）
let pool: Pool | null = null;
let initialized = false;

async function getDbPool(): Promise<Pool> {
  if (!pool) {
    const databaseUrl = Deno.env.get('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool(databaseUrl, 3, true);
  }
  return pool;
}

// 初始化表结构
async function initTables(): Promise<void> {
  if (initialized) return;
  
  const pool = await getDbPool();
  const client = await pool.connect();
  
  try {
    // 创建 risk_rules 表
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS risk_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        rule_type text NOT NULL,
        rule_config jsonb DEFAULT '{}',
        action_type text NOT NULL,
        action_config jsonb DEFAULT '{}',
        scope text DEFAULT 'all',
        priority integer DEFAULT 100,
        is_enabled boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    
    // 创建 risk_events 表
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS risk_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        rule_id uuid REFERENCES risk_rules(id) ON DELETE SET NULL,
        event_type text NOT NULL,
        event_data jsonb DEFAULT '{}',
        risk_level text NOT NULL DEFAULT 'medium',
        action_taken text,
        handled_by uuid,
        handled_at timestamptz,
        handle_note text,
        created_at timestamptz DEFAULT now()
      )
    `);
    
    // 创建索引
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_risk_rules_type ON risk_rules(rule_type)`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_risk_rules_enabled ON risk_rules(is_enabled)`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_risk_events_user ON risk_events(user_id)`);
    
    // 插入默认数据
    await client.queryObject(`
      INSERT INTO risk_rules (name, description, rule_type, rule_config, action_type, action_config, scope, priority, is_enabled)
      VALUES
        ('单笔交易限额', '限制单笔交易的最大金额', 'TRADE_LIMIT', '{"max_amount": 500000}', 'BLOCK', '{"message": "单笔交易金额超过限额"}', 'all', 10, true),
        ('日累计交易限额', '限制用户每日累计交易金额', 'TRADE_LIMIT', '{"daily_max_amount": 2000000}', 'WARN', '{"message": "今日累计交易金额较大"}', 'all', 20, true),
        ('价格偏离预警', '监控交易价格与市价的偏离程度', 'PRICE_DEVIATION', '{"max_deviation_percent": 10}', 'REVIEW', '{"message": "交易价格偏离市价较大"}', 'all', 30, true),
        ('持仓集中度监控', '监控单一股票持仓占比', 'POSITION_CONCENTRATION', '{"max_position_percent": 30}', 'WARN', '{"message": "单一持仓占比过高"}', 'all', 40, true),
        ('高频交易限制', '限制短时间内频繁交易', 'FREQUENCY', '{"max_trades_per_minute": 10}', 'BLOCK', '{"message": "交易频率过高，请稍后再试"}', 'all', 50, true)
      ON CONFLICT DO NOTHING
    `);
    
    initialized = true;
  } finally {
    client.release();
  }
}

// 直接查询数据库
async function queryRiskRules(type?: string, enabledOnly?: boolean): Promise<any[]> {
  await initTables();
  
  const pool = await getDbPool();
  const client = await pool.connect();
  
  try {
    let sql = 'SELECT * FROM risk_rules';
    const conditions: string[] = [];
    
    if (type) {
      conditions.push(`rule_type = '${type.replace(/'/g, "''")}'`);
    }
    if (enabledOnly) {
      conditions.push('is_enabled = true');
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY priority';
    
    const result = await client.queryObject(sql);
    return result.rows as any[];
  } finally {
    client.release();
  }
}

interface RiskRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  rule_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  scope: string;
  priority: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface RiskEvent {
  id: string;
  user_id: string | null;
  rule_id: string | null;
  event_type: string;
  event_data: Record<string, any>;
  risk_level: string;
  action_taken: string | null;
  handled_by: string | null;
  handled_at: string | null;
  handle_note: string | null;
  created_at: string;
}

// 规则类型说明
const RULE_TYPES = {
  TRADE_LIMIT: { label: '交易限额', description: '限制单笔或累计交易金额' },
  PRICE_DEVIATION: { label: '价格偏离', description: '监控价格异常波动' },
  POSITION_CONCENTRATION: { label: '持仓集中度', description: '监控单一持仓占比' },
  DAILY_LOSS: { label: '日内亏损', description: '监控日内亏损幅度' },
  SUSPICIOUS: { label: '可疑行为', description: '异常交易行为检测' },
  FREQUENCY: { label: '交易频率', description: '高频交易限制' },
  WITHDRAWAL: { label: '提现限制', description: '提现金额和频率限制' }
};

// 触发动作说明
const ACTION_TYPES = {
  WARN: { label: '警告', description: '发送警告消息' },
  BLOCK: { label: '阻断', description: '阻止交易' },
  REVIEW: { label: '人工审核', description: '提交人工审核' },
  FREEZE: { label: '冻结', description: '冻结账户' }
};

// 风险等级说明
const RISK_LEVELS = {
  low: { label: '低风险', color: '#22C55E' },
  medium: { label: '中风险', color: '#F97316' },
  high: { label: '高风险', color: '#EF4444' },
  critical: { label: '严重', color: '#7C3AED' }
};

Deno.serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'list_rules':
        return await handleListRules(supabase, body);
      
      case 'get_rule':
        return await handleGetRule(supabase, body);
      
      case 'admin_create_rule':
        return await handleAdminCreateRule(supabase, req, body);
      
      case 'admin_update_rule':
        return await handleAdminUpdateRule(supabase, req, body);
      
      case 'admin_delete_rule':
        return await handleAdminDeleteRule(supabase, req, body);
      
      case 'admin_toggle_rule':
        return await handleAdminToggleRule(supabase, req, body);
      
      case 'list_events':
        return await handleListEvents(supabase, req, body);
      
      case 'get_event':
        return await handleGetEvent(supabase, req, body);
      
      case 'admin_handle_event':
        return await handleAdminHandleEvent(supabase, req, body);
      
      case 'admin_event_stats':
        return await handleAdminEventStats(supabase, req);
      
      case 'check_risk':
        return await handleCheckRisk(supabase, body);
      
      case 'trigger_event':
        return await handleTriggerEvent(supabase, body);
      
      case 'get_rule_types':
        return jsonResponse({
          success: true,
          rule_types: RULE_TYPES,
          action_types: ACTION_TYPES,
          risk_levels: RISK_LEVELS
        });
      
      default:
        return errorResponse('无效的操作', 400);
    }
  } catch (error) {
    console.error('风控管理错误:', error);
    return errorResponse('服务器错误', 500);
  }
});

/**
 * 获取风控规则列表
 */
async function handleListRules(supabase: any, body: any) {
  const { type, enabled_only } = body;
  
  try {
    const rules = await queryRiskRules(type, enabled_only);
    
    return jsonResponse({
      success: true,
      rules: rules || []
    });
  } catch (err) {
    console.error('[risk-control] 查询异常:', err);
    return errorResponse('查询异常: ' + (err as Error).message, 500, 500);
  }
}

/**
 * 获取单个规则详情
 */
async function handleGetRule(supabase: any, body: any) {
  const { rule_id } = body;
  
  if (!rule_id) {
    return errorResponse('缺少规则ID', 400);
  }
  
  const { data, error } = await supabase
    .from('risk_rules')
    .select('*')
    .eq('id', rule_id)
    .single();
  
  if (error) {
    return errorResponse('规则不存在', 404);
  }
  
  return jsonResponse({
    success: true,
    rule: data
  });
}

/**
 * 管理员创建规则
 */
async function handleAdminCreateRule(supabase: any, req: Request, body: any) {
  // 验证管理员权限
  const authResult = await verifyAdminAccess(req);
  if (!authResult.isValid) {
    return authResult.error!;
  }
  
  const { name, description, rule_type, rule_config, action_type, action_config, scope, priority } = body;
  
  if (!name || !rule_type || !action_type) {
    return errorResponse('缺少必要参数', 400);
  }
  
  // 验证规则类型
  if (!RULE_TYPES[rule_type as keyof typeof RULE_TYPES]) {
    return errorResponse('无效的规则类型', 400);
  }
  
  // 验证动作类型
  if (!ACTION_TYPES[action_type as keyof typeof ACTION_TYPES]) {
    return errorResponse('无效的动作类型', 400);
  }
  
  const { data, error } = await supabase
    .from('risk_rules')
    .insert({
      name,
      description,
      rule_type,
      rule_config: rule_config || {},
      action_type,
      action_config: action_config || {},
      scope: scope || 'all',
      priority: priority || 100
    })
    .select()
    .single();
  
  if (error) {
    console.error('创建规则失败:', error);
    return errorResponse('创建规则失败', 500);
  }
  
  return jsonResponse({
    success: true,
    rule: data,
    message: '规则创建成功'
  });
}

/**
 * 管理员更新规则
 */
async function handleAdminUpdateRule(supabase: any, req: Request, body: any) {
  const authResult = await verifyAdminAccess(req);
  if (!authResult.isValid) {
    return authResult.error!;
  }
  
  const { rule_id, ...updates } = body;
  
  if (!rule_id) {
    return errorResponse('缺少规则ID', 400);
  }
  
  // 移除不应该更新的字段
  delete updates.id;
  delete updates.created_at;
  
  const { data, error } = await supabase
    .from('risk_rules')
    .update(updates)
    .eq('id', rule_id)
    .select()
    .single();
  
  if (error) {
    return errorResponse('更新规则失败', 500);
  }
  
  return jsonResponse({
    success: true,
    rule: data,
    message: '规则更新成功'
  });
}

/**
 * 管理员删除规则
 */
async function handleAdminDeleteRule(supabase: any, req: Request, body: any) {
  const authResult = await verifyAdminAccess(req);
  if (!authResult.isValid) {
    return authResult.error!;
  }
  
  const { rule_id } = body;
  
  if (!rule_id) {
    return errorResponse('缺少规则ID', 400);
  }
  
  const { error } = await supabase
    .from('risk_rules')
    .delete()
    .eq('id', rule_id);
  
  if (error) {
    return errorResponse('删除规则失败', 500);
  }
  
  return jsonResponse({
    success: true,
    message: '规则删除成功'
  });
}

/**
 * 管理员切换规则状态
 */
async function handleAdminToggleRule(supabase: any, req: Request, body: any) {
  const authResult = await verifyAdminAccess(req);
  if (!authResult.isValid) {
    return authResult.error!;
  }
  
  const { rule_id, is_enabled } = body;
  
  if (!rule_id) {
    return errorResponse('缺少规则ID', 400);
  }
  
  const { data, error } = await supabase
    .from('risk_rules')
    .update({ is_enabled })
    .eq('id', rule_id)
    .select()
    .single();
  
  if (error) {
    return errorResponse('操作失败', 500);
  }
  
  return jsonResponse({
    success: true,
    rule: data,
    message: is_enabled ? '规则已启用' : '规则已禁用'
  });
}

/**
 * 获取风险事件列表
 */
async function handleListEvents(supabase: any, req: Request, body: any) {
  const authResult = await verifyAdminAccess(req);
  if (!authResult.isValid) {
    return authResult.error!;
  }
  
  const { risk_level, event_type, user_id, start_date, end_date, page = 1, page_size = 20 } = body;
  
  let query = supabase
    .from('risk_events')
    .select('*, rule:risk_rules(id, name, rule_type)', { count: 'exact' })
    .order('created_at', { ascending: false });
  
  if (risk_level) {
    query = query.eq('risk_level', risk_level);
  }
  
  if (event_type) {
    query = query.eq('event_type', event_type);
  }
  
  if (user_id) {
    query = query.eq('user_id', user_id);
  }
  
  if (start_date) {
    query = query.gte('created_at', start_date);
  }
  
  if (end_date) {
    query = query.lte('created_at', end_date);
  }
  
  const offset = (page - 1) * page_size;
  query = query.range(offset, offset + page_size - 1);
  
  const { data, error, count } = await query;
  
  if (error) {
    return errorResponse('获取事件列表失败', 500);
  }
  
  return jsonResponse({
    success: true,
    events: data,
    pagination: {
      page,
      page_size,
      total: count,
      total_pages: Math.ceil((count || 0) / page_size)
    }
  });
}

/**
 * 获取事件详情
 */
async function handleGetEvent(supabase: any, req: Request, body: any) {
  const authResult = await verifyAdminAccess(req);
  if (!authResult.isValid) {
    return authResult.error!;
  }
  
  const { event_id } = body;
  
  if (!event_id) {
    return errorResponse('缺少事件ID', 400);
  }
  
  const { data, error } = await supabase
    .from('risk_events')
    .select('*, rule:risk_rules(*)')
    .eq('id', event_id)
    .single();
  
  if (error) {
    return errorResponse('事件不存在', 404);
  }
  
  return jsonResponse({
    success: true,
    event: data
  });
}

/**
 * 管理员处理事件
 */
async function handleAdminHandleEvent(supabase: any, req: Request, body: any) {
  const authResult = await verifyAdminAccess(req);
  if (!authResult.isValid) {
    return authResult.error!;
  }
  
  const { event_id, handle_note } = body;
  
  if (!event_id) {
    return errorResponse('缺少事件ID', 400);
  }
  
  // 获取当前用户ID
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY')!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  
  const { data: { user } } = await userClient.auth.getUser();
  
  const { data, error } = await supabase
    .from('risk_events')
    .update({
      handled_by: user?.id,
      handled_at: new Date().toISOString(),
      handle_note
    })
    .eq('id', event_id)
    .select()
    .single();
  
  if (error) {
    return errorResponse('处理失败', 500);
  }
  
  return jsonResponse({
    success: true,
    event: data,
    message: '事件已处理'
  });
}

/**
 * 获取事件统计
 */
async function handleAdminEventStats(supabase: any, req: Request) {
  const authResult = await verifyAdminAccess(req);
  if (!authResult.isValid) {
    return authResult.error!;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // 总体统计
  const { count: totalEvents } = await supabase
    .from('risk_events')
    .select('*', { count: 'exact', head: true });
  
  const { count: unhandledEvents } = await supabase
    .from('risk_events')
    .select('*', { count: 'exact', head: true })
    .is('handled_at', null);
  
  const { count: todayEvents } = await supabase
    .from('risk_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);
  
  // 按风险等级统计
  const { data: levelStats } = await supabase
    .from('risk_events')
    .select('risk_level')
    .gte('created_at', weekAgo);
  
  const levelCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  levelStats?.forEach((item: any) => {
    if (levelCounts.hasOwnProperty(item.risk_level)) {
      levelCounts[item.risk_level]++;
    }
  });
  
  // 按事件类型统计
  const { data: typeStats } = await supabase
    .from('risk_events')
    .select('event_type')
    .gte('created_at', weekAgo);
  
  const typeCounts: Record<string, number> = {};
  typeStats?.forEach((item: any) => {
    typeCounts[item.event_type] = (typeCounts[item.event_type] || 0) + 1;
  });
  
  // 每日趋势（最近7天）
  const { data: dailyTrend } = await supabase
    .from('risk_events')
    .select('created_at')
    .gte('created_at', weekAgo);
  
  const dailyCounts: Record<string, number> = {};
  dailyTrend?.forEach((item: any) => {
    const date = item.created_at.split('T')[0];
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });
  
  return jsonResponse({
    success: true,
    stats: {
      total: totalEvents || 0,
      unhandled: unhandledEvents || 0,
      today: todayEvents || 0,
      by_level: levelCounts,
      by_type: typeCounts,
      daily_trend: dailyCounts
    }
  });
}

/**
 * 检查交易风险（内部调用）
 */
async function handleCheckRisk(supabase: any, body: any) {
  const { user_id, trade_type, amount, symbol, price, quantity } = body;
  
  if (!user_id) {
    return errorResponse('缺少用户ID', 400);
  }
  
  // 获取用户VIP等级
  const { data: userVip } = await supabase
    .from('user_vip')
    .select('current_level')
    .eq('user_id', user_id)
    .single();
  
  const userLevel = userVip?.current_level || 1;
  
  // 获取所有启用的风控规则
  const { data: rules } = await supabase
    .from('risk_rules')
    .select('*')
    .eq('is_enabled', true)
    .order('priority', { ascending: true });
  
  const triggeredRules: any[] = [];
  let shouldBlock = false;
  
  for (const rule of rules || []) {
    // 检查规则适用范围
    if (rule.scope === 'vip' && userLevel < 1) continue;
    if (rule.scope === 'non_vip' && userLevel >= 1) continue;
    
    let triggered = false;
    const config = rule.rule_config;
    
    switch (rule.rule_type) {
      case 'TRADE_LIMIT':
        // 单笔交易限额
        if (amount && config.max_single_amount && amount > config.max_single_amount) {
          triggered = true;
        }
        // 日累计交易限额
        if (config.max_daily_amount) {
          const today = new Date().toISOString().split('T')[0];
          const { data: todayTrades } = await supabase
            .from('trades')
            .select('amount')
            .eq('user_id', user_id)
            .gte('created_at', today);
          
          const totalAmount = todayTrades?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
          if (totalAmount + amount > config.max_daily_amount) {
            triggered = true;
          }
        }
        break;
      
      case 'POSITION_CONCENTRATION':
        // 单一持仓占比检查
        if (config.max_position_percent && symbol) {
          // 获取用户总资产
          const { data: portfolio } = await supabase
            .from('user_portfolio')
            .select('total_value')
            .eq('user_id', user_id)
            .single();
          
          if (portfolio && amount) {
            const positionPercent = (amount / portfolio.total_value) * 100;
            if (positionPercent > config.max_position_percent) {
              triggered = true;
            }
          }
        }
        break;
      
      case 'DAILY_LOSS':
        // 日内亏损检查
        if (config.max_loss_percent) {
          const today = new Date().toISOString().split('T')[0];
          const { data: todayPnL } = await supabase
            .from('user_daily_pnl')
            .select('loss_percent')
            .eq('user_id', user_id)
            .eq('date', today)
            .single();
          
          if (todayPnL && todayPnL.loss_percent > config.max_loss_percent) {
            triggered = true;
          }
        }
        break;
      
      case 'FREQUENCY':
        // 交易频率检查
        if (config.max_trades_per_minute) {
          const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
          const { count } = await supabase
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .gte('created_at', oneMinuteAgo);
          
          if (count && count >= config.max_trades_per_minute) {
            triggered = true;
          }
        }
        break;
      
      case 'PRICE_DEVIATION':
        // 价格偏离检查
        if (config.max_deviation_percent && price && symbol) {
          // 获取当前市场价格
          const { data: marketData } = await supabase
            .from('stock_quotes')
            .select('last_price')
            .eq('symbol', symbol)
            .single();
          
          if (marketData) {
            const deviation = Math.abs((price - marketData.last_price) / marketData.last_price) * 100;
            if (deviation > config.max_deviation_percent) {
              triggered = true;
            }
          }
        }
        break;
    }
    
    if (triggered) {
      triggeredRules.push(rule);
      
      if (rule.action_type === 'BLOCK') {
        shouldBlock = true;
      }
      
      // 记录风险事件
      await supabase.from('risk_events').insert({
        user_id,
        rule_id: rule.id,
        event_type: rule.rule_type,
        event_data: { trade_type, amount, symbol, price, quantity, config },
        risk_level: rule.action_type === 'BLOCK' ? 'high' : 'medium',
        action_taken: rule.action_type
      });
    }
  }
  
  return jsonResponse({
    success: true,
    should_block: shouldBlock,
    triggered_rules: triggeredRules,
    message: shouldBlock ? '交易已被风控阻止' : (triggeredRules.length > 0 ? '交易触发风控警告' : '风控检查通过')
  });
}

/**
 * 手动触发风险事件（内部调用）
 */
async function handleTriggerEvent(supabase: any, body: any) {
  const { user_id, event_type, event_data, risk_level } = body;
  
  if (!event_type) {
    return errorResponse('缺少事件类型', 400);
  }
  
  const { data, error } = await supabase
    .from('risk_events')
    .insert({
      user_id,
      event_type,
      event_data: event_data || {},
      risk_level: risk_level || 'medium'
    })
    .select()
    .single();
  
  if (error) {
    return errorResponse('创建事件失败', 500);
  }
  
  return jsonResponse({
    success: true,
    event: data,
    message: '事件已记录'
  });
}
