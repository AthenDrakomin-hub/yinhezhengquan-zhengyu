# Edge Functions 部署指南

## 前置条件

1. 安装 Supabase CLI:
```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm
npm install -g supabase
```

2. 登录 Supabase:
```bash
supabase login
```

## 部署步骤

### 1. 关联项目

```bash
# 进入项目目录
cd /workspace/projects

# 关联远程项目
supabase link --project-ref kvlvbhzrrpspzaoiormt
```

### 2. 设置环境变量

在 Supabase Dashboard 中设置以下环境变量：

**路径**: Project Settings → Edge Functions → Environment Variables

| 变量名 | 说明 |
|--------|------|
| `SUPABASE_URL` | `https://kvlvbhzrrpspzaoiormt.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 从 Dashboard 获取 |
| `SUPABASE_ANON_KEY` | 匿名密钥 |
| `UPSTASH_REDIS_REST_URL` | Redis 缓存 URL |
| `UPSTASH_REDIS_REST_TOKEN` | Redis 缓存 Token |
| `IPO_SYNC_API_KEY` | IPO同步API密钥 |
| `ADMIN_ALLOWED_IPS` | 管理员IP白名单 |

### 3. 部署所有 Edge Functions

```bash
# 部署所有函数
supabase functions deploy --no-verify-jwt
```

## Edge Functions 列表

### 核心服务
| 函数名 | 功能 | JWT验证 |
|--------|------|---------|
| `health-check` | 健康检查 | 否 |
| `stock-search` | 股票搜索 | 否 |
| `proxy-market` | 行情代理（含缓存、涨停股等） | 否 |
| `clear-cache` | 缓存清理 | 否 |

### 数据同步
| 函数名 | 功能 | JWT验证 |
|--------|------|---------|
| `sync-ipo` | IPO数据同步 | 否 |
| `sync-stock-data` | 股票数据同步 | 否 |
| `fetch-galaxy-news` | 银河新闻获取 | 否 |
| `fetch-stock-f10` | F10数据获取 | 否 |

### 交易订单
| 函数名 | 功能 | JWT验证 |
|--------|------|---------|
| `create-a-share-order` | A股订单创建 | 否 |
| `create-hk-order` | 港股订单创建 | 否 |
| `create-ipo-order` | IPO订单创建 | 否 |
| `create-block-trade-order` | 大宗交易订单 | 否 |
| `create-limit-up-order` | 涨停板订单 | 否 |
| `match-trade-order` | 订单撮合 | 否 |
| `match-trade-order-v2` | 订单撮合V2 | 否 |
| `approve-trade-order` | 订单审批 | 否 |
| `cancel-trade-order` | 订单取消 | 否 |

### 理财基金
| 函数名 | 功能 | JWT验证 |
|--------|------|---------|
| `wealth-purchase` | 理财购买 | 否 |
| `wealth-redeem` | 理财赎回 | 否 |
| `fund-purchase` | 基金购买 | 否 |
| `fund-redeem` | 基金赎回 | 否 |
| `fund-settle` | 基金结算 | 否 |
| `bank-transfer` | 银行转账 | 否 |

### 用户服务
| 函数名 | 功能 | JWT验证 |
|--------|------|---------|
| `user-checkin` | 用户签到 | 是 |
| `user-vip` | VIP服务 | 是 |
| `campaign` | 活动服务 | 是 |

### 管理后台
| 函数名 | 功能 | JWT验证 |
|--------|------|---------|
| `admin-operations` | 管理员操作 | 否 |
| `admin-verify` | 管理员验证 | 否 |
| `system-config` | 系统配置 | 否 |
| `run-migration` | 运行迁移 | 否 |
| `risk-control` | 风控服务 | 否 |
| `data-reports` | 数据报告 | 否 |

## 验证部署

部署完成后，测试函数是否正常工作：

```bash
# 测试健康检查
curl "https://kvlvbhzrrpspzaoiormt.supabase.co/functions/v1/health-check"

# 测试股票搜索
curl "https://kvlvbhzrrpspzaoiormt.supabase.co/functions/v1/stock-search?keyword=平安"

# 测试行情代理（涨停股）
curl "https://kvlvbhzrrpspzaoiormt.supabase.co/functions/v1/proxy-market?action=limitup"

# 测试行情代理（单只股票）
curl "https://kvlvbhzrrpspzaoiormt.supabase.co/functions/v1/proxy-market?action=realtime&market=CN&symbols=600519"
```

## 注意事项

1. **Service Role Key** 需要从 Supabase Dashboard 获取，不要提交到代码库
2. 部署时使用 `--no-verify-jwt` 参数可以跳过 JWT 验证（公开函数）
3. **行情数据**：统一通过 `proxy-market` 函数获取，使用东方财富API + Redis缓存
