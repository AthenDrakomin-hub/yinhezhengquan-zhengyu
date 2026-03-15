# 缓存策略文档

## 概述

本项目使用三层缓存架构，在保证数据新鲜度的同时，控制资源使用量在免费配额范围内。

## 缓存架构

```
┌─────────────────────────────────────────────────────────────┐
│                       缓存架构图                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  前端 (Browser)                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐           │   │
│  │  │ 内存缓存 (Map)  │  │ localStorage   │           │   │
│  │  │ TTL: 秒级       │  │ 配置持久化     │           │   │
│  │  │ 最大: 1000条    │  │                │           │   │
│  │  └─────────────────┘  └─────────────────┘           │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓ API 请求                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  后端 (Edge Functions)                               │   │
│  │  ┌─────────────────────────────────────────────┐     │   │
│  │  │  Upstash Redis (主缓存)                      │     │   │
│  │  │  免费额度: 10,000 请求/天, 256MB 存储        │     │   │
│  │  │  TTL: 5秒 ~ 24小时                          │     │   │
│  │  └─────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓ 数据库查询                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  数据库 (Supabase PostgreSQL)                        │   │
│  │  ┌───────────────┐  ┌───────────────────────┐       │   │
│  │  │ 热点数据表    │  │ market_data_cache    │       │   │
│  │  │ 7天自动清理   │  │ 行情缓存(备用)       │       │   │
│  │  │ ~150KB       │  │ TTL: 30秒~1天        │       │   │
│  │  └───────────────┘  └───────────────────────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 免费额度与使用情况

| 服务 | 免费额度 | 建议使用 | 当前预估 |
|------|---------|----------|----------|
| **Upstash Redis** | 10,000 请求/天 | < 5,000 | ~2,000 |
| **Upstash Redis 存储** | 256MB | < 50MB | ~10MB |
| **Supabase 数据库** | 500MB | < 100MB | ~20MB |
| **Supabase Storage** | 1GB | < 100MB | < 1MB |

## 各层缓存详解

### 1. 前端内存缓存

**实现**：`services/cacheService.ts` - `MemoryCache` 类

**特点**：
- 最快访问速度（无网络延迟）
- 会话级缓存，页面刷新后清空
- LRU 淘汰策略

**TTL 配置**：
| 数据类型 | TTL | 说明 |
|---------|-----|------|
| 行情数据 | 5秒 | 高频更新 |
| K线数据 | 30秒 | 中频更新 |
| 新闻/热点 | 1分钟 | 低频更新 |
| 股票信息 | 5分钟 | 很少变化 |
| 用户数据 | 30秒 | 实时性要求高 |

### 2. Upstash Redis 缓存（主缓存）

**实现**：`supabase/functions/_shared/cache.ts`

**特点**：
- 持久化存储，跨会话共享
- 支持过期自动清理
- 支持模式匹配删除

**TTL 配置**（秒）：
| 数据类型 | TTL | 说明 |
|---------|-----|------|
| 成交明细 | 5秒 | 极高频更新 |
| 五档盘口 | 5秒 | 极高频更新 |
| 行情快照 | 30秒 | 高频更新 |
| 批量行情 | 30秒 | 高频更新 |
| K线数据 | 5分钟 | 中频更新 |
| 新闻数据 | 5分钟 | 中频更新 |
| 交易规则 | 10分钟 | 低频更新 |
| 用户档案 | 5分钟 | 中频更新 |
| IPO数据 | 1小时 | 低频更新 |
| 股票信息 | 24小时 | 静态数据 |

### 3. 数据库缓存（备用）

**实现**：`market_data_cache` 表

**用途**：
- 作为 Redis 不可用时的降级方案
- 存储较大的缓存数据

### 4. 热点数据

**表**：`hot_news`, `community_posts`, `today_hotspot`, `financial_calendar`

**特点**：
- 由 crawler 定时采集（每30分钟）
- 自动去重（title/event 唯一约束）
- 7天自动清理

**数据量估算**：
| 指标 | 数值 |
|------|------|
| 每次采集 | ~170条记录 |
| 每天采集 | 48次 × 170 = 8,160条 |
| 去重后 | ~2,000条 |
| 保留7天 | ~14KB × 7 = **~150KB** |

## 自动清理任务

通过 pg_cron 执行的定时任务（需在 Supabase Dashboard 手动创建）：

```sql
-- 1. 每小时清理过期缓存
SELECT cron.schedule(
  'cleanup-expired-cache-hourly',
  '0 * * * *',
  $$ DELETE FROM market_data_cache WHERE expires_at < NOW(); $$
);

