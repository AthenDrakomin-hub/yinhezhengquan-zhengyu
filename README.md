# 银河证券正裕交易系统

> 工业级虚拟证券交易平台 | 基于 Supabase + Vercel + React + TypeScript

## ⚠️ 重要声明

本系统为虚拟交易系统，不涉及真实资金，仅用于模拟交易和功能展示。

## 📋 项目概述

正裕交易系统是一个完整的虚拟证券交易平台，支持行情同步、交易下单、撮合成交、清算对账等全流程功能。

### 核心功能

- 🔐 用户认证（登录/注册/权限管理）
- 📊 实时行情数据（东方财富、腾讯财经公开 API）
- 💰 交易下单（股票、大宗商品、IPO 申购）
- 🎯 涨停板监控（QVeris API 实时数据）
- 📈 市场分析（K线图、技术指标）
- 📋 IPO 管理（新股申购、中签查询）
- 🛡️ 风控合规（交易规则、限制管理）
- 👨‍💼 管理后台（用户管理、数据统计）
- 💬 智能客服（知识库问答）
- 🔔 消息通知（实时推送）
- 📚 投教中心（投资教育内容）

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | 19.2 + 5.8 |
| 构建工具 | Vite | 6.4 |
| 包管理器 | npm | Latest |
| 后端服务 | Supabase Edge Functions | Latest |
| 数据库 | Supabase PostgreSQL | Latest |
| 认证服务 | Supabase Auth | Latest |
| 部署平台 | Vercel（前端） + Supabase（后端） | Latest |
| UI 框架 | Tailwind CSS | 4.2 |
| 图表库 | Recharts | 2.12 |
| 路由 | React Router | 7.1 |
| 状态管理 | React Query | 5.90 |

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd yinhezhengquan-zhengyu

# 安装依赖（使用 npm）
npm install
```

### 2. 环境变量配置

**创建 `.env` 文件（本地开发）：**

```env
# Supabase 核心配置（必需）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTION_URL=https://your-project.supabase.co/functions/v1

# 行情数据配置
VITE_USE_REAL_MARKET_DATA=true
```

> ⚠️ **Vercel 部署注意**：Vercel 不会读取 `.env` 文件，需要在 Vercel Dashboard → Settings → Environment Variables 中手动配置所有 `VITE_*` 变量。

### 3. 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5000
```

### 4. 构建部署

```bash
# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📦 项目结构

```
.
├── components/          # React 组件
│   ├── admin/          # 管理后台组件
│   ├── client/         # 客户端功能组件
│   ├── auth/           # 认证组件
│   ├── landing/        # 首页组件
│   └── core/           # 核心组件（Layout、路由等）
├── lib/                # 工具库
│   ├── supabase.ts     # Supabase 客户端
│   ├── imageConfig.ts  # 图片资源配置
│   └── constants.tsx   # 常量定义
├── routes/             # 路由配置
├── contexts/           # React Context
├── services/           # 业务服务层
├── supabase/           # Supabase 配置
│   ├── functions/      # Edge Functions
│   └── migrations/     # 数据库迁移
└── index.tsx           # 应用入口
```

## 🔧 部署指南

### Vercel 前端部署

1. 在 Vercel 创建新项目
2. 配置环境变量（见下表）
3. 部署

### Vercel 环境变量（必需）

| 变量名 | 说明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `VITE_SUPABASE_FUNCTION_URL` | Edge Functions URL |
| `VITE_USE_REAL_MARKET_DATA` | 启用真实行情数据（true/false） |

### Supabase Edge Functions 部署

```bash
# 安装 Supabase CLI
npm install -g supabase

# 链接项目
supabase link --project-ref your-project-ref

# 部署所有 Edge Functions
supabase functions deploy
```

### Supabase Edge Functions 环境变量（必需）

| 变量名 | 说明 |
|--------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 |
| `QVERIS_API_KEY` | QVeris 行情 API 密钥（涨停数据） |

## 📊 Edge Functions 列表

| 函数名 | 功能 |
|--------|------|
| `proxy-market` | 行情数据统一代理（核心函数） |
| `health-check` | 服务健康检查与告警 |
| `clear-cache` | 管理端缓存清除 |
| `sync-ipo` | 同步新股发行数据（定时任务） |
| `sync-stock-data` | 同步股票基础数据 |
| `get-limit-up` | 获取涨停股票数据（QVeris API） |
| `fetch-galaxy-news` | 获取银河证券新闻 |
| `fetch-stock-f10` | 获取股票基本面数据 |
| `proxy-market` | 统一行情数据代理（报价+成交明细+K线） |
| `stock-search` | 股票搜索 |
| `create-a-share-order` | A股交易（买入/卖出） |
| `create-hk-order` | 港股交易（买入/卖出） |
| `create-ipo-order` | 新股申购 |
| `create-block-trade-order` | 大宗交易 |
| `create-limit-up-order` | 涨停打板 |
| `cancel-trade-order` | 取消交易订单 |
| `approve-trade-order` | 审批交易订单 |
| `match-trade-order` | 匹配交易订单 |
| `admin-verify` | 验证管理员权限 |
| `admin-operations` | 管理员操作入口 |

---

## 📈 行情数据代理服务 (proxy-market)

### 架构说明

```
┌─────────────────────────────────────────────────────────┐
│                     前端应用                            │
│   marketApi.ts / stockDetailService.ts                 │
└───────────────────────┬─────────────────────────────────┘
                        │ supabase.functions.invoke()
                        ▼
