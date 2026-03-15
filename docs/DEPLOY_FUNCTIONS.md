# Supabase Edge Functions 部署指南

## 前置条件

1. 安装 Supabase CLI:
```bash
npm install -g supabase
# 或者使用 npx
npx supabase --version
```

2. 登录 Supabase:
```bash
supabase login
```

3. 链接项目:
```bash
supabase link --project-ref <your-project-ref>
```

## 部署方式

### 方式一：使用部署脚本（推荐）

```bash
chmod +x scripts/deploy-functions.sh
./scripts/deploy-functions.sh
```

### 方式二：手动逐个部署

```bash
# 部署单个函数
npx supabase functions deploy <function-name>

# 例如
npx supabase functions deploy api
npx supabase functions deploy health-check
```

### 方式三：批量部署

```bash
# 部署所有函数
for func in $(ls supabase/functions/); do
  if [ -d "supabase/functions/$func" ]; then
    echo "Deploying $func..."
    npx supabase functions deploy "$func"
  fi
done
```

## 函数列表

项目共包含 **40** 个 Edge Functions：

| 函数名 | 用途 |
|--------|------|
| `admin-operations` | 管理员操作 |
| `admin-verify` | 管理员验证 |
| `api` | API 网关 |
| `approve-trade-order` | 订单审批 |
| `auth-login` | 登录认证 |
| `bank-transfer` | 银行转账 |
| `campaign` | 活动管理 |
| `cancel-trade-order` | 撤销订单 |
| `clear-cache` | 清除缓存 |
| `crawler` | 数据爬虫 |
| `create-a-share-order` | 创建A股订单 |
| `create-block-trade-order` | 创建大宗交易订单 |
| `create-hk-order` | 创建港股订单 |
| `create-ipo-order` | 创建新股申购订单 |
| `create-limit-up-order` | 创建涨停打板订单 |
| `data-reports` | 数据报表 |
| `fetch-stock-f10` | 获取F10数据 |
| `fund-purchase` | 基金购买 |
| `fund-redeem` | 基金赎回 |
| `fund-settle` | 基金结算 |
| `get-limit-up` | 获取涨停股 |
| `get-profile` | 获取用户信息 |
| `health-check` | 健康检查 |
| `match-orders` | 订单撮合 |
| `match-trade-order` | 交易撮合 |
| `match-trade-order-v2` | 交易撮合V2 |
| `proxy-market` | 行情代理 |
| `risk-control` | 风控系统 |
| `run-migration` | 执行迁移 |
| `sql-exec` | SQL执行 |
| `stock-search` | 股票搜索 |
| `sync-ipo` | IPO同步 |
| `sync-stock-data` | 股票数据同步 |
| `system-config` | 系统配置 |
| `update-user-meta` | 更新用户元数据 |
| `user-checkin` | 用户签到 |
| `user-vip` | VIP管理 |
| `wealth-purchase` | 理财购买 |
| `wealth-redeem` | 理财赎回 |

## 环境变量配置

部署后需要在 Supabase Dashboard 中配置以下环境变量：

```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=<your-anon-key>
```

## 常见问题

### 1. 部署失败：未登录
```bash
supabase login
```

### 2. 部署失败：项目未链接
```bash
supabase link --project-ref <your-project-ref>
```

### 3. 部署失败：权限不足
确保你的 Supabase 账户有项目部署权限。

### 4. 函数超时
Edge Functions 默认超时时间为 150 秒。如需更长执行时间，请联系 Supabase 支持。
