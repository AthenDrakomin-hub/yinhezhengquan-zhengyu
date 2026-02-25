# Vercel Edge Middleware - IP黑名单功能

## 概述

此Edge Middleware用于拦截来自银河证券官方IP段（103.233.136.0/24, 103.233.137.0/24）的请求，保护应用免受未经授权的访问。

## 功能特性

1. **IP黑名单拦截**：拦截指定CIDR范围内的所有IPv4地址
2. **智能IP获取**：优先使用`x-real-ip`头，回退到`x-forwarded-for`的第一个IP
3. **友好的拦截页面**：返回美观的403禁止访问页面，显示被拦截的IP地址
4. **高性能CIDR匹配**：手动实现的CIDR匹配算法，无外部依赖
5. **全面日志记录**：记录所有请求的IP和路径，以及拦截事件

## 技术实现

### 核心算法

1. **CIDR匹配算法**：
   - 将IPv4地址转换为32位整数
   - 计算CIDR的网络地址和掩码
   - 使用位运算进行高效匹配

2. **IP获取策略**：
   ```typescript
   const ip = request.headers.get('x-real-ip') || 
              request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
              'unknown';
   ```

3. **拦截逻辑**：
   - 检查IP是否在BLOCKED_CIDRS范围内
   - 如果在范围内，返回403响应
   - 否则，继续处理请求

### 配置文件

```typescript
// 银河证券官方 IP 段（CIDR 格式）
const BLOCKED_CIDRS = [
  '103.233.136.0/24',
  '103.233.137.0/24'
];

// 匹配所有路径
export const config = {
  matcher: '/:path*',
};
```

## 测试方法

### 1. 本地测试

使用curl命令模拟被拦截的IP：

```bash
# 测试被拦截的IP（103.233.136.1）
curl -H "x-real-ip: 103.233.136.1" http://localhost:3000

# 测试被拦截的IP（103.233.137.100）
curl -H "x-real-ip: 103.233.137.100" http://localhost:3000

# 测试允许的IP
curl -H "x-real-ip: 8.8.8.8" http://localhost:3000
```

### 2. 开发环境测试

在Vercel开发环境中，可以使用Vercel CLI：

```bash
# 安装Vercel CLI
npm i -g vercel

# 本地开发
vercel dev

# 测试不同IP
curl -H "x-real-ip: 103.233.136.50" http://localhost:3000
```

### 3. 生产环境测试

部署到Vercel后，使用在线代理工具测试：

1. 使用代理服务（如BrightData、SmartProxy）选择不同地理位置的IP
2. 使用浏览器扩展切换IP
3. 使用API测试工具（如Postman、Insomnia）设置请求头

### 4. 验证测试用例

| 测试IP | 预期结果 | 说明 |
|--------|----------|------|
| 103.233.136.1 | 拦截 (403) | 在103.233.136.0/24范围内 |
| 103.233.136.255 | 拦截 (403) | 在103.233.136.0/24范围内 |
| 103.233.137.100 | 拦截 (403) | 在103.233.137.0/24范围内 |
| 103.233.138.1 | 通过 (200) | 不在黑名单范围内 |
| 8.8.8.8 | 通过 (200) | 公共DNS，不在黑名单范围内 |
| 192.168.1.1 | 通过 (200) | 私有IP，不在黑名单范围内 |
| IPv6地址 | 通过 (200) | 当前只拦截IPv4 |

## 部署说明

### 1. 自动部署（Vercel）

将代码推送到GitHub、GitLab或Bitbucket后，Vercel会自动检测并部署：

1. 在Vercel控制台导入项目
2. 配置环境变量（如果需要）
3. 部署后验证中间件功能

### 2. 手动部署

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 部署到Vercel
vercel --prod
```

### 3. 环境配置

确保Vercel项目设置中启用了Edge Functions：

1. 进入项目设置 → "Functions"
2. 确保"Edge Functions"已启用
3. 配置内存和超时设置（如果需要）

## 监控和日志

### 1. Vercel日志

在Vercel控制台查看Edge Function日志：

```
请求IP: 103.233.136.1, 路径: /
拦截来自IP 103.233.136.1 的请求
```

### 2. 自定义日志（可选扩展）

可以集成第三方日志服务：

```typescript
// 示例：记录到Supabase
async function logBlockedRequest(ip: string, path: string, userAgent: string) {
  // 实现日志记录逻辑
}
```

## 安全注意事项

1. **IP伪造防护**：虽然`x-real-ip`相对可靠，但客户端可以伪造`x-forwarded-for`
2. **IPv6支持**：当前只拦截IPv4，如需拦截IPv6需添加对应规则
3. **性能考虑**：CIDR匹配算法已优化，但大量规则可能影响性能
4. **误封风险**：部署前应在测试环境充分验证
5. **紧急禁用**：如需临时禁用，可注释中间件逻辑或移除middleware.ts文件

## 故障排除

### 常见问题

1. **中间件不生效**
   - 检查文件位置：确保middleware.ts在项目根目录
   - 检查Vercel配置：确保Edge Functions已启用
   - 检查部署日志：查看是否有编译错误

2. **误拦截正常用户**
   - 检查IP获取逻辑：确认获取的是真实客户端IP
   - 检查CIDR规则：确认规则准确无误
   - 添加白名单：为特定路径添加例外

3. **性能问题**
   - 优化CIDR匹配：考虑使用更高效的数据结构
   - 减少规则数量：只保留必要的拦截规则
   - 启用缓存：对频繁访问的IP进行缓存

### 调试方法

1. 添加详细日志：
   ```typescript
   console.log('请求头:', Object.fromEntries(request.headers));
   ```

2. 测试不同场景：
   ```bash
   # 测试无IP头的情况
   curl http://localhost:3000
   
   # 测试多个x-forwarded-for的情况
   curl -H "x-forwarded-for: 103.233.136.1, 10.0.0.1" http://localhost:3000
   ```

## 扩展功能

### 1. 添加白名单

```typescript
// 特定路径允许访问（如管理员后台）
const ALLOWED_PATHS = ['/admin', '/api/auth'];

if (ALLOWED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
  return NextResponse.next();
}
```

### 2. 集成日志服务

```typescript
// 记录到Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function logToSupabase(ip: string, path: string, blocked: boolean) {
  await supabase.from('security_logs').insert({
    ip,
    path,
    blocked,
    timestamp: new Date().toISOString(),
    user_agent: request.headers.get('user-agent')
  });
}
```

### 3. 动态规则更新

可以从数据库或API动态加载拦截规则：

```typescript
// 从环境变量或API获取规则
const BLOCKED_CIDRS = process.env.BLOCKED_CIDRS?.split(',') || [
  '103.233.136.0/24',
  '103.233.137.0/24'
];
```

## 许可证

此中间件为银河证券证裕交易单元专用安全组件，未经授权不得修改或分发。

## 支持

如有问题或需要技术支持，请联系：
- 系统管理员
- 安全团队
- 开发团队