┌─────────────────────────────────────────────────────────┐
│              proxy-market Edge Function                 │
│   - 支持 GET/POST 请求                                  │
│   - 请求去重                                            │
│   - 统一错误处理                                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 Upstash Redis 缓存                      │
│   - 减少外部 API 调用                                   │
│   - 凭证安全存储在后端                                  │
└───────────────────────┬─────────────────────────────────┘
                        │ (cache miss)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  东方财富 API                           │
│   push2.eastmoney.com / push2his.eastmoney.com         │
└─────────────────────────────────────────────────────────┘
```

### 支持的 Action 列表

| Action | 说明 | 参数 | 返回数据 |
|--------|------|------|----------|
| `batch` | 批量行情 | `symbols[]`, `market` | `[{symbol, name, price, change, changePercent}]` |
| `realtime` | 单只股票行情 | `symbols[]`, `market` | `{symbol, name, price, change, changePercent}` |
| `quote` | 完整个股详情 | `symbols[]`, `market` | `{symbol, name, price, open, high, low, volume, ...}` |
| `orderbook` | 五档盘口 | `symbols[]`, `market` | `{bids: [{price, volume}], asks: [{price, volume}]}` |
| `kline` | K线数据 | `symbols[]`, `market`, `days` | `[close_price1, close_price2, ...]` |
| `news` | 财经快讯 | `pageSize` | `[{id, title, content, time, source}]` |
| `stock_news` | 个股相关新闻 | `symbols[]`, `pageSize` | `[{id, title, content, url}]` |
| `stock_notice` | 个股公告 | `symbols[]`, `pageSize` | `[{id, title, date, type, url}]` |
| `limitup` | 涨停板股票 | - | `[{symbol, name, price, changePercent, industry}]` |

### 调用示例

**GET 请求**：
```bash
# 批量行情
curl "https://xxx.supabase.co/functions/v1/proxy-market?action=batch&market=CN&symbols=600519,000001"

# K线数据
curl "https://xxx.supabase.co/functions/v1/proxy-market?action=kline&market=CN&symbols=600519&days=30"

# 港股行情
curl "https://xxx.supabase.co/functions/v1/proxy-market?action=batch&market=HK&symbols=00700,09988"
```

**POST 请求**：
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.functions.invoke('proxy-market', {
  body: { 
    action: 'batch', 
    symbols: ['600519', '000001'], 
    market: 'CN' 
  }
});
```

**前端调用**：
```typescript
import { marketApi } from '@/services/marketApi';

// 批量行情
const stocks = await marketApi.getBatchStocks(['600519', '000001'], 'CN');

// 完整行情
const quote = await marketApi.getStockQuote('600519', 'CN');

// 五档盘口
const orderBook = await marketApi.getOrderBook('600519', 'CN');

// K线数据
const kline = await marketApi.getKline('600519', 'CN', 30);

// 财经快讯
const news = await marketApi.getNews(20);

// 个股新闻
const stockNews = await marketApi.getStockNews('600519', 10);

// 涨停板
const limitUp = await marketApi.getLimitUpStocks();
```

### 缓存 TTL 策略

| 数据类型 | 缓存时间 | 说明 |
|----------|----------|------|
| 实时行情 (`realtime`, `batch`, `quote`) | 30秒 | 平衡实时性与性能 |
| 五档盘口 (`orderbook`) | 5秒 | 高频更新数据 |
| K线数据 (`kline`) | 5分钟 | 历史数据变化慢 |
| 财经快讯 (`news`) | 60秒 | 中等时效性 |
| 个股新闻 (`stock_news`) | 2分钟 | 低频更新 |
| 个股公告 (`stock_notice`) | 5分钟 | 低频更新 |
| 涨停板 (`limitup`) | 60秒 | 中等时效性 |

### 环境变量配置

**Supabase Edge Functions 环境变量**（在 Dashboard 配置）：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | `gQAAAAAAAQ8D...` |
| `ALERT_WEBHOOK_URL` | 告警 Webhook（可选） | `https://hooks.slack.com/xxx` |

