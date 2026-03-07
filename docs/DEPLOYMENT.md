# 银河证券证裕交易单元 - 生产环境部署指南

## 📋 部署概览

本指南详细说明了银河证券证裕交易单元系统的生产环境部署流程。

### 系统要求

| 组件 | 要求 |
|------|------|
| Node.js | 18.x 或更高版本 |
| pnpm | 8.x 或更高版本 |
| Supabase | Pro 计划（推荐） |
| Vercel | Pro 计划（推荐） |

---

## 🔧 环境变量配置

### 必需变量

```env
# ========================
# Supabase 核心配置
# ========================
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTION_URL=https://your-project-ref.supabase.co/functions/v1

# ========================
# 服务端配置
# ========================
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# ========================
# 数据库连接
# ========================
DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?sslmode=require

# ========================
# 环境标识
# ========================
ENVIRONMENT=production
```

### 可选变量

```env
# 市场数据
VITE_USE_REAL_MARKET_DATA=true
VITE_QOS_KEY=your-qos-key
VITE_QOS_PRODUCTS=XAUUSD,XAGUSD,600519

# 安全配置
ADMIN_ALLOWED_IPS=your-ip-address
```

---

## 🚀 Vercel 部署步骤

### 1. 准备工作

1. **创建 Vercel 账号**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **导入项目**
   ```
   Vercel Dashboard → Add New → Project → Import Git Repository
   ```

### 2. 环境变量配置

在 Vercel 项目设置中添加所有必需的环境变量：

```
Settings → Environment Variables → Add
```

**重要**: 生产环境必须设置 `ENVIRONMENT=production`

### 3. 构建配置

项目自动检测 Vite 框架，默认配置如下：

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "framework": "vite"
}
```

### 4. 域名配置

1. 在 Vercel 中添加自定义域名
2. 配置 DNS 记录
3. 启用 HTTPS（自动）

---

## 🗄️ Supabase 配置

### 1. 项目创建

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 记录项目 URL 和 API 密钥

### 2. 数据库迁移

按顺序执行迁移文件：

```bash
# 方式1：使用 Supabase CLI
supabase db push

# 方式2：在 Dashboard SQL 编辑器中执行
# 打开 SQL Editor，依次执行 supabase/migrations/ 下的文件
```

### 3. 存储桶配置

运行存储桶初始化脚本：

```bash
pnpm exec tsx scripts/init-storage.ts
```

创建的存储桶：
- `faces` - 人脸数据（私有）
- `education` - 投教内容（私有）
- `avatars` - 用户头像（公开）
- `documents` - 文档存储（私有）

### 4. Edge Functions 部署

```bash
# 部署所有 Edge Functions
supabase functions deploy

# 或单独部署
supabase functions deploy admin-operations
supabase functions deploy db-migrate
```

### 5. 安全配置

1. **启用 RLS**
   - 所有表已启用 RLS
   - 检查策略是否正确应用

2. **API 密钥管理**
   - anon key: 前端使用，公开安全
   - service_role key: 后端使用，保密！

3. **网络限制**
   - 考虑启用 IP 白名单
   - 配置请求速率限制

---

## 📊 监控与日志

### Vercel 监控

- **Analytics**: 访问量、性能指标
- **Logs**: 实时请求日志
- **Deployments**: 部署历史

### Supabase 监控

- **Dashboard**: 数据库性能、API 使用量
- **Logs**: 数据库日志、Auth 日志
- **Alerts**: 配置异常告警

### 健康检查

```bash
# 检查前端服务
curl -I https://your-domain.vercel.app

# 检查 Supabase 连接
curl https://your-project-ref.supabase.co/rest/v1/ -H "apikey: your-anon-key"
```

---

## 🔄 CI/CD 流程

### 自动部署

项目配置了自动部署流程：

1. **Push 到 main 分支**
   - 自动触发生产部署
   - 运行构建和测试

2. **Pull Request**
   - 自动创建预览环境
   - 生成预览链接

### 手动部署

```bash
# 使用 Vercel CLI
vercel --prod

# 或在 Dashboard 中触发
```

---

## ⚠️ 生产环境检查清单

部署前请确认：

- [ ] 所有环境变量已正确配置
- [ ] 数据库迁移已执行
- [ ] 存储桶已创建
- [ ] Edge Functions 已部署
- [ ] RLS 策略已启用
- [ ] 测试账号已创建
- [ ] 域名已配置
- [ ] HTTPS 已启用
- [ ] 监控已设置
- [ ] 错误追踪已配置

---

## 🔐 安全建议

### 密码安全

1. 修改所有测试账号的默认密码
2. 使用强密码策略
3. 启用双因素认证（如果支持）

### 访问控制

1. 配置管理端 IP 白名单
2. 限制 API 请求频率
3. 启用请求日志审计

### 数据保护

1. 定期备份数据库
2. 配置数据保留策略
3. 敏感信息加密存储

---

## 📞 运维联系

| 角色 | 联系方式 |
|------|----------|
| 技术负责人 | tech@yinhe.test |
| 运维团队 | ops@yinhe.test |
| 安全团队 | security@yinhe.test |

---

## 🔧 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 清理缓存
   rm -rf node_modules .next
   pnpm install
   pnpm run build
   ```

2. **数据库连接失败**
   - 检查 DATABASE_URL 格式
   - 确认 IP 白名单设置
   - 验证数据库密码

3. **认证失败**
   - 确认 VITE_SUPABASE_ANON_KEY 正确
   - 检查 JWT Secret 配置
   - 验证用户状态

### 紧急回滚

```bash
# Vercel 回滚
vercel rollback

# 数据库回滚
# 在 Supabase Dashboard 中恢复备份
```

---

*最后更新: 2026-03-07*
