# Vercel 生产环境部署指南

## 前置要求

1. **Vercel 账号**: 注册并登录 [Vercel](https://vercel.com)
2. **Supabase 项目**: 确保数据库已创建并运行
3. **Git 仓库**: 代码已推送到 GitHub/GitLab/Bitbucket

## 项目配置说明

### 构建配置 (vercel.json)

```json
{
  "version": 2,
  "name": "yinhe-zhengyu-trade-system",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install --legacy-peer-deps"
}
```

### 路由配置

- **API 路由**: `/api/*` → Serverless Functions
- **静态资源**: `/assets/*`, `/favicon.ico`, `/og-preview.ico`
- **SPA 回退**: `/*` → `/index.html` (支持前端路由)

## 环境变量配置

在 Vercel Dashboard 的项目设置中配置以下环境变量：

### 必需变量

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 可选变量（Cron 安全）

```
VERCEL_CRON_SECRET=your-random-secret-for-cron-auth
```

### 配置步骤

1. 进入 Vercel 项目 Dashboard
2. 点击 "Settings" → "Environment Variables"
3. 添加上述变量到 Production 环境
4. 重新部署项目

## 数据库结构确认

确保 Supabase 中已创建以下表和函数：

### 核心表

| 表名 | 说明 |
|------|------|
| `users` | 用户认证表（由 Supabase Auth 管理） |
| `profiles` | 用户资料表 |
| `assets` | 资产表（available_balance, frozen_balance, total_asset） |
| `positions` | 持仓表（symbol, name, quantity, average_price） |
| `trades` | 交易记录表（type, symbol, price, quantity, status） |
| `conditional_orders` | 条件单表 |
| `trade_rules` | 交易规则表 |
| `news` | 新闻表（已创建并插入真实数据） |

### 数据库函数

```sql
-- 扣除资金
CREATE OR REPLACE FUNCTION deduct_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE assets 
  SET available_balance = available_balance - p_amount,
      frozen_balance = frozen_balance + p_amount
  WHERE user_id = p_user_id 
    AND available_balance >= p_amount;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加资金
CREATE OR REPLACE FUNCTION add_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE assets 
  SET available_balance = available_balance + p_amount
  WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确认交易
CREATE OR REPLACE FUNCTION confirm_trade(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE assets 
  SET frozen_balance = frozen_balance - p_amount
  WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Edge Functions 部署

确保以下 Edge Functions 已部署到 Supabase：

```bash
# 部署新闻获取函数
supabase functions deploy fetch-galaxy-news

# 部署 IPO 同步函数
supabase functions deploy sync-ipo

# 部署管理员验证函数
supabase functions deploy admin-verify
```

## 部署步骤

### 1. 连接 Git 仓库

在 Vercel Dashboard 中：
- 点击 "Add New Project"
- 选择你的 Git 仓库
- 点击 "Import"

### 2. 配置构建设置

Vercel 会自动检测 Vite 项目，确认以下设置：

| 设置项 | 值 |
|--------|-----|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install --legacy-peer-deps` |

### 3. 配置环境变量

在部署前，点击 "Environment Variables" 展开区域，添加：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 4. 部署项目

点击 "Deploy" 按钮，等待构建完成。

### 5. 验证部署

部署完成后，访问 Vercel 提供的域名，验证以下功能：

- [ ] 首页加载正常
- [ ] 用户登录/注册正常
- [ ] 资产中心显示正确
- [ ] 交易功能正常（买入/卖出）
- [ ] 交易记录可查询
- [ ] 新闻列表和详情页正常
- [ ] 智能选股功能正常
- [ ] 智能客服有声音反馈
- [ ] 管理后台可访问（管理员账号）

## 自定义域名配置（可选）

1. 在 Vercel Dashboard 中点击 "Domains"
2. 输入你的域名（如 `trade.yourdomain.com`）
3. 按照提示配置 DNS 记录
4. 等待 SSL 证书自动配置

## Cron Job 配置

项目配置了每天 8:00 AM 自动同步 IPO 数据的 Cron Job：

```json
{
  "crons": [
    {
      "path": "/api/ipo-sync-cron",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### 安全配置

Cron Job 支持通过 `VERCEL_CRON_SECRET` 环境变量进行验证，防止未授权访问。

## 故障排查

### 问题：构建失败

**症状**: Vercel 构建日志显示错误

**解决**:
1. 检查 `vercel.json` 语法是否正确
2. 确认 `package.json` 中的 `build` 脚本正确
3. 检查是否有未提交的更改

### 问题：页面刷新 404

**症状**: 直接访问 `/client/dashboard` 等路由返回 404

**解决**: 
- `vercel.json` 已配置 rewrite 规则确保所有路由指向 `index.html`
- 如果问题持续，检查是否有其他冲突配置

### 问题：环境变量不生效

**症状**: Supabase 连接失败

**解决**:
1. 确认环境变量名称以 `VITE_` 开头（Vite 要求）
2. 在 Vercel Dashboard 中重新保存环境变量
3. 触发重新部署
4. 检查浏览器控制台是否有 CORS 错误

### 问题：API 路由 404

**症状**: `/api/ipo-sync-cron` 返回 404

**解决**:
1. 确认 `api/` 目录下的文件使用正确的导出格式
2. 检查 `vercel.json` 中的 `functions` 配置
3. 确认已安装 `@vercel/node` 依赖

### 问题：静态资源 404

**症状**: JS/CSS 文件加载失败

**解决**:
1. 检查 `vite.config.ts` 中的 `base` 配置是否为 `/`
2. 确认 `dist/assets/` 目录存在
3. 检查 `vercel.json` 中的 rewrites 配置

### 问题：新闻不显示

**解决**:
1. 检查 Supabase Edge Function `fetch-galaxy-news` 是否已部署
2. 检查 `news` 表是否有数据
3. 检查浏览器网络请求是否有 CORS 错误

### 问题：交易失败

**解决**:
1. 检查数据库 RPC 函数是否存在 (`deduct_balance`, `add_balance`)
2. 检查 `assets` 表是否有用户的资金记录
3. 检查浏览器控制台错误信息

## 性能优化

### 已配置的优化

1. **代码分割**: `vite.config.ts` 中配置了 vendor chunks
2. **静态资源缓存**: `vercel.json` 中配置了长期缓存
3. **安全响应头**: 配置了 XSS、Frame Options 等安全头

### 额外优化建议

1. **启用 Vercel Analytics**: 在 Dashboard 中开启
2. **启用 Vercel Speed Insights**: 监控性能指标
3. **图像优化**: 使用 `vercel/image` 或 CDN
4. **Edge Network**: Vercel 自动提供全球 CDN

## 监控和日志

### Vercel 日志

- 在 Dashboard 中查看 Function Logs
- 查看 Build Logs

### Supabase 日志

- 在 Supabase Dashboard 中查看 Database Logs
- 查看 Edge Function Logs

## 安全建议

1. **启用 RLS**: 确保所有表都有适当的 Row Level Security 策略
2. **定期轮换密钥**: 定期更新 Supabase 和 Vercel 的密钥
3. **监控异常**: 配置警报监控异常访问模式
4. **备份数据**: 配置 Supabase 自动备份

## 联系支持

如有部署问题：

- [Vercel 文档](https://vercel.com/docs)
- [Vercel 支持](https://vercel.com/help)
- [Supabase 文档](https://supabase.com/docs)

---

**最后更新**: 2025年3月8日
