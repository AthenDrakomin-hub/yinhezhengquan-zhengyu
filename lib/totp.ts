import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';

export interface TOTPSecret {
  base32: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

/**
 * 生成 TOTP 密钥和二维码
 * @param username 用户名（显示在 Authenticator 中）
 * @param serviceName 服务名称（默认：银河证券管理系统）
 */
export async function generateTOTPSecret(
  username: string,
  serviceName: string = '银河证券管理系统'
): Promise<TOTPSecret> {
  // 生成随机密钥
  const secret = new Secret({ size: 32 });
  const base32 = secret.base32;

  // 创建 TOTP 对象
  const totp = new TOTP({
    issuer: serviceName,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  });

  // 获取 otpauth URL
  const otpauthUrl = totp.toString();

  // 生成二维码 Data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 200,
    margin: 2,
    color: {
      dark: '#2563EB',
      light: '#FFFFFF',
    },
  });

  return {
    base32,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/**
 * 验证 TOTP 码
 * @param secretBase32 用户保存的 base32 密钥
 * @param token 用户输入的 6 位数字
 * @param window 时间窗口容错（默认 1，表示 ±30 秒）
 */
export function verifyTOTP(
  secretBase32: string,
  token: string,
  window: number = 1
): boolean {
  const totp = new TOTP({
    secret: Secret.fromBase32(secretBase32),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  // validate() 返回 { delta: number } | null
  const result = totp.validate({ token, window });
  return result !== null;
}

/**
 * 生成当前 TOTP 码（用于调试）
 * @param secretBase32 base32 密钥
 */
export function generateCurrentTOTP(secretBase32: string): string {
  const totp = new TOTP({
    secret: Secret.fromBase32(secretBase32),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  return totp.generate();
}
