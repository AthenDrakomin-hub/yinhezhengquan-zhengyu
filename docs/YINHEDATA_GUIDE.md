# 银禾数据集成指南

## 概述

本文档说明如何使用银禾数据 Edge Function 获取金融数据。

**官网**: https://yinhedata.com/interface/index.html

**特点**:
- ✅ 完全免费
- ✅ 无需认证
- ✅ 覆盖A股、美股、港股、期货、ETF等

---

## 一、架构说明

银禾数据通过 Supabase Edge Function 提供服务，无需本地部署：

```
前端 → Supabase Edge Function (yinhe-data) → 银禾数据 API
```

---

## 二、前端调用

### 2.1 使用 yinhedataService

```typescript
import { yinhedataService } from '@/services/yinhedataService';

// 获取涨停股票
const limitUpStocks = await yinhedataService.getLimitUpStocks();

// 获取股票行情
const quotes = await yinhedataService.getQuotes(['600519', '000001']);

// 获取K线数据
const kline = await yinhedataService.getKline('600519', 'day', 100);

// 获取资金流向
const moneyFlow = await yinhedataService.getMoneyFlow('600519');

// 检查服务状态
const status = await yinhedataService.checkStatus();
```

### 2.2 数据获取优先级

```
1. Supabase 数据库 (缓存数据)
     ↓ (无数据)
2. 银禾数据 Edge Function (推荐)
     ↓ (不可用)
3. 模拟数据 (兜底方案)
```

---

## 三、API 接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/quotes` | GET | 股票行情列表 |
| `/api/quote/:symbol` | GET | 单只股票行情 |
| `/api/limit-up` | GET | 涨停股票列表 |
| `/api/limit-down` | GET | 跌停股票列表 |
| `/api/ipo` | GET | 新股申购列表 |
| `/api/kline/:symbol` | GET | K线数据 |
| `/api/money-flow/:symbol` | GET | 资金流向 |
| `/api/dragon-tiger` | GET | 龙虎榜数据 |
| `/api/stock-list` | GET | 股票列表 |
| `/api/financial/:symbol` | GET | 财务数据 |
| `/api/sectors` | GET | 板块行情 |
| `/api/concepts` | GET | 概念板块 |
| `/api/search` | GET | 搜索股票 |

---

## 四、环境变量配置

```env
# 银禾数据 Edge Function
VITE_YINHE_FUNCTION_URL=https://<project>.supabase.co/functions/v1/yinhe-data
```

---

## 五、Edge Function 部署

### 5.1 设置 Secrets

```bash
supabase secrets set YINHE_API_KEY=your_key_here
```

### 5.2 部署

```bash
supabase functions deploy yinhe-data
```

### 5.3 验证

```bash
curl https://<project>.supabase.co/functions/v1/yinhe-data/health
```

---

## 六、注意事项

1. **数据延迟**: 免费接口可能有轻微延迟，不适合高频交易
2. **调用频率**: 建议设置合理的请求间隔，避免频繁调用
3. **缓存策略**: 重要数据建议本地缓存

---

*本文档已移除本地 Python 服务相关内容，统一使用 Edge Function*
