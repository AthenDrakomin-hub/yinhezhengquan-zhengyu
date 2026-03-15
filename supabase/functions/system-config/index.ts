/**
 * 系统配置管理 Edge Function
 * 功能：系统参数配置、功能开关、公告管理、维护模式
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, errorResponse, optionsResponse, verifyAdmin } from './_shared/mod.ts';

// 默认系统配置
const DEFAULT_CONFIG = {
  // 交易配置
  trade: {
    max_single_trade_amount: 10000000,      // 单笔最大交易金额
    max_daily_trade_amount: 50000000,       // 日累计最大交易金额
    min_trade_amount: 100,                  // 最小交易金额
    trade_fee_rate: 0.0003,                 // 交易手续费率
    trade_limit_enabled: true,              // 是否启用交易限额
    ipo_enabled: true,                      // 是否启用IPO申购
    block_trade_enabled: true,              // 是否启用大宗交易
    condition_order_enabled: true,          // 是否启用条件单
  },
  // 提现配置
  withdrawal: {
    min_withdrawal: 10,                     // 最小提现金额
    max_withdrawal_daily: 500000,           // 单日最大提现金额
    withdrawal_fee_rate: 0,                 // 提现手续费率
    withdrawal_enabled: true,               // 是否启用提现
    withdrawal_review_enabled: false,       // 是否需要人工审核
  },
  // VIP配置
  vip: {
    vip_enabled: true,                      // 是否启用VIP系统
    vip_discount_enabled: true,             // 是否启用VIP折扣
    max_vip_level: 5,                       // 最高VIP等级
  },
  // 积分配置
  points: {
    points_enabled: true,                   // 是否启用积分系统
    checkin_enabled: true,                  // 是否启用签到
    checkin_points: 10,                     // 签到基础积分
    consecutive_bonus: 5,                   // 连续签到额外积分
    max_exchange_per_day: 5,                // 每日最大兑换次数
  },
  // 系统配置
  system: {
    maintenance_mode: false,                // 维护模式
    maintenance_message: '',                // 维护公告
    register_enabled: true,                 // 是否允许注册
    sms_enabled: true,                      // 是否启用短信验证
    email_enabled: true,                    // 是否启用邮件验证
    upload_enabled: true,                   // 是否允许上传文件
  },
  // 安全配置
  security: {
    password_min_length: 8,                 // 密码最小长度
    login_retry_limit: 5,                   // 登录重试次数限制
    login_lock_time: 30,                    // 登录锁定时间(分钟)
    session_timeout: 120,                   // 会话超时时间(分钟)
    two_factor_enabled: false,              // 是否启用两步验证
  }
};

// 系统公告类型
interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'get_config':
        return await handleGetConfig(supabase);
      
      case 'admin_update_config':
        return await handleAdminUpdateConfig(supabase, req, body);
      
      case 'get_announcements':
        return await handleGetAnnouncements(supabase, body);
      
      case 'get_active_announcements':
        return await handleGetActiveAnnouncements(supabase);
      
      case 'admin_create_announcement':
        return await handleAdminCreateAnnouncement(supabase, req, body);
      
      case 'admin_update_announcement':
        return await handleAdminUpdateAnnouncement(supabase, req, body);
      
      case 'admin_delete_announcement':
        return await handleAdminDeleteAnnouncement(supabase, req, body);
      
      case 'admin_toggle_announcement':
        return await handleAdminToggleAnnouncement(supabase, req, body);
      
      case 'get_system_status':
        return await handleGetSystemStatus(supabase);
      
      case 'admin_set_maintenance':
        return await handleAdminSetMaintenance(supabase, req, body);
      
      default:
        return errorResponse('无效的操作', 400);
    }
  } catch (error) {
    console.error('系统配置管理错误:', error);
    return errorResponse('服务器错误', 500);
  }
});

/**
 * 获取系统配置
 */
async function handleGetConfig(supabase: any) {
  // 尝试从数据库获取配置
  const { data: configData, error } = await supabase
    .from('system_config')
    .select('config_key, config_value')
    .eq('is_active', true);

  if (error || !configData || configData.length === 0) {
    // 返回默认配置
    return jsonResponse({
      success: true,
      config: DEFAULT_CONFIG,
      is_default: true
    });
  }

  // 解析配置
  const config: Record<string, any> = {};
  configData.forEach((item: any) => {
    try {
      config[item.config_key] = JSON.parse(item.config_value);
    } catch {
      config[item.config_key] = item.config_value;
    }
  });

  // 合并默认配置
  const mergedConfig = deepMerge(DEFAULT_CONFIG, config);

  return jsonResponse({
    success: true,
    config: mergedConfig,
    is_default: false
  });
}

/**
 * 管理员更新配置
 */
async function handleAdminUpdateConfig(supabase: any, req: Request, body: any) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return errorResponse('无权限', 403);
  }

  const { config } = body;
  
  if (!config) {
    return errorResponse('缺少配置数据', 400);
  }

  // 逐个更新配置项
  const updates = [];
  for (const [key, value] of Object.entries(config)) {
    updates.push(
      supabase
        .from('system_config')
        .upsert({
          config_key: key,
          config_value: JSON.stringify(value),
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'config_key' })
    );
  }

  try {
    await Promise.all(updates);
    
    // 清除配置缓存
    await clearConfigCache(supabase);

    return jsonResponse({
      success: true,
      message: '配置更新成功'
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    return errorResponse('更新配置失败', 500);
  }
}

/**
 * 获取公告列表
 */
async function handleGetAnnouncements(supabase: any, body: any) {
  const { page = 1, page_size = 20 } = body;

  const offset = (page - 1) * page_size;

  const { data, error, count } = await supabase
    .from('system_announcements')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + page_size - 1);

  if (error) {
    return errorResponse('获取公告失败', 500);
  }

  return jsonResponse({
    success: true,
    announcements: data,
    pagination: {
      page,
      page_size,
      total: count,
      total_pages: Math.ceil((count || 0) / page_size)
    }
  });
}

