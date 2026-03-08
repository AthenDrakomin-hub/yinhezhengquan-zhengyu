/**
 * 手机号归属地查询 Edge Function
 * 替代 360 手机归属地 API
 * 支持多源查询: juhe.cn, showapi.com 等
 * 
 * 部署: supabase functions deploy phone-location
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// API Key 配置
const JUHE_API_KEY = Deno.env.get('JUHE_PHONE_API_KEY') || '';
const SHOWAPI_APPID = Deno.env.get('SHOWAPI_APPID') || '';
const SHOWAPI_SECRET = Deno.env.get('SHOWAPI_SECRET') || '';

// 手机号格式验证
const validatePhoneFormat = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

// 运营商映射
const operatorMap: Record<string, string> = {
  '1': '中国移动',
  '2': '中国联通',
  '3': '中国电信',
  '4': '中国电信',
  '5': '中国移动',
  '6': '中国联通',
  '移动': '中国移动',
  '联通': '中国联通',
  '电信': '中国电信',
  'CMCC': '中国移动',
  'CUCC': '中国联通',
  'CTCC': '中国电信',
};

// 响应格式
interface PhoneLocationResult {
  valid: boolean;
  phone: string;
  province?: string;
  city?: string;
  operator?: string;
  zipCode?: string;
  areaCode?: string;
  message?: string;
}

const successResponse = (data: PhoneLocationResult) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const errorResponse = (message: string, code: number = 400) => ({
  success: false,
  error: message,
  code,
  timestamp: new Date().toISOString(),
});

/**
 * 方法1: 使用聚合数据 API (juhe.cn)
 * 需要申请 API Key: https://www.juhe.cn/docs/api/id/11
 */
async function queryByJuhe(phone: string): Promise<PhoneLocationResult | null> {
  if (!JUHE_API_KEY) return null;
  
  try {
    const response = await fetch(
      `https://apis.juhe.cn/mobile/get?phone=${phone}&key=${JUHE_API_KEY}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const data = await response.json();
    
    if (data.error_code === 0 && data.result) {
      return {
        valid: true,
        phone,
        province: data.result.province,
        city: data.result.city,
        operator: data.result.company,
        zipCode: data.result.zip,
        areaCode: data.result.areacode,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Juhe API 错误:', error);
    return null;
  }
}

/**
 * 方法2: 使用 ShowAPI (showapi.com)
 * 需要申请 AppId 和 Secret: https://www.showapi.com/api/phoneLocation
 */
async function queryByShowAPI(phone: string): Promise<PhoneLocationResult | null> {
  if (!SHOWAPI_APPID || !SHOWAPI_SECRET) return null;
  
  try {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const sign = await generateShowAPISign(timestamp);
    
    const response = await fetch(
      `https://route.showapi.com/6-1?showapi_appid=${SHOWAPI_APPID}&showapi_sign=${sign}&showapi_timestamp=${timestamp}&num=${phone}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const data = await response.json();
    
    if (data.showapi_res_code === 0 && data.showapi_res_body) {
      const body = data.showapi_res_body;
      return {
        valid: true,
        phone,
        province: body.province,
        city: body.city,
        operator: body.name,
      };
    }
    
    return null;
  } catch (error) {
    console.error('ShowAPI 错误:', error);
    return null;
  }
}

/**
 * 生成 ShowAPI 签名
 */
async function generateShowAPISign(timestamp: string): Promise<string> {
  const signStr = `${SHOWAPI_SECRET}showapi_appid${SHOWAPI_APPID}showapi_timestamp${timestamp}${SHOWAPI_SECRET}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(signStr);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 方法3: 使用国内免费的归属地查询 API (备用)
 */
async function queryByBackupAPI(phone: string): Promise<PhoneLocationResult | null> {
  try {
    // 尝试多个备用 API
    const apis = [
      `https://api.vvhan.com/api/phone?tel=${phone}`,
    ];
    
    for (const apiUrl of apis) {
      try {
        const response = await fetch(apiUrl, {
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        // 解析不同 API 的响应格式
        if (data.success && data.info) {
          return {
            valid: true,
            phone,
            province: data.info.province,
            city: data.info.city,
            operator: data.info.operator || data.info.name,
          };
        }
      } catch (e) {
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('备用 API 错误:', error);
    return null;
  }
}

/**
 * 方法4: 基于号段的本地查询 (最后的备用方案)
 * 使用号段数据库进行粗略查询
 */
function queryByLocalDB(phone: string): PhoneLocationResult {
  const prefix = phone.substring(0, 7);
  const segment = phone.substring(0, 3);
  
  // 运营商判断
  let operator = '未知运营商';
  if (['134', '135', '136', '137', '138', '139', '147', '150', '151', '152', '157', '158', '159', '178', '182', '183', '184', '187', '188', '198'].includes(segment)) {
    operator = '中国移动';
  } else if (['130', '131', '132', '145', '155', '156', '166', '175', '176', '185', '186'].includes(segment)) {
    operator = '中国联通';
  } else if (['133', '149', '153', '173', '177', '180', '181', '189', '199'].includes(segment)) {
    operator = '中国电信';
  } else if (['192'].includes(segment)) {
    operator = '中国广电';
  }
  
  return {
    valid: true,
    phone,
    operator,
    message: '仅基于号段的粗略查询结果',
  };
}

/**
 * 主查询函数 - 按优先级尝试多个数据源
 */
async function queryPhoneLocation(phone: string): Promise<PhoneLocationResult> {
  // 1. 验证手机号格式
  if (!validatePhoneFormat(phone)) {
    return {
      valid: false,
      phone,
      message: '手机号格式不正确',
    };
  }
  
  // 2. 按优先级查询
  // 优先使用聚合数据
  let result = await queryByJuhe(phone);
  if (result) return result;
  
  // 其次使用 ShowAPI
  result = await queryByShowAPI(phone);
  if (result) return result;
  
  // 使用备用 API
  result = await queryByBackupAPI(phone);
  if (result) return result;
  
  // 最后使用本地号段查询
  return queryByLocalDB(phone);
}

// 主处理函数
serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // 路由: /phone-location/:phone 或 /phone-location?phone=xxx
    if (path === '/phone-location' || path.startsWith('/phone-location/')) {
      let phone: string | null = null;
      
      // 从路径获取手机号
      if (path.startsWith('/phone-location/')) {
        phone = path.replace('/phone-location/', '');
      }
      
      // 从查询参数获取手机号
      if (!phone) {
        phone = url.searchParams.get('phone');
      }
      
      // 从请求体获取手机号 (POST)
      if (!phone && req.method === 'POST') {
        try {
          const body = await req.json();
          phone = body.phone;
        } catch {
          // 忽略解析错误
        }
      }
      
      if (!phone) {
        return new Response(JSON.stringify(errorResponse('缺少 phone 参数', 400)), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // 清理手机号 (去除空格和特殊字符)
      phone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
      
      const result = await queryPhoneLocation(phone);
      
      return new Response(JSON.stringify(successResponse(result)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 健康检查
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'phone-location',
        juheConfigured: !!JUHE_API_KEY,
        showapiConfigured: !!(SHOWAPI_APPID && SHOWAPI_SECRET),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 404 处理
    return new Response(JSON.stringify(errorResponse('接口不存在', 404)), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(JSON.stringify(errorResponse(error instanceof Error ? error.message : '内部服务器错误')), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
