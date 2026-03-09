# Vercel 环境变量配置指南

## 问题修复

已移除 `vercel.json` 中的 `env` 字段，避免与 Vercel Dashboard 配置冲突。

## 配置方式

环境变量必须在 **Vercel Dashboard** 中配置：

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量

## 必需的环境变量

### 核心配置（必需）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_SUPABASE_URL` | `https://rfnrosyfeivcbkimjlwo.supabase.co` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase 匿名密钥 |

### Edge Functions（可选）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_YINHE_FUNCTION_URL` | `https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/yinhe-data` | 银禾数据 API |
| `VITE_PHONE_LOCATION_FUNCTION_URL` | `https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/phone-location` | 手机号归属地 |

### 图片资源（可选，有默认值）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_LOGO_URL` | `/logo.png` | Logo 图片 |
| `VITE_AGENT_AVATAR_URL` | `/avatar-default.png` | 客服头像 |

## 快速配置

复制以下值到 Vercel Dashboard：

```
VITE_SUPABASE_URL=https://rfnrosyfeivcbkimjlwo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbnJvc3lmZWl2Y2JraW1qbHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTQwNjMsImV4cCI6MjA4MzEzMDA2M30.MBPJwbwbT12W99bMHPqFtj_oMqWBXFOYnL6ZzeSyveo
```

## 注意事项

1. **不要**在 `vercel.json` 中配置环境变量
2. **不要**将 `.env` 文件提交到 Git
3. 环境变量变更后需要 **重新部署** 才能生效
4. 所有 `VITE_` 开头的变量都会暴露给前端代码

## 故障排除

如果部署仍被阻止：

1. 检查 Vercel Dashboard 中环境变量总大小是否超过 64KB
2. 删除不必要的环境变量
3. 确保变量名以 `VITE_` 开头（前端可用）
