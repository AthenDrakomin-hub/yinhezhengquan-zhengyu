/**
 * 数据脱敏工具函数
 * 用于在前端展示时隐藏敏感信息
 */

/**
 * 手机号脱敏
 * @param phone 手机号
 * @returns 脱敏后的手机号，如 138****8888
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 身份证号脱敏
 * @param idCard 身份证号
 * @returns 脱敏后的身份证号，如 110***********1234
 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard;
  // 保留前3位和后4位
  const front = idCard.slice(0, 3);
  const back = idCard.slice(-4);
  const middle = '*'.repeat(idCard.length - 7);
  return `${front}${middle}${back}`;
}

/**
 * 邮箱脱敏
 * @param email 邮箱
 * @returns 脱敏后的邮箱，如 a***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 1) return email;
  const maskedName = name[0] + '*'.repeat(Math.min(name.length - 1, 3));
  return `${maskedName}@${domain}`;
}

/**
 * 银行卡号脱敏
 * @param cardNo 银行卡号
 * @returns 脱敏后的银行卡号，如 6222 **** **** 1234
 */
export function maskBankCard(cardNo: string): string {
  if (!cardNo || cardNo.length < 8) return cardNo;
  const front = cardNo.slice(0, 4);
  const back = cardNo.slice(-4);
  const middle = ' **** **** ';
  return `${front}${middle}${back}`;
}

/**
 * 姓名脱敏
 * @param name 姓名
 * @returns 脱敏后的姓名，如 张*、张**
 */
export function maskName(name: string): string {
  if (!name || name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}

/**
 * 地址脱敏
 * @param address 地址
 * @returns 脱敏后的地址，只显示省市，隐藏详细地址
 */
export function maskAddress(address: string): string {
  if (!address || address.length < 6) return address;
  // 尝试找到省市区
  const match = address.match(/^(.+?[省市])?(.+?[市区县])?/);
  if (match && match[0]) {
    return match[0] + '****';
  }
  // 默认隐藏后半部分
  return address.slice(0, Math.floor(address.length / 2)) + '****';
}
