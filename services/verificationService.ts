// 开户申请手机号验证服务
import { supabase } from '../lib/supabase';

// Edge Function URL
const getPhoneLocationFunctionUrl = () => {
  if (import.meta.env.VITE_PHONE_LOCATION_FUNCTION_URL) {
    return import.meta.env.VITE_PHONE_LOCATION_FUNCTION_URL;
  }
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-location`;
};

// 手机号格式验证
export const validatePhoneFormat = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

// 姓名格式验证
export const validateNameFormat = (name: string): boolean => {
  return /^[\u4e00-\u9fa5]{2,8}$/.test(name) || /^[a-zA-Z\s]{2,30}$/.test(name);
};

// 手机号归属地查询结果
export interface PhoneInfo {
  valid: boolean;
  operator?: string;
  province?: string;
  city?: string;
  zipCode?: string;
  areaCode?: string;
  message?: string;
}

/**
 * 查询手机号归属地/运营商
 * 通过 Supabase Edge Function (phone-location)
 * 
 * 支持多源查询:
 * 1. 聚合数据 API (juhe.cn) - 需要配置 JUHE_PHONE_API_KEY
 * 2. ShowAPI (showapi.com) - 需要配置 SHOWAPI_APPID 和 SHOWAPI_SECRET
 * 3. 备用免费 API
 * 4. 本地号段查询 (兜底)
 */
export const queryPhoneInfo = async (phone: string): Promise<PhoneInfo> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(
      `${getPhoneLocationFunctionUrl()}/phone-location?phone=${encodeURIComponent(phone)}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`查询失败: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return {
        valid: result.data.valid,
        operator: result.data.operator,
        province: result.data.province,
        city: result.data.city,
        zipCode: result.data.zipCode,
        areaCode: result.data.areaCode,
        message: result.data.message,
      };
    }
    
    return { valid: false, message: result.error || '查询失败' };
  } catch (error) {
    console.error('查询手机号归属地失败:', error);
    // API 失败时返回格式验证结果
    return { valid: validatePhoneFormat(phone) };
  }
};

// 解析运营商代码 (兼容旧版 360 API)
const getOperatorName = (sp: string): string => {
  const operators: Record<string, string> = {
    '1': '中国移动',
    '2': '中国联通', 
    '3': '中国电信',
    '4': '中国电信',
    '5': '中国移动',
    '6': '中国联通',
  };
  return operators[sp] || '未知运营商';
};

// ============================================
// 实名认证方案 (需要企业资质和付费)
// ============================================

export interface RealNameVerifyParams {
  name: string;
  phone: string;
  idCard?: string; // 可选，二要素/三要素认证
}

export interface RealNameVerifyResult {
  success: boolean;
  match: boolean;
  message: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * 阿里云实名认证 - 需要企业资质
 * 费用: ~0.3-0.5元/次
 */
export const verifyRealNameAliyun = async (
  params: RealNameVerifyParams
): Promise<RealNameVerifyResult> => {
  // 实际调用阿里云API
  // const response = await fetch('https://cloudauth.aliyuncs.com/', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': 'YOUR_ALIYUN_KEY',
  //   },
  //   body: JSON.stringify({
  //     ProductCode: 'Auth',
  //     Type: '2', // 二要素认证
  //     Name: params.name,
  //     Phone: params.phone,
  //   }),
  // });
  
  // 模拟返回
  return {
    success: true,
    match: true,
    message: '验证通过',
    riskLevel: 'low',
  };
};

// 方案B: 腾讯云实名认证
export const verifyRealNameTencent = async (
  params: RealNameVerifyParams
): Promise<RealNameVerifyResult> => {
  // 实际调用腾讯云API
  // const response = await fetch('https://faceid.tencentcloudapi.com/', { ... });
  
  return {
    success: true,
    match: true,
    message: '验证通过',
    riskLevel: 'low',
  };
};

// 方案C: 聚合数据实名认证 (个人可申请)
export const verifyRealNameJuhe = async (
  params: RealNameVerifyParams
): Promise<RealNameVerifyResult> => {
  try {
    // 二要素认证: 姓名+手机号
    const response = await fetch(
      `https://op.juhe.cn/ofpay/mobile/telcheck?realname=${encodeURIComponent(params.name)}&mobile=${params.phone}&key=YOUR_JUHE_KEY`
    );
    const data = await response.json();
    
    if (data.error_code === 0) {
      return {
        success: true,
        match: data.result.isok === '1',
        message: data.result.isok === '1' ? '验证通过' : '姓名与手机号不匹配',
      };
    }
    
    return {
      success: false,
      match: false,
      message: data.reason || '验证失败',
    };
  } catch (error) {
    return {
      success: false,
      match: false,
      message: '验证服务暂时不可用',
    };
  }
};

// ============================================
// 推荐的实现方案
// ============================================

export interface VerifyPhoneAndNameResult {
  valid: boolean;
  phoneValid: boolean;
  nameValid: boolean;
  match?: boolean;
  phoneInfo?: PhoneInfo;
  message: string;
}

/**
 * 推荐验证流程
 * 
 * 阶段1 (当前): 基础验证
 * - 手机号格式验证
 * - 姓名格式验证
 * - 手机号归属地查询 (通过 Edge Function)
 * 
 * 阶段2 (后续): 实名认证
 * - 接入第三方实名认证API
 * - 需要企业资质申请
 */
export const verifyPhoneAndName = async (
  name: string,
  phone: string,
  useRealNameVerify: boolean = false
): Promise<VerifyPhoneAndNameResult> => {
  // 1. 基础格式验证
  const phoneValid = validatePhoneFormat(phone);
  const nameValid = validateNameFormat(name);
  
  if (!phoneValid) {
    return {
      valid: false,
      phoneValid: false,
      nameValid,
      message: '手机号格式不正确',
    };
  }
  
  if (!nameValid) {
    return {
      valid: false,
      phoneValid,
      nameValid: false,
      message: '姓名格式不正确（请输入2-8位中文或2-30位英文）',
    };
  }
  
  // 2. 查询手机号归属地
  const phoneInfo = await queryPhoneInfo(phone);
  
  if (!phoneInfo.valid) {
    return {
      valid: false,
      phoneValid,
      nameValid,
      phoneInfo,
      message: phoneInfo.message || '手机号无效',
    };
  }
  
  // 3. 实名认证 (可选)
  if (useRealNameVerify) {
    // 这里可以接入阿里云/腾讯云实名认证
    // const verifyResult = await verifyRealNameAliyun({ name, phone });
    // if (!verifyResult.match) {
    //   return {
    //     valid: false,
    //     phoneValid,
    //     nameValid,
    //     phoneInfo,
    //     match: false,
    //     message: '姓名与手机号不匹配',
    //   };
    // }
  }
  
  return {
    valid: true,
    phoneValid,
    nameValid,
    phoneInfo,
    message: '验证通过',
  };
};

export default {
  validatePhoneFormat,
  validateNameFormat,
  queryPhoneInfo,
  verifyPhoneAndName,
};
