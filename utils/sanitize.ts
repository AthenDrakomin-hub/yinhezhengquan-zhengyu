/**
 * XSS 过滤和输入消毒工具
 * 用于对用户输入（如昵称、评论、备注等）进行安全处理
 */

/**
 * HTML 实体编码
 * 将特殊字符转换为 HTML 实体，防止 XSS 攻击
 */
export const escapeHtml = (input: string): string => {
  if (!input) return '';
  
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return String(input).replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
};

/**
 * HTML 实体解码
 * 将 HTML 实体转换回原始字符
 */
export const unescapeHtml = (input: string): string => {
  if (!input) return '';
  
  const htmlEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&nbsp;': ' ',
  };

  return String(input).replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D|nbsp);/g, (entity) => htmlEntities[entity] || entity);
};

/**
 * 移除 HTML 标签
 * 保留纯文本内容
 */
export const stripHtml = (input: string): string => {
  if (!input) return '';
  return String(input).replace(/<[^>]*>/g, '');
};

/**
 * 清理危险字符和模式
 * 移除可能的脚本注入和危险模式
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  let sanitized = String(input);
  
  // 移除 script 标签及其内容
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除 style 标签及其内容
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // 移除 iframe 标签
  sanitized = sanitized.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // 移除事件处理属性
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // 移除 javascript: 协议
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  
  // 移除 data: 协议（可能用于恶意内容）
  sanitized = sanitized.replace(/data\s*:/gi, '');
  
  // 移除 vbscript: 协议
  sanitized = sanitized.replace(/vbscript\s*:/gi, '');
  
  // 移除 expression() CSS 表达式
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');
  
  // 移除 @import 规则
  sanitized = sanitized.replace(/@import\s+[^;]+;/gi, '');
  
  // 移除 HTML 注释
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  
  // 移除 CDATA 区块
  sanitized = sanitized.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '');
  
  return sanitized.trim();
};

/**
 * 清理富文本输入
 * 允许部分安全的 HTML 标签，移除危险内容
 */
export const sanitizeRichText = (input: string): string => {
  if (!input) return '';
  
  // 允许的安全标签
  const allowedTags = [
    'p', 'br', 'span', 'strong', 'em', 'u', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  ];
  
  // 允许的安全属性
  const allowedAttrs: Record<string, string[]> = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'table': ['border', 'cellpadding', 'cellspacing'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
  };
  
  let sanitized = sanitizeInput(input);
  
  // 先转义所有 HTML
  sanitized = escapeHtml(sanitized);
  
  // 然后恢复允许的标签（这是简化版，生产环境建议使用 DOMPurify）
  // 注意：这是一个基础实现，生产环境强烈建议使用 DOMPurify 库
  
  return sanitized;
};

/**
 * 验证并清理 URL
 * 确保只允许安全的协议
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  // 允许的安全协议
  const safeProtocols = ['http://', 'https://', 'mailto:', 'tel:'];
  const trimmedUrl = url.trim().toLowerCase();
  
  // 检查是否以安全协议开头
  const isSafe = safeProtocols.some(protocol => trimmedUrl.startsWith(protocol));
  
  // 允许相对路径
  const isRelative = trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || !trimmedUrl.includes(':');
  
  if (isSafe || isRelative) {
    return url.trim();
  }
  
  // 危险协议，返回空
  return '';
};

/**
 * 清理 JSON 字符串
 * 移除可能的 JSON 注入
 */
export const sanitizeJson = (input: string): string => {
  if (!input) return '';
  
  try {
    // 尝试解析并重新序列化
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed);
  } catch {
    // 如果解析失败，返回空对象
    return '{}';
  }
};

/**
 * 清理文件名
 * 移除路径遍历和特殊字符
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return '';
  
  return String(filename)
    // 移除路径遍历
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // 移除控制字符
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // 移除特殊字符
    .replace(/[<>:"|?*]/g, '')
    // 限制长度
    .slice(0, 255)
    .trim();
};

/**
 * 清理 CSS 值
 * 移除可能的 CSS 注入
 */
export const sanitizeCss = (css: string): string => {
  if (!css) return '';
  
  return String(css)
    // 移除 expression
    .replace(/expression\s*\(/gi, '')
    // 移除 url() 中的危险内容
    .replace(/url\s*\(\s*["']?\s*javascript:/gi, 'url(')
    // 移除 @import
    .replace(/@import/gi, '')
    // 移除 behavior
    .replace(/behavior\s*:/gi, '')
    // 移除 -moz-binding
    .replace(/-moz-binding\s*:/gi, '');
};

/**
 * 清理 SQL 输入（额外保护层，不应替代参数化查询）
 */
export const sanitizeSqlInput = (input: string): string => {
  if (!input) return '';
  
  return String(input)
    // 转义单引号
    .replace(/'/g, "''")
    // 移除注释
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // 移除分号（防止多语句）
    .replace(/;/g, '');
};

/**
 * 验证输入长度
 */
export const validateLength = (input: string, min: number, max: number): { valid: boolean; message?: string } => {
  if (!input) {
    return { valid: min === 0, message: min === 0 ? undefined : '内容不能为空' };
  }
  
  const length = String(input).length;
  
  if (length < min) {
    return { valid: false, message: `内容长度不能少于 ${min} 个字符` };
  }
  
  if (length > max) {
    return { valid: false, message: `内容长度不能超过 ${max} 个字符` };
  }
  
  return { valid: true };
};

export default {
  escapeHtml,
  unescapeHtml,
  stripHtml,
  sanitizeInput,
  sanitizeRichText,
  sanitizeUrl,
  sanitizeJson,
  sanitizeFilename,
  sanitizeCss,
  sanitizeSqlInput,
  validateLength,
};