-- 2. 每天清理热点数据（保留7天）
SELECT cron.schedule(
  'cleanup-hotspot-data-daily',
  '0 3 * * *',
  $$
  DELETE FROM hot_news WHERE crawl_time < NOW() - INTERVAL '7 days';
  DELETE FROM community_posts WHERE crawl_time < NOW() - INTERVAL '7 days';
  DELETE FROM today_hotspot WHERE crawl_time < NOW() - INTERVAL '7 days';
  DELETE FROM financial_calendar WHERE crawl_time < NOW() - INTERVAL '7 days';
  $$
);

-- 3. crawler 热点数据采集（每30分钟）
SELECT cron.schedule(
  'crawler-hotspot-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/crawler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 使用指南

### 前端缓存使用

```typescript
import { memoryCache, CACHE_CONFIG } from '@/services/cacheService';

// 获取缓存
const quote = memoryCache.get<QuoteData>('quote:600519');

// 设置缓存
if (!quote) {
  const data = await fetchQuote('600519');
  memoryCache.set('quote:600519', data, CACHE_CONFIG.MEMORY_TTL.QUOTE);
}

// 清理缓存
memoryCache.delete('quote');  // 清理包含 'quote' 的缓存
memoryCache.clear();          // 清空所有内存缓存
```

### Edge Function 缓存使用

```typescript
import { getCache, setCache, CacheTTL } from '../_shared/cache.ts';

// 获取缓存
const quote = await getCache<QuoteData>('quote:600519');

// 设置缓存
if (!quote) {
  const data = await fetchQuoteFromAPI('600519');
  await setCache('quote:600519', data, CacheTTL.QUOTE);
}
```

### 手动清理缓存

调用 `clear-cache` Edge Function：

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/clear-cache' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"pattern": "quote"}'
```

## 监控命令

### 查看 Redis 使用情况

```sql
-- 通过 Edge Function 调用
SELECT net.http_post(
  url := 'https://YOUR_PROJECT.supabase.co/functions/v1/health-check',
  headers := '{"Content-Type": "application/json"}'::jsonb
);
```

### 查看数据库缓存统计

```sql
-- 数据库缓存统计
SELECT 
  COUNT(*) as total_items,
  MIN(cached_at) as oldest_cache,
  MAX(expires_at) as latest_expiry
FROM market_data_cache;

-- 热点数据统计
SELECT 
  'hot_news' as table_name, COUNT(*) as count FROM hot_news
UNION ALL
SELECT 'community_posts', COUNT(*) FROM community_posts
UNION ALL
SELECT 'today_hotspot', COUNT(*) FROM today_hotspot
UNION ALL
SELECT 'financial_calendar', COUNT(*) FROM financial_calendar;
```

### 查看前端内存缓存统计

```typescript
const stats = memoryCache.stats();
console.log(`内存缓存: ${stats.size} 条`);
console.log('缓存键:', stats.keys);
```

## 最佳实践

1. **选择合适的缓存层级**
   - 高频访问、短期有效 → 前端内存缓存
   - 跨会话共享、中期有效 → Redis 缓存
   - 大数据量、长期存储 → 数据库

2. **设置合理的 TTL**
   - 数据更新频率越高，TTL 越短
   - 实时性要求越高，TTL 越短

3. **控制 Redis 请求量**
   - 前端使用内存缓存减少 API 调用
   - 批量查询合并请求
   - 避免不必要的缓存穿透

4. **定期清理**
   - 依赖 pg_cron 自动清理
   - 发现异常及时手动清理