> ⚠️ **安全提示**：Redis 凭证必须配置在 Supabase 后端环境变量中，切勿配置在前端 `.env` 文件中！

---

## 🗑️ 缓存管理 (clear-cache)

### 调用方式

```typescript
import { cacheAdmin } from '@/services/marketApi';

// 清除特定股票的所有缓存
await cacheAdmin.clearStockCache('600519', 'CN');

// 清除特定缓存键
await cacheAdmin.clearKeys(['quote:CN:600519', 'kline:CN:600519:30']);

// 按模式清除
await cacheAdmin.clearPattern('quote');  // 清除所有行情缓存
await cacheAdmin.clearPattern('news');   // 清除所有新闻缓存

// 清除所有缓存（谨慎使用）
await cacheAdmin.clearAll();
```

### 管理端自动缓存清除

```typescript
import { adminService } from '@/services/adminService';

// 更新股票信息时自动清除缓存
await adminService.updateStockInfo('600519', 'CN', {
  name: '贵州茅台',
  industry: '白酒'
});

// 批量刷新股票缓存
await adminService.refreshStockCache(['600519', '000858'], 'CN');

// 清除所有行情缓存
await adminService.clearAllMarketCache();
```

---

## 🏥 健康监控 (health-check)

### 健康检查项

| 检查项 | 说明 | 超时阈值 |
|--------|------|----------|
| Redis | 连接和响应检测 | 5秒 |
| 东方财富 API | 行情接口可用性 | 5秒 |
| Edge Function | proxy-market 自检 | 5秒 |

### 状态级别

- `healthy`: 所有检查通过 ✅
- `degraded`: 部分检查失败 ⚠️
- `unhealthy`: 全部检查失败 ❌

### 前端集成

```typescript
import { healthMonitor } from '@/services/healthMonitor';

// 配置告警
healthMonitor.configure({
  webhookUrl: 'https://hooks.slack.com/xxx',
  onUnhealthy: (status) => {
    console.error('服务异常:', status);
  },
  onRecovered: (status) => {
    console.log('服务已恢复:', status);
  }
});

// 启动定时检查（每60秒）
healthMonitor.startPeriodicCheck(60000);

// 手动检查
const status = await healthMonitor.check();
```

### 定时任务配置

**方式1: QStash（推荐）**
```typescript
import { Client } from "@upstash/qstash";

const client = new Client({ token: "your-token" });
await client.schedules.create({
  destination: "https://xxx.supabase.co/functions/v1/health-check",
  cron: "*/5 * * * *", // 每5分钟
});
```

**方式2: Supabase pg_cron**
```sql
SELECT cron.schedule(
  'health-check',
  '*/5 * * * *',
  $$SELECT net.http_post(url := 'https://xxx.supabase.co/functions/v1/health-check')$$
);
```

---

## 🚀 部署命令

### 部署所有 Edge Functions

```bash
# 链接项目（首次）
supabase link --project-ref your-project-ref

# 部署所有函数
supabase functions deploy
```

### 部署单个函数

```bash
# 行情代理（核心）
supabase functions deploy proxy-market --no-verify-jwt

# 健康检查
supabase functions deploy health-check --no-verify-jwt

# 缓存清除
supabase functions deploy clear-cache --no-verify-jwt

# 其他函数
supabase functions deploy sync-ipo --no-verify-jwt
supabase functions deploy stock-search --no-verify-jwt
supabase functions deploy proxy-market --no-verify-jwt
```

### 配置环境变量

```bash
# 在 Supabase Dashboard → Edge Functions → Environment variables 配置：
# - UPSTASH_REDIS_REST_URL
# - UPSTASH_REDIS_REST_TOKEN
# - ALERT_WEBHOOK_URL（可选）
```

### 配置 pg_cron 定时任务

```bash
# 1. 在 Supabase Dashboard → Database → Extensions 中启用 pg_cron

# 2. 执行迁移文件（需要替换占位符）
psql -f supabase/migrations/20250502000000_pg_cron_jobs.sql

# 或者在 Supabase SQL Editor 中手动执行

# 3. 需要替换的内容：
# - "你的项目ID" → Supabase 项目 ID
# - "你的服务角色密钥" → Settings → API → service_role key

# 查看定时任务状态
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

**定时任务说明：**
| 任务名称 | 执行频率 | 功能 |
|---------|---------|------|
| `sync-stock-data-every-minute` | 每分钟 | 同步股票基础数据 |
| `sync-ipo-every-minute` | 每分钟 | 同步新股发行数据 |
| `fetch-galaxy-news-every-minute` | 每分钟 | 同步银河证券新闻 |

## 🎯 涨停数据机制

### 数据流
```
前端组件 (LimitUpPanel)
    ↓
limitUpService.getLimitUpList()
    ↓
Supabase Edge Function: get-limit-up
    ↓