/**
 * 获取有效公告（用户端）
 */
async function handleGetActiveAnnouncements(supabase: any) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('system_announcements')
    .select('*')
    .eq('is_active', true)
    .lte('start_time', now)
    .gte('end_time', now)
    .order('created_at', { ascending: false });

  if (error) {
    return errorResponse('获取公告失败', 500);
  }

  return jsonResponse({
    success: true,
    announcements: data || []
  });
}

/**
 * 管理员创建公告
 */
async function handleAdminCreateAnnouncement(supabase: any, req: Request, body: any) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return errorResponse('无权限', 403);
  }

  const { title, content, type, start_time, end_time } = body;

  if (!title || !content) {
    return errorResponse('缺少必要参数', 400);
  }

  const { data, error } = await supabase
    .from('system_announcements')
    .insert({
      title,
      content,
      type: type || 'info',
      start_time: start_time || new Date().toISOString(),
      end_time: end_time || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true
    })
    .select()
    .single();

  if (error) {
    return errorResponse('创建公告失败', 500);
  }

  return jsonResponse({
    success: true,
    announcement: data,
    message: '公告创建成功'
  });
}

/**
 * 管理员更新公告
 */
async function handleAdminUpdateAnnouncement(supabase: any, req: Request, body: any) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return errorResponse('无权限', 403);
  }

  const { announcement_id, ...updates } = body;

  if (!announcement_id) {
    return errorResponse('缺少公告ID', 400);
  }

  const { data, error } = await supabase
    .from('system_announcements')
    .update(updates)
    .eq('id', announcement_id)
    .select()
    .single();

  if (error) {
    return errorResponse('更新公告失败', 500);
  }

  return jsonResponse({
    success: true,
    announcement: data,
    message: '公告更新成功'
  });
}

/**
 * 管理员删除公告
 */
async function handleAdminDeleteAnnouncement(supabase: any, req: Request, body: any) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return errorResponse('无权限', 403);
  }

  const { announcement_id } = body;

  if (!announcement_id) {
    return errorResponse('缺少公告ID', 400);
  }

  const { error } = await supabase
    .from('system_announcements')
    .delete()
    .eq('id', announcement_id);

  if (error) {
    return errorResponse('删除公告失败', 500);
  }

  return jsonResponse({
    success: true,
    message: '公告删除成功'
  });
}

/**
 * 管理员切换公告状态
 */
async function handleAdminToggleAnnouncement(supabase: any, req: Request, body: any) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return errorResponse('无权限', 403);
  }

  const { announcement_id, is_active } = body;

  if (!announcement_id) {
    return errorResponse('缺少公告ID', 400);
  }

  const { data, error } = await supabase
    .from('system_announcements')
    .update({ is_active })
    .eq('id', announcement_id)
    .select()
    .single();

  if (error) {
    return errorResponse('操作失败', 500);
  }

  return jsonResponse({
    success: true,
    announcement: data,
    message: is_active ? '公告已启用' : '公告已禁用'
  });
}

/**
 * 获取系统状态
 */
async function handleGetSystemStatus(supabase: any) {
  // 检查数据库连接
  const { error: dbError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  // 获取维护模式状态
  const { data: configData } = await supabase
    .from('system_config')
    .select('config_value')
    .eq('config_key', 'system')
    .single();

  let maintenanceMode = false;
  let maintenanceMessage = '';
  
  if (configData?.config_value) {
    try {
      const systemConfig = JSON.parse(configData.config_value);
      maintenanceMode = systemConfig.maintenance_mode || false;
      maintenanceMessage = systemConfig.maintenance_message || '';
    } catch {}
  }

  return jsonResponse({
    success: true,
    status: {
      database: !dbError ? 'healthy' : 'error',
      maintenance_mode: maintenanceMode,
      maintenance_message: maintenanceMessage,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * 管理员设置维护模式
 */
async function handleAdminSetMaintenance(supabase: any, req: Request, body: any) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return errorResponse('无权限', 403);
  }

  const { maintenance_mode, maintenance_message } = body;

  // 获取当前系统配置
  const { data: currentConfig } = await supabase
    .from('system_config')
    .select('config_value')
    .eq('config_key', 'system')
    .single();

  let systemConfig = DEFAULT_CONFIG.system;
  if (currentConfig?.config_value) {
    try {
      systemConfig = { ...systemConfig, ...JSON.parse(currentConfig.config_value) };
    } catch {}
  }

  // 更新维护模式
  systemConfig.maintenance_mode = maintenance_mode;
  if (maintenance_message !== undefined) {
    systemConfig.maintenance_message = maintenance_message;
  }

  const { error } = await supabase
    .from('system_config')
    .upsert({
      config_key: 'system',
      config_value: JSON.stringify(systemConfig),
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'config_key' });

  if (error) {
    return errorResponse('设置维护模式失败', 500);
  }

  return jsonResponse({
    success: true,
    message: maintenance_mode ? '已开启维护模式' : '已关闭维护模式',
    config: systemConfig
  });
}

/**
 * 清除配置缓存
 */
async function clearConfigCache(supabase: any) {
  try {
    // 调用 clear-cache 函数清除配置相关缓存
    await supabase.functions.invoke('clear-cache', {
      body: { pattern: 'config:*' }
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
}

/**
 * 深度合并对象
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
