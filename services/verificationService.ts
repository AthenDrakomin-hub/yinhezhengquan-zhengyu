// 开户申请手机号验证服务
import { supabase } from '../lib/supabase';

// 手机号格式验证
export const validatePhoneFormat = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

// 姓名格式验证
export const validateNameFormat = (name: string): boolean => {
  return /^[\u4e00-\u9fa5]{2,8}$/.test(name) || /^[a-zA-Z\s]{2,30}$/.test(name);
};

// 查询手机号归属地/运营商 (使用免费API)
export interface PhoneInfo {
  valid: boolean;
  operator?: string;
  province?: string;
  city?: string;
}

export const queryPhoneInfo = async (phone: string): Promise<PhoneInfo> => {
  try {
    // 方法1: 使用聚合数据的免费API (需要申请key)
    // const response = await fetch(`https://apis.juhe.cn/mobile/get?phone=${phone}&key=YOUR_KEY`);
    
    // 方法2: 使用简单的归属地查询API
    const response = await fetch(`https://cx.shouji.360.cn/phonearea.php?number=${phone}`);
    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      return {
        valid: true,
        operator: getOperatorName(data.data.sp),
        province: data.data.province,
        city: data.data.city,
      };
    }
    
    return { valid: false };
  } catch (error) {
    console.error('查询手机号信息失败:', error);
    // 如果API失败，返回格式验证通过
    return { valid: validatePhoneFormat(phone) };
  }
};

// 解析运营商代码
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

// 方案A: 阿里云实名认证
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
 * - 手机号归属地查询 (免费)
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
      message: '姓名格式不正确(2-8个汉字或2-30个英文字母)',
    };
  }
  
  // 2. 查询手机号信息
  const phoneInfo = await queryPhoneInfo(phone);
  
  if (!phoneInfo.valid) {
    return {
      valid: false,
      phoneValid: false,
      nameValid,
      phoneInfo,
      message: '手机号不存在或已停机',
    };
  }
  
  // 3. 实名认证 (可选)
  if (useRealNameVerify) {
    // 这里调用实际的实名认证API
    // const result = await verifyRealNameJuhe({ name, phone });
    
    // 模拟实名认证
    const mockMatch = Math.random() > 0.1; // 90%通过率模拟
    
    return {
      valid: mockMatch,
      phoneValid: true,
      nameValid: true,
      match: mockMatch,
      phoneInfo,
      message: mockMatch ? '验证通过' : '姓名与手机号实名信息不匹配',
    };
  }
  
  // 基础验证通过
  return {
    valid: true,
    phoneValid: true,
    nameValid: true,
    phoneInfo,
    message: '验证通过',
  };
};

// 保存验证记录
export const saveVerificationRecord = async (
  name: string,
  phone: string,
  result: VerifyPhoneAndNameResult
) => {
  try {
    const { error } = await supabase.from('phone_verification_logs').insert({
      name,
      phone,
      valid: result.valid,
      phone_info: result.phoneInfo,
      created_at: new Date().toISOString(),
    });
    
    if (error) console.error('保存验证记录失败:', error);
  } catch (err) {
    console.error('保存验证记录失败:', err);
  }
};