QVeris API (实时行情)
    ↓
涨停判定 → 返回数据
```

### 涨停判定规则
| 股票类型 | 代码特征 | 涨停幅度 |
|---------|---------|---------|
| 主板 | 60xxxx, 00xxxx | ≥10% |
| 创业板 | 300xxx, 301xxx | ≥20% |
| 科创板 | 688xxx, 689xxx | ≥20% |
| ST股票 | 名称含ST | ≥5% |

### 配置要求
- 需要在 Supabase Edge Function 环境中配置 `QVERIS_API_KEY`

## 👥 管理员用户设置

### 默认用户账号

| 角色 | 邮箱 | 初始密码 | 初始资金 |
|------|------|----------|----------|
| 超级管理员 | superadmin@yinhe.com | Admin123456 | 50,000,000 元 |
| 管理员 | admin@yinhe.com | Admin123456 | 1,000,000 元 |
| 普通用户 | user@yinhe.com | User123456 | 100,000 元 |

### 权限说明

- **超级管理员** (`admin_level = 'super_admin'`):
  - 可访问所有管理功能
  - 可访问客户端进行交易
  - 可管理其他管理员账号

- **管理员** (`admin_level = 'admin'`):
  - 可访问大部分管理功能
  - 可访问客户端进行交易
  - 不可管理超级管理员账号

- **普通用户** (`admin_level = NULL`):
  - 仅可访问客户端
  - 只能进行交易操作
  - 无管理权限

## 🎨 主题系统

系统使用 CSS 变量实现主题系统，支持浅色/深色主题切换：

### 核心变量
- `--color-bg`: 背景色
- `--color-surface`: 表面色
- `--color-text-primary`: 主文本色
- `--color-text-secondary`: 次文本色
- `--color-text-muted`: 弱化文本色
- `--color-border`: 边框色
- `--color-primary`: 主色调

### 组件样式规范
所有组件必须使用 CSS 变量而非硬编码颜色：
```css
/* ✅ 正确 */
color: var(--color-text-primary);
background: var(--color-surface);

/* ❌ 错误 */
color: white;
background: slate-800;
```

## 🔒 安全说明

- 使用 Row Level Security (RLS) 保护数据库（部分表已禁用以提升性能）
- Edge Functions 使用 Service Role Key 进行服务端操作
- 前端仅使用 Anon Key 进行客户端操作
- 支持 IP 白名单限制

## 📝 已知问题与解决方案

### 1. Profiles 表 RLS 问题
- **问题**: Supabase schema cache 可能导致 RPC 函数无法被发现
- **解决**: 直接查询 profiles 表（RLS 已关闭）

### 2. 管理端样式不一致
- **问题**: 部分管理端组件使用硬编码颜色
- **解决**: 统一使用 CSS 变量

## 📝 开发规范

### 代码规范
- 使用 ESLint + Prettier
- TypeScript 严格模式
- 组件化开发

### Git 提交规范
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构
- `docs`: 文档
- `chore`: 构建/工具
- `style`: 样式调整

## 📋 生产部署检查清单

### 前端部署（Vercel）
- [ ] 配置 `VITE_SUPABASE_URL`
- [ ] 配置 `VITE_SUPABASE_ANON_KEY`
- [ ] 配置 `VITE_SUPABASE_FUNCTION_URL`
- [ ] 配置 `VITE_USE_REAL_MARKET_DATA=true`
- [ ] 执行 `npm run build` 确认无错误
- [ ] 部署到 Vercel

### 后端部署（Supabase）

#### Edge Functions 部署
- [ ] 部署 `proxy-market` 函数
- [ ] 部署 `health-check` 函数
- [ ] 部署 `clear-cache` 函数
- [ ] 部署其他业务函数

#### 环境变量配置
- [ ] `UPSTASH_REDIS_REST_URL` - Redis 服务地址
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Redis 访问令牌
- [ ] `SUPABASE_URL` - Supabase 项目 URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - 服务角色密钥
- [ ] `QVERIS_API_KEY` - 涨停数据 API 密钥
- [ ] `ALERT_WEBHOOK_URL` - 告警通知 Webhook（可选）

#### 数据库与认证
- [ ] 执行数据库迁移
- [ ] 创建管理员账号
- [ ] 配置 RLS 策略

#### 监控配置
- [ ] 配置健康检查定时任务（QStash 或 pg_cron）
- [ ] 配置告警 Webhook（Slack/企业微信）
- [ ] 测试健康检查接口

### 功能验证
- [ ] 用户登录/注册
- [ ] 管理端登录
- [ ] 实时行情数据
- [ ] 交易下单
- [ ] 涨停数据展示
- [ ] 智能客服
- [ ] 消息通知
- [ ] 投教中心

## 📄 License

MIT License
