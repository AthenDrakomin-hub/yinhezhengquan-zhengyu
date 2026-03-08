# Vercel 生产环境部署指南

## 前置要求

1. **Vercel 账号**: 注册并登录 [Vercel](https://vercel.com)
2. **Supabase 项目**: 确保数据库已创建并运行
3. **Git 仓库**: 代码已推送到 GitHub/GitLab

## 环境变量配置

在 Vercel 项目设置中配置以下环境变量：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 数据库结构确认

确保 Supabase 中已创建以下表：

### 核心表
- `users` - 用户表
- `profiles` - 用户资料表
- `assets` - 资产表（available_balance, frozen_balance, total_asset）
- `positions` - 持仓表（stock_code, stock_name, quantity, average_price）
- `trades` - 交易记录表（trade_type, stock_code, price, quantity, status）
- `conditional_orders` - 条件单表
- `trade_rules` - 交易规则表
- `news` - 新闻表（已创建并插入真实数据）

### 数据库函数
已创建以下 RPC 函数：
- `deduct_balance(p_user_id UUID, p_amount NUMERIC)` - 扣除资金
- `add_balance(p_user_id UUID, p_amount NUMERIC)` - 增加资金
- `confirm_trade(p_user_id UUID, p_amount NUMERIC)` - 确认交易

## Edge Functions

确保以下 Edge Functions 已部署到 Supabase：

1. **fetch-galaxy-news** - 获取新闻列表
   ```bash
   supabase functions deploy fetch-galaxy-news
   ```

2. **fetch-stock-f10** - 获取股票F10数据（可选）
   ```bash
   supabase functions deploy fetch-stock-f10
   ```

3. **admin-verify** - 管理员权限验证
   ```bash
   supabase functions deploy admin-verify
   ```

## 部署步骤

### 1. 连接 Git 仓库
在 Vercel Dashboard 中点击 "Add New Project"，选择你的 Git 仓库。

### 2. 配置构建设置
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3. 配置环境变量
在 Vercel 项目设置的 "Environment Variables" 中添加：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 4. 部署
点击 "Deploy" 按钮，等待构建完成。

## 验证检查清单

部署后验证以下功能：

- [ ] 用户登录/注册正常
- [ ] 资产中心显示正确
- [ ] 交易功能正常（买入/卖出）
- [ ] 交易记录可查询
- [ ] 新闻列表和详情页正常
- [ ] 智能选股功能正常
- [ ] 智能客服有声音反馈
- [ ] 管理后台可访问（管理员账号）

## 故障排查

### 问题：新闻不显示
**解决**: 检查 Edge Function `fetch-galaxy-news` 是否已部署，以及 `news` 表是否有数据

### 问题：交易失败
**解决**: 
1. 检查 `deduct_balance` 和 `add_balance` 函数是否存在
2. 检查 `assets` 表是否有用户的资金记录
3. 检查浏览器控制台错误信息

### 问题：页面刷新404
**解决**: `vercel.json` 已配置 rewrite 规则，确保已提交到仓库

### 问题：环境变量不生效
**解决**: 
1. 确认环境变量名称以 `VITE_` 开头
2. 重新部署项目
3. 检查浏览器控制台是否有 Supabase 连接错误

## 生产环境优化建议

1. **启用 Supabase 生产模式**: 设置合适的 RLS 策略
2. **配置自定义域名**: 在 Vercel 中绑定自定义域名
3. **启用 CDN**: Vercel 自动提供全球 CDN
4. **监控和日志**: 配置 Vercel Analytics 和 Supabase 日志
5. **定期备份**: 设置 Supabase 数据库自动备份

## 联系支持

如有部署问题，请联系技术支持或查阅：
- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
