# Supabase Edge Functions 环境变量配置

本文档说明如何配置前端 (Vercel) 和后端 (Supabase Edge Functions) 的环境变量。

---

## 架构概览

```
┌─────────────────┐         ┌─────────────────────────┐
│   Vercel 前端   │────────▶│  Supabase Edge Functions │
│  (React + Vite) │   HTTP  │       (后端 API)         │
└─────────────────┘         └─────────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────────┐
                            │   Supabase 数据库       │
                            └─────────────────────────┘
```

---

## 前端环境变量 (Vercel)

### 配置位置
Vercel Dashboard → Project → Settings → Environment Variables

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIs...` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_LOGO_URL` | Logo 图片 URL | `/logo.png` |
| `VITE_CAROUSEL_IMAGE_*` | 轮播图 URL | 本地图片 |
| `VITE_SERVICE_ICON_*` | 服务图标 URL | 本地图片 |
| `VERCEL_CRON_SECRET` | Cron Job 密钥 | - |

---

## 后端环境变量 (Supabase Edge Functions)

### 配置位置
Supabase Dashboard → Project → Settings → Edge Functions

### 必需变量

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `SUPABASE_URL` | Supabase 项目 URL | 与前端相同 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务角色密钥 | Supabase Dashboard → Project Settings → API → service_role key |

### Edge Function 特定变量

| 变量名 | 说明 | 用途 |
|--------|------|------|
| `IPO_SYNC_API_KEY` | IPO 同步 API 密钥 | 验证 IPO 同步请求 |
| `QVERIS_API_KEY` | Qveris API 密钥 | 外部数据源认证 |

---

## Edge Functions 列表

项目使用以下 Edge Functions 处理后端逻辑：

| Function 名称 | 功能 | 前端调用路径 |
|---------------|------|-------------|
| `admin-verify` | 验证管理员权限 | `${VITE_SUPABASE_URL}/functions/v1/admin-verify` |
| `sync-ipo` | 同步 IPO 数据 | `${VITE_SUPABASE_URL}/functions/v1/sync-ipo` |
| `fetch-galaxy-news` | 获取新闻数据 | `${VITE_SUPABASE_URL}/functions/v1/fetch-galaxy-news` |

### 部署 Edge Functions

```bash
# 部署所有 Edge Functions
supabase functions deploy admin-verify
supabase functions deploy sync-ipo
supabase functions deploy fetch-galaxy-news
```

---

## 环境变量使用示例

### 前端代码 (Vercel)
```typescript
// 读取前端环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 调用 Edge Function
const functionUrl = `${supabaseUrl}/functions/v1/admin-verify`;
const response = await fetch(functionUrl, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Edge Function 代码 (Supabase)
```typescript
// 读取后端环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 创建服务端 Supabase 客户端
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
```

---

## 安全配置检查清单

### 前端安全
- [ ] `VITE_SUPABASE_ANON_KEY` 是 anon key，不是 service_role key
- [ ] 没有在代码中硬编码任何密钥或密码
- [ ] 所有敏感操作都通过 Edge Function 处理

### 后端安全
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 仅在 Edge Functions 中使用
- [ ] Edge Functions 启用了身份验证检查
- [ ] IPO_SYNC_API_KEY 设置为强随机字符串

### 部署安全
- [ ] 环境变量仅在需要的环境中设置（Production/Preview/Development）
- [ ] 定期轮换 API 密钥
- [ ] 启用 Supabase RLS (Row Level Security)

---

## 故障排查

### 前端无法连接 Edge Function
1. 检查 `VITE_SUPABASE_URL` 是否正确
2. 确认 Edge Function 已部署: `supabase functions list`
3. 检查浏览器控制台网络请求错误

### Edge Function 返回 401
1. 检查 `Authorization` header 是否正确携带
2. 确认用户已登录且 token 未过期

### Edge Function 返回 500
1. 检查 Supabase Dashboard 的 Edge Function 日志
2. 确认后端环境变量已正确配置
3. 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否有效

---

## 密钥轮换指南

### 轮换 Supabase 密钥
1. 在 Supabase Dashboard → Project Settings → API 生成新密钥
2. 更新 Vercel 环境变量 `VITE_SUPABASE_ANON_KEY`
3. 更新 Supabase Edge Functions 环境变量 `SUPABASE_SERVICE_ROLE_KEY`
4. 重新部署 Edge Functions
5. 删除旧密钥

### 轮换 API 密钥
1. 生成新的 `IPO_SYNC_API_KEY`
2. 更新 Supabase Edge Functions 环境变量
3. 更新调用方配置

---

## 相关文档

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Environment Variables](https://supabase.com/docs/guides/functions/secrets)
