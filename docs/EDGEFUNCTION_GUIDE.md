# Edge Functions 部署与迁移指南

## 概述

本文档整合 Edge Functions 的部署说明和迁移报告。

---

## 一、Edge Functions 清单 (15个)

| # | Function | 描述 | 状态 |
|---|----------|------|------|
| 1 | admin-operations | 管理员操作 | ✅ 已部署 |
| 2 | admin-verify | 管理员验证 | ✅ 已部署 |
| 3 | approve-trade-order | 审批交易订单 | ✅ 已部署 |
| 4 | cancel-trade-order | 取消交易订单 | ✅ 已部署 |
| 5 | create-trade-order | 创建交易订单 | ✅ 已部署 |
| 6 | db-migrate | 数据库迁移 | ✅ 已部署 |
| 7 | fetch-galaxy-news | 获取银河新闻 | ✅ 已部署 |
| 8 | fetch-stock-f10 | 获取股票 F10 | ✅ 已部署 |
| 9 | get-limit-up | 获取涨停数据 | ✅ 已部署 |
| 10 | get-market-data | 获取市场行情 | ✅ 已部署 |
| 11 | match-trade-order | 撮合交易订单 | ✅ 已部署 |
| 12 | nexus-sync | Nexus 数据同步 | ✅ 已部署 |
| 13 | sync-ipo | 同步 IPO 数据 | ✅ 已部署 |
| 14 | yinhe-data | 银禾数据 API | ✅ 已部署 |
| 15 | phone-location | 手机号归属地 | ✅ 已部署 |

---

## 二、银禾数据 Edge Function (yinhe-data)

### 2.1 功能
代理银禾数据 API，统一处理股票行情、涨停数据、新股申购、K线数据、资金流向等。

### 2.2 环境变量配置

```bash
# 设置银禾数据 API Key
supabase secrets set YINHE_API_KEY=your_yinhe_api_key_here
```

### 2.3 部署命令

```bash
# 部署到 Supabase
supabase functions deploy yinhe-data

# 本地开发测试
supabase functions serve yinhe-data
```

### 2.4 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/quotes` | GET | 获取股票行情列表 |
| `/api/quote/:symbol` | GET | 获取单只股票行情 |
| `/api/limit-up` | GET | 获取涨停股票列表 |
| `/api/limit-down` | GET | 获取跌停股票列表 |
| `/api/ipo` | GET | 获取新股申购列表 |
| `/api/kline/:symbol` | GET | 获取K线数据 |
| `/api/money-flow/:symbol` | GET | 获取资金流向 |
| `/api/dragon-tiger` | GET | 获取龙虎榜数据 |
| `/api/stock-list` | GET | 获取股票列表 |
| `/api/financial/:symbol` | GET | 获取财务数据 |
| `/api/sectors` | GET | 获取板块行情 |
| `/api/concepts` | GET | 获取概念板块 |
| `/api/search` | GET | 搜索股票 |

### 2.5 前端使用

```typescript
import { yinhedataService } from './services/yinhedataService';

// 获取股票行情
const quotes = await yinhedataService.getQuotes(['000001', '000002']);

// 获取涨停股票
const limitUpStocks = await yinhedataService.getLimitUpStocks();
```

---

## 三、手机号归属地 Edge Function (phone-location)

### 3.1 功能
替代原有的 360 手机归属地 API，支持多源查询。

### 3.2 环境变量配置

```bash
# 聚合数据 API Key (推荐)
supabase secrets set JUHE_PHONE_API_KEY=your_juhe_key_here

# ShowAPI 配置 (备选)
supabase secrets set SHOWAPI_APPID=your_showapi_appid_here
supabase secrets set SHOWAPI_SECRET=your_showapi_secret_here
```

### 3.3 申请 API Key

**聚合数据 (推荐)**
- 网址: https://www.juhe.cn/docs/api/id/11
- 免费额度: 100次/天

**ShowAPI (备选)**
- 网址: https://www.showapi.com/api/phoneLocation
- 免费额度: 100次/天

### 3.4 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/phone-location?phone=xxx` | GET | 查询手机号归属地 |
| `/phone-location/:phone` | GET | 查询手机号归属地 |

### 3.5 前端使用

```typescript
import { queryPhoneInfo, verifyPhoneAndName } from './services/verificationService';

// 查询手机号归属地
const phoneInfo = await queryPhoneInfo('13800138000');

// 完整验证
const result = await verifyPhoneAndName('张三', '13800138000');
```

---

## 四、前端服务更新

### 4.1 yinhedataService.ts
- ✅ 已迁移到 Edge Function
- 环境变量: `VITE_YINHE_FUNCTION_URL`
- 自动添加认证头

### 4.2 verificationService.ts
- ✅ 已替换 360 API
- 环境变量: `VITE_PHONE_LOCATION_FUNCTION_URL`
- 支持多源查询和自动降级

---

## 五、完整部署步骤

```bash
# 1. 登录 Supabase
supabase login

# 2. 链接项目
supabase link --project-ref rfnrosyfeivcbkimjlwo

# 3. 设置 Secrets
supabase secrets set YINHE_API_KEY=your_key
supabase secrets set JUHE_PHONE_API_KEY=your_key

# 4. 部署 Edge Functions
supabase functions deploy yinhe-data
supabase functions deploy phone-location

# 5. 验证部署
supabase functions list

# 6. 测试
curl https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/yinhe-data/health
curl "https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/phone-location/phone-location?phone=13800138000"
```

---

## 六、环境变量

添加到 `.env` 文件：

```bash
# 银禾数据 Edge Function
VITE_YINHE_FUNCTION_URL=https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/yinhe-data

# 手机号归属地 Edge Function
VITE_PHONE_LOCATION_FUNCTION_URL=https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/phone-location
```

---

## 七、注意事项

1. **API Key 安全**: 所有 API Key 通过 Supabase Secrets 管理，不会暴露在代码中
2. **CORS**: Edge Functions 已配置 CORS，支持前端跨域访问
3. **认证**: 自动附加当前用户的 JWT Token，支持权限控制
4. **股票行情 API**: 腾讯、东方财富、新浪 API 保持前端调用不变（无需 CORS 代理）

---

## 八、文件变更记录

### 新增文件
- `supabase/functions/yinhe-data/index.ts`
- `supabase/functions/phone-location/index.ts`

### 修改文件
- `services/yinhedataService.ts` - 迁移到 Edge Function
- `services/verificationService.ts` - 替换 360 API
- `.env` - 添加环境变量配置

---

*本文档由 EDGEFUNCTION_DEPLOY.md 和 EDGEFUNCTION_MIGRATION_REPORT.md 合并而成*
