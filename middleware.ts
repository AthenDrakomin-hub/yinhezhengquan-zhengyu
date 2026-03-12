// Vercel Edge Middleware - IP黑名单功能
// 拦截来自银河证券官方IP段（103.233.136.0/24, 103.233.137.0/24）的请求

// 银河证券官方 IP 段（CIDR 格式）
const BLOCKED_CIDRS = [
  '103.233.136.0/24',
  '103.233.137.0/24'
];

/**
 * 将IPv4地址转换为32位整数
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    throw new Error(`无效的IPv4地址: ${ip}`);
  }
  
  return ((parseInt(parts[0]) << 24) >>> 0) +
         ((parseInt(parts[1]) << 16) >>> 0) +
         ((parseInt(parts[2]) << 8) >>> 0) +
         (parseInt(parts[3]) >>> 0);
}

/**
 * 解析CIDR表示法，返回网络地址和掩码
 */
function parseCIDR(cidr: string): { network: number; mask: number } {
  const [ip, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr);
  
  if (prefix < 0 || prefix > 32) {
    throw new Error(`无效的CIDR前缀: ${cidr}`);
  }
  
  const network = ipToInt(ip);
  const mask = prefix === 32 ? 0xFFFFFFFF : (~(0xFFFFFFFF >>> prefix)) >>> 0;
  
  return { network: network & mask, mask };
}

/**
 * 检查IP是否在CIDR范围内
 */
function isIpInCIDR(ip: string, cidr: string): boolean {
  try {
    const ipInt = ipToInt(ip);
    const { network, mask } = parseCIDR(cidr);
    
    return (ipInt & mask) === network;
  } catch (error) {
    console.error(`CIDR匹配错误: ${error}`);
    return false;
  }
}

/**
 * 检查IP是否被阻止
 */
function isIpBlocked(ip: string): boolean {
  // 检查是否为IPv4地址
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) {
    // 如果是IPv6或其他格式，暂时放行（可根据需要添加IPv6规则）
    return false;
  }
  
  // 检查IP是否在任何被阻止的CIDR范围内
  for (const cidr of BLOCKED_CIDRS) {
    if (isIpInCIDR(ip, cidr)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 生成403禁止访问页面
 */
function createBlockedResponse(ip: string): Response {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>禁止访问 - 银河证券日斗投资单元</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #ff6b6b;
        }
        p {
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .ip-info {
            background: rgba(0, 0, 0, 0.2);
            padding: 10px 20px;
            border-radius: 10px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 1.2rem;
        }
        .contact {
            margin-top: 30px;
            font-size: 0.9rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚫 禁止访问</h1>
        <p>抱歉，您的访问请求已被系统拦截。</p>
        <p>根据安全策略，来自特定IP段的访问请求不被允许。</p>
        
        <div class="ip-info">
            被拦截的IP地址: <strong>${ip}</strong>
        </div>
        
        <p>如果您认为这是一个错误，或者需要访问权限，请联系系统管理员。</p>
        
        <div class="contact">
            <p>银河证券日斗投资单元安全系统</p>
            <p>© ${new Date().getFullYear()} 中国银河证券股份有限公司</p>
        </div>
    </div>
</body>
</html>
  `;

  return new Response(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}

/**
 * Vercel Edge Middleware 主函数
 */
export default function middleware(request: Request) {
  // 获取请求URL
  const url = new URL(request.url);
  
  // 获取真实IP地址
  // Vercel提供x-real-ip头，优先使用
  // 如果不存在，回退到x-forwarded-for的第一个IP
  const ip = request.headers.get('x-real-ip') || 
             request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
             'unknown';
  
  console.log(`请求IP: ${ip}, 路径: ${url.pathname}`);
  
  // 检查IP是否被阻止
  if (ip !== 'unknown' && isIpBlocked(ip)) {
    console.log(`拦截来自IP ${ip} 的请求`);
    return createBlockedResponse(ip);
  }
  
  // IP未被阻止，继续处理请求
  return new Response(null, {
    status: 200,
    headers: {
      'x-middleware-next': '1'
    }
  });
}

// 配置匹配路径（所有路径）
export const config = {
  matcher: '/:path*',
};
