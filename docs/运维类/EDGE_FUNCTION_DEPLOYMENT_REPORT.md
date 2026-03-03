# Edge Function admin-verify 部署报告

## ✅ 部署成功

**部署时间**: 2026-03-03  
**项目名称**: rfnrosyfeivcbkimjlwo  
**函数名称**: admin-verify  

---

## 📦 部署详情

### 部署命令

```bash
npx supabase functions deploy admin-verify
```

### 部署输出

```
Using workdir C:\Users\88903\Desktop\yinhezhengquan-zhengyu
WARNING: Docker is not running
Uploading asset (admin-verify): supabase/functions/admin-verify/index.ts
Deployed Functions on project rfnrosyfeivcbkimjlwo: admin-verify
You can inspect your deployment in the Dashboard: https://supabase.com/dashboard/project/rfnrosyfeivcbkimjlwo/functions
```

---

## 🔗 访问地址

### 生产环境 URL

```
https://rfnrosyfeivcbkimjlwo.functions.supabase.co/admin-verify
```

### Dashboard 管理链接

[https://supabase.com/dashboard/project/rfnrosyfeivcbkimjlwo/functions](https://supabase.com/dashboard/project/rfnrosyfeivcbkimjlwo/functions)

---

## 🧪 测试验证

### 1. 使用 curl 测试

```bash
# 获取 access_token（需要先登录）
# 然后在浏览器 Console 执行：
# const session = await supabase.auth.getSession();
# console.log(session.data.session.access_token);

curl -X GET 'https://rfnrosyfeivcbkimjlwo.functions.supabase.co/admin-verify' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

### 2. 预期响应

**成功响应** (管理员):
```json
{
  "ok": true,
  "admin": true,
  "payload": {
    "sub": "user-uuid-here",
    "email": "admin@zhengyu.com",
    "iat": 1709467200,
    "exp": 1709470800
  }
}
```

**成功响应** (非管理员):
```json
{
  "ok": true,
  "admin": false,
  "payload": {
    "sub": "user-uuid-here",
    "email": "user@example.com",
    "iat": 1709467200,
    "exp": 1709470800
  }
}
```

**错误响应** (缺少 token):
```json
{
  "ok": false,
  "error": "missing token",
  "admin": false
}
```

**错误响应** (缺少 sub claim):
```json
{
  "ok": false,
  "error": "invalid claim: missing sub claim",
  "admin": false
}
```

---

## 🔍 功能说明

### 主要功能

1. **JWT Payload 解码**
   - 从 Authorization header 提取 JWT token
   - Base64 解码 payload
   - 提取 `sub`、`email` 等字段

2. **sub 字段验证**
   - 检查 JWT 是否包含 `sub` 字段
   - 如果缺失，返回 403 错误
   - 防止"bad_jwt"和"missing sub claim"错误

3. **管理员权限判断**
   - 基于邮箱白名单
   - 支持的管理员邮箱：
     - `admin@zhengyu.com`
     - `root@local.dev`
     - `superadmin@zhengyu.com`

---

## 🛡️ 安全说明

### 当前实现（开发环境）

- ⚠️ **不验证 JWT 签名**（仅用于快速诊断/模拟）
- ✅ 验证 `sub` 字段存在性
- ✅ CORS 允许所有来源（开发方便）

### 生产环境建议

需要实现完整的 JWT 签名验证：

```typescript
// 使用 Supabase 的 JWKS 验证签名
const jwksUrl = 'https://rfnrosyfeivcbkimjlwo.supabase.co/auth/v1/jwks';
// 实现 JWT 签名验证逻辑...
```

---

## 📊 与前端集成

### AdminLoginView 中的调用

```typescript
// components/admin/AdminLoginView.tsx

// 1. 获取最新 session
const { data: latestSessionData } = await supabase.auth.getSession();
const accessToken = latestSessionData?.session?.access_token;

// 2. 调用 Edge Function
const verificationResult = await verifyAdminWithEdgeFunction(accessToken);

console.log('[AdminLogin] Edge Function 响应:', {
  ok: verificationResult.ok,
  admin: verificationResult.admin,
  status: verificationResult.status,
});

// 3. 根据结果处理
if (!verificationResult.ok || !verificationResult.admin) {
  await supabase.auth.signOut();
  throw new Error('管理员验证失败');
}

// 4. 验证通过，跳转管理后台
window.location.href = '/admin/dashboard';
```

---

## 🔧 故障排查

### 问题 1：Edge Function 返回 500

**可能原因**:
- Deno 运行时错误
- 代码语法问题

**解决方法**:
1. 查看 Dashboard 中的 Logs
2. 检查函数代码是否有语法错误
3. 重新部署：`npx supabase functions deploy admin-verify`

---

### 问题 2：CORS 错误

**错误信息**: 
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解决方法**:
确保 Edge Function 代码中包含 CORS headers：

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 处理 OPTIONS 预检请求
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

---

### 问题 3：返回 403 "missing sub claim"

**原因**: JWT token 中确实缺少 `sub` 字段

**解决方法**:
1. 检查前端是否正确调用 `getSession()`
2. 确保使用了最新的 access_token
3. 查看 AdminLoginView 中的日志：
   ```typescript
   console.log('[AdminLogin] Session 检查结果:', {
     hasSession: !!latestSessionData?.session,
     userId: latestSessionData?.session?.user.id,
   });
   ```

---

## 📈 监控指标

### 关键指标

1. **成功率**
   - 目标：>98%
   - 监控：200 响应比例

2. **响应时间**
   - 目标：<200ms
   - 监控：P95 延迟

3. **错误分布**
   - 403 错误：JWT 问题
   - 500 错误：函数内部错误
   - 401 错误：缺少 token

### 查看 Logs

在 Supabase Dashboard 中：
1. 进入项目 Dashboard
2. 点击 "Functions"
3. 选择 "admin-verify"
4. 点击 "Logs" 标签页

---

## 🔄 版本历史

### v1.0.0 (2026-03-03)

**功能**:
- ✅ JWT payload 解码
- ✅ sub 字段验证
- ✅ 邮箱白名单判断管理员权限
- ✅ CORS 支持
- ✅ 详细日志记录

**已知限制**:
- ⚠️ 不验证 JWT 签名（仅开发环境）
- ⚠️ 硬编码管理员邮箱列表

---

## 📝 下一步优化

### 短期（本周）

- [ ] 添加 JWT 签名验证（生产环境必需）
- [ ] 将管理员邮箱移到环境变量
- [ ] 添加请求频率限制

### 中期（本月）

- [ ] 集成数据库查询（从 profiles 表读取 admin_level）
- [ ] 添加审计日志（记录所有验证请求）
- [ ] 实现更细粒度的权限控制

### 长期（下季度）

- [ ] 支持 RBAC 角色管理
- [ ] 实现权限缓存机制
- [ ] 添加监控告警

---

## 🔗 相关资源

### 官方文档

- [Supabase Functions](https://supabase.com/docs/guides/functions)
- [Deno Deploy](https://deno.com/deploy)
- [JWT.io](https://jwt.io/)

### 本地文件

- [`supabase/functions/admin-verify/index.ts`](../../supabase/functions/admin-verify/index.ts) - 源码
- [`lib/fetch.ts`](../../lib/fetch.ts) - 前端调用封装
- [`components/admin/AdminLoginView.tsx`](../../components/admin/AdminLoginView.tsx) - 管理端登录

---

## ✅ 验收清单

- [x] Edge Function 部署成功
- [ ] 使用真实 token 测试通过
- [ ] 管理员账号验证通过（返回 admin: true）
- [ ] 普通用户验证返回 admin: false
- [ ] 缺少 token 时返回 401
- [ ] JWT 缺少 sub 字段时返回 403
- [ ] CORS 配置正确
- [ ] Logs 可以正常查看

---

**部署状态**: ✅ 已完成  
**测试状态**: 🟡 待验证  
**生产就绪**: 🟡 需要实现签名验证  
**维护者**: 银河证券开发团队
