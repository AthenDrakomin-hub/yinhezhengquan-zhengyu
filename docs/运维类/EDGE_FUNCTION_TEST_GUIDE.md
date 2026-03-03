# Edge Function admin-verify 快速测试指南

## 🎯 测试目标

验证已部署的 Edge Function 是否正常工作。

---

## 🧪 测试步骤

### 方法 1：通过管理端登录界面测试（推荐）

**步骤**:
1. 打开浏览器，访问应用
2. 导航到 `/admin/login`
3. 输入管理员账号：`admin@zhengyu.com` / `Admin123!`
4. 点击"登录银监会"
5. 打开浏览器 Console (F12)

**预期 Console 输出**:
```javascript
[AdminLogin] 开始登录...
[AdminLogin] 登录响应：{hasError: false, hasUser: true, hasSession: true}
[AdminLogin] 获取最新 session...
[AdminLogin] Session 检查结果：{
  hasSessionError: false,
  hasSession: true,
  userId: "xxx-xxx-xxx"
}
[AdminLogin] Access Token: 存在
[AdminLogin] 调用 Edge Function 验证管理员权限...
[AdminLogin] Edge Function 响应：{
  ok: true,
  admin: true,
  status: 200,
  error: null
}
[AdminLogin] 管理员验证通过
[AdminLogin] 登录成功，准备跳转...
[AdminLogin] 跳转到 /admin/dashboard
```

**成功标志**:
- ✅ 看到 `[AdminLogin] Edge Function 响应：{ok: true, admin: true}`
- ✅ 页面成功跳转到 `/admin/dashboard`
- ✅ Network 面板中 Edge Function 请求返回 200

---

### 方法 2：使用浏览器 Console 直接测试

**步骤**:
1. 先登录任意账号（客户端或管理端）
2. 打开浏览器 Console (F12)
3. 粘贴以下代码并回车：

```javascript
// 获取 access_token 并调用 Edge Function
(async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  
  console.log('🔑 Access Token:', token ? '存在' : '不存在');
  
  if (!token) {
    console.error('❌ 未找到 access token，请先登录');
    return;
  }
  
  try {
    const response = await fetch('https://rfnrosyfeivcbkimjlwo.functions.supabase.co/admin-verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    const result = await response.json();
    
    console.log('📊 Edge Function 响应:', {
      status: response.status,
      ok: result.ok,
      admin: result.admin,
      payload: result.payload,
      error: result.error
    });
    
    if (result.ok && result.admin) {
      console.log('✅ 管理员验证通过！');
    } else if (result.ok && !result.admin) {
      console.log('⚠️ 用户不是管理员');
    } else {
      console.error('❌ 验证失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 调用 Edge Function 失败:', error);
  }
})();
```

**预期输出** (管理员账号):
```javascript
🔑 Access Token: 存在
📊 Edge Function 响应：{
  status: 200,
  ok: true,
  admin: true,
  payload: {
    sub: "user-uuid-here",
    email: "admin@zhengyu.com",
    iat: 1709467200,
    exp: 1709470800
  },
  error: null
}
✅ 管理员验证通过！
```

**预期输出** (普通用户账号):
```javascript
🔑 Access Token: 存在
📊 Edge Function 响应：{
  status: 200,
  ok: true,
  admin: false,
  payload: {
    sub: "user-uuid-here",
    email: "user@example.com",
    iat: 1709467200,
    exp: 1709470800
  },
  error: null
}
⚠️ 用户不是管理员
```

---

### 方法 3：使用 curl 命令测试（命令行）

**步骤**:
1. 在浏览器 Console 获取 access_token：
   ```javascript
   const { data } = await supabase.auth.getSession();
   console.log(data.session.access_token);
   ```

2. 复制输出的 token，替换下面的 `YOUR_ACCESS_TOKEN`，然后执行：

```bash
curl -X GET 'https://rfnrosyfeivcbkimjlwo.functions.supabase.co/admin-verify' ^
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' ^
  -H 'Content-Type: application/json'
```

**PowerShell 版本**:
```powershell
$token = "YOUR_ACCESS_TOKEN"
Invoke-RestMethod -Uri "https://rfnrosyfeivcbkimjlwo.functions.supabase.co/admin-verify" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
```

**预期响应**:
```json
{
  "ok": true,
  "admin": true,
  "payload": {
    "sub": "...",
    "email": "admin@zhengyu.com",
    "iat": 1709467200,
    "exp": 1709470800
  }
}
```

---

## 🔍 故障排查

### 问题 1：Edge Function 返回 403 "missing sub claim"

**原因**: JWT token 中缺少 `sub` 字段

**解决方法**:
1. 检查是否正确调用了 `getSession()`
2. 查看 AdminLoginView 中的日志：
   ```javascript
   [AdminLogin] Session 检查结果：{...}
   ```
3. 确认 `hasSession: true`

---

### 问题 2：CORS 错误

**错误信息**:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解决方法**:
1. 检查 Edge Function 代码是否包含 CORS headers
2. 确认处理了 OPTIONS 预检请求
3. 重新部署：`npx supabase functions deploy admin-verify`

---

### 问题 3：Network 面板看不到 Edge Function 请求

**可能原因**:
- Filter 设置不当
- 请求被浏览器缓存

**解决方法**:
1. 清除浏览器缓存 (Ctrl+Shift+Delete)
2. Network 面板过滤设置为：`-css -js -img`
3. 勾选 "Preserve log"

---

## 📊 测试结果记录表

| 测试场景 | 测试账号 | 预期结果 | 实际结果 | 状态 |
|---------|---------|---------|---------|------|
| 管理员登录 | admin@zhengyu.com | admin: true | _待填写_ | ⏳ |
| 普通用户登录 | zhangsan@qq.com | admin: false | _待填写_ | ⏳ |
| 缺少 token | - | 401 error | _待填写_ | ⏳ |
| JWT 缺少 sub | - | 403 "missing sub" | _待填写_ | ⏳ |

---

## 🎯 成功标准

所有测试都应该满足以下条件：

- ✅ Edge Function 可以正常访问
- ✅ 管理员账号返回 `admin: true`
- ✅ 普通用户返回 `admin: false`
- ✅ 缺少 token 时返回 401
- ✅ JWT 缺少 sub 时返回 403
- ✅ 响应时间 < 500ms
- ✅ Console 日志清晰可追溯

---

## 📝 下一步

测试通过后：

1. 更新 [`EDGE_FUNCTION_DEPLOYMENT_REPORT.md`](EDGE_FUNCTION_DEPLOYMENT_REPORT.md) 的验收清单
2. 记录测试结果到上表
3. 继续其他登录场景的测试

---

**文档状态**: ✅ 待测试  
**最后更新**: 2026-03-03  
**维护者**: 银河证券开发团队
